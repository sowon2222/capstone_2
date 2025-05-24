from sqlalchemy.orm import Session
from sqlalchemy import text
import statistics
import json
import os
import openai
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# 1. 내 전체 정답률
def get_user_accuracy(user_id: int, db: Session):
    sql = text("""
    SELECT SUM(is_correct) / COUNT(*) * 100 AS accuracy
    FROM question_attempts
    WHERE user_id = :user_id
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchone()
    return result[0] if result and result[0] is not None else 0.0

# 2. 문제 유형별 정답률/시도수
def get_category_stats(user_id: int, db: Session):
    sql = text("""
    SELECT q.question_type, COUNT(*) AS attempts, SUM(a.is_correct) AS corrects,
           SUM(a.is_correct) / COUNT(*) * 100 AS accuracy
    FROM question_attempts a
    JOIN questions q ON a.question_id = q.question_id
    WHERE a.user_id = :user_id
    GROUP BY q.question_type
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchall()
    return [
        {
            "question_type": row[0],
            "attempts": row[1],
            "corrects": row[2],
            "accuracy": float(row[3]) if row[3] is not None else 0.0
        }
        for row in result
    ]

# 3. 자주 틀리는 키워드 (최근 30일)
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
    LIMIT 5;
    """)
    result = db.execute(sql, {"user_id": user_id}).fetchall()
    return [
        {"keyword_name": row[0], "wrong_count": row[1]} for row in result
    ]

# 4. 학습 시간 집계 함수
def get_study_time_summary(user_id: int, db: Session):
    periods = {
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
        "all": "'1000-01-01'"
    }
    result = {}
    for key, date_cond in periods.items():
        sql = text(f"""
            SELECT SUM(total_time) FROM daily_study_time
            WHERE user_id = :user_id AND study_date >= {date_cond}
        """)
        value = db.execute(sql, {"user_id": user_id}).scalar()
        result[key] = int(value) if value is not None else 0
    return result

# 5. 강의자료 업로드/학습량 집계 함수
def get_material_upload_count(user_id: int, db: Session):
    periods = {
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
        "all": "'1000-01-01'"
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

# 6. 학습 진행도 변화 함수
def get_study_progress_change(user_id: int, db: Session):
    periods = {
        "7d": "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
        "30d": "DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
        "all": "'1000-01-01'"
    }
    result = {}
    for key, date_cond in periods.items():
        sql = text(f"""
            SELECT SUM(progress_delta) FROM study_progress_log
            WHERE user_id = :user_id AND study_date >= {date_cond}
        """)
        value = db.execute(sql, {"user_id": user_id}).scalar()
        result[key] = float(value) if value is not None else 0.0
    return result

# 7. 상위 % 계산 함수
def get_user_percentile(user_id: int, db: Session):
    # 1. 내 정답률
    sql_my = text("""
        SELECT SUM(is_correct) / COUNT(*) * 100 AS accuracy
        FROM question_attempts
        WHERE user_id = :user_id
    """)
    my_acc = db.execute(sql_my, {"user_id": user_id}).scalar() or 0.0

    # 2. 전체 사용자별 정답률
    sql_all = text("""
        SELECT user_id, SUM(is_correct) / COUNT(*) * 100 AS user_acc
        FROM question_attempts
        GROUP BY user_id
    """)
    all_acc = [row[1] for row in db.execute(sql_all).fetchall()]
    if not all_acc:
        return {"my_accuracy": my_acc, "percentile": 0, "average": 0, "stddev": 0}

    # 3. 평균, 표준편차
    avg = statistics.mean(all_acc)
    stddev = statistics.stdev(all_acc) if len(all_acc) > 1 else 0

    # 4. 상위 %
    lower_count = sum(1 for acc in all_acc if acc < my_acc)
    percentile = (lower_count / len(all_acc)) * 100

    return {
        "my_accuracy": my_acc,
        "percentile": percentile,
        "average": avg,
        "stddev": stddev
    }

def get_accuracy_change_rate(user_id: int, db: Session, days: int = 7):
    # 최근 days일
    sql_recent = text(f"""
        SELECT SUM(is_correct) / COUNT(*) * 100
        FROM question_attempts
        WHERE user_id = :user_id
          AND attempt_date BETWEEN DATE_SUB(CURDATE(), INTERVAL {days} DAY) AND CURDATE()
    """)
    recent = db.execute(sql_recent, {"user_id": user_id}).scalar() or 0.0

    # 그 전 days일
    sql_prev = text(f"""
        SELECT SUM(is_correct) / COUNT(*) * 100
        FROM question_attempts
        WHERE user_id = :user_id
          AND attempt_date BETWEEN DATE_SUB(CURDATE(), INTERVAL {days*2} DAY) AND DATE_SUB(CURDATE(), INTERVAL {days+1} DAY)
    """)
    prev = db.execute(sql_prev, {"user_id": user_id}).scalar() or 0.0

    if prev == 0:
        change_rate = None  # 변화율 계산 불가(분모 0)
    else:
        change_rate = ((recent - prev) / prev) * 100
    return {
        "recent": recent,
        "prev": prev,
        "change_rate": change_rate
    }

def get_llm_feedback(user_id: int, db: Session):
    # 리포트 데이터 집계
    accuracy = get_user_accuracy(user_id, db)
    accuracy_change = get_accuracy_change_rate(user_id, db)
    weak_keywords = get_weak_keywords(user_id, db)
    study_time = get_study_time_summary(user_id, db)
    material_upload = get_material_upload_count(user_id, db)
    category_stats = get_category_stats(user_id, db)
    percentile = get_user_percentile(user_id, db)
    # 성장/정체 신호 예시(간단판단)
    growth_status = "성장 중" if accuracy_change["change_rate"] and accuracy_change["change_rate"] > 5 else ("정체 중" if accuracy_change["change_rate"] and abs(accuracy_change["change_rate"]) < 1 else "정체/감소")

    # 프롬프트 설계
    prompt = f"""
아래는 한 사용자의 최근 학습 리포트 데이터입니다. 이 사용자가 학습을 매우 잘하고(진도율, 정답률, 변화율, 상위 %, 목표 달성 등 모든 방면이 뛰어난 경우)에는 진심 어린 칭찬과 함께, 더 발전할 수 있는 구체적 방법(예: 심화문제 도전, 새로운 유형 학습, 동료와 토론 등)도 꼭 제안해줘.

- 전체 정답률: {accuracy}%
- 최근 7일 정답률: {accuracy_change['recent']}%
- 그 전 7일 정답률: {accuracy_change['prev']}%
- 변화율: {accuracy_change['change_rate']}%
- 약점 키워드: {', '.join([kw['keyword_name'] for kw in weak_keywords]) if weak_keywords else '없음'}
- 최근 7일 학습 시간: {study_time['7d']}분
- 최근 업로드 자료: {material_upload['7d']}개
- 성장/정체 신호: {growth_status}
- 유형별 정답률: {json.dumps(category_stats, ensure_ascii=False)}
- 상위 %: {percentile['percentile']:.1f}% (전체 평균: {percentile['average']:.1f}%, 표준편차: {percentile['stddev']:.1f}%)

이 사용자의 학습 효과를 높이고, 동기부여를 줄 수 있는
전문가 수준의 피드백과 맞춤형 학습 추천을 2~3문장으로 작성해줘.
"""

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "너는 학습 코치야. 친절하고 동기부여를 주는 피드백을 해줘."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=300,
        temperature=0.7
    )
    feedback = response['choices'][0]['message']['content']
    return feedback