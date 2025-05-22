# Study Platform Backend
학습 플랫폼의 백엔드 서버입니다. PDF 강의 자료를 업로드하고, OCR을 통해 텍스트를 추출한 후 GPT를 활용하여 요약 및 문제를 생성하는 기능을 제공합니다.


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

3. 환경 변수 설정
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
```
backend/
├── node_modules/        # 의존성 모듈
├── uploads/            # 업로드된 PDF 파일
├── server.js           # 메인 서버 파일
├── summarizeWithGPT.js # GPT 관련 기능
├── create_database.sql # 데이터베이스 스키마
├── package.json        # 프로젝트 의존성
└── .env               # 환경 변수
```

## 개발 가이드
### 코드 스타일
- ESLint를 사용한 코드 스타일 검사
- Prettier를 사용한 코드 포맷팅

## 라이선스

MIT License

## 주의사항

- `public` 디렉토리는 프론트엔드와 연결하기 전 테스트를 위해 만든 정적 HTML 파일입니다.
- `create_database.sql`을 실행하여 데이터베이스를 만들 수 있습니다. (데이터베이스는 수정이 필요할 수 있습니다.)
- `server.js`에서 모든 API를 관리하고 있으며, 향후 확장성을 위해 분할할 예정입니다.

# Archives
*.zip
*.rar
*.7z

 