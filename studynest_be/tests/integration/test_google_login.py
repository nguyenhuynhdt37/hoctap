"""Google login with real PostgreSQL transactions and synthetic ID token claims."""

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import SecurityService
from app.core.settings import settings
from app.db.models.database import Role, Sessions, User, UserRoles
from app.db.models.user_identity import UserIdentity
from app.schemas.auth.user import GoogleLogin
from app.services.shares import auth

pytestmark = pytest.mark.asyncio
JKT = "a" * 43


@pytest.fixture
def google_login(monkeypatch):
    claims_by_credential = {}
    monkeypatch.setattr(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "test-client")
    monkeypatch.setattr(
        auth.id_token, "verify_oauth2_token",
        lambda credential, *_: claims_by_credential[credential],
    )
    monkeypatch.setattr(auth.AuthService, "_login_jkt", AsyncMock(return_value=JKT))
    monkeypatch.setattr(auth.AuthService, "_broadcast_new_session", AsyncMock())

    async def login(db, subject, **claims):
        credential = uuid4().hex
        claims_by_credential[credential] = {"sub": subject, "email_verified": True, **claims}
        security = SecurityService()
        service = auth.AuthService(db=db, security=security, mail_service=None, wallet_service=None)
        response = Response()
        result = await service.login_google_async(GoogleLogin(credential=credential), response)
        access_claims = await security.decode_access_token(result["access_token"])
        assert result["token_type"] == "DPoP"
        assert access_claims["cnf"] == {"jkt": JKT}
        assert not response.headers.getlist("set-cookie")
        return UUID(access_claims["sub"]), UUID(result["session_id"])

    return login


async def add_user(db, email, *, password="google-oauth", verified=True, **fields):
    user = User(email=email, fullname="Test user", password=password, is_verified_email=verified, **fields)
    db.add(user)
    await db.commit()
    return user


async def add_identity(db, user, subject):
    db.add(UserIdentity(
        provider="google", provider_subject=subject, user_id=user.id, email_at_link=user.email,
    ))
    await db.commit()


@pytest.mark.parametrize("include_email", [True, False])
async def test_linked_subject_survives_email_change(db_session, google_login, include_email):
    subject = uuid4().hex
    user = await add_user(db_session, f"{uuid4()}@example.test")
    await add_identity(db_session, user, subject)
    new_email_owner = await add_user(db_session, f"{uuid4()}@example.test")
    new_claims = {"email": new_email_owner.email} if include_email else {}

    user_id, session_id = await google_login(db_session, subject, **new_claims)

    assert user_id == user.id
    session = await db_session.get(Sessions, session_id)
    assert session.user_id == user.id and session.dpop_jkt == JKT
    identity = await db_session.get(UserIdentity, ("google", subject))
    assert identity.email_at_link == user.email != new_email_owner.email


@pytest.mark.parametrize("already_linked", [False, True])
async def test_reassigned_email_cannot_grant_account_access(db_session, google_login, already_linked):
    user = await add_user(db_session, f"{uuid4()}@example.test")
    if already_linked:
        await add_identity(db_session, user, uuid4().hex)

    with pytest.raises(HTTPException) as error:
        await google_login(db_session, uuid4().hex, email=user.email)

    assert error.value.status_code == 409


async def test_existing_personal_gmail_user_is_linked_once(db_session, google_login):
    user = await add_user(db_session, f"{uuid4().hex}@gmail.com")
    user_id, email = user.id, user.email
    subject = uuid4().hex

    assert (await google_login(db_session, subject, email=email))[0] == user_id
    identity = await db_session.get(UserIdentity, ("google", subject))
    assert identity.user_id == user_id and identity.email_at_link == email
    with pytest.raises(HTTPException) as error:
        await google_login(db_session, uuid4().hex, email=email)
    assert error.value.status_code == 409


@pytest.mark.parametrize(
    "password,verified,domain,extra_claims",
    [
        ("local-password-hash", True, "gmail.com", {}),
        ("", True, "gmail.com", {}),
        ("google-oauth", False, "gmail.com", {}),
        ("google-oauth", True, "workspace.example.test", {"hd": "workspace.example.test"}),
        ("google-oauth", True, "gmail.com", {"hd": "workspace.example.test"}),
    ],
)
async def test_same_email_requires_eligible_legacy_account(
    db_session, google_login, password, verified, domain, extra_claims,
):
    user = await add_user(db_session, f"{uuid4().hex}@{domain}", password=password, verified=verified)
    subject = uuid4().hex

    with pytest.raises(HTTPException) as error:
        await google_login(db_session, subject, email=user.email, **extra_claims)

    assert error.value.status_code == 409
    assert await db_session.get(UserIdentity, ("google", subject)) is None


@pytest.mark.parametrize("field, value", [("is_banned", True), ("deleted_at", datetime(2026, 1, 1))])
@pytest.mark.parametrize("already_linked", [False, True])
async def test_google_cannot_log_into_inactive_account(db_session, google_login, field, value, already_linked):
    user = await add_user(db_session, f"{uuid4().hex}@gmail.com", **{field: value})
    subject = uuid4().hex
    if already_linked:
        await add_identity(db_session, user, subject)

    with pytest.raises(HTTPException) as error:
        await google_login(db_session, subject, email=user.email)

    assert error.value.status_code == 403


async def test_database_rejects_same_subject_for_two_users(db_session):
    first = await add_user(db_session, f"{uuid4()}@example.test")
    second = await add_user(db_session, f"{uuid4()}@example.test")
    subject = uuid4().hex
    await add_identity(db_session, first, subject)
    with pytest.raises(IntegrityError, match="user_identities_pkey"):
        async with db_session.begin_nested():
            db_session.add(UserIdentity(
                provider="google", provider_subject=subject, user_id=second.id, email_at_link=second.email,
            ))
            await db_session.flush()


@pytest.mark.parametrize("same_email", [True, False])
async def test_concurrent_first_logins_commit_one_user_and_identity(async_engine, google_login, same_email):
    subject = uuid4().hex
    first_email = f"{uuid4()}@example.test"
    second_email = first_email if same_email else f"{uuid4()}@example.test"
    emails = (first_email, second_email)
    both_looked_up = asyncio.Barrier(2)

    class ConcurrentFirstLookupSession(AsyncSession):
        async def scalar(self, *args, **kwargs):
            result = await super().scalar(*args, **kwargs)
            if not self.info.get("first_lookup_finished"):
                self.info["first_lookup_finished"] = True
                assert result is None
                await both_looked_up.wait()
            return result

    async def login(email):
        async with ConcurrentFirstLookupSession(async_engine, expire_on_commit=False) as db:
            return await google_login(db, subject, email=email)

    try:
        async with asyncio.timeout(15), asyncio.TaskGroup() as tasks:
            first = tasks.create_task(login(first_email))
            second = tasks.create_task(login(second_email))
        first_id, first_session = first.result()
        second_id, second_session = second.result()
        assert first_id == second_id
        assert first_session != second_session

        async with AsyncSession(async_engine) as db:
            user = (await db.scalars(select(User).where(User.email.in_(emails)))).one()
            identity = (await db.scalars(select(UserIdentity).where(UserIdentity.user_id == user.id))).one()
            role = await db.scalar(select(Role.role_name).join(UserRoles).where(UserRoles.user_id == user.id))
            assert user.id == first_id and user.is_verified_email and user.password == ""
            assert identity.provider_subject == subject and identity.email_at_link == user.email
            assert role == "USER"
    finally:
        async with AsyncSession(async_engine) as db:
            await db.execute(delete(User).where(User.email.in_(emails)))
            await db.commit()
