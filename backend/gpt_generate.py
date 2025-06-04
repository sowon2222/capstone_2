# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from auth import get_current_user
from database import get_db
from schemas import QuizGenerationRequest, QuizOptions, QuizGenerationResponse, RegisterQuestionRequest
from models import Question, QuestionAttempt, Keyword, WeakKeywordLog, Slide, WeakReviewHistory
import openai, json, re
from typing import List, Optional
from sqlalchemy import text, or_, func
import random
import os

router = APIRouter()

# ✅ 문제 생성 및 저장 API (Swagger에서 자물쇠 나오게 수정)
@router.post("/quiz/generate")
def generate_quiz(
    material_id: int = Body(...),
    db: Session = Depends(get_db),
    force_difficulty: str = Body(None)
):
    # 1. 모든 슬라이드 불러오기
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    if not slides:
        raise HTTPException(status_code=404, detail="해당 강의자료의 슬라이드가 없습니다.")

    # 2. 강의자료 이름 불러오기
    material = db.execute(
        text("SELECT material_name FROM lecture_materials WHERE material_id = :mid"),
        {"mid": material_id}
    ).fetchone()
    material_title = material[0] if material else ""

    # 3. 슬라이드 전체 내용 합치기
    combined_content = {
        "title": material_title,
        "slides": [
            {
                "slide_title": slide.slide_title,
                "concept_explanation": slide.concept_explanation,
                "summary": slide.summary,
                "main_keywords": slide.main_keywords,
                "important_sentences": slide.important_sentences
            }
            for slide in slides
        ]
    }

    # 4. GPT 프롬프트 생성
    prompt = f"""
다음은 강의 자료의 전체 내용입니다. 이 내용을 바탕으로 10개의 문제를 생성해주세요.

강의 제목: {combined_content['title']}

강의 내용:
{json.dumps(combined_content['slides'], ensure_ascii=False, indent=2)}

각 문제는 다음 형식을 따라야 합니다:
{{
  "type": "객관식/주관식/참거짓",
  "difficulty": "...",
  "question": "...",
  "options": {{ "A": "...", "B": "...", "C": "...", "D": "..." }},
  "correct_answer": "A",
  "explanation": "...",
  "tags": ["..."]
}}

10개의 문제를 JSON 배열 형태로 출력하세요.
"""

    # 5. GPT 호출 및 문제 저장
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "너는 대학 강의 기반 문제 생성 AI야."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        content = response.choices[0].message['content']
        content = re.sub(r"^```json\s*|\s*```$", "", content.strip(), flags=re.MULTILINE)
        questions = json.loads(content)

        saved_questions = []
        for idx, q in enumerate(questions):
            # slide_id를 슬라이드 수만큼 순환 할당
            slide_id = slides[idx % len(slides)].slide_id

            if q.get("type") == "주관식" and not q.get("correct_answer"):
                q["correct_answer"] = "정답 없음"

            if q.get("type") == "객관식":
                content_to_save = json.dumps(q, ensure_ascii=False)
                answer_to_save = q.get("correct_answer") or "정답 없음"
            else:
                content_to_save = q.get("question")
                answer_to_save = q.get("correct_answer") or "정답 없음"

            question = Question(
                slide_id=slide_id,
                question_type=q.get("type"),
                #tags=",".join(q.get("tags", [])),
                content=content_to_save,
                answer=answer_to_save,
                explanation=q.get("explanation"),
                difficulty=q.get("difficulty", "")
            )
            db.add(question)
            db.commit()
            db.refresh(question)
            q["question_id"] = question.question_id
            saved_questions.append(q)

        return saved_questions

    except Exception as e:
        print("문제 생성 에러:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ✅ 저장된 문제 전체 조회용 (테스트용)
@router.get("/questions")
def get_all_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).all()
    return [
        {
            "question_id": q.question_id,
            "slide_id": q.slide_id,
            "type": q.question_type,
            "content": q.content,
            "answer": q.answer,
            "explanation": q.explanation
        } for q in questions
    ]


