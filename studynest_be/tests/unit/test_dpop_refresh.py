import base64
import hashlib
import time
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException, Request, Response

from app.core import security
from app.db.models.database import Sessions, SpentRefreshTokens, User
from app.core.settings import settings
from app.libs.formats.datetime import now_tzinfo
from app.services.shares import auth


class Redis:
    def __init__(self):
        self.values = {}

    def lock(self, *args, **kwargs):
        return SimpleNamespace(acquire=AsyncMock(return_value=True), release=AsyncMock())

    async def get(self, name):
        return self.values.get(name)

    async def set(self, name, value, *, ex, nx=False):
        if nx and name in self.values:
            return None
        self.values[name] = value
        return True


def b64(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


@pytest.fixture
async def bound(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_API_URL", "https://api.example")
    redis = Redis()
    monkeypatch.setattr(security, "get_redis", lambda: redis)
    monkeypatch.setattr(auth, "get_redis", lambda: redis)
    signer = ec.generate_private_key(ec.SECP256R1())
    jwk = jwt.algorithms.ECAlgorithm.to_jwk(signer.public_key(), as_dict=True)
    public = f'{{"crv":"P-256","kty":"EC","x":"{jwk["x"]}","y":"{jwk["y"]}"}}'
    jkt = b64(hashlib.sha256(public.encode()).digest())
    service_security = security.SecurityService()
    old = await service_security.generate_refresh_token()
    session = SimpleNamespace(
        id=uuid4(), user_id=uuid4(), is_revoked=False, dpop_jkt=jkt,
        refresh_token_hash=await service_security.hash_token(old),
        previous_refresh_hash=None, previous_rotated_at=None,
        expired_at=now_tzinfo() + timedelta(days=1),
    )

    active = SimpleNamespace(id=session.user_id, deleted_at=None, is_banned=False)
    history = {}
    order = []

    async def scalar(stmt):
        if stmt.column_descriptions[0]["entity"] is User:
            return active
        ((param, token_hash),) = stmt.compile().params.items()
        attr = param.rsplit("_", 1)[0]
        return session if getattr(session, attr) == token_hash else None

    async def get(model, key, **kw):
        if model is SpentRefreshTokens:
            return history.get(key)
        assert model is Sessions and key == session.id
        if kw.get("with_for_update"):
            order.append("row-lock")
        return session

    original_set = redis.set
    async def record_set(name, value, **kw):
        order.append("jti" if name.startswith("auth:dpop:jti:") else "cache-write")
        return await original_set(name, value, **kw)

    redis.set = record_set
    db = SimpleNamespace(
        execute=AsyncMock(), scalar=scalar, commit=AsyncMock(), rollback=AsyncMock(), get=get,
        add=lambda row: history.update({row.token_hash: row}),
    )
    service = auth.AuthService(db=db, security=service_security, mail_service=None, wallet_service=None)

    def request(token, *, key=signer, claims_jwk=jwk):
        path = "/api/v1/auth/refresh"
        proof = jwt.encode({
            "htm": "POST", "htu": "https://api.example" + path, "iat": int(time.time()), "jti": uuid4().hex,
            "rth": b64(hashlib.sha256(token.encode()).digest()),
        }, key, algorithm="ES256", headers={"typ": "dpop+jwt", "jwk": claims_jwk})
        return Request({"type": "http", "method": "POST", "path": path, "headers": [(b"dpop", proof.encode())]})

    return SimpleNamespace(service=service, db=db, session=session, old=old, request=request, redis=redis, history=history, order=order, user=active)


async def test_reuses_result_inside_grace_and_revokes_after_grace(bound):
    response = Response()
    result = await bound.service.refresh_token_async(bound.old, response, request=bound.request(bound.old))
    assert result["token_type"] == "DPoP"
    assert result["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    claims = await bound.service.security.decode_access_token(result["access_token"])
    assert claims["cnf"] == {"jkt": bound.session.dpop_jkt}
    assert response.headers["cache-control"] == "no-store"
    assert not response.headers.getlist("set-cookie")
    retry = await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    assert retry["refresh_token"] == result["refresh_token"]
    assert bound.db.commit.await_count == 1

    # Leave the cache populated to simulate Redis TTL outliving the database grace period.
    bound.session.previous_rotated_at -= timedelta(seconds=16)
    with pytest.raises(HTTPException) as error:
        await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    assert error.value.code == "session_revoked"
    assert bound.session.is_revoked is True
    assert bound.db.commit.await_count == 2
    with pytest.raises(HTTPException) as revoked:
        await bound.service.refresh_token_async(
            result["refresh_token"], Response(), request=bound.request(result["refresh_token"]),
        )
    assert revoked.value.code == "session_revoked"


async def test_stolen_old_refresh_without_bound_key_cannot_revoke(bound):
    await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    bound.session.previous_rotated_at -= timedelta(seconds=16)
    bound.redis.values.clear()

    key = ec.generate_private_key(ec.SECP256R1())
    attacker_jwk = jwt.algorithms.ECAlgorithm.to_jwk(key.public_key(), as_dict=True)
    for request in (None, bound.request(bound.old, key=key, claims_jwk=attacker_jwk)):
        with pytest.raises(HTTPException) as error:
            await bound.service.refresh_token_async(bound.old, Response(), request=request)
        assert error.value.code == "invalid_dpop_proof"
    assert bound.session.is_revoked is False
    assert bound.db.commit.await_count == 1

    with pytest.raises(HTTPException) as reused:
        await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    assert reused.value.code == "session_revoked"
    assert bound.session.is_revoked


async def test_grace_encryption_and_order_of_redis_and_row_locks(bound, monkeypatch):
    from app.core.auth_encryption import open_auth_payload

    original_get = bound.redis.get
    async def record_get(key):
        bound.order.append("cache-read")
        return await original_get(key)

    monkeypatch.setattr(bound.redis, "get", record_get)
    result = await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    assert bound.order == ["jti", "row-lock", "cache-write"]
    key = auth.REFRESH_CACHE_PREFIX + await bound.service.security.hash_token(bound.old)
    stored = bound.redis.values[key]
    assert all(result[field] not in stored for field in ("access_token", "refresh_token"))
    assert open_auth_payload(stored, key) == result
    assert open_auth_payload(stored, key + "wrong") is None

    bound.order.clear()
    retry = await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    assert retry == result
    assert bound.order[0] == "jti"
    assert all(step == "cache-read" for step in bound.order[1:-1])
    assert bound.order[-1] == "row-lock"


async def test_durable_retry_uses_matching_operation_after_grace(bound, monkeypatch):
    operation_id = uuid4()
    result = await bound.service.refresh_token_async(
        bound.old, Response(), request=bound.request(bound.old), operation_id=operation_id,
    )
    spent = bound.history[bound.session.previous_refresh_hash]
    assert result["refresh_token"] not in spent.encrypted_result
    spent.rotated_at -= timedelta(seconds=16)
    bound.session.previous_rotated_at = spent.rotated_at
    bound.redis.values.clear()
    from redis.exceptions import ConnectionError
    grace_read = AsyncMock(side_effect=ConnectionError("grace cache unavailable"))
    monkeypatch.setattr(bound.redis, "get", grace_read)

    retry = await bound.service.refresh_token_async(
        bound.old, Response(), request=bound.request(bound.old), operation_id=operation_id,
    )
    assert retry["refresh_token"] == result["refresh_token"]
    assert retry["session_id"] == result["session_id"]
    grace_read.assert_not_awaited()
    assert not bound.session.is_revoked
    bound.db.commit.assert_awaited_once()


async def test_spent_dpop_refresh_is_detected_after_two_rotations(bound):
    first = await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    next_token = first["refresh_token"]
    await bound.service.refresh_token_async(next_token, Response(), request=bound.request(next_token))
    bound.history[await bound.service.security.hash_token(bound.old)].rotated_at -= timedelta(seconds=16)
    bound.redis.values.clear()
    with pytest.raises(HTTPException) as exc:
        await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    assert exc.value.code == "session_revoked"
    assert bound.session.is_revoked


@pytest.mark.parametrize("deleted,status", [(True, 401), (False, 403)])
async def test_refresh_rejects_inactive_users_before_locking_session(bound, deleted, status):
    bound.user.deleted_at = object() if deleted else None
    bound.user.is_banned = not deleted
    bound.user.banned_until = bound.user.banned_reason = None
    with pytest.raises(HTTPException) as exc:
        await bound.service.refresh_token_async(bound.old, Response(), request=bound.request(bound.old))
    assert exc.value.status_code == status
    assert bound.order == ["jti"]
    bound.db.commit.assert_not_awaited()
