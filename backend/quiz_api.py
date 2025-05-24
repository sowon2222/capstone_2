# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, select, text
from models import Question, QuestionAttempt, Keyword, WeakKeywordLog, Slide
from database import get_db
from auth import get_current_user
from schemas import QuizGenerationResponse, RegisterQuestionRequest


router = APIRouter()
       
@router.get("/quiz/wrong-notes")
def get_wrong_notes(user_id: int, db: Session = Depends(get_db)):
    results = db.execute(
        text("""
            SELECT q.content, q.question_type, k.keyword_name, qa.answer, q.answer, q.explanation, qa.is_correct, qa.attempt_date
            FROM question_attempts qa
            JOIN questions q ON qa.question_id = q.question_id
            JOIN question_keywords qk ON q.question_id = qk.question_id
            JOIN keywords k ON qk.keyword_id = k.keyword_id
            WHERE qa.user_id = :uid AND qa.is_correct = FALSE
        """),
        {"uid": user_id}
    ).fetchall()
    return [
        {
            "question": row[0],
            "type": row[1],
            "keyword": row[2],
            "user_answer": row[3],
            "correct_answer": row[4],
            "explanation": row[5],
            "is_correct": row[6],
            "attempt_date": str(row[7]) if row[7] else None
        }
        for row in results
    ]


@router.get("/quiz/weak-review")
def weak_review(user_id: int, db: Session = Depends(get_db)):
    # 오답이 가장 많은 키워드 집계 쿼리로 추출
    weak = (
        db.query(WeakKeywordLog.keyword_id, func.count().label("incorrect_count"))
        .filter(WeakKeywordLog.user_id == user_id, WeakKeywordLog.is_incorrect == True)
        .group_by(WeakKeywordLog.keyword_id)
        .order_by(func.count().desc())
        .first()
    )
    if not weak:
        return []
    questions = db.execute(
        text("""
            SELECT q.question_id, q.content
            FROM questions q
            JOIN question_keywords k ON q.question_id = k.question_id
            WHERE k.keyword_id = :kid
        """),
        {"kid": weak[0]}
    ).fetchall()
    return [{"question_id": row[0], "content": row[1]} for row in questions]

@router.get("/quiz/my-attempts")
def get_my_attempts(user_id: int, material_id: int = None, db: Session = Depends(get_db)):
    query = db.query(QuestionAttempt, Question).join(Question, Question.question_id == QuestionAttempt.question_id)
    query = query.filter(QuestionAttempt.user_id == user_id)
    if material_id:
        # slide -> material_id 연결
        slide_ids = db.query(Slide.slide_id).filter(Slide.material_id == material_id).subquery()
        query = query.filter(Question.slide_id.in_(slide_ids))
    attempts = query.order_by(QuestionAttempt.attempt_id.desc()).all()
    return [
        {
            "attempt_id": a.QuestionAttempt.attempt_id,
            "user_id": a.QuestionAttempt.user_id,
            "question_id": a.Question.question_id,
            "question": a.Question.content,
            "user_answer": a.QuestionAttempt.answer,
            "correct_answer": a.Question.answer,
            "explanation": a.Question.explanation,
            "is_correct": a.QuestionAttempt.is_correct,
            "attempt_date": str(a.QuestionAttempt.attempt_date) if a.QuestionAttempt.attempt_date else None
        }
        for a in attempts
    ]
    
@router.post("/quiz/register")
def register_question(
    data: RegisterQuestionRequest,
    db: Session = Depends(get_db)
):
    question = Question(
        slide_id=data.slide_id,
        question_type=data.type,
        content=data.question,
        answer=data.correct_answer,
        explanation=data.explanation
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    # 문제-키워드 연결 저장
    for kid in data.keyword_ids:  # keyword_ids는 리스트여야 함
        db.execute(
            text("INSERT INTO question_keywords (question_id, keyword_id) VALUES (:qid, :kid)"),
            {"qid": question.question_id, "kid": kid}
        )
    db.commit()

    return {
        "question_id": question.question_id,
        "message": "문제가 성공적으로 저장되었습니다."
    }

@router.post("/quiz/submit")
def submit_quiz(
    user_id: int = Body(...),
    question_id: int = Body(...),
    user_answer: str = Body(...),
    db: Session = Depends(get_db)
):
    # 문제 정보 조회
    question = db.query(Question).filter(Question.question_id == question_id).first()
    if not question:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    # 정답 비교
    if question.question_type in ['객관식', '참거짓']:
        is_correct = (user_answer.strip().lower() == question.answer.strip().lower())
    else:
        is_correct = (user_answer.strip().lower() == question.answer.strip().lower())

    # 풀이 기록 저장
    attempt = QuestionAttempt(
        user_id=user_id,
        question_id=question_id,
        answer=user_answer,
        is_correct=is_correct
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # 오답일 경우 weak_keyword_logs에 기록
    if not is_correct:
        # question_keywords에서 keyword_id 가져오기
        keyword_ids = [row[0] for row in db.execute(
            text("SELECT keyword_id FROM question_keywords WHERE question_id = :qid"),
            {"qid": question_id}
        )]
        for kid in keyword_ids:
            weak_log = WeakKeywordLog(
                user_id=user_id,
                question_id=question_id,
                keyword_id=kid,
                is_incorrect=True
            )
            db.add(weak_log)
        db.commit()

    return {
        "question_id": question_id,
        "is_correct": is_correct,
        "correct_answer": question.answer,
        "explanation": question.explanation,
        "attempt_id": attempt.attempt_id
    }

@router.get("/quiz/all")
def get_all_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).all()
    result = []
    for q in questions:
        # question_keywords 테이블에서 keyword_id 리스트 조회
        keyword_ids = [row[0] for row in db.execute(
            select([Keyword.keyword_id])
            .select_from(Keyword)
            .join('question_keywords', Keyword.keyword_id == text('question_keywords.keyword_id'))
            .where(text('question_keywords.question_id = :qid')).params(qid=q.question_id)
        )]
        result.append({
            "question_id": q.question_id,
            "slide_id": q.slide_id,
            "type": q.question_type,
            "content": q.content,
            "answer": q.answer,
            "explanation": q.explanation,
            "keyword_ids": keyword_ids
        })
    return result