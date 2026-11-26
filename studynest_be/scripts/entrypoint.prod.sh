#!/usr/bin/env bash
set -euo pipefail

# Tự động chuẩn hóa DATABASE_ASYNC_URL sang host/port nội bộ Docker (postgres:5432)
# nếu đang chạy trong container mà .env đang trỏ 127.0.0.1 / localhost
if [ -n "${DATABASE_ASYNC_URL:-}" ] && [ -n "${POSTGRES_HOST:-}" ]; then
  DATABASE_ASYNC_URL="$(python - <<'PY'
import os
from urllib.parse import urlparse, urlunparse

raw = os.environ["DATABASE_ASYNC_URL"]
target_host = os.environ["POSTGRES_HOST"]
target_port = os.environ.get("POSTGRES_PORT", "5432")
u = urlparse(raw)
if u.hostname in ("127.0.0.1", "localhost"):
    auth = ""
    if u.username:
        auth = u.username + (f":{u.password}" if u.password is not None else "") + "@"
    new_netloc = f"{auth}{target_host}:{target_port}"
    print(urlunparse((u.scheme, new_netloc, u.path, u.params, u.query, u.fragment)))
else:
    print(raw)
PY
)"
  export DATABASE_ASYNC_URL
fi

echo "[Mây Mây Backend] Đang kiểm tra kết nối PostgreSQL..."
python - <<'PY'
import asyncio, os, sys
from urllib.parse import urlparse
import asyncpg

async def wait_pg():
    dsn = os.getenv("DATABASE_ASYNC_URL", "")
    if dsn:
        u = urlparse(dsn.replace("postgresql+asyncpg://", "postgresql://"))
        host = u.hostname or os.getenv("POSTGRES_HOST", "postgres")
        port = u.port or int(os.getenv("POSTGRES_PORT", "5432"))
        user = u.username or os.getenv("POSTGRES_USER", "postgres")
        password = u.password if u.password is not None else os.getenv("POSTGRES_PASSWORD", "")
        db = (u.path or "").lstrip("/") or os.getenv("POSTGRES_DB", "studynest")
    else:
        host = os.getenv("POSTGRES_HOST", "postgres")
        port = int(os.getenv("POSTGRES_PORT", "5432"))
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "")
        db = os.getenv("POSTGRES_DB", "studynest")

    for attempt in range(1, 31):
        try:
            conn = await asyncpg.connect(host=host, port=port, user=user, password=password, database=db, timeout=3)
            await conn.close()
            print(f"[Mây Mây Backend] PostgreSQL ({host}:{port}/{db}) sẵn sàng (lần thử {attempt}).")
            return
        except Exception as exc:
            print(f"[Mây Mây Backend] Chờ PostgreSQL ({attempt}/30): {exc}")
            await asyncio.sleep(2)
    sys.exit(1)

asyncio.run(wait_pg())
PY

if [ -f "scripts/migrate_digital_contracts.py" ]; then
  echo "[Mây Mây Backend] Chạy migration idempotent cho Hợp đồng Điện tử..."
  python scripts/migrate_digital_contracts.py || echo "[WARN] Migration bỏ qua hoặc đã hoàn tất trước đó."
fi

WORKERS="${UVICORN_WORKERS:-2}"
echo "[Mây Mây Backend] Khởi chạy Uvicorn Production (${WORKERS} workers) trên cổng 8000..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${WORKERS}" \
  --proxy-headers \
  --forwarded-allow-ips="*"
