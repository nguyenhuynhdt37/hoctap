from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, Response
from redis.exceptions import RedisError

from app.schemas.auth.user import VerifyOtp
from app.services.shares.auth import AuthService


@pytest.mark.asyncio
async def test_pending_account_cannot_be_activated_by_login_otp(dpop_login):
    user = SimpleNamespace(
        id=uuid4(), is_verified_email=False, deleted_at=None, is_banned=False,
        password="unverified-password-hash",
    )
    db = SimpleNamespace(
        execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: user)),
        rollback=AsyncMock(),
    )
    service = AuthService(db=db)
    service._create_session = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await service.verify_otp_login_async(
            VerifyOtp(email="student@example.com", otp_code="123456", purpose="login"),
            Response(),
            request=dpop_login.request("verify-otp"),
        )
    assert exc.value.status_code == 403
    assert exc.value.detail["error_code"] == "EMAIL_NOT_VERIFIED"
    assert not user.is_verified_email
    service._create_session.assert_not_awaited()


@pytest.mark.asyncio
async def test_pending_reregistration_replaces_challenge_and_disables_old_password(monkeypatch):
    from app.libs.formats.datetime import now
    from app.schemas.auth.user import UserCreate
    from app.services.shares import otp

    user = SimpleNamespace(
        id=uuid4(), email="student@example.com", fullname="Old", password="old-hash",
        is_verified_email=False, deleted_at=None, is_banned=False,
    )
    rows = []
    db = SimpleNamespace(
        scalar=AsyncMock(return_value=user), execute=AsyncMock(), add=rows.append, commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    security = SimpleNamespace(hash_password=AsyncMock(return_value="new-hash"), generate_otp=AsyncMock(return_value="123456"))
    mail = SimpleNamespace(send_verification_email=AsyncMock())
    redis = SimpleNamespace(eval=AsyncMock(return_value=0))
    monkeypatch.setattr(otp, "get_redis", lambda: redis)
    service = AuthService(db=db, security=security, mail_service=mail)
    assert (await service.check_email_async(user.email))["available"]
    await service.register_async(
        UserCreate(email=user.email, password="new-secret", full_name="Student"), ip="192.0.2.4",
    )
    assert not user.is_verified_email and user.password == ""
    assert user.fullname == "Student"
    [challenge] = rows
    assert challenge.purpose == otp.VERIFY_EMAIL
    assert challenge.pending_password_hash == "new-hash"
    assert challenge.expired_at > now()
    assert db.execute.await_args.args[0].compile().params["purpose_1"] == "verify-email"
    mail.send_verification_email.assert_awaited_once_with(email=user.email, fullname=user.fullname, code=challenge.code)


@pytest.mark.parametrize("purpose", ["login", "verify-email"])
@pytest.mark.asyncio
async def test_session_creation_requires_delete_returning_to_win(monkeypatch, purpose, dpop_login):
    from datetime import timedelta
    from app.libs.formats.datetime import now
    from app.schemas.auth.user import VerifyEmail
    from app.services.shares import otp

    user = SimpleNamespace(
        id=uuid4(), is_verified_email=purpose == "login", deleted_at=None, is_banned=False,
        password="preexisting-hash",
    )
    row = SimpleNamespace(
        id=uuid4(), purpose=purpose, code="123456",
        expired_at=now() + timedelta(minutes=1), pending_password_hash=None,
    )
    db = SimpleNamespace(
        execute=AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: user)),
        scalar=AsyncMock(side_effect=[row, None] if purpose == "login" else [user, row, None]),
        refresh=AsyncMock(), rollback=AsyncMock(), commit=AsyncMock(),
    )
    redis = SimpleNamespace(eval=AsyncMock(return_value=0))
    monkeypatch.setattr(otp, "get_redis", lambda: redis)
    service = AuthService(db=db)
    service._create_session = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        if purpose == "login":
            await service.verify_otp_login_async(
                VerifyOtp(email="student@example.com", otp_code="123456", purpose="authenticate"),
                Response(), ip="192.0.2.10", request=dpop_login.request("verify-otp"),
            )
        else:
            await service.verify_email_async(
                VerifyEmail(email="student@example.com", code="123456"), Response(),
                request=dpop_login.request("verify-email"),
            )
    assert exc.value.status_code == (401 if purpose == "login" else 400)
    if purpose == "login":
        assert exc.value.code == "invalid_token"
    assert user.is_verified_email is (purpose == "login")
    lookup, delete = [call.args[0] for call in db.scalar.await_args_list[-2:]]
    assert lookup.compile().params["purpose_1"] == purpose
    assert delete.compile().params["id_1"] == row.id and "RETURNING" in str(delete)
    assert len(redis.eval.await_args_list) == 3
    assert redis.eval.await_args.args[-3:] == (5, 600, 0)
    assert user.password == "preexisting-hash"
    service._create_session.assert_not_awaited()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_attempt_budgets_are_shared_across_ips_and_resends(monkeypatch):
    from app.services.shares import otp

    counters = {}

    async def limit(script, nkeys, key, lock, threshold, ttl, backoff):
        assert nkeys == 2 and lock == key + ":lock"
        counters[key] = counters.get(key, 0) + 1
        return (backoff or ttl) if counters[key] > threshold else 0

    monkeypatch.setattr(otp, "get_redis", lambda: SimpleNamespace(eval=limit))
    for index in range(5):
        await otp.limit_attempt_async("account", "challenge", f"192.0.2.{index}")
    with pytest.raises(HTTPException) as limited:
        await otp.limit_attempt_async("account", "challenge", "198.51.100.1")
    assert limited.value.status_code == 429
    for _ in range(4):
        await otp.limit_attempt_async("account", "new-challenge", "198.51.100.2")
    with pytest.raises(HTTPException) as locked:
        await otp.limit_attempt_async("account", "new-challenge", "198.51.100.3")
    assert locked.value.headers["Retry-After"] == "60"


@pytest.mark.asyncio
async def test_issue_is_throttled_and_redis_outage_fails_closed(monkeypatch):
    from app.schemas.auth.user import SendOtp
    from app.services.shares import otp

    redis = SimpleNamespace(eval=AsyncMock(side_effect=[0, 46, RedisError("temporarily down")]))
    monkeypatch.setattr(otp, "get_redis", lambda: redis)
    db = SimpleNamespace(scalar=AsyncMock())
    service = AuthService(db=db)
    data = SendOtp(email="student@example.com", purpose="login")
    with pytest.raises(HTTPException) as limited:
        await service.send_otp_async(data, ip="192.0.2.1")
    assert limited.value.status_code == 429
    assert limited.value.headers["Retry-After"] == "46"
    assert redis.eval.await_args.args[-3:] == (1, 60, 0)
    with pytest.raises(HTTPException) as unavailable:
        await service.send_otp_async(data, ip="192.0.2.1")
    assert unavailable.value.status_code == 503
    db.scalar.assert_not_awaited()
