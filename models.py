from database import Base, get_db, engine
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, TIMESTAMP, text
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

class Archive(Base):
    __tablename__ = "archives"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    filename = Column(String(255))
    original_text = Column(Text)
    summary = Column(Text)
    quiz_json = Column(Text)
    
class Question(Base):
    __tablename__ = "questions"
    question_id = Column(Integer, primary_key=True, index=True)
    slide_id = Column(Integer, ForeignKey("slides.slide_id"))
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"))
    question_type = Column(String(20))
    content = Column(Text)
    answer = Column(Text)
    explanation = Column(Text)
    difficulty = Column(String(10), nullable=False, default="중")

class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    attempt_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    answer = Column(Text)  # 사용자 답변 저장 (콤마 제거)
    question_id = Column(Integer, ForeignKey("questions.question_id"))
    is_correct = Column(Boolean, nullable=False)

# class WeakKeyword(Base):
#     __tablename__ = "weak_keywords"
#     weak_id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.user_id"))
#     keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"))
#     incorrect_count = Column(Integer, default=1)

class WeakKeywordLog(Base):
    __tablename__ = "weak_keyword_logs"
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=False)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=False)
    is_incorrect = Column(Boolean, nullable=False)
    occurred_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"), nullable=False)

class Keyword(Base):
    __tablename__ = "keywords"
    keyword_id = Column(Integer, primary_key=True, index=True)
    # slide_id = Column(Integer, ForeignKey("slides.slide_id"))  # ❌ 실제 DB에는 없음, 주석처리
    keyword_name = Column(String(255), unique=True)

class Slide(Base):
    __tablename__ = "slides"
    slide_id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("lecture_materials.material_id"))
    slide_number = Column(Integer)
    summary = Column(Text)

class LectureMaterial(Base):
    __tablename__ = "lecture_materials"
    material_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    material_name = Column(String(255), unique=True)
