# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Question, QuestionAttempt, Keyword, WeakKeywordLog
from database import get_db
from auth import get_current_user
from schemas import QuizGenerationResponse, RegisterQuestionRequest


router = APIRouter()
       
@router.get("/quiz/wrong-notes")
def get_wrong_notes(user_id: int, db: Session = Depends(get_db)):
    results = (
        db.query(QuestionAttempt, Question, Keyword)
        .join(Question, QuestionAttempt.question_id == Question.question_id)
        .join(Keyword, Question.keyword_id == Keyword.keyword_id)
        .filter(QuestionAttempt.user_id == user_id, QuestionAttempt.is_correct == False)
        .all()
    )
    return [
        {
            "question": q.content,
            "type": q.question_type,
            "keyword": k.keyword_name,
            "user_answer": qa.answer,
            "correct_answer": q.answer,
            "explanation": q.explanation
        }
        for qa, q, k in results
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
    questions = db.query(Question).filter(Question.keyword_id == weak[0]).all()
    return [{"question_id": q.question_id, "content": q.content} for q in questions]

@router.get("/quiz/my-attempts")
def get_my_attempts(user_id: int, db: Session = Depends(get_db)):
    attempts = (
        db.query(QuestionAttempt, Question)
        .join(Question, Question.question_id == QuestionAttempt.question_id)
        .filter(QuestionAttempt.user_id == user_id)
        .order_by(QuestionAttempt.attempt_id.desc())
        .all()
    )
    return [
        {
            "attempt_id": a.QuestionAttempt.attempt_id,
            "question_id": a.Question.question_id,
            "question": a.Question.content,
            "is_correct": a.QuestionAttempt.is_correct
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
        keyword_id=data.keyword_id,
        question_type=data.type,
        content=data.question,
        answer=data.correct_answer,
        explanation=data.explanation
    )
    db.add(question)
    db.commit()
    db.refresh(question)
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
    is_correct = (user_answer.strip() == question.answer.strip())

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
        weak_log = WeakKeywordLog(
            user_id=user_id,
            question_id=question_id,
            keyword_id=question.keyword_id,
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