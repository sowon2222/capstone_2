# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from auth import get_current_user
from database import get_db
from schemas import QuizGenerationRequest, QuizOptions, QuizGenerationResponse, RegisterQuestionRequest
from models import Question, QuestionAttempt, Keyword, WeakKeywordLog
import openai, json, re
from typing import List, Optional
from sqlalchemy import text
import random

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
    db: Session = Depends(get_db)
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

    prompt = f"""
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

[난이도] {difficulty}
- 개념 복잡도: {selected['concept']}
- 배경지식 필요도: {selected['prior_knowledge']}
- 정보 탐색 난이도: {selected['reasoning']}

위 기준에 맞춰 대학생 수준의 기출 문제를 생성해줘. 문제 유형은 객관식, 주관식, 참/거짓, 빈칸 채우기 중 하나를 선택해서 아래 JSON 형식으로 정확히 출력해줘:\n\n예시 (객관식):\n{{\n  "type": "객관식",\n  "question": "...",\n  "options": {{ "A": "...", "B": "...", "C": "...", "D": "..." }},\n  "correct_answer": "A",\n  "explanation": "...",\n  "tags": ["..."]\n}}\n"""
    try:
        client = openai.OpenAI(api_key="API_KEY")
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "너는 대학 강의 기반 문제 생성 AI야."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        content = response.choices[0].message.content
        content = re.sub(r"^```json\\s*|\\s*```$", "", content.strip(), flags=re.MULTILINE)
        parsed = json.loads(content)
        # 난이도 정보도 함께 반환
        parsed["difficulty"] = difficulty
        # DB에 저장 (slide_id, keyword_id 명시적으로 저장)
        question = Question(
            slide_id=slide_id,
            keyword_id=keyword_id,
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
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ 저장된 문제 전체 조회용 (테스트용)
@router.get("/questions")
def get_all_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).all()
    return [
        {
            "question_id": q.question_id,
            "slide_id": q.slide_id,
            "keyword_id": q.keyword_id,
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
        client = openai.OpenAI(api_key="API KEY")
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "너는 대학 강의 기반 문제 생성 AI야."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        content = response.choices[0].message.content
        print("GPT 응답:", content)  # 디버깅용
        content = re.sub(r"^```json\\s*|\\s*```$|^```|```$", "", content.strip(), flags=re.MULTILINE)
        parsed = json.loads(content)
        parsed["difficulty"] = difficulty
        # DB에 저장 (slide_id는 None, keyword_id는 약점 키워드 중 첫 번째)
        question = Question(
            slide_id=None,
            keyword_id=keyword_ids[0] if keyword_ids else None,
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
        return parsed
    except Exception as e:
        print("파싱 실패 content:", content)
        raise HTTPException(status_code=500, detail=f"GPT 문제 생성 실패: {str(e)} / content: {content}")

