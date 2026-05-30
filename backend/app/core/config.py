from pydantic_settings import BaseSettings
from functools import lru_cache
import os


def _make_async_url(url: str) -> str:
    """Render가 제공하는 'postgresql://' URL을 asyncpg용으로 변환."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def _make_sync_url(url: str) -> str:
    """Alembic용 동기 URL 변환."""
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Settings(BaseSettings):
    # Render는 DATABASE_URL 하나만 제공하므로 선택적으로 받음
    DATABASE_URL: str = ""
    DATABASE_URL_SYNC: str = ""

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8003/api/auth/google/callback"

    KAKAO_REST_API_KEY: str = ""

    REDIS_URL: str = ""

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "travel-diary-photos"
    AWS_S3_REGION: str = "ap-northeast-2"

    FRONTEND_URL: str = "http://localhost:3003"
    APP_ENV: str = "development"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

    def get_async_db_url(self) -> str:
        """비동기 DB URL 반환 (asyncpg / aiomysql)."""
        if self.DATABASE_URL:
            return _make_async_url(self.DATABASE_URL)
        return ""

    def get_sync_db_url(self) -> str:
        """동기 DB URL 반환 (Alembic용)."""
        if self.DATABASE_URL_SYNC:
            return _make_sync_url(self.DATABASE_URL_SYNC)
        if self.DATABASE_URL:
            return _make_sync_url(self.DATABASE_URL)
        return ""


@lru_cache()
def get_settings() -> Settings:
    return Settings()
