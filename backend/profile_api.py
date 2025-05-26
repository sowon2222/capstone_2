# 프로필 리포트 페이지 데이터 조회 API
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from profileservice import (
    get_user_name, get_user_accuracy, get_category_stats, get_weak_keywords,
    get_study_time_summary, get_material_upload_count, get_study_progress_change,
    get_user_percentile, get_accuracy_change_rate, get_llm_feedback, get_study_time_by_tab,
    get_study_time_by_tab_period, get_period_accuracy, get_learning_status, get_completion_rate_trend,
    get_avg_time_by_type, get_difficulty_stats
)

router = APIRouter()

@router.get("/api/report/summary")
def report_summary(user_id: int, period: str = "7d", db: Session = Depends(get_db)):
    try:
        name = get_user_name(user_id, db)
        accuracy = get_user_accuracy(user_id, db)
        category_stats = get_category_stats(user_id, db)
        weak_keywords = get_weak_keywords(user_id, db)
        study_time = get_study_time_summary(user_id, db)
        material_upload = get_material_upload_count(user_id, db)
        progress_change = get_study_progress_change(user_id, db)
        percentile = get_user_percentile(user_id, db)
        accuracy_change = get_accuracy_change_rate(user_id, db)
        llm_feedback = get_llm_feedback(user_id, db)
        study_time_by_tab = get_study_time_by_tab(user_id, db)
        study_time_by_tab_period = get_study_time_by_tab_period(user_id, period, db)
        period_accuracy = get_period_accuracy(user_id, db)
        learning_status = get_learning_status(user_id, db)
        completion_rate_trend = get_completion_rate_trend(user_id, period, db)
        by_type = get_avg_time_by_type(user_id, period, db)
        difficulty_stats = get_difficulty_stats(user_id, period, db)

        return {
            "name": name,
            "accuracy": accuracy,
            "category_stats": category_stats,
            "weak_keywords": weak_keywords,
            "study_time": study_time,
            "material_upload": material_upload,
            "progress_change": progress_change,
            "percentile": percentile,
            "accuracy_change": accuracy_change,
            "llm_feedback": llm_feedback,
            "study_time_by_tab": study_time_by_tab,
            "study_time_by_tab_period": study_time_by_tab_period,
            "period_accuracy": period_accuracy,
            "learning_status": learning_status,
            "completion_rate_trend": {period: completion_rate_trend},
            "by_type": by_type,
            "difficulty_stats": difficulty_stats,
        }
    except Exception as e:
        print("리포트 API 오류:", e)
        return {}
