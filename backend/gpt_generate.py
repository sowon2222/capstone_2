# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from database import get_db
from models import Question, QuestionAttempt, Slide
import openai, json, re
from typing import List, Optional
from sqlalchemy import text
import random
import os
from pydantic import BaseModel

router = APIRouter()

class MaterialIdRequest(BaseModel):
    material_id: int

# ✅ 번호(슬라이드/개념)별 3문제(상/중/하) 생성 API
@router.post("/quiz/generate-bulk-number")
def generate_bulk_number_quiz(
    material_id: int = Body(...),
    db: Session = Depends(get_db)
):
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    if not slides:
        raise HTTPException(status_code=404, detail="해당 강의자료의 슬라이드가 없습니다.")
    generated_questions = []
    for slide in slides:
        for difficulty in ["상", "중", "하"]:
            prompt = f"""
너는 대학 강의 기반 문제 생성 AI야. 아래 슬라이드 정보를 참고해서, [난이도]와 [문제 유형] 기준에 맞는 문제를 1개 생성해줘.
────────────────────────────
[슬라이드 제목]\n{slide.slide_title}
[개념 설명]\n{slide.concept_explanation}
[중요 문장]\n{slide.important_sentences}
[슬라이드 전체 요약]\n{slide.summary}
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
- 정답은 반드시 슬라이드/개념 설명에서 유추 가능한 내용이어야 하며, "정답 없음", "모름", "해당 없음" 등은 허용하지 마세요.
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
  "explanation": "..."
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
                content = re.sub(r"^```json\\s*|\\s*```$|^```|```$", "", content.strip(), flags=re.MULTILINE)
                parsed = json.loads(content)
                # DB 저장
                q = Question(
                    number=slide.slide_number,
                    slide_id=slide.slide_id,
                    question_type=parsed.get("type"),
                    content=json.dumps(parsed, ensure_ascii=False) if parsed.get("type") == "객관식" else parsed.get("question"),
                    answer=parsed.get("correct_answer") or "정답 없음",
                    explanation=parsed.get("explanation"),
                    difficulty=difficulty
                )
                db.add(q)
                db.commit()
                db.refresh(q)
                generated_questions.append({"question_id": q.question_id, "number": q.number, "difficulty": q.difficulty})
            except Exception as e:
                print(f"문제 생성 실패 (slide_id={slide.slide_id}, 난이도={difficulty}):", e)
    return {"questions": generated_questions}

# ✅ 1회차: 각 번호별 1문제(랜덤)씩 출제
@router.get("/quiz/first-round")
def get_first_round(material_id: int, db: Session = Depends(get_db)):
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    questions = []
    for slide in slides:
        qlist = db.query(Question).filter(Question.number == slide.slide_number).all()
        if qlist:
            questions.append(random.choice(qlist))
    # 문제 데이터 가공
    result = []
    for q in questions:
        q_dict = {
            "question_id": q.question_id,
            "number": q.number,
            "type": q.question_type,
            "difficulty": q.difficulty,
            "explanation": q.explanation
        }
        if q.question_type == "객관식":
            try:
                content_json = json.loads(q.content)
                q_dict["content"] = content_json.get("question")
                if "options" in content_json:
                    q_dict["options"] = [v for k, v in sorted(content_json["options"].items())]
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

# ✅ 보충학습: 오답 번호별 아직 안 푼 문제 중 1문제(없으면 랜덤)씩 출제
@router.post("/quiz/review-round")
def get_review_round(
    material_id: int = Body(...),
    wrong_numbers: List[int] = Body(...),
    solved_question_ids: List[int] = Body(...),
    db: Session = Depends(get_db)
):
    # material_id에 해당하는 slide_id 목록 추출
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    slide_ids = [slide.slide_id for slide in slides]
    # 오답 번호에 해당하는 모든 문제 중, 이미 푼 문제 제외
    qlist = db.query(Question).filter(
        Question.slide_id.in_(slide_ids),
        Question.number.in_(wrong_numbers)
    ).all()
    unsolved = [q for q in qlist if q.question_id not in solved_question_ids]

    # 2. 각 번호별로 1개씩만 랜덤 추출
    by_number = {}
    for q in unsolved:
        by_number.setdefault(q.number, []).append(q)
    selected_questions = []
    for num, qlist in by_number.items():
        selected_questions.append(random.choice(qlist))

    # 3. 부족하면 material_id 전체 pool에서 랜덤으로 추가(중복 없이)
    if len(selected_questions) < 10:
        # 이미 뽑은 question_id는 제외
        already_selected_ids = {q.question_id for q in selected_questions}
        # 전체 pool에서 이미 푼 문제, 이미 뽑은 문제 제외
        all_pool = db.query(Question).filter(
            Question.slide_id.in_(slide_ids),
            ~Question.question_id.in_(solved_question_ids + list(already_selected_ids))
        ).all()
        # 랜덤으로 부족한 만큼 추가
        random.shuffle(all_pool)
        for q in all_pool:
            if len(selected_questions) >= 10:
                break
            selected_questions.append(q)

    # 4. 최종 10문제만 반환
    selected_questions = selected_questions[:10]

    # 이하 기존 result 가공 코드 유지
    result = []
    for q in selected_questions:
        q_dict = {
            "question_id": q.question_id,
            "number": q.number,
            "type": q.question_type,
            "difficulty": q.difficulty,
            "explanation": q.explanation
        }
        if q.question_type == "객관식":
            try:
                content_json = json.loads(q.content)
                q_dict["content"] = content_json.get("question")
                if "options" in content_json:
                    q_dict["options"] = [v for k, v in sorted(content_json["options"].items())]
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

@router.get("/quiz/number-questions")
def get_number_questions(material_id: int, db: Session = Depends(get_db)):
    # material_id에 해당하는 모든 slide_id를 가져옴
    slides = db.query(Slide).filter(Slide.material_id == material_id).all()
    slide_ids = [slide.slide_id for slide in slides]
    # slide_id가 일치하는 모든 문제를 가져옴
    all_questions = db.query(Question).filter(Question.slide_id.in_(slide_ids)).all()
    # 10문제만 랜덤 추출
    selected_questions = random.sample(all_questions, min(10, len(all_questions)))
    result = []
    for q in selected_questions:
        q_dict = {
            "question_id": q.question_id,
            "number": q.number,
            "type": q.question_type,
            "difficulty": q.difficulty,
            "explanation": q.explanation
        }
        if q.question_type == "객관식":
            try:
                content_json = json.loads(q.content)
                q_dict["content"] = content_json.get("question")
                if "options" in content_json:
                    q_dict["options"] = [v for k, v in sorted(content_json["options"].items())]
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

@router.post("/quiz/generate")
def generate_quiz(req: MaterialIdRequest, db: Session = Depends(get_db)):
    material_id = req.material_id
    return generate_bulk_number_quiz(material_id, db)
