"""GitHub identity lifecycle using only the explicit disposable test database."""
import os
from uuid import uuid4
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException, Response
from sqlalchemy import select
from app.services.shares import github_auth as auth
from app.db.models.database import User, Sessions
from app.db.models.github_identity import GitHubIdentity
from app.services.shares.auth import AuthService
from app.core.security import SecurityService

pytestmark = [pytest.mark.asyncio, pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'), reason='Scratch DB required')]


async def test_signup_session_and_stable_identity(db_session, monkeypatch):
    email = f'{uuid4()}@example.test'
    verified = AsyncMock(return_value=email)
    monkeypatch.setattr(auth, 'verified_email', verified)
    profile = {'id': uuid4().int % (2**62), 'login':'fixture'}
    user = await auth.resolve_user(db_session, profile, 'fixture-token')
    assert user.is_verified_email and user.email == email
    assert (await db_session.get(GitHubIdentity, profile['id'])).user_id == user.id
    service = AuthService(db=db_session, security=SecurityService(), mail_service=None, wallet_service=None)
    response = Response()
    result = await service._create_session(user.id, response, 'test', '127.0.0.1')
    await db_session.flush()
    session = await db_session.scalar(select(Sessions).where(Sessions.id == result['session_id']))
    assert session.user_id == user.id
    assert all('HttpOnly' in c for c in response.headers.getlist('set-cookie'))
    verified.reset_mock()
    again = await auth.resolve_user(db_session, profile, 'fixture-token')
    assert again.id == user.id
    verified.assert_not_awaited()
    user.is_banned = True
    await db_session.flush()
    with pytest.raises(HTTPException) as exc:
        await auth.resolve_user(db_session, profile, 'fixture-token')
    assert exc.value.status_code == 403


@pytest.mark.parametrize('verified', [True, False])
async def test_existing_email_link_requires_local_verification(db_session, monkeypatch, verified):
    email = f'{uuid4()}@example.test'
    user = User(fullname='Fixture', password='unused', email=email, is_verified_email=verified)
    db_session.add(user)
    await db_session.flush()
    monkeypatch.setattr(auth, 'verified_email', AsyncMock(return_value=email))
    profile = {'id': uuid4().int % (2**62), 'login':'fixture'}
    if verified:
        assert (await auth.resolve_user(db_session, profile, 'fixture-token')).id == user.id
    else:
        with pytest.raises(HTTPException) as exc:
            await auth.resolve_user(db_session, profile, 'fixture-token')
        assert exc.value.status_code == 409
