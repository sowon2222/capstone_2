# #FastAPI 라우터/엔드포인트 작성
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from database import get_db
# from report_service import (
#     get_user_accuracy, get_category_stats, get_weak_keywords,
#     get_study_time_summary, get_material_upload_count, get_study_progress_change,
#     get_user_percentile, get_accuracy_change_rate, get_llm_feedback
# )

# router = APIRouter()

# @router.get("/api/report/summary")
# def report_summary(user_id: int, db: Session = Depends(get_db)):
#     accuracy = get_user_accuracy(user_id, db)
#     category_stats = get_category_stats(user_id, db)
#     weak_keywords = get_weak_keywords(user_id, db)
#     study_time = get_study_time_summary(user_id, db)
#     material_upload = get_material_upload_count(user_id, db)
#     progress_change = get_study_progress_change(user_id, db)
#     percentile = get_user_percentile(user_id, db)
#     accuracy_change = get_accuracy_change_rate(user_id, db)
#     llm_feedback = get_llm_feedback(user_id, db)
#     return {
#         "accuracy": accuracy,
#         "category_stats": category_stats,
#         "weak_keywords": weak_keywords,
#         "study_time": study_time,
#         "material_upload": material_upload,
#         "progress_change": progress_change,
#         "percentile": percentile,
#         "accuracy_change": accuracy_change,
#         "llm_feedback": llm_feedback
#     }

from fastapi import APIRouter
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/api/report/summary")
def report_summary(user_id: int, period: str = "7d"):
    # 기간에 따른 데이터 생성
    days = 3 if period == "3d" else 7 if period == "7d" else 30
    
    # 일별 데이터 생성
    daily_data = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%m월 %d일")
        daily_data.append({
            "date": date,
            "solved": 10 if i % 2 == 0 else 7,
            "total": 10
        })
    
    return {
        "name": "홍길동",
        "percent": 50,
        "solved": 25,
        "total": 50,
        "wrongConcepts": [
            {"name": "시험과 사전", "count": 8},
            {"name": "수학적 확률", "count": 7},
            {"name": "확률의 활용과 기본 성질", "count": 5}
        ],
        "daily": daily_data,
        "pie": {
            "labels": ["완료", "진행중", "부족"],
            "data": [14, 4, 3]
        },
        "line": {
            "labels": [f"Day {i+1}" for i in range(days)],
            "data": [40 + i * 5 for i in range(days)]
        },
        "study_time": {
            "3d": 1800,
            "7d": 3600,
            "30d": 10800
        },
        "accuracy": 80,
        "category_stats": [
            {"question_type": "객관식", "attempts": 10, "corrects": 8, "accuracy": 80},
            {"question_type": "주관식", "attempts": 5, "corrects": 3, "accuracy": 60}
        ],
        "weak_keywords": [
            {"keyword_name": "자료구조"},
            {"keyword_name": "알고리즘"}
        ],
        "material_upload": {
            "3d": 1,
            "7d": 2,
            "30d": 5
        },
        "progress_change": {
            "3d": 5,
            "7d": 10,
            "30d": 30
        },
        "percentile": {
            "my_accuracy": 80,
            "percentile": 90,
            "average": 60,
            "stddev": 15
        },
        "accuracy_change": {
            "recent": 80,
            "prev": 70,
            "change_rate": 14.3
        },
        "llm_feedback": "아주 우수한 학습 성과입니다! 심화문제에 도전해보세요."
    }