@router.post("/quiz/weak-generate")
def generate_weak_gpt_quiz(user_id: int = Body(...), keywords: list = Body(...), top_n: int = Body(10), db: Session = Depends(get_db)):
    try:
        # 1. 약점 키워드 top_n 추출 (집계 뷰 사용)
        stats = db.execute(
            text("""
            SELECT w.keyword_id, k.keyword_name, w.incorrect_count
            FROM weak_weak_keyword_stats w
            JOIN keywords k ON w.keyword_id = k.keyword_id
            WHERE w.user_id = :user_id
            ORDER BY w.incorrect_count DESC
            LIMIT :top_n
            """),
            {"user_id": user_id, "top_n": top_n}
        ).fetchall()
        
        if not stats:
            return []  # 빈 배열 반환

        keyword_names = [row[1] for row in stats]
        keyword_ids = [row[0] for row in stats]

        # 2. 문제 유형별 약점 분석 (오답 많은 유형)
        type_counts = db.execute(
            text("""
            SELECT q.question_type, COUNT(*) as cnt
            FROM weak_keyword_logs l
            JOIN questions q ON l.question_id = q.question_id
            WHERE l.user_id = :user_id AND l.is_incorrect = TRUE
            GROUP BY q.question_type
            ORDER BY cnt DESC
            LIMIT :top_n
            """),
            {"user_id": user_id, "top_n": top_n}
        ).fetchall()
        weak_types = [row[0] for row in type_counts] if type_counts else []

        # 난이도 기준 랜덤 선택
        difficulty_levels = [
            {
                "level": "하",
                "concept": "기억(Remember), 이해(Understand)",
                "prior_knowledge": "기본 용어만 알면 풀 수 있음",
                "reasoning": "단순 fact-check, 암기형"
            },
            {
                "level": "중",
                "concept": "적용(Apply), 분석(Analyze)",
                "prior_knowledge": "전공/수업 개념 필요",
                "reasoning": "정보 연결, 간단한 추론"
            },
            {
                "level": "상",
                "concept": "평가(Evaluate), 창작(Create)",
                "prior_knowledge": "여러 단원/심화 전공지식 필요",
                "reasoning": "복합적 추론, 종합, 창의적 문제 해결"
            }
        ]
        selected = random.choice(difficulty_levels)
        difficulty = selected["level"]

        # 3. GPT 프롬프트 생성
        prompt = f"""
아래 키워드와 문제 유형을 바탕으로 대학생 수준의 기출 문제를 한 문제 생성해줘.
- 키워드: {', '.join(keyword_names)}
- 문제 유형: {', '.join(weak_types) if weak_types else '자유롭게'}

[난이도] {difficulty}
- 개념 복잡도: {selected['concept']}
- 배경지식 필요도: {selected['prior_knowledge']}
- 정보 탐색 난이도: {selected['reasoning']}

문제 유형은 객관식, 주관식, 참/거짓, 빈칸 채우기 중 하나로, 아래 JSON 형식으로 출력해줘:

{{
  "type": "객관식",
  "question": "...",
  "options": {{ "A": "...", "B": "...", "C": "...", "D": "..." }},
  "correct_answer": "A",
  "explanation": "...",
  "tags": ["..."]
}}
아무 설명도 붙이지 말고, 아래 JSON만 정확히 출력해줘.

만약 키워드가 너무 추상적이거나 문제가 생성이 어렵더라도, 반드시 아래 JSON 예시 형식에 맞는 임의의 문제를 만들어서 출력해줘. 절대 설명문만 출력하지 마!
"""
        # 4. GPT로 문제 생성
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates educational questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # 5. 응답 파싱
        try:
            question_data = json.loads(response.choices[0].message.content)
            # 응답을 배열로 감싸서 반환
            return [question_data]
        except json.JSONDecodeError:
            return []  # JSON 파싱 실패시 빈 배열 반환
            
    except Exception as e:
        print(f"Error in generate_weak_gpt_quiz: {str(e)}")
        return []  # 에러 발생시 빈 배열 반환


