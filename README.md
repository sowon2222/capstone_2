
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