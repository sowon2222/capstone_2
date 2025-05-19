from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import models
from database import get_db
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slide_analyzer import analyze_pdf as conceptmap_analyze_pdf

from app.upload import router as upload_router

app = FastAPI()

app.include_router(upload_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["http://localhost:3000"] 등 프론트엔드 주소만 허용 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    return user

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

@app.post("/users/")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me/")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email, "id": current_user.id}

@app.post("/files/upload/")
async def upload_file(
    file: UploadFile = File(...),
    user_id: int = None,
    db: Session = Depends(get_db)
):
    # 파일 저장
    file_location = f"temp_files/{file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(await file.read())
    
    # 데이터베이스에 파일 정보 저장
    db_file = models.File(
        user_id=user_id,
        original_filename=file.filename,
        stored_filename=file_location,
        file_type=file.content_type,
        file_size=os.path.getsize(file_location)
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

@app.get("/files/{file_id}/analysis/")
def get_file_analysis(file_id: int, db: Session = Depends(get_db)):
    analysis_results = db.query(models.AnalysisResult).filter(
        models.AnalysisResult.file_id == file_id
    ).all()
    return analysis_results

@app.post("/files/{file_id}/analysis/")
def create_analysis(
    file_id: int,
    analysis_type: str,
    result_data: dict,
    db: Session = Depends(get_db)
):
    db_analysis = models.AnalysisResult(
        file_id=file_id,
        analysis_type=analysis_type,
        result_data=result_data
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis

@app.post("/analyze-pdf")
async def analyze_pdf_endpoint(file: UploadFile = File(...)):
    return await conceptmap_analyze_pdf(file) 