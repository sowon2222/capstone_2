import os
from dotenv import load_dotenv
from fastapi import APIRouter, Query, FastAPI, Body
import pymysql
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, date
from profileservice import get_avg_time_by_type, get_difficulty_stats

load_dotenv()

app = FastAPI()
router = APIRouter()

# DB 연결 함수

def get_db():
    return pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', '1234'),
        db=os.getenv('DB_NAME', 'study_platform'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

@router.get("/report/focus-analysis")
def focus_analysis(
    user_id: int = Query(...),
    period_start: str = Query(date.today().strftime("%Y-%m-%d")),
    period_end: str = Query((date.today() + timedelta(days=1)).strftime("%Y-%m-%d"))
):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) AS total_focus_blocks
                FROM focus_sessions
                WHERE user_id = %s AND duration >= 25 AND start_time BETWEEN %s AND %s
            """, (user_id, period_start, period_end))
            total_focus_blocks = cursor.fetchone()['total_focus_blocks']

            cursor.execute("""
                SELECT COUNT(*) AS total_interruptions
                FROM focus_sessions
                WHERE user_id = %s AND is_interrupted = TRUE AND start_time BETWEEN %s AND %s
            """, (user_id, period_start, period_end))
            total_interruptions = cursor.fetchone()['total_interruptions'] or 0

            cursor.execute("""
                SELECT HOUR(start_time) AS hour, SUM(duration) AS focus_minutes
                FROM focus_sessions
                WHERE user_id = %s AND start_time BETWEEN %s AND %s
                GROUP BY HOUR(start_time) ORDER BY hour
            """, (user_id, period_start, period_end))
            hourly_focus = cursor.fetchall()

            cursor.execute("""
                SELECT start_time, end_time, duration, is_interrupted
                FROM focus_sessions
                WHERE user_id = %s AND start_time BETWEEN %s AND %s
                ORDER BY start_time
            """, (user_id, period_start, period_end))
            focus_sessions = cursor.fetchall()

        focus_index = max(0, 1 - (total_interruptions / total_focus_blocks))

        return {
            'total_focus_blocks': total_focus_blocks,
            'total_interruptions': total_interruptions,
            'focus_index': focus_index,
            'hourly_focus': hourly_focus,
            'focus_sessions': focus_sessions
        }
    finally:
        conn.close()

@router.get("/report/focus-session-daily")
def focus_session_daily(
    user_id: int = Query(...),
    period_start: str = Query("2024-06-01"),
    period_end: str = Query("2024-06-30")
):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT DATE(start_time) AS date, COUNT(*) AS session_count
                FROM focus_sessions
                WHERE user_id = %s AND duration >= 25 AND start_time BETWEEN %s AND %s
                GROUP BY DATE(start_time)
                ORDER BY date
            """, (user_id, period_start, period_end))
            rows = cursor.fetchall()
        return rows
    finally:
        conn.close()