@router.post("/quiz/generate-material")
def generate_material_quiz(
    material_id: int = Body(...),
    db: Session = Depends(get_db)
):
    # 1. 모든 슬라이드 정보 가져오기
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    if not slides:
        raise HTTPException(status_code=404, detail="해당 강의자료의 슬라이드가 없습니다.")
    # 2. 10개 이하만 랜덤 선택
    selected_slides = random.sample(slides, min(10, len(slides)))
    generated_questions = []
    for slide in selected_slides:
        # 키워드 추출 (main_keywords: str -> list)
        keywords = []
        keyword_id = None
        if slide.main_keywords:
            keywords = [k.strip() for k in slide.main_keywords.split(',') if k.strip()]
            # 첫 번째 키워드 id 조회 (없으면 None)
            if keywords:
                keyword_obj = db.query(Keyword).filter(Keyword.keyword_name == keywords[0]).first()
                if keyword_obj:
                    keyword_id = keyword_obj.keyword_id
        # 문제 생성 프롬프트 재사용
        try:
            result = generate_quiz(
                material_id=material_id,
                db=db
            )
            generated_questions.append(result)
        except Exception as e:
            print(f"문제 생성 실패 (slide_id={slide.slide_id}):", e)
    return {"questions": generated_questions}

@router.post("/quiz/generate-bulk")
def generate_bulk_quiz(
    material_id: int = Body(...),
    slide_ids: list = Body(...),
    target_difficulty: str = Body(None),
    db: Session = Depends(get_db)
):
    # slide_ids로 슬라이드 정보 조회
    slides = db.query(Slide).filter(Slide.slide_id.in_(slide_ids)).all()
    if not slides:
        raise HTTPException(status_code=404, detail="해당 슬라이드가 없습니다.")
    # 최대 10개 랜덤 선택
    selected_slides = random.sample(slides, min(10, len(slides)))
    generated_questions = []
    for slide in selected_slides:
        keywords = []
        keyword_id = None
        if slide.main_keywords:
            keywords = [k.strip() for k in slide.main_keywords.split(',') if k.strip()]
            if keywords:
                keyword_obj = db.query(Keyword).filter(Keyword.keyword_name == keywords[0]).first()
                if keyword_obj:
                    keyword_id = keyword_obj.keyword_id
        try:
            # 난이도 강제 적용
            result = generate_quiz(
                material_id=material_id,
                db=db,
                force_difficulty=target_difficulty
            )
            generated_questions.append(result)
        except Exception as e:
            print(f"문제 생성 실패 (slide_id={slide.slide_id}):", e)
    return {"questions": generated_questions}

@router.get("/quiz/material-questions")
def get_material_questions(material_id: int, db: Session = Depends(get_db)):
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    slide_ids = [s.slide_id for s in slides]
    questions = db.query(Question).filter(Question.slide_id.in_(slide_ids)).all()
    result = []
    for q in questions:
        q_dict = {
            "question_id": q.question_id,
            "slide_id": q.slide_id,
            "type": q.question_type,
            "difficulty": q.difficulty,
            "explanation": q.explanation
        }
        if q.question_type == "객관식":
            try:
                content_json = json.loads(q.content)
                # 필수 필드 체크
                if (
                    "options" not in content_json or not content_json.get("options") or
                    "question" not in content_json or not content_json.get("question") or
                    "correct_answer" not in content_json or not content_json.get("correct_answer")
                ):
                    continue
                q_dict["content"] = content_json.get("question")
                # options를 리스트로 변환
                if isinstance(content_json["options"], dict):
                    q_dict["options"] = [v for k, v in sorted(content_json["options"].items())]
                    option_keys = list(sorted(content_json["options"].keys()))
                elif isinstance(content_json["options"], list):
                    q_dict["options"] = content_json["options"]
                    option_keys = list(range(len(content_json["options"])))
                else:
                    q_dict["options"] = []
                    option_keys = []
                # correct 인덱스 계산
                correct_answer = content_json.get("correct_answer")
                if isinstance(q.answer, str) and correct_answer in option_keys:
                    q_dict["correct"] = option_keys.index(correct_answer)
                elif isinstance(q.answer, str) and q.answer in option_keys:
                    q_dict["correct"] = option_keys.index(q.answer)
                elif correct_answer in content_json["options"]:
                    # 정답이 value로 들어있는 경우
                    q_dict["correct"] = q_dict["options"].index(correct_answer)
                else:
                    q_dict["correct"] = -1
            except Exception as e:
                print("객관식 파싱 에러:", e)
                continue  # 파싱 실패시 건너뜀
        elif q.question_type == "주관식":
            if not q.content or not q.answer:
                continue
            q_dict["content"] = q.content
            q_dict["options"] = ['정답 입력']
            q_dict["correct"] = q.answer
        elif q.question_type == "참거짓":
            answer_clean = q.answer.strip() if q.answer else ""
            if not q.content or not answer_clean or answer_clean not in ["참", "거짓", "true", "false"]:
                continue
            q_dict["content"] = q.content
            q_dict["options"] = ['참', '거짓']
            q_dict["correct"] = 0 if answer_clean in ["참", "true"] else 1
        else:
            continue
        result.append(q_dict)
    return result

