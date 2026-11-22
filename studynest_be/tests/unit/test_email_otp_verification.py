from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, Response

from app.libs.formats.datetime import now as get_now
from app.schemas.auth.user import VerifyEmail, VerifyOtp
from app.services.shares.auth import AuthService


class _ScalarResult:
    def __init__(self, item):
        self._item = item

    def first(self):
        return self._item

    def scalar_one_or_none(self):
        return self._item


@pytest.mark.asyncio
async def test_verify_email_rejects_wrong_otp_code():
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
        code="257030",
        expired_at=get_now() + timedelta(minutes=10),
    )
    db = SimpleNamespace(
        scalar=AsyncMock(return_value=user),
        scalars=AsyncMock(return_value=_ScalarResult(verification)),
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
        )
    assert exc.value.status_code == 400
    assert user.is_verified_email is False
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_verify_email_accepts_matching_otp_and_consumes_codes(monkeypatch):
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
        code="257030",
        expired_at=get_now() + timedelta(minutes=10),
    )
    db = SimpleNamespace(
        scalar=AsyncMock(return_value=user),
        scalars=AsyncMock(return_value=_ScalarResult(verification)),
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
    )
    assert result["user"]["is_verified_email"] is True
    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_verify_otp_login_blocks_banned_user():
    banned_user = SimpleNamespace(
        id=uuid4(),
        email="banned@example.com",
        deleted_at=None,
        is_banned=True,
    )
    db = SimpleNamespace(
        execute=AsyncMock(return_value=_ScalarResult(banned_user)),
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
        )
    assert exc.value.status_code == 403
