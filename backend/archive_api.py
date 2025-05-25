from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Archive, LectureMaterial, Slide, Question
from auth import get_current_user
import pdfplumber
from database import Base, get_db, engine

router = APIRouter()

@router.post("/upload_pdf")
def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    # user_id: int = Depends(get_current_user)
):
    pdf_bytes = file.file.read()
    with open("temp.pdf", "wb") as f:
        f.write(pdf_bytes)
    with pdfplumber.open("temp.pdf") as pdf:
        original_text = ""
        for page in pdf.pages:
            original_text += page.extract_text() + "\n"
    summary = call_summary_model(original_text)
    quiz_json = call_quiz_model(summary)
    archive = Archive(
        user_id=user_id,
        filename=file.filename,
        original_text=original_text,
        summary=summary,
        quiz_json=quiz_json
    )
    db.add(archive)
    db.commit()
    db.refresh(archive)
    return {"archive_id": archive.id}

@router.get("/archives")
def get_archives(
    db: Session = Depends(get_db),
    # user_id: int = Depends(get_current_user)
):
    archives = db.query(Archive).filter(Archive.user_id == user_id).all()
    return [
        {
            "archive_id": a.id,
            "filename": a.filename,
            "summary": a.summary,
            "quiz_json": a.quiz_json
        }
        for a in archives
    ]

@router.get("/archive/{lecture_id}")
def get_archive(lecture_id: int, db: Session = Depends(get_db)):
    # 강의자료 정보 조회
    material = db.query(LectureMaterial).filter(LectureMaterial.material_id == lecture_id).first()
    if not material:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="강의자료를 찾을 수 없습니다.")

    # 해당 강의자료의 슬라이드 조회
    slides = db.query(Slide).filter(Slide.material_id == lecture_id).all()
    slide_ids = [s.slide_id for s in slides]

    # 해당 슬라이드에 연결된 문제 조회
    questions = db.query(Question).filter(Question.slide_id.in_(slide_ids)).all()

    return {
        "lecture_id": lecture_id,
        "material_name": material.material_name,
        "slides": [
            {
                "slide_id": s.slide_id,
                "slide_number": s.slide_number,
                "summary": s.summary
            } for s in slides
        ],
        "questions": [
            {
                "question_id": q.question_id,
                "slide_id": q.slide_id,
                "content": q.content,
                "answer": q.answer,
                "explanation": q.explanation
            } for q in questions
        ]
    }