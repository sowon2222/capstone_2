from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 설정
    files = relationship("File", back_populates="user")

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="pending")
    
    # 관계 설정
    user = relationship("User", back_populates="files")
    analysis_results = relationship("AnalysisResult", back_populates="file")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"))
    analysis_type = Column(String(50), nullable=False)
    result_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 설정
    file = relationship("File", back_populates="analysis_results")
    visualizations = relationship("Visualization", back_populates="analysis_result")

class Visualization(Base):
    __tablename__ = "visualizations"

    id = Column(Integer, primary_key=True, index=True)
    analysis_result_id = Column(Integer, ForeignKey("analysis_results.id"))
    visualization_type = Column(String(50), nullable=False)
    visualization_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 설정
    analysis_result = relationship("AnalysisResult", back_populates="visualizations") 