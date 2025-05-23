from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User
from passlib.context import CryptContext
from auth import create_access_token, get_current_user
from database import Base, get_db, engine

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register")
def register(
    username: str = Form(...),
    password: str = Form(...),
    name: str = Form(None),
    email: str = Form(None),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="User already exists.")
    hashed_pw = pwd_context.hash(password)
    user = User(username=username, password=hashed_pw, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Registration successful", "user_id": user.user_id}

@router.post("/login")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not pwd_context.verify(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    access_token = create_access_token(data={"user_id": user.user_id, "username": user.username})
    return {
        "message": "Login successful",
        "user_id": user.user_id,
        "username": user.username,
        "access_token": access_token
    }

@router.get("/user/me")
def get_me(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email
    }
    