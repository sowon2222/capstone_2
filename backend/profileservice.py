#리포트 페이지 데이터 처리 
from sqlalchemy.orm import Session
from sqlalchemy import text
import statistics
import json
import os
import openai
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# 1. 사용자 이름
def get_user_name(user_id: int, db: Session):
    sql = text("SELECT username FROM users WHERE user_id = :user_id")
    result = db.execute(sql, {"user_id": user_id}).fetchone()
    return result[0] if result else "Unknown"

# 2. 내 전체 정답률
def get_user_accuracy(user_id: int, db: Session):
    sql = text("""
        SELECT SUM(is_correct) / NULLIF(COUNT(*), 0) * 100 AS accuracy
        FROM question_attempts
        WHERE user_id = :user_id
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchone()
    return float(result[0]) if result and result[0] is not None else 0.0

# 3. 문제 유형별 정답률/시도수
def get_category_stats(user_id: int, db: Session):
    sql = text("""
        SELECT q.question_type, COUNT(*) AS attempts, SUM(a.is_correct) AS corrects,
               SUM(a.is_correct) / NULLIF(COUNT(*), 0) * 100 AS accuracy
        FROM question_attempts a
        JOIN questions q ON a.question_id = q.question_id
        WHERE a.user_id = :user_id
        GROUP BY q.question_type
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchall()
    return [
        {
            "question_type": row[0],
            "attempts": row[1] or 0,
            "corrects": row[2] or 0,
            "accuracy": float(row[3]) if row[3] is not None else 0.0
        }
        for row in result
    ] if result else []

# 4. 자주 틀리는 키워드 (최근 30일)
def get_weak_keywords(user_id: int, db: Session):
    sql = text("""
        SELECT k.keyword_name, COUNT(*) AS wrong_count
        FROM weak_keyword_logs w
        JOIN keywords k ON w.keyword_id = k.keyword_id
        WHERE w.user_id = :user_id
          AND w.is_incorrect = 1
          AND w.occurred_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY k.keyword_name
        ORDER BY wrong_count DESC
        LIMIT 5
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchall()
    return [
        {"keyword_name": row[0]} for row in result
    ] if result else []

# 5. 학습 시간 집계 함수
def get_study_time_summary(user_id: int, db: Session):
    periods = {
        "3d": "DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    }
    result = {}
    for key, date_cond in periods.items():
        sql = text(f"""
            SELECT IFNULL(SUM(total_time), 0) FROM daily_study_time
            WHERE user_id = :user_id AND study_date >= {date_cond}
        """)
        value = db.execute(sql, {"user_id": user_id}).scalar()
        result[key] = int(value) if value is not None else 0
    return result

# 6. 강의자료 업로드/학습량 집계 함수
def get_material_upload_count(user_id: int, db: Session):
    periods = {
        "3d": "DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    }
    result = {}
    for key, date_cond in periods.items():
        sql = text(f"""
            SELECT COUNT(*) FROM lecture_materials
            WHERE user_id = :user_id AND created_at >= {date_cond}
        """)
        value = db.execute(sql, {"user_id": user_id}).scalar()
        result[key] = int(value) if value is not None else 0
    return result

# 7. 학습 진행도 변화 함수
def get_study_progress_change(user_id: int, db: Session):
    periods = {
        "3d": "DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    }
    result = {}
    for key, date_cond in periods.items():
        sql = text(f"""
            SELECT IFNULL(SUM(progress_delta), 0) FROM study_progress_log
            WHERE user_id = :user_id AND study_date >= {date_cond}
        """)
        value = db.execute(sql, {"user_id": user_id}).scalar()
        result[key] = float(value) if value is not None else 0.0
    return result

# 8. 상위 % 계산 함수
def get_user_percentile(user_id: int, db: Session):
    sql_my = text("""
        SELECT SUM(is_correct) / NULLIF(COUNT(*), 0) * 100 AS accuracy
        FROM question_attempts
        WHERE user_id = :user_id
    """)
    my_acc = db.execute(sql_my, {"user_id": user_id}).scalar() or 0.0

    sql_all = text("""
        SELECT user_id, SUM(is_correct) / NULLIF(COUNT(*), 0) * 100 AS user_acc
        FROM question_attempts
        GROUP BY user_id
    """)
    all_acc = [row[1] for row in db.execute(sql_all).fetchall() if row[1] is not None]
    if not all_acc:
        return {"my_accuracy": my_acc, "percentile": 0, "average": 0, "stddev": 0}

    avg = statistics.mean(all_acc)
    stddev = statistics.stdev(all_acc) if len(all_acc) > 1 else 0
    lower_count = sum(1 for acc in all_acc if acc < my_acc)
    percentile = (lower_count / len(all_acc)) * 100

    return {
        "my_accuracy": my_acc,
        "percentile": percentile,
        "average": avg,
        "stddev": stddev
    }

# 9. 정답률 변화율
def get_accuracy_change_rate(user_id: int, db: Session, days: int = 7):
    sql_recent = text(f"""
        SELECT SUM(is_correct) / NULLIF(COUNT(*), 0) * 100
        FROM question_attempts
        WHERE user_id = :user_id
          AND attempt_date BETWEEN DATE_SUB(CURDATE(), INTERVAL {days} DAY) AND CURDATE()
    """)
    recent = db.execute(sql_recent, {"user_id": user_id}).scalar() or 0.0

    sql_prev = text(f"""
        SELECT SUM(is_correct) / NULLIF(COUNT(*), 0) * 100
        FROM question_attempts
        WHERE user_id = :user_id
          AND attempt_date BETWEEN DATE_SUB(CURDATE(), INTERVAL {days*2} DAY) AND DATE_SUB(CURDATE(), INTERVAL {days+1} DAY)
    """)
    prev = db.execute(sql_prev, {"user_id": user_id}).scalar() or 0.0

    if prev == 0:
        change_rate = None
    else:
        change_rate = ((recent - prev) / prev) * 100
    return {
        "recent": recent,
        "prev": prev,
        "change_rate": change_rate
    }

# 10. AI 피드백 (변경 없음)
def get_llm_feedback(user_id: int, db: Session):
    accuracy = get_user_accuracy(user_id, db)
    accuracy_change = get_accuracy_change_rate(user_id, db)
    weak_keywords = get_weak_keywords(user_id, db)
    study_time = get_study_time_summary(user_id, db)
    material_upload = get_material_upload_count(user_id, db)
    category_stats = get_category_stats(user_id, db)
    percentile = get_user_percentile(user_id, db)
    growth_status = "성장 중" if accuracy_change["change_rate"] and accuracy_change["change_rate"] > 5 else ("정체 중" if accuracy_change["change_rate"] and abs(accuracy_change["change_rate"]) < 1 else "정체/감소")

    prompt = f"""
아래는 한 사용자의 최근 학습 리포트 데이터입니다.

- 전체 정답률: {accuracy}%
- 최근 7일 정답률: {accuracy_change['recent']}%
- 변화율: {accuracy_change['change_rate']}%
- 약점 키워드: {', '.join([kw['keyword_name'] for kw in weak_keywords]) if weak_keywords else '없음'}
- 최근 7일 학습 시간: {study_time['7d']}분
- 업로드 자료: {material_upload['7d']}개
- 성장/정체 신호: {growth_status}
- 상위 %: {percentile['percentile']:.1f}%

이 데이터를 바탕으로, 동기부여와 실질적 도움이 되는 피드백을 **2~3문장**으로,  
항상 완결된 문장으로 끝나게 작성해줘.
"""
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "너는 학습 코치야. 친절하고 동기부여를 주는 피드백을 해줘."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800,
        temperature=0.7
    )
    feedback = response['choices'][0]['message']['content']
    return feedback

# 학습하기탭/문제풀기탭 기간별 학습시간 집계 함수
# study: daily_study_time의 total_time, solve: question_attempts 시도수*5(분)로 가정

def get_study_time_by_tab(user_id: int, db: Session):
    periods = {
        "3d": "DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    }
    result = {}
    for key, date_cond in periods.items():
        # 학습하기탭: daily_study_time
        sql_study = text(f"""
            SELECT IFNULL(SUM(total_time), 0) FROM daily_study_time
            WHERE user_id = :user_id AND study_date >= {date_cond}
        """)
        study_time = db.execute(sql_study, {"user_id": user_id}).scalar() or 0
        # 문제풀기탭: question_attempts 시도수 * 5분(임의)
        sql_solve = text(f"""
            SELECT COUNT(*) FROM question_attempts
            WHERE user_id = :user_id AND attempt_date >= {date_cond}
        """)
        solve_count = db.execute(sql_solve, {"user_id": user_id}).scalar() or 0
        solve_time = solve_count * 5  # 1문제당 5분 가정
        result[key] = {"study": int(study_time), "solve": int(solve_time)}
    return result

def get_study_time_by_tab_period(user_id: int, period: str, db: Session):
    today = datetime.now().date()
    result = []
    if period == "3d":
        for i in range(2, -1, -1):  # 2,1,0
            day = today - timedelta(days=i)
            # 학습하기탭
            sql_study = text("""
                SELECT IFNULL(SUM(total_time), 0) FROM daily_study_time
                WHERE user_id = :user_id AND study_date = :day
            """)
            study_time = db.execute(sql_study, {"user_id": user_id, "day": day}).scalar() or 0
            # 문제풀기탭
            sql_solve = text("""
                SELECT COUNT(*) FROM question_attempts
                WHERE user_id = :user_id AND attempt_date = :day
            """)
            solve_count = db.execute(sql_solve, {"user_id": user_id, "day": day}).scalar() or 0
            solve_time = solve_count * 5
            result.append({
                "label": day.strftime("%m/%d"),
                "study": int(study_time),
                "solve": int(solve_time)
            })
    elif period == "7d":
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            # 학습하기탭
            sql_study = text("""
                SELECT IFNULL(SUM(total_time), 0) FROM daily_study_time
                WHERE user_id = :user_id AND study_date = :day
            """)
            study_time = db.execute(sql_study, {"user_id": user_id, "day": day}).scalar() or 0
            # 문제풀기탭
            sql_solve = text("""
                SELECT COUNT(*) FROM question_attempts
                WHERE user_id = :user_id AND attempt_date = :day
            """)
            solve_count = db.execute(sql_solve, {"user_id": user_id, "day": day}).scalar() or 0
            solve_time = solve_count * 5
            result.append({
                "label": day.strftime("%m/%d"),
                "study": int(study_time),
                "solve": int(solve_time)
            })
    elif period == "30d":
        # 4주로 나누기
        for week in range(4):
            start = today - timedelta(days=29 - week*7)
            end = start + timedelta(days=6)
            sql_study = text("""
                SELECT IFNULL(SUM(total_time), 0) FROM daily_study_time
                WHERE user_id = :user_id AND study_date BETWEEN :start AND :end
            """)
            study_time = db.execute(sql_study, {"user_id": user_id, "start": start, "end": end}).scalar() or 0
            sql_solve = text("""
                SELECT COUNT(*) FROM question_attempts
                WHERE user_id = :user_id AND attempt_date BETWEEN :start AND :end
            """)
            solve_count = db.execute(sql_solve, {"user_id": user_id, "start": start, "end": end}).scalar() or 0
            solve_time = solve_count * 5
            result.append({
                "label": f"{week+1}주",
                "study": int(study_time),
                "solve": int(solve_time)
            })
    return result

def get_period_accuracy(user_id: int, db: Session):
    periods = {
        "3d": "DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    }
    result = {}
    for key, date_cond in periods.items():
        sql_total = text(f"""
            SELECT COUNT(*) FROM question_attempts
            WHERE user_id = :user_id AND attempt_date >= {date_cond}
        """)
        sql_correct = text(f"""
            SELECT COUNT(*) FROM question_attempts
            WHERE user_id = :user_id AND attempt_date >= {date_cond} AND is_correct = 1
        """)
        total = db.execute(sql_total, {"user_id": user_id}).scalar() or 0
        correct = db.execute(sql_correct, {"user_id": user_id}).scalar() or 0
        accuracy = (correct / total * 100) if total > 0 else 0.0
        result[key] = {"accuracy": accuracy, "total": total, "correct": correct}
    return result

def get_learning_status(user_id: int, db: Session):
    # 1. 내가 업로드한 모든 강의자료 id, 이름, 진도율
    materials = db.execute(text("""
        SELECT material_id, material_name, progress
        FROM lecture_materials
        WHERE user_id = :user_id
    """), {"user_id": user_id}).fetchall()

    # 자료 개수 기준으로 집계 (사람 수 아님)
    status_count = {"학습 완료": 0, "학습 진행 중": 0, "미참여": 0}
    for m in materials:
        material_id, name, progress = m
        if progress == 0:
            status_count["미참여"] += 1
            continue
        # 문제풀이 시도 여부
        q_count = db.execute(text("""
            SELECT COUNT(*) FROM questions q
            JOIN question_attempts qa ON q.question_id = qa.question_id
            WHERE q.slide_id IN (SELECT slide_id FROM slides WHERE material_id = :mid)
              AND qa.user_id = :user_id
        """), {"mid": material_id, "user_id": user_id}).scalar() or 0
        # 전체 문제 수
        total_q = db.execute(text("""
            SELECT COUNT(*) FROM questions
            WHERE slide_id IN (SELECT slide_id FROM slides WHERE material_id = :mid)
        """), {"mid": material_id}).scalar() or 0
        if total_q > 0 and q_count >= total_q:
            status_count["학습 완료"] += 1
        else:
            status_count["학습 진행 중"] += 1
    # 반환값은 자료 개수 기준임을 명확히
    return status_count

def get_completion_rate_trend(user_id: int, period: str, db: Session):
    today = datetime.now().date()
    result = []
    if period == "3d":
        for i in range(2, -1, -1):
            day = today - timedelta(days=i)
            # 전체 강의자료 수
            total = db.execute(text("""
                SELECT COUNT(*) FROM lecture_materials WHERE user_id = :user_id
            """), {"user_id": user_id}).scalar() or 0
            # 완료 강의자료 수
            completed = db.execute(text("""
                SELECT COUNT(*) FROM lecture_materials WHERE user_id = :user_id AND progress >= 100 AND DATE(updated_at) = :day
            """), {"user_id": user_id, "day": day}).scalar() or 0
            percent = (completed / total * 100) if total > 0 else 0.0
            result.append(percent)
    elif period == "7d":
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            total = db.execute(text("""
                SELECT COUNT(*) FROM lecture_materials WHERE user_id = :user_id
            """), {"user_id": user_id}).scalar() or 0
            completed = db.execute(text("""
                SELECT COUNT(*) FROM lecture_materials WHERE user_id = :user_id AND progress >= 100 AND DATE(updated_at) = :day
            """), {"user_id": user_id, "day": day}).scalar() or 0
            percent = (completed / total * 100) if total > 0 else 0.0
            result.append(percent)
    elif period == "30d":
        # 4주 단위
        for week in range(4):
            start = today - timedelta(days=29 - week*7)
            end = start + timedelta(days=6)
            total = db.execute(text("""
                SELECT COUNT(*) FROM lecture_materials WHERE user_id = :user_id
            """), {"user_id": user_id}).scalar() or 0
            completed = db.execute(text("""
                SELECT COUNT(*) FROM lecture_materials WHERE user_id = :user_id AND progress >= 100 AND DATE(updated_at) BETWEEN :start AND :end
            """), {"user_id": user_id, "start": start, "end": end}).scalar() or 0
            percent = (completed / total * 100) if total > 0 else 0.0
            result.append(percent)
    return result

# 유형별 평균 풀이 시간 (문제 1개당 5분=300초로 임의 계산)
def get_avg_time_by_type(user_id: int, period: str, db: Session):
    days = {"3d": 3, "7d": 7, "30d": 30}[period]
    sql = text(f"""
        SELECT q.question_type, COUNT(*) * 300 AS avg_time
        FROM question_attempts a
        JOIN questions q ON a.question_id = q.question_id
        WHERE a.user_id = :user_id
          AND a.attempt_date >= DATE_SUB(CURDATE(), INTERVAL {days} DAY)
        GROUP BY q.question_type
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchall()
    return [
        {"question_type": row[0], "avg_time": float(row[1]) if row[1] is not None else 0}
        for row in result
    ]

# 난이도별 정답률

def get_difficulty_stats(user_id: int, period: str, db: Session):
    days = {"3d": 3, "7d": 7, "30d": 30}[period]
    sql = text(f"""
        SELECT q.difficulty, SUM(a.is_correct) / NULLIF(COUNT(*), 0) * 100 AS accuracy
        FROM question_attempts a
        JOIN questions q ON a.question_id = q.question_id
        WHERE a.user_id = :user_id
          AND a.attempt_date >= DATE_SUB(CURDATE(), INTERVAL {days} DAY)
        GROUP BY q.difficulty
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchall()
    return [
        {"difficulty": row[0], "accuracy": float(row[1]) if row[1] is not None else 0}
        for row in result
    ]