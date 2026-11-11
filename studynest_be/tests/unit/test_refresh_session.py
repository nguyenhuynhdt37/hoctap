import asyncio
import unittest
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

from fastapi import HTTPException, Response
from redis.exceptions import ConnectionError

from app.core.security import SecurityService
from app.core.settings import settings
from app.libs.formats.datetime import now
from app.services.shares.auth import AuthService


class RedisLock:
    def __init__(self, lock): self.lock = lock
    async def acquire(self): await self.lock.acquire(); return True
    async def release(self): self.lock.release()


class FakeRedis:
    def __init__(self): self.values = {}; self.mutex = asyncio.Lock(); self.expiries = []
    def lock(self, *args, **kwargs): return RedisLock(self.mutex)
    async def get(self, key): return self.values.get(key)
    async def set(self, key, value, ex): self.values[key] = value; self.expiries.append(ex)


class RefreshSessionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.security = SecurityService()
        self.old = await self.security.generate_refresh_token()
        self.session = SimpleNamespace(id=uuid4(), user_id=uuid4(), is_revoked=False,
            refresh_token_hash=await self.security.hash_token(self.old), expired_at=now()+timedelta(days=1))
        self.db = SimpleNamespace(get=AsyncMock(return_value=self.session), commit=AsyncMock(), execute=AsyncMock())
        async def execute(stmt):
            old_hash = stmt.compile().params['refresh_token_hash_1']
            return SimpleNamespace(scalar_one_or_none=lambda: self.session if self.session.refresh_token_hash == old_hash else None)
        self.db.execute.side_effect = execute
        self.redis = FakeRedis()
        patcher = patch('app.services.shares.auth.get_redis', return_value=self.redis)
        patcher.start(); self.addCleanup(patcher.stop)
        self.auth = AuthService(db=self.db, security=self.security, mail_service=Mock(), wallet_service=Mock())

    async def test_rotation_is_committed_and_existing_device_id_is_retained(self):
        response = Response()
        result = await self.auth.refresh_token_async(self.old, response)
        self.db.commit.assert_awaited_once()
        self.assertEqual(result['session_id'], str(self.session.id))
        self.assertNotEqual(result['refresh_token'], self.old)
        self.assertEqual(self.session.refresh_token_hash, await self.security.hash_token(result['refresh_token']))
        self.assertEqual(self.redis.expiries, [15])
        self.assertIn(f'Max-Age={int(float(settings.ACCESS_TOKEN_EXPIRE_MINUTES)*60)}', response.headers.getlist('set-cookie')[0])

    async def test_concurrent_old_token_requests_share_one_rotation(self):
        results = await asyncio.gather(*(self.auth.refresh_token_async(self.old, Response()) for _ in range(8)))
        self.assertEqual(len({r['refresh_token'] for r in results}), 1)
        self.db.commit.assert_awaited_once()

    async def test_revocation_overrides_recent_cached_credentials(self):
        await self.auth.refresh_token_async(self.old, Response())
        self.session.is_revoked = True
        with self.assertRaises(HTTPException) as error:
            await self.auth.refresh_token_async(self.old, Response())
        self.assertEqual(error.exception.status_code, 401)

    async def test_old_token_rejected_after_grace_cache_expires(self):
        await self.auth.refresh_token_async(self.old, Response())
        self.redis.values.clear()
        with self.assertRaises(HTTPException) as error:
            await self.auth.refresh_token_async(self.old, Response())
        self.assertEqual(error.exception.status_code, 401)

    async def test_temporary_redis_error_does_not_rotate_or_clear_cookies(self):
        self.redis.lock = Mock(return_value=SimpleNamespace(acquire=AsyncMock(side_effect=ConnectionError('temporary failure'))))
        response = Response()
        with self.assertRaises(HTTPException) as error:
            await self.auth.refresh_token_async(self.old, response)
        self.assertEqual(error.exception.status_code, 503)
        self.assertFalse(response.headers.getlist('set-cookie'))
        self.db.commit.assert_not_awaited()

    async def test_failed_commit_does_not_emit_unpersisted_credentials(self):
        self.db.commit.side_effect = RuntimeError('database unavailable')
        response = Response()
        with self.assertRaises(RuntimeError):
            await self.auth.refresh_token_async(self.old, response)
        self.assertFalse(response.headers.getlist('set-cookie'))
        self.assertFalse(self.redis.values)