@router.post("/quiz/weak-generate-by-keywords")
def generate_weak_review(
    user_id: int = Body(...),
    keywords: list = Body(...),
    top_n: int = Body(10),
    exclude_question_ids: list = Body([]),
    material_id: int = Body(...),
    db: Session = Depends(get_db)
):
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    slide_ids = [s.slide_id for s in slides]
    query = db.query(Question).filter(
        Question.slide_id.in_(slide_ids),
        ~Question.question_id.in_(exclude_question_ids)
    )
    questions = query.order_by(func.rand()).limit(top_n).all()

    # 1. 남은 문제가 없으면, exclude를 무시하고 다시 뽑기 (리사이클)
    if len(questions) == 0:
        questions = db.query(Question).filter(
            Question.slide_id.in_(slide_ids)
        ).order_by(func.rand()).limit(top_n).all()

    # 2. 그래도 부족하면, GPT로 새 문제 생성
    if len(questions) == 0:
        try:
            generate_quiz(material_id=material_id, db=db)
            questions = db.query(Question).filter(
                Question.slide_id.in_(slide_ids)
            ).order_by(func.rand()).limit(top_n).all()
        except Exception as e:
            print("자동 문제 생성 실패:", e)
            return []

    # 6. 응답: 프론트가 바로 쓸 수 있게 가공
    result = []
    for q in questions:
        q_dict = {
            "question_id": q.question_id,
            "slide_id": q.slide_id,
            "type": q.question_type,
            "difficulty": q.difficulty,
            "explanation": q.explanation
        }
        if q.question_type == "객관식":
            try:
                content_json = json.loads(q.content)
                if (
                    "options" not in content_json or not content_json.get("options") or
                    "question" not in content_json or not content_json.get("question") or
                    "correct_answer" not in content_json or not content_json.get("correct_answer")
                ):
                    continue
                q_dict["content"] = content_json.get("question")
                if isinstance(content_json["options"], dict):
                    q_dict["options"] = [v for k, v in sorted(content_json["options"].items())]
                    option_keys = list(sorted(content_json["options"].keys()))
                elif isinstance(content_json["options"], list):
                    q_dict["options"] = content_json["options"]
                    option_keys = list(range(len(content_json["options"])))
                else:
                    q_dict["options"] = []
                    option_keys = []
                correct_answer = content_json.get("correct_answer")
                if isinstance(q.answer, str) and correct_answer in option_keys:
                    q_dict["correct"] = option_keys.index(correct_answer)
                elif isinstance(q.answer, str) and q.answer in option_keys:
                    q_dict["correct"] = option_keys.index(q.answer)
                elif correct_answer in content_json["options"]:
                    q_dict["correct"] = q_dict["options"].index(correct_answer)
                else:
                    q_dict["correct"] = -1
            except Exception as e:
                print("보충학습 객관식 파싱 에러:", e)
                continue
        elif q.question_type == "주관식":
            if not q.content or not q.answer:
                continue
            q_dict["content"] = q.content
            q_dict["options"] = ['정답 입력']
            q_dict["correct"] = q.answer
        elif q.question_type == "참거짓":
            answer_clean = q.answer.strip() if q.answer else ""
            if not q.content or not answer_clean or answer_clean not in ["참", "거짓", "true", "false"]:
                continue
            q_dict["content"] = q.content
            q_dict["options"] = ['참', '거짓']
            q_dict["correct"] = 0 if answer_clean in ["참", "true"] else 1
        else:
            continue
        result.append(q_dict)
    return result

@router.post("/api/weak-review-history")
def save_weak_review_history(
    user_id: int = Body(...),
    review_round: int = Body(...),
    questions: list = Body(...),
    db: Session = Depends(get_db)
):
    for q in questions:
        db.add(WeakReviewHistory(
            user_id=user_id,
            review_round=review_round,
            question_id=q["question_id"],
            user_answer=q["user_answer"],
            is_correct=q["is_correct"]
        ))
    db.commit()
    return {"status": "ok"}
