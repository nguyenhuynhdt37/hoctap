"""Chặn cấu hình lẫn môi trường (dev/test trỏ vào hạ tầng production và ngược lại).

Chạy một lần khi `settings` được tạo. Vi phạm "cứng" -> RuntimeError, backend không khởi động.
Vi phạm "mềm" (ví dụ PayPal sandbox ở production) -> chỉ cảnh báo.
"""

from __future__ import annotations

import logging
import re
from urllib.parse import urlparse

logger = logging.getLogger("maymay.env_guard")

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}
_SUFFIX = {"development": "_dev", "test": "_test"}
_BUCKET_SUFFIX = {"development": "-dev", "test": "-test"}


def _csv(value: str) -> set[str]:
    return {item.strip().lower() for item in (value or "").split(",") if item.strip()}


def _db_parts(url: str) -> tuple[str, str]:
    parsed = urlparse(url.replace("postgresql+asyncpg://", "postgresql://", 1))
    return (parsed.hostname or "").lower(), (parsed.path or "").lstrip("/")


def _host(url: str) -> str:
    return (urlparse(url).hostname or "").lower() if url else ""


def collect_problems(s) -> tuple[list[str], list[str]]:
    """Trả về (lỗi cứng, cảnh báo) cho một đối tượng settings."""
    errors: list[str] = []
    warnings: list[str] = []
    env = s.APP_ENV
    prod_db_hosts = _csv(s.PROD_DB_HOSTS)
    prod_web_hosts = _csv(s.PROD_PUBLIC_HOSTS)
    db_host, db_name = _db_parts(s.DATABASE_ASYNC_URL) if s.DATABASE_ASYNC_URL else ("", "")

    if env in _SUFFIX:
        if db_host and db_host in prod_db_hosts:
            errors.append(f"APP_ENV={env} nhưng DATABASE_ASYNC_URL trỏ tới máy chủ database production ({db_host}).")
        if db_name and not db_name.endswith(_SUFFIX[env]):
            errors.append(f"APP_ENV={env} yêu cầu tên database kết thúc bằng '{_SUFFIX[env]}', hiện là '{db_name}'.")
        if "api-m.paypal.com" in s.PAYPAL_BASE_URL and "sandbox" not in s.PAYPAL_BASE_URL:
            errors.append(f"APP_ENV={env} không được dùng PayPal live ({s.PAYPAL_BASE_URL}).")
        if s.STORAGE_PROVIDER == "r2" and s.R2_BUCKET_NAME and not s.R2_BUCKET_NAME.endswith(_BUCKET_SUFFIX[env]):
            errors.append(
                f"APP_ENV={env} yêu cầu bucket R2 kết thúc bằng '{_BUCKET_SUFFIX[env]}', hiện là '{s.R2_BUCKET_NAME}'."
            )
        for key in ("FRONTEND_URL", "BACKEND_URL", "PUBLIC_API_URL"):
            host = _host(getattr(s, key))
            if host and any(host == h or host.endswith("." + h) for h in prod_web_hosts):
                errors.append(f"APP_ENV={env} nhưng {key} trỏ tới domain production ({host}).")
    elif env == "production":
        if db_host in _LOCAL_HOSTS:
            errors.append(f"APP_ENV=production nhưng DATABASE_ASYNC_URL trỏ localhost ({db_host}).")
        if db_name.endswith(tuple(_SUFFIX.values())):
            errors.append(f"APP_ENV=production nhưng dùng database dev/test '{db_name}'.")
        if s.MAIL_SERVER.lower() in _LOCAL_HOSTS | {"mailpit"} or s.MAIL_PORT == 1025:
            errors.append("APP_ENV=production nhưng mail đang trỏ Mailpit/localhost.")
        if s.R2_BUCKET_NAME.endswith(tuple(_BUCKET_SUFFIX.values())):
            errors.append(f"APP_ENV=production nhưng dùng bucket dev/test '{s.R2_BUCKET_NAME}'.")
        for key in ("FRONTEND_URL", "BACKEND_URL", "PUBLIC_API_URL"):
            if _host(getattr(s, key)) in _LOCAL_HOSTS:
                errors.append(f"APP_ENV=production nhưng {key} trỏ localhost.")
        if _host(s.REDIS_URL) in _LOCAL_HOSTS and not _in_container():
            errors.append("APP_ENV=production nhưng REDIS_URL trỏ localhost ngoài Docker.")
        origins = _csv(s.CORS_ALLOWED_ORIGINS)
        if "*" in origins or any(_host(o) in _LOCAL_HOSTS for o in origins):
            errors.append("APP_ENV=production: CORS_ALLOWED_ORIGINS không được chứa '*' hay localhost.")
        secret = getattr(s, "JWT_SECRET", "") or ""
        if len(secret) < 32 or re.search(r"change[_-]?me|dev[_-]?only", secret, re.I):
            errors.append("APP_ENV=production: JWT_SECRET quá ngắn (<32 ký tự) hoặc là giá trị mẫu.")
        if "sandbox" in s.PAYPAL_BASE_URL:
            warnings.append("APP_ENV=production đang dùng PayPal sandbox; thanh toán thật sẽ không hoạt động.")
    return errors, warnings


def _in_container() -> bool:
    import os

    return os.path.exists("/.dockerenv") or bool(os.environ.get("KUBERNETES_SERVICE_HOST"))


def validate_environment(s) -> None:
    errors, warnings = collect_problems(s)
    for message in warnings:
        logger.warning("[env_guard] %s", message)
    if errors:
        detail = "\n  - ".join(errors)
        raise RuntimeError(
            f"Cấu hình môi trường '{s.APP_ENV}' không hợp lệ, từ chối khởi động:\n  - {detail}\n"
            "Xem docs/infra/environments.md để biết cách tách dev/test/production."
        )
