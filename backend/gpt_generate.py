# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from auth import get_current_user
from database import get_db
from schemas import QuizGenerationRequest, QuizOptions, QuizGenerationResponse, RegisterQuestionRequest
from models import Question, QuestionAttempt, Keyword, WeakKeywordLog, Slide
import openai, json, re
from typing import List, Optional
from sqlalchemy import text
import random
import os

router = APIRouter()

# ✅ 문제 생성 및 저장 API (Swagger에서 자물쇠 나오게 수정)
@router.post("/quiz/generate")
def generate_quiz(
    slide_id: int = Body(...),
    keyword_id: int = Body(...),
    slide_title: str = Body(...),
    concept_explanation: str = Body(...),
    image_description: str = Body(None),
    keywords: list = Body(...),
    important_sentences: list = Body(...),
    slide_summary: str = Body(...),
    db: Session = Depends(get_db),
    force_difficulty: str = Body(None)
):
    # 난이도 기준 정의
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

    if force_difficulty:
        difficulty = force_difficulty

    prompt = f"""
너는 대학 강의 기반 문제 생성 AI야.

아래 슬라이드 정보를 참고해서, 
[난이도]와 [문제 유형] 기준에 맞는 문제를 1개 생성해줘.

────────────────────────────
[슬라이드 제목]
{slide_title}

[개념 설명]
{concept_explanation}

[이미지 설명]
{image_description if image_description else '없음'}

[주요 키워드]
{', '.join(keywords)}

[중요 문장]
{chr(10).join(important_sentences)}

[슬라이드 전체 요약]
{slide_summary}
────────────────────────────

[난이도] {difficulty}
- 하: 기억(Remember), 이해(Understand) 수준. 기본 개념, 정의, 단순 암기, 단답형 문제. 예) "TCP/IP란 무엇인가?"
- 중: 적용(Apply), 분석(Analyze) 수준. 개념 응용, 비교, 간단한 분석. 예) "TCP와 UDP의 차이점을 설명하라."
- 상: 평가(Evaluate), 창작(Create) 수준. 복합적 사고, 실제 사례 적용, 비판적 분석. 예) "네트워크 장애 상황에서 OSI 7계층별로 원인 분석"

[문제 유형]
- 객관식: 명확한 정답, 4지선다(보기), 오답지(함정) 포함. 예) "다음 중 TCP의 특징이 아닌 것은?"
- 주관식: 한 문장 또는 단락으로 서술, 정답 예시 반드시 포함. 예) "OSI 7계층의 각 계층의 역할을 간단히 설명하시오."
- 참거짓: 명확히 True/False로 답할 수 있는 진술문. 예) "TCP는 비연결형 프로토콜이다. (참/거짓)"
- 빈칸: 문장 내 핵심 개념/용어를 빈칸으로 제시. 예) "OSI 7계층 중 데이터의 암호화와 복호화를 담당하는 계층은 [  ]이다."

[출제 시 주의사항]
- 정답은 반드시 슬라이드/키워드/개념 설명에서 유추 가능한 내용이어야 하며, "정답 없음", "모름", "해당 없음" 등은 허용하지 마세요.
- 문제, 정답, 해설, 보기(객관식)는 반드시 모두 포함하세요.
- 아래 JSON 예시 형식에 맞춰, 설명문 없이 JSON만 출력하세요.

────────────────────────────
예시 (객관식):
{{
  "type": "객관식",
  "difficulty": "{difficulty}",
  "question": "...",
  "options": {{ "A": "...", "B": "...", "C": "...", "D": "..." }},
  "correct_answer": "A",
  "explanation": "...",
  "tags": ["..."]
}}
────────────────────────────

이 기준을 반드시 지켜서 문제를 1개 생성하고, JSON만 출력하세요.
"""
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
        content = re.sub(r"^```json\\s*|\\s*```$", "", content.strip(), flags=re.MULTILINE)
        parsed = json.loads(content)
        parsed["difficulty"] = difficulty

        # 주관식 문제의 경우 correct_answer가 없을 수 있으므로 처리
        if parsed.get("type") == "주관식" and not parsed.get("correct_answer"):
            parsed["correct_answer"] = "정답 없음"  # 임시 정답 설정

        # 객관식 문제의 경우 content에 전체 JSON을 저장 (options, correct_answer 포함)
        if parsed.get("type") == "객관식":
            content_to_save = json.dumps(parsed, ensure_ascii=False)
            answer_to_save = parsed.get("correct_answer") or "정답 없음"
        else:
            content_to_save = parsed.get("question")
            answer_to_save = parsed.get("correct_answer") or "정답 없음"

        # DB에 저장 (slide_id, keyword_id 명시적으로 저장)
        question = Question(
            slide_id=slide_id,
            question_type=parsed.get("type"),
            content=content_to_save,
            answer=answer_to_save,  # null 방지
            explanation=parsed.get("explanation"),
            difficulty=difficulty
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        parsed["question_id"] = question.question_id

        # 만약 keyword_id가 있다면 question_keywords 테이블에 추가
        if keyword_id:
            db.execute(
                text("INSERT INTO question_keywords (question_id, keyword_id) VALUES (:qid, :kid)"),
                {"qid": question.question_id, "kid": keyword_id}
            )
            db.commit()

        return parsed
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
def generate_weak_gpt_quiz(user_id: int, top_n: int = 1, db: Session = Depends(get_db)):
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
        raise HTTPException(status_code=404, detail="약점 키워드가 없습니다.")

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

    # 4. GPT 호출 (openai 라이브러리 사용)
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
        print("GPT 응답:", content)  # 디버깅용
        content = re.sub(r"^```json\\s*|\\s*```$|^```|```$", "", content.strip(), flags=re.MULTILINE)
        parsed = json.loads(content)
        parsed["difficulty"] = difficulty
        # DB에 저장 (slide_id는 None, keyword_id는 약점 키워드 중 첫 번째)
        question = Question(
            slide_id=None,
            question_type=parsed.get("type"),
            content=parsed.get("question"),
            answer=parsed.get("correct_answer"),
            explanation=parsed.get("explanation"),
            difficulty=difficulty
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        parsed["question_id"] = question.question_id

        # 만약 keyword_id가 있다면 question_keywords 테이블에 추가
        if keyword_ids:
            db.execute(
                text("INSERT INTO question_keywords (question_id, keyword_id) VALUES (:qid, :kid)"),
                {"qid": question.question_id, "kid": keyword_ids[0]}
            )
            db.commit()

        return parsed
    except Exception as e:
        print("파싱 실패 content:", content)
        raise HTTPException(status_code=500, detail=f"GPT 문제 생성 실패: {str(e)} / content: {content}")


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
                slide_id=slide.slide_id,
                keyword_id=keyword_id or 0,
                slide_title=slide.slide_title or '',
                concept_explanation=slide.concept_explanation or '',
                image_description=None,
                keywords=keywords,
                important_sentences=(slide.important_sentences or '').split('\n'),
                slide_summary=slide.summary or '',
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
                slide_id=slide.slide_id,
                keyword_id=keyword_id or 0,
                slide_title=slide.slide_title or '',
                concept_explanation=slide.concept_explanation or '',
                image_description=None,
                keywords=keywords,
                important_sentences=(slide.important_sentences or '').split('\n'),
                slide_summary=slide.summary or '',
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
        # 객관식 문제의 경우 content에 options, correct_answer 포함
        if q.question_type == "객관식":
            try:
                content_json = json.loads(q.content)
                q_dict["content"] = content_json.get("question")
                if "options" in content_json:
                    q_dict["options"] = [v for k, v in sorted(content_json["options"].items())]
                    # answer가 'A' 등 알파벳이면 인덱스로 변환
                    if isinstance(q.answer, str) and q.answer in content_json["options"]:
                        q_dict["correct"] = list(content_json["options"].keys()).index(q.answer)
                    elif "correct_answer" in content_json and content_json["correct_answer"] in content_json["options"]:
                        q_dict["correct"] = list(content_json["options"].keys()).index(content_json["correct_answer"])
            except Exception:
                q_dict["content"] = q.content
        else:
            q_dict["content"] = q.content
            q_dict["answer"] = q.answer
        result.append(q_dict)
    return result