@router.get("/report/solve-habit")
def solve_habit(
    user_id: int = Query(...),
    period_start: str = Query("2024-06-01"),
    period_end: str = Query("2024-06-30")
):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT q.question_type, 
                       AVG(qa.is_correct) AS accuracy, 
                       AVG(qa.solve_time) AS avg_time
                FROM question_attempts qa
                JOIN questions q ON qa.question_id = q.question_id
                WHERE qa.user_id = %s
                  AND qa.attempted_at BETWEEN %s AND %s
                GROUP BY q.question_type
            """, (user_id, period_start, period_end))
            by_type = cursor.fetchall()

            cursor.execute("""
                SELECT '전체' AS question_type, 
                       AVG(qa.is_correct) AS accuracy, 
                       AVG(qa.solve_time) AS avg_time
                FROM question_attempts qa
                JOIN questions q ON qa.question_id = q.question_id
                WHERE qa.user_id = %s
                  AND qa.attempted_at BETWEEN %s AND %s
            """, (user_id, period_start, period_end))
            total_type = cursor.fetchone()

            if total_type and total_type['accuracy'] is not None:
                by_type.append(total_type)

            cursor.execute("""
                SELECT q.difficulty, 
                       AVG(qa.is_correct) AS accuracy, 
                       AVG(qa.solve_time) AS avg_time
                FROM question_attempts qa
                JOIN questions q ON qa.question_id = q.question_id
                WHERE qa.user_id = %s
                  AND qa.attempted_at BETWEEN %s AND %s
                GROUP BY q.difficulty
            """, (user_id, period_start, period_end))
            by_difficulty = cursor.fetchall()

            cursor.execute("""
                SELECT q.question_type, q.difficulty, AVG(qa.is_correct) AS accuracy
                FROM question_attempts qa
                JOIN questions q ON qa.question_id = q.question_id
                WHERE qa.user_id = %s
                  AND qa.attempted_at BETWEEN %s AND %s
                GROUP BY q.question_type, q.difficulty
            """, (user_id, period_start, period_end))
            heatmap = cursor.fetchall()

            cursor.execute("""
                SELECT q.difficulty, AVG(qa.is_correct) AS accuracy
                FROM question_attempts qa
                JOIN questions q ON qa.question_id = q.question_id
                WHERE qa.user_id = %s
                  AND qa.attempted_at BETWEEN %s AND %s
                GROUP BY q.difficulty
            """, (user_id, period_start, period_end))
            total_heatmap = cursor.fetchall()
            for row in total_heatmap:
                row['question_type'] = '전체'
                heatmap.append(row)

            cursor.execute("""
                SELECT start_time, end_time, duration, is_interrupted
                FROM focus_sessions
                WHERE user_id = %s AND start_time BETWEEN %s AND %s
                ORDER BY start_time
            """, (user_id, period_start, period_end))
            sessions = cursor.fetchall()

        return {
            "by_type": by_type,
            "by_difficulty": by_difficulty,
            "heatmap": heatmap,
            "sessions": sessions
        }
    finally:
        conn.close()

@router.get("/report/review-curation")
def review_curation(
    user_id: int = Query(...),
    top_n: int = Query(3)
):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT keyword_id
                FROM weak_keyword_logs
                WHERE user_id = %s AND is_incorrect = TRUE
                ORDER BY occurred_at DESC
                LIMIT %s
            """, (user_id, top_n))
            keyword_rows = cursor.fetchall()
            keyword_ids = [row['keyword_id'] for row in keyword_rows]

            cards = []
            for kid in keyword_ids:
                cursor.execute("""
                    SELECT q.question_id, q.content, q.slide_id, s.summary, k.keyword_name, q.answer
                    FROM question_keywords qk
                    JOIN questions q ON qk.question_id = q.question_id
                    JOIN slides s ON q.slide_id = s.slide_id
                    JOIN keywords k ON qk.keyword_id = k.keyword_id
                    WHERE qk.keyword_id = %s
                    ORDER BY q.question_id DESC
                    LIMIT 1
                """, (kid,))
                q = cursor.fetchone()
                if q:
                    cards.append(q)
        return {"cards": cards}
    finally:
        conn.close()

@router.get("/report/focus-timeline")
def focus_timeline(
    user_id: int = Query(...),
    period_start: str = Query("2024-06-01"),
    period_end: str = Query("2024-06-30")
):
    conn = get_db()
    try:
        # period_end를 하루 더해줌
        period_end_dt = datetime.strptime(period_end, '%Y-%m-%d') + timedelta(days=1)
        period_end_str = period_end_dt.strftime('%Y-%m-%d')
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT start_time, end_time, duration, is_interrupted
                FROM focus_sessions
                WHERE user_id = %s AND start_time >= %s AND start_time < %s
                ORDER BY start_time
            """, (user_id, period_start, period_end_str))
            rows = cursor.fetchall()
        return rows
    finally:
        conn.close()

@router.post("/report/focus-session-create")
def focus_session_create(
    user_id: int = Body(...),
    start_time: str = Body(...),
    end_time: str = Body(...),
    duration: int = Body(...),
    is_interrupted: bool = Body(False)
):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO focus_sessions (user_id, start_time, end_time, duration, is_interrupted)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, start_time, end_time, duration, is_interrupted))
            conn.commit()
        return {"success": True}
    finally:
        conn.close()

@router.get("/report/summary-by-type-difficulty")
def summary_by_type_difficulty(
    user_id: int = Query(...),
    period: str = Query("7d")
):
    # DB 세션 생성
    import sqlalchemy
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import create_engine
    # DB 연결 문자열 환경변수에서 가져오기
    db_url = os.getenv('SQLALCHEMY_DATABASE_URL', 'mysql+pymysql://root:1234@localhost:3307/my_capstone')
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        by_type = get_avg_time_by_type(user_id, period, db)
        difficulty_stats = get_difficulty_stats(user_id, period, db)
        return {
            "by_type": by_type,
            "difficulty_stats": difficulty_stats
        }
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router) 