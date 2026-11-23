import base64
import hashlib
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit
import pytest
from fastapi import HTTPException, Response
from app.services.shares import github_auth as auth
from app.agent import github_connection as gh


@pytest.mark.parametrize('path', ['https://evil.test', '//evil.test', '/\\evil', '/\n/evil', '/\t/evil', None])
def test_return_path_rejects_external_redirects(path):
    assert auth.return_path(path) == '/'


def test_internal_return_path():
    assert auth.return_path('/learning/python?q=1') == '/learning/python?q=1'


@pytest.mark.asyncio
async def test_login_pkce_nonce_and_minimal_scopes(monkeypatch):
    states = {}

    async def save(key, value, *, ex, nx):
        assert ex == 600 and nx is True
        if key in states:
            return False
        states[key] = value
        return True

    async def consume(key):
        return states.pop(key, None)

    redis = SimpleNamespace(set=save, getdel=consume)
    monkeypatch.setattr(auth.settings, 'AUTH_ALLOW_COOKIE_COMPAT', True)
    monkeypatch.setattr(gh, 'get_redis', lambda: redis)
    monkeypatch.setattr(auth, 'get_redis', lambda: redis)
    monkeypatch.setattr(gh, 'configured', lambda: True)
    response = Response()
    result = await auth.begin_login(response, '//evil.test')
    query = parse_qs(urlsplit(result['authorize_url']).query)
    assert query['scope'] == ['read:user user:email']
    assert query['code_challenge_method'] == ['S256']
    state = query['state'][0]
    saved = json.loads(states[f'github:oauth:{state}'])
    challenge = base64.urlsafe_b64encode(hashlib.sha256(saved['verifier'].encode()).digest()).decode().rstrip('=')
    assert query['code_challenge'] == [challenge]
    assert saved['purpose'] == 'login' and saved['return_to'] == '/'
    assert 'HttpOnly' in response.headers['set-cookie']
    nonce = response.headers['set-cookie'].split(';')[0].split('=', 1)[1]
    assert saved['nonce_hash'] == hashlib.sha256(nonce.encode()).hexdigest()
    assert (await auth.consume_login_state(state, nonce))['purpose'] == 'login'
    with pytest.raises(HTTPException) as exc:
        await auth.consume_login_state(state, nonce)
    assert exc.value.status_code == 400

    other = await auth.begin_login(Response())
    other_state = parse_qs(urlsplit(other['authorize_url']).query)['state'][0]
    with pytest.raises(HTTPException) as exc:
        await auth.consume_login_state(other_state, nonce)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_expired_repo_token_rotates_encrypted_refresh(monkeypatch):
    from datetime import datetime, timedelta, timezone
    monkeypatch.setattr(gh.settings, 'SECRET_KEY', 'test-key')
    row = SimpleNamespace(token_expires_at=datetime.now(timezone.utc)-timedelta(seconds=1),
        encrypted_token=gh.cipher().encrypt(b'old').decode(),
        encrypted_refresh_token=gh.cipher().encrypt(b'old-refresh').decode(), scopes='repo')
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, **kwargs):
            assert kwargs['data']['refresh_token'] == 'old-refresh'
            return SimpleNamespace(status_code=200, json=lambda: {'access_token':'new', 'refresh_token':'new-refresh', 'expires_in':28800})
    monkeypatch.setattr(gh.httpx, 'AsyncClient', lambda **kwargs: Client())
    db = SimpleNamespace(scalar=AsyncMock(return_value=row), commit=AsyncMock(), rollback=AsyncMock())
    assert await gh.token_for(db, '00000000-0000-0000-0000-000000000001') == 'new'
    assert gh.cipher().decrypt(row.encrypted_refresh_token.encode()) == b'new-refresh'
    assert row.token_expires_at > datetime.now(timezone.utc)
    db.commit.assert_awaited_once()
