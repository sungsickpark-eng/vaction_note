from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import get_settings
from app.api import auth, trips, waypoints, memos, photos, maps, recommend, ai_chat, premium

settings = get_settings()

app = FastAPI(
    title="여행 일지 다이어리 API",
    description="구글 지도 기반 여행 계획 및 기록 서비스",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 로컬 정적 파일 (사진 업로드 - 개발용)
os.makedirs("static/photos", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(waypoints.router)
app.include_router(memos.router)
app.include_router(photos.router)
app.include_router(maps.router)
app.include_router(recommend.router)
app.include_router(ai_chat.router)
app.include_router(premium.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
