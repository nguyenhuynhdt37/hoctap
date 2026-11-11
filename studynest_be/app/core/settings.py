# app/core/settings.py
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""
    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: int = 5432
    DATABASE_ASYNC_URL: str = ""

    # google key
    GOOGLE_API_KEY: str = ""

    # Chat provider: gemini or 9router (OpenAI-compatible API)
    LLM_PROVIDER: str = "gemini"
    NINEROUTER_BASE_URL: str = "https://9router.itup.io.vn/v1"
    NINEROUTER_API_KEY: str = ""
    NINEROUTER_MODEL: str = "gemini"
    NINEROUTER_AUTO_MODEL: str = "mixed"
    NINEROUTER_TIMEOUT_SECONDS: float = 120.0
    NINEROUTER_STREAM: bool = True
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 1536

    # Upload storage: R2 only.
    STORAGE_PROVIDER: Literal["r2"] = "r2"
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_SIGNED_URL_TTL_SECONDS: int = 300
    R2_CA_BUNDLE: str = ""
    R2_CACHE_DIRECTORY: str = str(Path(__file__).resolve().parents[2] / ".cache" / "r2")
    STORAGE_MAX_UPLOAD_BYTES: int = 2 * 1024 * 1024 * 1024

    # JWT
    SECRET_KEY: str = ""
    JWT_SECRET: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    # Mail
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = ""
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False

    TENANT_ID: str = ""
    CLIENT_ID: str = ""
    CLIENT_SECRET: str = ""
    GRAPH_BASE: str = ""

    GOOGLE_API_KEY_CHAT: str = ""
    GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE: str = ""
    GOOGLE_API_SECRET_ID_LOGIN_GOOGLE: str = ""

    HF_TOKEN: str = ""

    PISTON_URL: str = ""

    # PayPal
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = ""
    # PAYPAL_WEBHOOK_ID: str = ""

    FRONTEND_URL: str = ""
    BACKEND_URL: str = ""

    # Redis / realtime presence
    REDIS_URL: str = "redis://localhost:6379/0"
    PRESENCE_TTL_SECONDS: int = 90

    class Config:
        env_file = str(Path(__file__).resolve().parents[2] / ".env")
        extra = "ignore"  # tránh crash nếu .env có key dư


settings = Settings()
