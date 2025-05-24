-- =========================
-- 리포트용 주요 쿼리 모음
-- =========================

-- 1. 내 전체 정답률
SELECT 
  SUM(is_correct) / COUNT(*) * 100 AS accuracy
FROM question_attempts
WHERE user_id = :user_id;

-- 2. 전체 사용자별 정답률, 평균, 표준편차
SELECT 
  AVG(user_acc) AS avg_accuracy,
  STDDEV(user_acc) AS stddev_accuracy
FROM (
  SELECT user_id, SUM(is_correct) / COUNT(*) * 100 AS user_acc
  FROM question_attempts
  GROUP BY user_id
) t;

-- 3. 내 정답률 상위 %
-- (내 정답률보다 낮은 사용자 수 / 전체 사용자 수) * 100
SELECT 
  COUNT(*) AS lower_count
FROM (
  SELECT user_id, SUM(is_correct) / COUNT(*) * 100 AS user_acc
  FROM question_attempts
  GROUP BY user_id
) t
WHERE user_acc < :my_accuracy;

SELECT COUNT(DISTINCT user_id) FROM question_attempts;

-- 4. 문제 유형별 정답률/시도수
SELECT 
  q.question_type,
  COUNT(*) AS attempts,
  SUM(a.is_correct) AS corrects,
  SUM(a.is_correct) / COUNT(*) * 100 AS accuracy
FROM question_attempts a
JOIN questions q ON a.question_id = q.question_id
WHERE a.user_id = :user_id
GROUP BY q.question_type;

-- 5. 일별 정답률 (최근 7일)
SELECT 
  attempt_date,
  SUM(is_correct) / COUNT(*) * 100 AS accuracy
FROM question_attempts
WHERE user_id = :user_id
  AND attempt_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY attempt_date
ORDER BY attempt_date;

-- 6. 유형별 일별 정답률 (최근 7일)
SELECT 
  q.question_type,
  a.attempt_date,
  SUM(a.is_correct) / COUNT(*) * 100 AS accuracy
FROM question_attempts a
JOIN questions q ON a.question_id = q.question_id
WHERE a.user_id = :user_id
  AND a.attempt_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY q.question_type, a.attempt_date
ORDER BY q.question_type, a.attempt_date;

-- 7. 자주 틀리는 키워드 (최근 30일)
SELECT 
  k.keyword_name,
  COUNT(*) AS wrong_count
FROM weak_keyword_logs w
JOIN keywords k ON w.keyword_id = k.keyword_id
WHERE w.user_id = :user_id
  AND w.is_incorrect = 1
  AND w.occurred_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY k.keyword_name
ORDER BY wrong_count DESC
LIMIT 5;

-- 8. 최근 1주 학습일수 (목표: 주 5회)
SELECT COUNT(DISTINCT attempt_date) AS study_days
FROM question_attempts
WHERE user_id = :user_id
  AND attempt_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

-- 9. 최근 1주 평균 정답률 (목표: 80%)
SELECT SUM(is_correct) / COUNT(*) * 100 AS accuracy
FROM question_attempts
WHERE user_id = :user_id
  AND attempt_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

-- 10. 최근 7일 정답률 변화
SELECT 
  (SELECT SUM(is_correct) / COUNT(*) * 100
   FROM question_attempts
   WHERE user_id = :user_id
     AND attempt_date BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()
  ) -
  (SELECT SUM(is_correct) / COUNT(*) * 100
   FROM question_attempts
   WHERE user_id = :user_id
     AND attempt_date BETWEEN CURDATE() - INTERVAL 14 DAY AND CURDATE() - INTERVAL 8 DAY
  ) AS accuracy_change;

-- 11. 최근 7일 학습 시간
SELECT SUM(total_time) AS total_time
FROM daily_study_time
WHERE user_id = :user_id
  AND study_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

-- 12. 최근 10일간 정답률 증감폭
SELECT 
  MAX(daily_acc) - MIN(daily_acc) AS acc_diff
FROM (
  SELECT attempt_date, SUM(is_correct) / COUNT(*) * 100 AS daily_acc
  FROM question_attempts
  WHERE user_id = :user_id
    AND attempt_date >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)
  GROUP BY attempt_date
) t;

-- (필요시 추가 쿼리 계속 작성)
