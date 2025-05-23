from database import Base, get_db, engine
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, TIMESTAMP, text, Float, Date, Enum

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(255))

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
    slide_id = Column(Integer, ForeignKey("slides.slide_id"), nullable=False)
    question_type = Column(Enum('객관식', '주관식', '참거짓', '빈칸채우기'), nullable=False)
    content = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    explanation = Column(Text)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    difficulty = Column(String(255))

class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    attempt_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    answer = Column(Text)
    attempt_date = Column(Date, nullable=False, server_default=text("CURDATE()"))

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
    occurred_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

class Keyword(Base):
    __tablename__ = "keywords"
    keyword_id = Column(Integer, primary_key=True, index=True)
    keyword_name = Column(String(255), unique=True, nullable=False)

class Slide(Base):
    __tablename__ = "slides"
    slide_id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("lecture_materials.material_id"), nullable=False)
    slide_number = Column(Integer, nullable=False)
    summary = Column(Text)
    original_text = Column(Text)
    slide_title = Column(String(255))
    concept_explanation = Column(Text)
    main_keywords = Column(String(255))
    important_sentences = Column(Text)

class LectureMaterial(Base):
    __tablename__ = "lecture_materials"
    material_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    material_name = Column(String(255), unique=True, nullable=False)
    progress = Column(Float, nullable=False, default=0)
    page = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    summary = Column(Text)

class SlideKeyword(Base):
    __tablename__ = "slide_keywords"
    slide_id = Column(Integer, ForeignKey("slides.slide_id"), primary_key=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), primary_key=True)

class QuestionKeyword(Base):
    __tablename__ = "question_keywords"
    question_id = Column(Integer, ForeignKey("questions.question_id"), primary_key=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), primary_key=True)

class DailyStudyTime(Base):
    __tablename__ = "daily_study_time"
    study_date = Column(Date, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    total_time = Column(Integer, nullable=False)

class StudyProgressLog(Base):
    __tablename__ = "study_progress_log"
    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    material_id = Column(Integer, ForeignKey("lecture_materials.material_id"), nullable=False)
    study_date = Column(Date, nullable=False)
    progress_delta = Column(Float, default=0)
    total_progress = Column(Float, default=0)

class StudyIntensityLog(Base):
    __tablename__ = "study_intensity_log"
    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    study_date = Column(Date, nullable=False)
    intensity_score = Column(Float, default=0)
