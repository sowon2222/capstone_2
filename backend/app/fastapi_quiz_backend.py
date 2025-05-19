from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoTokenizer, MT5ForConditionalGeneration
from peft import PeftModel
import torch, re

app = FastAPI()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB 설정
DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class QuizResult(Base):
    __tablename__ = "quiz_results"
    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text)
    options = Column(Text)
    answer = Column(String)
    explanation = Column(Text)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 모델 로드
base_model_1 = MT5ForConditionalGeneration.from_pretrained("google/mt5-base")
model1 = PeftModel.from_pretrained(base_model_1, "./lora_step1_question_model/lora_adapter")
model1 = model1.merge_and_unload().to(device).eval()

base_model_2 = MT5ForConditionalGeneration.from_pretrained("google/mt5-base")
model2 = PeftModel.from_pretrained(base_model_2, "./lora_step2_answer_model/lora_adapter")
model2 = model2.merge_and_unload().to(device).eval()

tokenizer = AutoTokenizer.from_pretrained("google/mt5-base")
tokenizer.padding_side = "right"

def clean_step1_output(text):
    text = text.strip()
    text = re.sub(r"[\n\r]+", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text

class SummaryInput(BaseModel):
    summary: str

@app.post("/generate_quiz")
def generate_quiz(data: SummaryInput, db: Session = Depends(get_db)):
    summary_text = data.summary.strip()
    prompt1 = f"다음 내용을 바탕으로 객관식 문제와 보기 A~D를 생성하세요. 보기 순서는 A~D이고 보기 문장은 간결하게 작성하세요.\n\n{summary_text}"
    inputs1 = tokenizer(prompt1, return_tensors="pt", truncation=True, padding="max_length", max_length=512).to(device)
    outputs1 = model1.generate(
        **inputs1,
        max_length=384,
        num_beams=4,
        no_repeat_ngram_size=3,
        repetition_penalty=1.5,
        early_stopping=True,
        pad_token_id=tokenizer.pad_token_id
    )
    step1_text = clean_step1_output(tokenizer.decode(outputs1[0], skip_special_tokens=True))

    prompt2 = f"다음 문제에 대해 정답과 해설을 생성하세요. 정답은 보기 중 하나를 정확히 선택하고 해설은 구체적으로 작성하세요.\n\n{step1_text}"
    inputs2 = tokenizer(prompt2, return_tensors="pt", truncation=True, padding="max_length", max_length=512).to(device)
    outputs2 = model2.generate(
        **inputs2,
        max_length=256,
        num_beams=4,
        no_repeat_ngram_size=3,
        repetition_penalty=1.5,
        early_stopping=True,
        pad_token_id=tokenizer.pad_token_id
    )
    step2_text = tokenizer.decode(outputs2[0], skip_special_tokens=True).strip()

    question = step1_text.split("A.")[0].replace("문제:", "").strip()
    options = step1_text[len(question):].strip()

    answer_match = re.search(r"정답[:：]?\s*(.+?)($|\n)", step2_text)
    explanation_match = re.search(r"해설[:：]?\s*(.+)", step2_text)

    answer = answer_match.group(1).strip() if answer_match else "미확인"
    explanation = explanation_match.group(1).strip() if explanation_match else "미확인"

    existing_quiz = db.query(QuizResult).filter_by(question=question).first()

    if existing_quiz:
        return {
            "question": existing_quiz.question,
            "options": existing_quiz.options,
            "answer": existing_quiz.answer,
            "explanation": existing_quiz.explanation,
            "message": "Quiz already exists; returning saved data."
        }

    quiz = QuizResult(question=question, options=options, answer=answer, explanation=explanation)
    db.add(quiz)
    db.commit()

    return {"question": question, "options": options, "answer": answer, "explanation": explanation}
