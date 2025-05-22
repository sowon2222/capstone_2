## 주요 파일/폴더 설명

| 파일명              | 설명                                      |
|---------------------|-------------------------------------------|
| `main.py`           | FastAPI 앱 실행 및 라우터 등록             |
| `quiz_api.py`       | 퀴즈(문제 생성/채점/오답/약점) 관련 API   |
| `gpt_generate.py`   | GPT 기반 문제 생성/약점 기반 문제 생성 API|
| `archive_api.py`    | 강의자료/슬라이드/문제-해설 아카이브 API  |
| `user_api.py`       | 회원가입/로그인 등 사용자 인증 API         |
| `models.py`         | SQLAlchemy ORM 모델 정의                  |
| `database.py`       | DB 연결 및 세션 관리                      |
| `schemas.py`        | Pydantic 데이터 모델                      |
| `auth.py`           | JWT 인증/토큰 관련 함수                   |
| `캡스톤db_1.txt`    | MariaDB 테이블/뷰 생성 SQL 예시           |

---

## 주요 API 엔드포인트

| 경로                      | 메서드 | 설명                       |
|---------------------------|--------|----------------------------|
| `/quiz/generate`          | POST   | 슬라이드 기반 문제 생성(GPT) |
| `/quiz/weak-generate`     | POST   | 약점 키워드 기반 문제 생성   |
| `/quiz/submit`            | POST   | 문제 제출/채점/오답 기록     |
| `/quiz/weak-review`       | GET    | 약점 키워드 복습(오답노트)   |
| `/quiz/wrong-notes`       | GET    | 오답노트 전체 조회           |
| `/quiz/my-attempts`       | GET    | 내 풀이 기록                 |
| `/quiz/register`          | POST   | 문제 직접 등록               |
| `/quiz/all`               | GET    | 전체 문제 목록               |
| `/register`               | POST   | 회원가입                     |
| `/login`                  | POST   | 로그인                       |
| `/archive/{lecture_id}`   | GET    | 강의자료별 슬라이드/문제/해설|
| `/archives`               | GET    | 내 강의자료 목록             |

---

jwt 토큰 아직 수정 중....

## 🗄️ 최신 DB 테이블 구조

### 1. users
| 컬럼명    | 타입           | 설명         |
|-----------|----------------|--------------|
| user_id   | int, PK, AI    | 사용자 ID    |
| username  | varchar(255)   | 사용자명(고유)|
| password  | varchar(255)   | 비밀번호 해시|

---

### 2. questions
| 컬럼명        | 타입                                         | 설명                |
|---------------|----------------------------------------------|---------------------|
| question_id   | int, PK, AI                                 | 문제 ID             |
| slide_id      | int, FK                                     | 소속 슬라이드 ID    |
| keyword_id    | int, FK, NULL 허용                          | 주요 키워드 ID      |
| question_type | enum('객관식','주관식','참거짓','빈칸채우기')| 문제 유형           |
| content       | text                                        | 문제 내용           |
| answer        | text                                        | 정답                |
| explanation   | text, NULL 허용                             | 해설                |
| difficulty    | varchar(10)                                 | 난이도(상/중/하)    |

---

### 3. weak_keyword_logs
| 컬럼명      | 타입        | 설명                |
|-------------|------------|---------------------|
| log_id      | int, PK, AI| 오답 로그 ID        |
| user_id     | int, FK    | 사용자 ID           |
| question_id | int, FK    | 문제 ID             |
| keyword_id  | int, FK    | 키워드 ID           |
| is_incorrect| tinyint(1) | 오답 여부           |
| occurred_at | timestamp  | 기록 시각           |

---

### 4. keywords
| 컬럼명      | 타입           | 설명         |
|-------------|----------------|--------------|
| keyword_id  | int, PK, AI    | 키워드 ID    |
| keyword_name| varchar(255)   | 키워드명(고유)|

---

### 5. slides
| 컬럼명      | 타입        | 설명           |
|-------------|-------------|----------------|
| slide_id    | int, PK, AI | 슬라이드 ID    |
| material_id | int, FK     | 강의자료 ID    |
| slide_number| int         | 슬라이드 번호  |
| summary     | text        | 슬라이드 요약  |

---

### 6. lecture_materials
| 컬럼명      | 타입           | 설명           |
|-------------|----------------|----------------|
| material_id | int, PK, AI    | 강의자료 ID    |
| user_id     | int, FK        | 사용자 ID      |
| material_name| varchar(255)  | 강의자료명(고유)|
| progress    | float          | 진도율         |
| page        | int            | 현재 페이지    |

---

### 7. question_attempts
| 컬럼명      | 타입        | 설명           |
|-------------|-------------|----------------|
| attempt_id  | int, PK, AI | 풀이 기록 ID   |
| user_id     | int, FK     | 사용자 ID      |
| question_id | int, FK     | 문제 ID        |
| is_correct  | tinyint(1)  | 정답 여부      |
| answer      | text, NULL 허용 | 사용자의 답변 |

---

### 8. question_keywords
| 컬럼명      | 타입        | 설명           |
|-------------|-------------|----------------|
| question_id | int, PK     | 문제 ID        |
| keyword_id  | int, PK     | 키워드 ID      |

---

### 9. progress
| 컬럼명      | 타입        | 설명           |
|-------------|-------------|----------------|
| progress_id | int, PK, AI | 진도 ID        |
| user_id     | int, FK     | 사용자 ID      |
| material_id | int, FK     | 강의자료 ID    |
| slide_id    | int, FK     | 슬라이드 ID    |
| date        | timestamp   | 기록 시각      |

---

### 10. daily_study_time
| 컬럼명      | 타입        | 설명           |
|-------------|-------------|----------------|
| study_date  | date, PK    | 날짜           |
| user_id     | int, PK     | 사용자 ID      |
| total_time  | int         | 총 학습 시간(분)|

---

### 11. weak_weak_keyword_stats (VIEW)
| 컬럼명         | 타입        | 설명                |
|----------------|-------------|---------------------|
| user_id        | int         | 사용자 ID           |
| keyword_id     | int         | 키워드 ID           |
| incorrect_count| bigint      | 오답 횟수           |

---

> AI: auto_increment, PK: Primary Key, FK: Foreign Key
> 각 테이블의 외래키 제약조건, 인덱스 등은 캡스톤db_1.txt 참고