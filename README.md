이 프로젝트는 두 명이 각자 맡은 기능을 개발하여 통합한 대학생 학습 도우미 백엔드입니다.

- A: 로그인/회원가입/문제풀이 등 사용자/퀴즈 관련 기능 (FastAPI, quiz_api.py 등)
- B: 슬라이드 요약/강의자료 관리 등 PDF/AI 관련 기능 (Node.js, server.js 등)


## 주요 파일/폴더 및 담당자

| 파일/폴더/기능         | 담당자 | 설명 |
|------------------------|--------|------|
| `main.py`, `quiz_api.py`, `user_api.py` | A | FastAPI 기반 사용자/문제 API |
| `server.js`, `summarizeWithGPT.js`      | B | Node.js 기반 슬라이드 요약/강의자료 API |
| `create_database.sql`                   | 통합 | 최종 DB 스키마 (통합 필요) |

** A 
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

** B 

- PDF 강의 자료를 업로드하고, OCR을 통해 텍스트를 추출한 후 GPT를 활용하여 요약 및 문제를 생성하는 기능을 제공합니다.


## 주요 기능
- PDF 강의 자료 업로드 및 관리
- OCR을 통한 텍스트 추출
- GPT를 활용한 슬라이드 요약 및 문제 생성
- 학습 진도 및 강도(intensity) 추적
- 사용자별 약점 키워드 분석


## 기술 스택
- Node.js
- Express.js
- MariaDB
- JWT 인증
- OpenAI GPT API
- Tesseract.js (OCR)
- PDF.js


## 설치 방법

1. 저장소 클론
```bash
git clone [repository-url]
cd backend
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정 -> 중요 중요 
`.env.example` 파일을 `.env`로 복사하고 필요한 값들을 설정합니다:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=1234
DB_NAME=study_platform
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-api-key
```

4. 데이터베이스 설정
```bash
mysql -u root -p < create_database.sql
```

5. 서버 실행
```bash
npm start
```

## API 엔드포인트
### 인증
- POST `/api/register` - 회원가입
- POST `/api/login` - 로그인
- GET `/api/profile` - 사용자 정보 조회

### 강의 자료
- POST `/api/upload` - PDF 업로드
- GET `/archive/list` - 업로드된 자료 목록
- GET `/archive/:lecture_id` - 특정 자료의 슬라이드 요약
- POST `/archive/:lecture_id/slide/:slide_number/summary` - 슬라이드 요약 생성
- POST `/archive/:lecture_id/summary` - 전체 자료 요약

### 학습 관리
- POST `/api/study-time` - 학습 시간 기록
- GET `/api/study-intensity/today` - 오늘의 학습 강도
- GET `/api/study-intensity/month` - 이번 달 학습 강도


## 프로젝트 구조
backend/
├── node_modules/        # 의존성 모듈
├── uploads/            # 업로드된 PDF 파일
├── server.js           # 메인 서버 파일
├── summarizeWithGPT.js # GPT 관련 기능
├── create_database.sql # 데이터베이스 스키마
├── package.json        # 프로젝트 의존성
└── .env               # 환경 변수
```


## 주의사항

- `public` 디렉토리는 프론트엔드와 연결하기 전 테스트를 위해 만든 정적 HTML 파일입니다.
- ⚠️ 주의: create_database.sql 파일을 실행하면 기존 study_platform 데이터베이스가 완전히 삭제되고 새로 생성됩니다.
> 운영 환경에서는 절대 실행하지 마세요!
- `server.js`에서 모든 API를 관리하고 있으며, 향후 확장성을 위해 분할할 예정입니다.

## 데이터베이스 초기화 및 재설정 방법

1. **기존 데이터베이스 삭제**
   - MariaDB/MySQL에 접속 후 아래 명령어 실행:
     ```sql
     DROP DATABASE IF EXISTS study_platform;
     ```

2. **최신 데이터베이스 스키마로 재생성**
   - 터미널(명령 프롬프트)에서 아래 명령어 실행:
     ```bash
     mysql -u root -p < create_database.sql
     ```
   - (비밀번호 입력 후 자동으로 study_platform 데이터베이스와 모든 테이블이 생성됩니다.)

3. **.env 파일 설정**
   - DB 정보가 아래와 같아야 합니다:
     ```
     DB_USER=root
     DB_PASSWORD=1234
     DB_HOST=localhost
     DB_PORT=3306
     DB_NAME=study_platform
     ```

4. **서버 재시작**
   - Node.js, FastAPI 등 모든 서버를 재시작하세요.

---

**⚠️ 주의:**  
이 작업을 하면 기존 데이터베이스의 모든 데이터가 삭제됩니다.  
중요한 데이터가 있다면 백업 후 진행하세요!

# 05/23 - 백엔드 합치면서 변경점 
1. 데이터베이스 연결 설정 env로 관리 
가상환경에서 아래 명령어 실행 
 pip install python-dotenv 

 