"""Forgot/reset password against real PostgreSQL transactions with the mailer and limiters stubbed."""

from datetime import timedelta
from unittest.mock import AsyncMock
from urllib.parse import quote
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.core.security import SecurityService
from app.core.settings import settings
from app.db.models.database import EmailVerifications, User
from app.libs.formats.datetime import now as get_now
from app.schemas.auth.user import ForgotPasswordRequest, ResetPasswordRequest
from app.services.shares import auth

pytestmark = pytest.mark.asyncio
RESET = "reset-password"


@pytest.fixture
def service_factory(monkeypatch):
    revoke = AsyncMock()
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://app.example-mail.com")
    monkeypatch.setattr(auth, "limit_issue_async", AsyncMock())
    monkeypatch.setattr(auth, "limit_attempt_async", AsyncMock())
    monkeypatch.setattr(auth, "revoke_user_sessions_async", revoke)
    mailer = AsyncMock()

    def make(db):
        service = auth.AuthService(db=db, security=SecurityService(), mail_service=mailer, wallet_service=None)
        return service, mailer, revoke

    return make


async def add_user(db, **fields):
    fields.setdefault("email", f"{uuid4().hex}@example-mail.com")
    user = User(fullname="Test user", password="old-hash", is_verified_email=True, **fields)
    db.add(user)
    await db.commit()
    return user


async def reset_rows(db, user_id):
    result = await db.execute(
        select(EmailVerifications).where(
            EmailVerifications.user_id == user_id, EmailVerifications.purpose == RESET,
        )
    )
    return result.scalars().all()


async def request_code(service, mailer, email):
    await service.forgot_password_async(ForgotPasswordRequest(email=email))
    return mailer.send_reset_password_email.call_args.kwargs


async def test_unknown_email_is_reported_as_not_registered(db_session, service_factory):
    service, mailer, _ = service_factory(db_session)

    with pytest.raises(HTTPException) as error:
        await service.forgot_password_async(ForgotPasswordRequest(email=f"{uuid4().hex}@example-mail.com"))

    assert error.value.status_code == 404
    assert error.value.detail["error_code"] == "ACCOUNT_NOT_FOUND"
    mailer.send_reset_password_email.assert_not_awaited()


@pytest.mark.parametrize("pattern", ["%@example-mail.com", "_%@example-mail.com", "%"])
async def test_wildcards_in_the_address_never_match_another_account(db_session, service_factory, pattern):
    victim = await add_user(db_session)
    service, mailer, _ = service_factory(db_session)
    email = pattern if "@" in pattern else f"{pattern}@example-mail.com"

    with pytest.raises(HTTPException) as error:
        await service.forgot_password_async(ForgotPasswordRequest(email=email))

    assert error.value.status_code == 404
    mailer.send_reset_password_email.assert_not_awaited()
    assert await reset_rows(db_session, victim.id) == []


async def test_stored_mixed_case_email_still_receives_the_code(db_session, service_factory):
    user = await add_user(db_session, email=f"Mixed.{uuid4().hex}@Example-Mail.com")
    service, mailer, _ = service_factory(db_session)

    sent = await request_code(service, mailer, user.email.upper())

    assert sent["email"] == user.email  # mail goes to the address as stored
    assert len(await reset_rows(db_session, user.id)) == 1


async def test_rate_limit_runs_before_the_account_lookup(db_session, service_factory, monkeypatch):
    limiter = AsyncMock(side_effect=HTTPException(429, "slow down"))
    monkeypatch.setattr(auth, "limit_issue_async", limiter)
    service, mailer, _ = service_factory(db_session)
    monkeypatch.setattr(auth, "limit_issue_async", limiter)

    with pytest.raises(HTTPException) as error:
        await service.forgot_password_async(ForgotPasswordRequest(email=f"{uuid4().hex}@example-mail.com"))

    assert error.value.status_code == 429
    limiter.assert_awaited_once()
    mailer.send_reset_password_email.assert_not_awaited()


