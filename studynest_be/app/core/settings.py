# app/core/settings.py
import os
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


_BASE_DIR = Path(__file__).resolve().parents[2]
_APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()


def _env_files() -> tuple[str, ...]:
    """Mỗi môi trường chỉ đọc đúng file `.env.<APP_ENV>`, không trộn với môi trường khác.

    `.env` cũ chỉ còn là fallback cho development khi chưa tạo `.env.development`.
    """
    specific = _BASE_DIR / f".env.{_APP_ENV}"
    if specific.exists():
        return (str(specific),)
    if _APP_ENV == "development" and (_BASE_DIR / ".env").exists():
        return (str(_BASE_DIR / ".env"),)
    return ()


class Settings(BaseSettings):
    # Môi trường chạy: development | test | production (kiểm tra chéo trong env_guard)
    APP_ENV: Literal["development", "test", "production"] = "development"
    # Hạ tầng thật mà dev/test tuyệt đối không được trỏ tới.
    PROD_DB_HOSTS: str = "psql-maymay.itup.io.vn,100.122.190.92"
    PROD_PUBLIC_HOSTS: str = "may-may.tech"

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
    # Optional server-side route for interactive tutoring. Empty follows admin selection.
    TUTOR_CHAT_MODEL: str = ""
    TUTOR_TRANSCRIBE_PROVIDER: Literal["gemini", "9router"] = "gemini"
    TUTOR_DICTATION_ENABLED: bool = True
    TUTOR_DICTATION_MODEL: str = "qwen3-asr-flash-realtime"
    TUTOR_DICTATION_MAX_SECONDS: int = 120
    TUTOR_TRANSCRIBE_MODEL: str = "gemini-3.1-flash-lite"
    DASHSCOPE_API_KEY: str = ""
    DASHSCOPE_WS_URL: str = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime"
    DASHSCOPE_COMPATIBLE_BASE_URL: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    DASHSCOPE_CHAT_MODEL: str = "qwen3.8-omni-flash"
    TUTOR_VOICE_ENABLED: bool = True
    TUTOR_VOICE_MODEL: str = "qwen3.8-omni-flash-realtime"
    TUTOR_VOICE_NAME: str = "Tina"
    TUTOR_VOICE_MAX_SECONDS: int = 600
    TUTOR_VOICE_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 1536

    # Additive agent harness. Enable after migrations and release checks.
    AGENT_CONTEXT_PROVIDER: str = ""
    AGENT_CONTEXT_MODEL: str = ""
    AGENT_CONTEXT_TIMEOUT_SECONDS: float = 30
    AGENT_CONTEXT_THRESHOLD_CHARS: int = 10000  # Legacy compatibility; not an automatic trigger.
    AGENT_CONTEXT_WINDOWS_JSON: str = "{}"
    AGENT_SEMANTIC_MEMORY_ENABLED: bool = True
    AGENT_MEMORY_TIMEOUT_SECONDS: float = 12
    AGENT_ENABLED: bool = False
    AGENT_MODEL: str = ""
    AGENT_VISION_PROVIDER: str = "gemini"
    AGENT_VISION_MODEL: str = "gemini-3.1-flash-lite"
    AGENT_RUN_MAX_SECONDS: int = 1800
    AGENT_MODEL_TIMEOUT_SECONDS: float = 90
    AGENT_MAX_TOOL_CALLS: int = 0  # không dùng: agent không giới hạn số lần gọi tool
    AGENT_MAX_RUNS_PER_MINUTE: int = 20
    AGENT_MAX_SESSIONS_PER_HOUR: int = 60
    AGENT_MAX_ITERATIONS: int = 0  # không dùng: agent không giới hạn số vòng lặp
    AGENT_MAX_INPUT_TOKENS: int = 8000000
    AGENT_MAX_OUTPUT_TOKENS_TOTAL: int = 100_000_000
    AGENT_MAX_RUN_COST_USD: float | None = None
    AGENT_MODEL_PRICES_JSON: str = "{}"
    AGENT_EVENT_RETENTION_DAYS: int = 30
    AGENT_MCP_ENABLED: bool = True
    MISSION_COUPON_REWARDS_ENABLED: bool = False
    LEVEL_COUPON_REWARDS_ENABLED: bool = False

    CODE_MAX_RUNS_PER_MINUTE: int = 6
    CODE_MAX_SECONDS: int = 90

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

    GITHUB_OAUTH_CLIENT_ID: str = ""
    GITHUB_OAUTH_CLIENT_SECRET: str = ""
    GITHUB_OAUTH_REDIRECT_URI: str = ""

    # JWT
    SECRET_KEY: str = ""
    JWT_SECRET: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10
    AUTH_ALLOW_COOKIE_COMPAT: bool = True
    AUTH_ALLOW_UNBOUND_BEARER: bool = True
    AUTH_INTERNAL_REFRESH_SECRET: str = Field(default="", repr=False)
    PUBLIC_API_URL: str = ""
    # Set only when the upstream ASGI path omits the public prefix.
    DPOP_STRIPPED_PUBLIC_PATH_PREFIX: str = Field(default="", pattern=r"^(?:/[A-Za-z0-9_-]+)*$")
    DPOP_IAT_LEEWAY_SECONDS: int = Field(default=60, gt=0)
    DPOP_JTI_TTL_SECONDS: int = Field(default=120, gt=0)
    DPOP_JTI_FAIL_OPEN_ON_GET: bool = False
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
    PISTON_API_KEY: str = ""

    # PayPal
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = ""
    # Địa chỉ quay về của "Log in with PayPal"; để trống thì dùng BACKEND_URL + /api/v1/lecturer/payout/callback.
    PAYPAL_REDIRECT_URI: str = ""
    # PAYPAL_WEBHOOK_ID: str = ""

    CORS_ALLOWED_ORIGINS: str = ""
    FRONTEND_URL: str = ""
    BACKEND_URL: str = ""

    # Redis / realtime presence
    REDIS_URL: str = "redis://localhost:6379/0"
    PRESENCE_TTL_SECONDS: int = 90

    class Config:
        env_file = _env_files()
        extra = "ignore"  # tránh crash nếu .env có key dư


settings = Settings()

from app.core.env_guard import validate_environment  # noqa: E402

validate_environment(settings)
