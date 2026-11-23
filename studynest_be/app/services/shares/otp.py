import hashlib

from fastapi import HTTPException
from redis.exceptions import RedisError

from app.core.redis import get_redis

VERIFY_EMAIL = "verify-email"
LOGIN = "login"
OTP_TTL = 600

# A fixed counter lifetime bounds lockouts even during sustained traffic.
# Individual challenges have a hard ceiling, independent of the source IP.
_LIMIT = """
if redis.call('EXISTS', KEYS[2]) == 1 then
    return math.max(1, redis.call('TTL', KEYS[2]))
end
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
local excess = count - tonumber(ARGV[1])
if excess <= 0 then return 0 end
local remaining = redis.call('TTL', KEYS[1])
local base = tonumber(ARGV[3])
if base == 0 then return math.max(1, remaining) end
local delay = math.max(1, math.min(remaining, base * 2 ^ math.min(excess - 1, 3)))
redis.call('SET', KEYS[2], '1', 'EX', delay)
return delay
"""


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


async def _limit_async(key: str, maximum: int, window: int, backoff: int = 0) -> None:
    # The hash tag keeps both keys in the same Redis Cluster slot.
    key = "auth:otp:{" + key + "}"
    try:
        delay = await get_redis().eval(_LIMIT, 2, key, key + ":lock", maximum, window, backoff)
    except RedisError:
        raise HTTPException(503, "Chưa thể xác thực mã. Vui lòng thử lại.") from None
    if delay:
        raise HTTPException(429, "Bạn đã gửi quá nhiều yêu cầu.", headers={"Retry-After": str(delay)})


async def limit_issue_async(email: str, purpose: str, ip: str | None) -> None:
    await _limit_async("issue:ip:" + _fingerprint(ip or "unknown"), 20, OTP_TTL)
    account = _fingerprint(email.strip().casefold())
    await _limit_async(f"issue:{purpose}:{account}", 1, 60)
    await _limit_async(f"issue:account:{account}", 5, 3600)


async def limit_attempt_async(
    account_id: str, challenge_id: str | None, ip: str | None,
) -> None:
    await _limit_async("attempt:ip:" + _fingerprint(ip or "unknown"), 50, OTP_TTL, 30)
    await _limit_async("attempt:account:" + account_id, 10, OTP_TTL, 60)
    if challenge_id is not None:
        await _limit_async("attempt:challenge:" + challenge_id, 5, OTP_TTL)