@pytest.mark.parametrize("field,value,status_code", [("is_banned", True, 403), ("deleted_at", get_now(), 404)])
async def test_inactive_accounts_get_no_code(db_session, service_factory, field, value, status_code):
    user = await add_user(db_session, **{field: value})
    service, mailer, _ = service_factory(db_session)

    with pytest.raises(HTTPException) as error:
        await service.forgot_password_async(ForgotPasswordRequest(email=user.email))

    assert error.value.status_code == status_code
    mailer.send_reset_password_email.assert_not_awaited()
    assert await reset_rows(db_session, user.id) == []


async def test_code_is_mailed_in_plain_text_but_stored_hashed_and_replaced_on_resend(db_session, service_factory):
    user = await add_user(db_session)
    service, mailer, _ = service_factory(db_session)

    first = await request_code(service, mailer, user.email)
    rows = await reset_rows(db_session, user.id)
    assert len(rows) == 1
    assert rows[0].code != first["code"] and len(rows[0].code) == 64
    assert first["reset_link"] == (
        f"https://app.example-mail.com/reset-password?email={quote(user.email)}&code={quote(first['code'])}"
    )

    await request_code(service, mailer, user.email)
    assert len(await reset_rows(db_session, user.id)) == 1


async def test_correct_code_sets_password_and_revokes_sessions_once(db_session, service_factory):
    user = await add_user(db_session)
    service, mailer, revoke = service_factory(db_session)
    code = (await request_code(service, mailer, user.email))["code"]

    result = await service.reset_password_async(
        ResetPasswordRequest(email=user.email, code=code, new_password="new-password-123")
    )

    assert "thành công" in result["message"]
    await db_session.refresh(user)
    assert await SecurityService().verify_password("new-password-123", user.password)
    assert not await SecurityService().verify_password("old-hash", user.password)
    revoke.assert_awaited_once()
    assert revoke.await_args.args[1] == user.id
    assert await reset_rows(db_session, user.id) == []
    with pytest.raises(HTTPException) as replay:
        await service.reset_password_async(
            ResetPasswordRequest(email=user.email, code=code, new_password="another-password")
        )
    assert replay.value.status_code == 400


async def test_wrong_code_leaves_password_untouched(db_session, service_factory):
    user = await add_user(db_session)
    service, mailer, revoke = service_factory(db_session)
    code = (await request_code(service, mailer, user.email))["code"]
    wrong = "000000" if code != "000000" else "111111"

    with pytest.raises(HTTPException) as error:
        await service.reset_password_async(
            ResetPasswordRequest(email=user.email, code=wrong, new_password="new-password-123")
        )

    assert error.value.status_code == 400
    assert error.value.detail["error_code"] == "INVALID_RESET_CODE"
    await db_session.refresh(user)
    assert user.password == "old-hash"
    revoke.assert_not_awaited()
    assert len(await reset_rows(db_session, user.id)) == 1


async def test_expired_code_is_rejected_and_removed(db_session, service_factory):
    user = await add_user(db_session)
    service, mailer, revoke = service_factory(db_session)
    code = (await request_code(service, mailer, user.email))["code"]
    (row,) = await reset_rows(db_session, user.id)
    row.expired_at = get_now() - timedelta(minutes=1)
    await db_session.commit()

    with pytest.raises(HTTPException) as error:
        await service.reset_password_async(
            ResetPasswordRequest(email=user.email, code=code, new_password="new-password-123")
        )

    assert error.value.status_code == 400
    await db_session.refresh(user)
    assert user.password == "old-hash"
    revoke.assert_not_awaited()
    assert await reset_rows(db_session, user.id) == []


async def test_code_for_another_account_does_not_work(db_session, service_factory):
    owner = await add_user(db_session)
    other = await add_user(db_session)
    service, mailer, _ = service_factory(db_session)
    code = (await request_code(service, mailer, owner.email))["code"]

    with pytest.raises(HTTPException) as error:
        await service.reset_password_async(
            ResetPasswordRequest(email=other.email, code=code, new_password="new-password-123")
        )

    assert error.value.status_code == 400
    await db_session.refresh(other)
    assert other.password == "old-hash"
