import time
from uuid import UUID

from fastapi import HTTPException
from loguru import logger
from redis.exceptions import RedisError

from app.core.redis import get_redis


async def limit_action(user_id: UUID, action: str, message: str) -> None:
    key = f"gamification:{action}:{user_id}:{int(time.time()) // 60}"
    try:
        async with get_redis().pipeline(transaction=True) as pipeline:
            count, _ = await pipeline.incr(key).expire(key, 90).execute()
    except RedisError as exc:
        logger.warning("Không kiểm tra được giới hạn thao tác ({})", type(exc).__name__)
        return
    if count > 30:
        raise HTTPException(429, message, headers={"Retry-After": "60"})
