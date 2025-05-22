from pydantic import BaseModel
from typing import Optional, List

class QuizGenerationRequest(BaseModel):
    slide_title: str                # 슬라이드 제목(소주제)
    concept_explanation: str        # 슬라이드 개념 설명
    image_description: Optional[str] = None  # 이미지 설명 (없으면 None)
    keywords: List[str]             # 슬라이드 주요 키워드
    important_sentences: List[str]  # 중요한 문장
    slide_summary: str              # 개별 슬라이드 전체 요약

class QuizOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str

class QuizGenerationRequest(BaseModel):
    slide_title: str
    concept_explanation: str
    image_description: Optional[str] = None
    keywords: List[str]
    important_sentences: List[str]
    slide_summary: str
    slide_id: int               # ? 필요!
    keyword_id: int             # ? 필요!

    
class RegisterQuestionRequest(BaseModel):
    slide_id: int
    keyword_id: int
    type: str
    question: str
    options: Optional[QuizOptions] = None
    correct_answer: str
    explanation: Optional[str] = None
    
class QuizGenerationResponse(BaseModel):
    type: str
    question: str
    options: Optional[QuizOptions] = None
    correct_answer: str
    explanation: str
    tags: List[str]
