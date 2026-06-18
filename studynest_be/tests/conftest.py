"""
Fixtures dùng chung cho toàn bộ test suite.
"""
from __future__ import annotations

import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ──────────────────────────────────────────────────────────────────────────────
# Nếu có biến môi trường TEST_DATABASE_ASYNC_URL thì dùng, còn không thì
# dùng database thật (cẩn thận chỉ để dev / CI).
# ──────────────────────────────────────────────────────────────────────────────
import os

TEST_DATABASE_URL: str = os.getenv(
    "TEST_DATABASE_ASYNC_URL",
    os.getenv(
        "DATABASE_ASYNC_URL",
        "postgresql+asyncpg://admin:StrongPass2026!@127.0.0.1:5433/studynest",
    ),
)


@pytest.fixture(scope="session")
def event_loop():
    """Sử dụng một event loop duy nhất cho toàn session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


from sqlalchemy.pool import NullPool


@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Session với transaction rollback sau mỗi test, hỗ trợ commit() trong code ứng dụng."""
    connection = await async_engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(bind=connection, expire_on_commit=False)

    yield session

    await session.close()
    await transaction.rollback()
    await connection.close()
