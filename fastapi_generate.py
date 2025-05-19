from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from jose import JWTError, jwt
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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class SummaryResult(Base):
    __tablename__ = "summary_results"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    topic = Column(String)
    summary = Column(Text)

class QuizResult(Base):
    __tablename__ = "quiz_results"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
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

class UserCreate(BaseModel):
    username: str
    password: str

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_pw = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "username": new_user.username}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username}

@app.post("/save_summary")
def save_summary(topic: str, summary: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(SummaryResult).filter_by(username=current_user.username, topic=topic).first():
        raise HTTPException(status_code=409, detail="Summary exists")
    db.add(SummaryResult(username=current_user.username, topic=topic, summary=summary))
    db.commit()
    return {"message": "Summary saved."}

@app.post("/save_quiz")
def save_quiz(question: str, options: str, answer: str, explanation: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(QuizResult).filter_by(username=current_user.username, question=question).first():
        raise HTTPException(status_code=409, detail="Quiz exists")
    db.add(QuizResult(username=current_user.username, question=question, options=options, answer=answer, explanation=explanation))
    db.commit()
    return {"message": "Quiz saved."}

@app.get("/my_summaries")
def get_my_summaries(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SummaryResult).filter_by(username=current_user.username).all()

@app.get("/my_quizzes")
def get_my_quizzes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(QuizResult).filter_by(username=current_user.username).all()

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
def generate_quiz(data: SummaryInput, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    summary_text = data.summary.strip()
    prompt1 = f"다음 내용을 바탕으로 객관식 문제와 보기 A~D를 생성하세요. 보기 순서는 A~D이고 보기 문장은 간결하게 작성하세요.\n\n{summary_text}"
    inputs1 = tokenizer(prompt1, return_tensors="pt", truncation=True, padding="max_length", max_length=512).to(device)
    outputs1 = model1.generate(**inputs1, max_length=384, num_beams=4, no_repeat_ngram_size=3, repetition_penalty=1.5, early_stopping=True, pad_token_id=tokenizer.pad_token_id)
    step1_text = clean_step1_output(tokenizer.decode(outputs1[0], skip_special_tokens=True))

    prompt2 = f"다음 문제에 대해 정답과 해설을 생성하세요. 정답은 보기 중 하나를 정확히 선택하고 해설은 구체적으로 작성하세요.\n\n{step1_text}"
    inputs2 = tokenizer(prompt2, return_tensors="pt", truncation=True, padding="max_length", max_length=512).to(device)
    outputs2 = model2.generate(**inputs2, max_length=256, num_beams=4, no_repeat_ngram_size=3, repetition_penalty=1.5, early_stopping=True, pad_token_id=tokenizer.pad_token_id)
    step2_text = tokenizer.decode(outputs2[0], skip_special_tokens=True).strip()

    question = step1_text.split("A.")[0].replace("문제:", "").strip()
    options = step1_text[len(question):].strip()
    answer_match = re.search(r"정답[:：]?\s*(.+?)($|\n)", step2_text)
    explanation_match = re.search(r"해설[:：]?\s*(.+)", step2_text)
    answer = answer_match.group(1).strip() if answer_match else "미확인"
    explanation = explanation_match.group(1).strip() if explanation_match else "미확인"

    if db.query(QuizResult).filter_by(username=current_user.username, question=question).first():
        raise HTTPException(status_code=409, detail="Quiz already exists.")

    quiz = QuizResult(username=current_user.username, question=question, options=options, answer=answer, explanation=explanation)
    db.add(quiz)
    db.commit()

    return {"question": question, "options": options, "answer": answer, "explanation": explanation}
