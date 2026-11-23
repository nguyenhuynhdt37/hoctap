from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, Response

from app.libs.formats.datetime import now as get_now
from app.schemas.auth.user import VerifyEmail, VerifyOtp
from app.services.shares import otp
from app.services.shares.auth import AuthService


class _ScalarResult:
    def __init__(self, item):
        self._item = item

    def first(self):
        return self._item

    def scalar_one_or_none(self):
        return self._item


@pytest.fixture(autouse=True)
def rate_store(monkeypatch):
    redis = SimpleNamespace(eval=AsyncMock(return_value=0))
    monkeypatch.setattr(otp, "get_redis", lambda: redis)
    return redis


@pytest.mark.asyncio
async def test_verify_email_rejects_wrong_otp_code(dpop_login):
    user = SimpleNamespace(
        id=uuid4(),
        email="student@example.com",
        fullname="Student",
        avatar=None,
        bio=None,
        facebook_url=None,
        is_verified_email=False,
        email_verified_at=None,
        deleted_at=None,
        is_banned=False,
        user_roles=[SimpleNamespace(role=SimpleNamespace(role_name="USER"))],
    )
    verification = SimpleNamespace(
        id=uuid4(), purpose=otp.VERIFY_EMAIL, pending_password_hash="registered-hash",
        code="257030",
        expired_at=get_now() + timedelta(minutes=10),
    )
    db = SimpleNamespace(
        scalar=AsyncMock(side_effect=[user, verification]),
        execute=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
        refresh=AsyncMock(),
    )
    service = AuthService(
        db=db,
        security=SimpleNamespace(),
        mail_service=SimpleNamespace(),
        wallet_service=SimpleNamespace(get_or_create_wallet_async=AsyncMock()),
    )

    with pytest.raises(HTTPException) as exc:
        await service.verify_email_async(
            VerifyEmail(email="student@example.com", code="000000"),
            Response(),
            request=dpop_login.request("verify-email"),
        )
    assert exc.value.status_code == 400
    assert user.is_verified_email is False
    assert db.scalar.await_count == 2  # User and challenge were read, with no OTP consumption.
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_verify_email_accepts_matching_otp_and_consumes_codes(monkeypatch, dpop_login):
    user = SimpleNamespace(
        id=uuid4(),
        email="student@example.com",
        fullname="Student",
        avatar=None,
        bio=None,
        facebook_url=None,
        is_verified_email=False,
        email_verified_at=None,
        deleted_at=None,
        is_banned=False,
        user_roles=[SimpleNamespace(role=SimpleNamespace(role_name="USER"))],
    )
    verification = SimpleNamespace(
        id=uuid4(), purpose=otp.VERIFY_EMAIL, pending_password_hash="registered-hash",
        code="257030",
        expired_at=get_now() + timedelta(minutes=10),
    )
    db = SimpleNamespace(
        scalar=AsyncMock(side_effect=[user, verification, verification.id]),
        execute=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
        refresh=AsyncMock(),
    )
    service = AuthService(
        db=db,
        security=SimpleNamespace(),
        mail_service=SimpleNamespace(),
        wallet_service=SimpleNamespace(get_or_create_wallet_async=AsyncMock()),
    )
    monkeypatch.setattr(
        service,
        "_create_session",
        AsyncMock(
            return_value={
                "message": "Login successful",
                "session_id": str(uuid4()),
                "access_token": "tok",
                "refresh_token": "ref",
                "expired_at": get_now() + timedelta(days=30),
            }
        ),
    )
    monkeypatch.setattr(service, "_broadcast_new_session", AsyncMock())

    result = await service.verify_email_async(
        VerifyEmail(email="student@example.com", code="257030"),
        Response(),
        request=dpop_login.request("verify-email"),
    )
    assert result["user"]["is_verified_email"] is True
    assert user.password == "registered-hash"
    statements = [call.args[0] for call in db.scalar.await_args_list]
    assert statements[1].compile().params["purpose_1"] == "verify-email"
    assert "DELETE FROM public.email_verifications" in str(statements[2])
    assert "RETURNING public.email_verifications.id" in str(statements[2])
    service._create_session.assert_awaited_once()
    assert service._create_session.await_args.kwargs["jkt"] == dpop_login.jkt
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_verify_otp_login_blocks_banned_user(dpop_login):
    banned_user = SimpleNamespace(
        id=uuid4(),
        email="banned@example.com",
        deleted_at=None,
        is_banned=True,
    )
    db = SimpleNamespace(
        execute=AsyncMock(return_value=_ScalarResult(banned_user)),
        scalar=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    service = AuthService(
        db=db,
        security=SimpleNamespace(),
        mail_service=SimpleNamespace(),
        wallet_service=SimpleNamespace(),
    )

    with pytest.raises(HTTPException) as exc:
        await service.verify_otp_login_async(
            VerifyOtp(email="banned@example.com", otp_code="123456", purpose="login"),
            Response(),
            request=dpop_login.request("verify-otp"),
        )
    assert exc.value.status_code == 403
    assert exc.value.detail["error_code"] == "ACCOUNT_BANNED"
    db.scalar.assert_not_awaited()
    db.commit.assert_not_awaited()


async def test_resend_cannot_activate_pending_hash_without_a_new_password(dpop_login):
    from app.schemas.auth.user import RefreshEmail

    user = SimpleNamespace(
        id=uuid4(), email="student@example.com", fullname="Student", password="legacy-hash",
        avatar=None, bio=None, facebook_url=None,
        is_verified_email=False, deleted_at=None, is_banned=False, user_roles=[],
    )
    challenges = []
    db = SimpleNamespace(
        scalar=AsyncMock(return_value=user), execute=AsyncMock(), add=challenges.append,
        commit=AsyncMock(), rollback=AsyncMock(), refresh=AsyncMock(),
    )
    service = AuthService(
        db=db, security=SimpleNamespace(generate_otp=AsyncMock(return_value="123456")),
        mail_service=SimpleNamespace(send_verification_email=AsyncMock()),
        wallet_service=SimpleNamespace(get_or_create_wallet_async=AsyncMock()),
    )
    await service.refesh_email_async(RefreshEmail(email=user.email), ip="192.0.2.2")
    [challenge] = challenges
    assert challenge.pending_password_hash is None and user.password == ""
    challenge.id = uuid4()
    db.scalar.side_effect = [user, challenge, challenge.id]
    service._create_session = AsyncMock(return_value={"session_id": str(uuid4())})
    service._broadcast_new_session = AsyncMock()
    await service.verify_email_async(
        VerifyEmail(email=user.email, code=challenge.code), Response(),
        request=dpop_login.request("verify-email"),
    )
    assert user.is_verified_email
    assert user.password == ""


async def test_verified_email_can_choose_password_at_verification(dpop_login):
    user = SimpleNamespace(
        id=uuid4(), email="student@example.com", fullname="Student", password="old-hash",
        avatar=None, bio=None, facebook_url=None,
        is_verified_email=False, deleted_at=None, is_banned=False, user_roles=[],
    )
    challenge = SimpleNamespace(
        id=uuid4(), code="123456", expired_at=get_now() + timedelta(minutes=2),
        purpose=otp.VERIFY_EMAIL, pending_password_hash="pending-hash",
    )
    security = SimpleNamespace(hash_password=AsyncMock(return_value="owner-password-hash"))
    db = SimpleNamespace(
        scalar=AsyncMock(side_effect=[user, challenge, challenge.id]),
        commit=AsyncMock(), rollback=AsyncMock(), refresh=AsyncMock(),
    )
    service = AuthService(
        db=db, security=security,
        wallet_service=SimpleNamespace(get_or_create_wallet_async=AsyncMock()),
    )
    service._create_session = AsyncMock(return_value={"session_id": str(uuid4())})
    service._broadcast_new_session = AsyncMock()

    await service.verify_email_async(
        VerifyEmail(email=user.email, code=challenge.code, new_password="user-chosen-password"), Response(),
        request=dpop_login.request("verify-email"),
    )
    assert user.password == "owner-password-hash" and user.is_verified_email
    security.hash_password.assert_awaited_once_with("user-chosen-password")
