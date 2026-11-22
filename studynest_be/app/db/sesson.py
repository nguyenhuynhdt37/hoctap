# app/database.py
import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.settings import settings

DATABASE_URL = os.getenv(
    "DATABASE_ASYNC_URL",
    settings.DATABASE_ASYNC_URL,
)

# Phân giải host psql-maymay qua IP Tailscale trực tiếp khi domain đi qua Cloudflare proxy (chỉ forward HTTP/HTTPS)
connect_args = {}
if DATABASE_URL and "psql-maymay.itup.io.vn" in DATABASE_URL:
    connect_args["host"] = "100.122.190.92"
    connect_args["port"] = 5435

# ✅ Tạo engine async
engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # bật True chỉ khi debug
    pool_pre_ping=True,  # tự kiểm tra connection còn sống
)

# ✅ Tạo session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # 👈 Quan trọng nhất: giữ context sau commit, không greenlet lỗi
)

# ✅ Dependency cho FastAPI


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
