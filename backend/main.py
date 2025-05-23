from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from user_api import router as user_router
from archive_api import router as archive_router
from gpt_generate import router as gpt_router
from quiz_api import router as quiz_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 🔐 Swagger에 Bearer Token Authorize 버튼 추가하는 설정
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="기출문제 자동 생성 API",
        version="1.0.0",
        description="강의 슬라이드 기반 기출 문제 생성/채점/복습 시스템",
        routes=app.routes,
    )

    # 🔒 인증 방식 정의
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    # 🔐 모든 경로에 기본 보안 적용 (선택)
    # for path in openapi_schema["paths"].values():
    #     for method in path.values():
    #         method.setdefault("security", [{"BearerAuth": []}])

    app.openapi_schema = openapi_schema
    return app.openapi_schema

# ✅ 보안 스키마 적용
app.openapi = custom_openapi

# 📦 API 라우터 등록
app.include_router(user_router)
app.include_router(archive_router)
app.include_router(gpt_router)
app.include_router(quiz_router)

# 👇 이 부분 추가!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["http://localhost:3001"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
