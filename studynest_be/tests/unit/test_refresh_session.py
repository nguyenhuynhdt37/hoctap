import asyncio
import secrets
import unittest
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

from fastapi import HTTPException, Response
from redis.exceptions import ConnectionError

from app.core.security import SecurityService
from app.core.settings import settings
from app.db.models.database import Sessions, User
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
        self.enterContext(patch.object(settings, 'AUTH_ALLOW_COOKIE_COMPAT', True))
        self.enterContext(patch.object(settings, 'AUTH_ALLOW_UNBOUND_BEARER', False))
        self.enterContext(patch.object(settings, 'JWT_SECRET', secrets.token_hex(32)))
        self.enterContext(patch.object(settings, 'SECRET_KEY', secrets.token_hex(32)))
        self.enterContext(patch.object(settings, 'ALGORITHM', 'HS256'))
        self.security = SecurityService()
        self.old = await self.security.generate_refresh_token()
        self.session = SimpleNamespace(id=uuid4(), user_id=uuid4(), is_revoked=False,
            dpop_jkt=None, previous_refresh_hash=None, previous_rotated_at=None,
            refresh_token_hash=await self.security.hash_token(self.old), expired_at=now()+timedelta(days=1))
        self.user = SimpleNamespace(id=self.session.user_id, is_banned=False, deleted_at=None)

        async def scalar(stmt):
            if stmt.column_descriptions[0]["entity"] is User:
                return self.user
            ((param, token_hash),) = stmt.compile().params.items()
            column = param.rsplit("_", 1)[0]
            return self.session if getattr(self.session, column) == token_hash else None

        async def get(model, key, **kwargs):
            if model is Sessions and key == self.session.id:
                return self.session
            return None

        self.db = SimpleNamespace(
            get=AsyncMock(side_effect=get), commit=AsyncMock(), rollback=AsyncMock(),
            execute=AsyncMock(), scalar=scalar,
        )
        self.redis = FakeRedis()
        patcher = patch('app.services.shares.auth.get_redis', return_value=self.redis)
        patcher.start(); self.addCleanup(patcher.stop)
        self.auth = AuthService(db=self.db, security=self.security, mail_service=Mock(), wallet_service=Mock())

    async def test_rotation_is_committed_and_existing_device_id_is_retained(self):
        response = Response()
        result = await self.auth.refresh_token_async(self.old, response, from_cookie=True)
        self.db.commit.assert_awaited_once()
        self.assertEqual(result['session_id'], str(self.session.id))
        self.assertNotEqual(result['refresh_token'], self.old)
        self.assertEqual(self.session.refresh_token_hash, await self.security.hash_token(result['refresh_token']))
        self.assertEqual(self.redis.expiries, [15])
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertIn(f'Max-Age={int(float(settings.ACCESS_TOKEN_EXPIRE_MINUTES)*60)}', response.headers.getlist('set-cookie')[0])

    async def test_concurrent_old_token_requests_share_one_rotation(self):
        request_count = 8
        entered = 0
        all_started = asyncio.Event()

        async def refresh():
            nonlocal entered
            entered += 1
            if entered == request_count:
                all_started.set()
            return await self.auth.refresh_token_async(self.old, Response(), from_cookie=True)

        self.db.commit.side_effect = all_started.wait
        results = await asyncio.wait_for(asyncio.gather(*(refresh() for _ in range(request_count))), timeout=2)
        self.assertEqual(len({r['refresh_token'] for r in results}), 1)
        self.assertEqual(len({r['access_token'] for r in results}), 1)
        self.db.commit.assert_awaited_once()

    async def test_revocation_overrides_recent_cached_credentials(self):
        await self.auth.refresh_token_async(self.old, Response(), from_cookie=True)
        self.assertTrue(self.redis.values)
        self.session.is_revoked = True
        response = Response()
        with self.assertRaises(HTTPException) as error:
            await self.auth.refresh_token_async(self.old, response, from_cookie=True)
        self.assertEqual(error.exception.status_code, 401)
        self.assertEqual(error.exception.code, 'session_revoked')
        self.assertFalse(response.headers.getlist('set-cookie'))
        self.db.commit.assert_awaited_once()

    async def test_old_token_rejected_after_grace_cache_expires(self):
        await self.auth.refresh_token_async(self.old, Response(), from_cookie=True)
        self.session.previous_rotated_at -= timedelta(seconds=16)
        self.redis.values.clear()
        response = Response()
        with self.assertRaises(HTTPException) as error:
            await self.auth.refresh_token_async(self.old, response, from_cookie=True)
        self.assertEqual(error.exception.status_code, 401)
        self.assertEqual(error.exception.code, 'invalid_token')
        self.assertFalse(error.exception.clear_cookies)
        self.assertFalse(response.headers.getlist('set-cookie'))
        self.assertFalse(self.session.is_revoked)
        self.db.commit.assert_awaited_once()

    async def test_temporary_redis_error_does_not_rotate_or_clear_cookies(self):
        self.redis.lock = Mock(return_value=SimpleNamespace(acquire=AsyncMock(side_effect=ConnectionError('temporary failure'))))
        response = Response()
        with self.assertRaises(HTTPException) as error:
            await self.auth.refresh_token_async(self.old, response, from_cookie=True)
        self.assertEqual(error.exception.status_code, 503)
        self.assertFalse(response.headers.getlist('set-cookie'))
        self.db.commit.assert_not_awaited()

    async def test_failed_commit_does_not_emit_unpersisted_credentials(self):
        self.db.commit.side_effect = RuntimeError('database unavailable')
        response = Response()
        with self.assertRaises(RuntimeError):
            await self.auth.refresh_token_async(self.old, response, from_cookie=True)
        self.assertFalse(response.headers.getlist('set-cookie'))
        self.assertFalse(self.redis.values)
        self.db.commit.assert_awaited_once()
        self.db.rollback.assert_awaited_once()

    async def test_stale_cookie_after_grace_does_not_revoke_healthy_session(self):
        with patch.object(settings, "AUTH_ALLOW_COOKIE_COMPAT", True):
            current = await self.auth.refresh_token_async(self.old, Response(), from_cookie=True)
            self.session.previous_rotated_at -= timedelta(seconds=16)
            with self.assertRaises(HTTPException) as error:
                await self.auth.refresh_token_async(self.old, Response(), from_cookie=True)
            self.assertEqual(error.exception.code, "invalid_token")
            self.assertFalse(self.session.is_revoked)
            renewed = await self.auth.refresh_token_async(current["refresh_token"], Response(), from_cookie=True)
        self.assertNotEqual(renewed["refresh_token"], current["refresh_token"])

    async def test_unbound_refresh_respects_credential_source_flags(self):
        with patch.object(settings, "AUTH_ALLOW_UNBOUND_BEARER", False), patch.object(settings, "AUTH_ALLOW_COOKIE_COMPAT", True):
            with self.assertRaises(HTTPException) as error:
                await self.auth.refresh_token_async(self.old, Response())
            self.assertEqual(error.exception.code, "invalid_token")
            result = await self.auth.refresh_token_async(self.old, Response(), from_cookie=True)
        with patch.object(settings, "AUTH_ALLOW_UNBOUND_BEARER", True), patch.object(settings, "AUTH_ALLOW_COOKIE_COMPAT", False):
            token = result["refresh_token"]
            with self.assertRaises(HTTPException) as error:
                await self.auth.refresh_token_async(token, Response(), from_cookie=True)
            response = Response()
            await self.auth.refresh_token_async(token, response)
            self.assertFalse(response.headers.getlist("set-cookie"))
