from pydantic import BaseModel
from typing import Optional, List

class QuizGenerationRequest(BaseModel):
    slide_title: str                # �����̵� ����(������)
    concept_explanation: str        # �����̵� ���� ����
    image_description: Optional[str] = None  # �̹��� ���� (������ None)
    keywords: List[str]             # �����̵� �ֿ� Ű����
    important_sentences: List[str]  # �߿��� ����
    slide_summary: str              # ���� �����̵� ��ü ���

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
    slide_id: int               # ? �ʿ�!
    keyword_id: int             # ? �ʿ�!

    
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
