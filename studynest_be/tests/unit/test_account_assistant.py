"""Account SQL isolation, OAuth identity binding, and lifetime memory contracts."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4
from urllib.parse import urlparse, parse_qs
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.agent.sql_sandbox import query_snapshot
from app.agent.memory import MemoryConsentInput
from app.agent import github_connection as gh
from app.agent.tools import AccountSQL

DATA = {'my_courses': [('course-one', 'Python', 25, '2026-01-01')], 'my_progress': [('course-one', 'lesson-one', 'Intro', 1)]}


def test_sql_aggregate_and_limits():
    assert query_snapshot('SELECT SUM(completed) FROM my_progress', DATA)['rows'] == [[1]]
    lots = {'my_courses': [(str(i), 'Course', 0, None) for i in range(501)]}
    assert query_snapshot('SELECT count(*) FROM my_courses', lots)['rows'] == [[500]]
    result = query_snapshot('SELECT * FROM my_courses', lots)
    assert len(result['rows']) == 100 and result['truncated'] and result['snapshot_truncated']


@pytest.mark.parametrize('sql', [
    'DELETE FROM my_courses', 'CREATE TABLE leak(x)', "ATTACH DATABASE '/tmp/leak' AS leak",
    'PRAGMA database_list', 'SELECT * FROM sqlite_master', "SELECT load_extension('/tmp/x')",
    'SELECT randomblob(999999999)', 'SELECT 1; SELECT 2',
    'WITH RECURSIVE infinite(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM infinite) SELECT * FROM infinite',
])
def test_sql_rejects_escape_and_expensive_functions(sql):
    with pytest.raises(ValueError): query_snapshot(sql, DATA)


def test_caller_cannot_inject_another_account_or_unbounded_memory_policy():
    with pytest.raises(ValidationError): AccountSQL(sql='SELECT * FROM my_courses', user_id=str(uuid4()))
    assert MemoryConsentInput(enabled=True).retention_days is None
    with pytest.raises(ValidationError): MemoryConsentInput(enabled=True, retention_days=10000)


@pytest.fixture
def oauth(monkeypatch):
    monkeypatch.setattr(gh.settings, 'GITHUB_OAUTH_CLIENT_ID', 'test-client')
    monkeypatch.setattr(gh.settings, 'GITHUB_OAUTH_CLIENT_SECRET', 'test-secret')
    monkeypatch.setattr(gh.settings, 'SECRET_KEY', 'test-encryption-key')
    redis = SimpleNamespace(set=AsyncMock(return_value=True), getdel=AsyncMock())
    monkeypatch.setattr(gh, 'get_redis', lambda: redis)
    return redis


@pytest.mark.asyncio
async def test_oauth_uses_pkce_and_one_use_state_bound_to_owner_and_login(oauth):
    owner, sid = uuid4(), uuid4()
    response = await gh.begin(None, owner, sid)
    params = parse_qs(urlparse(response['authorize_url']).query)
    assert params['code_challenge_method'] == ['S256']
    assert len(params['code_challenge'][0]) == 43
    stored = json.loads(oauth.set.call_args.args[1])
    assert stored['user_id'] == str(owner) and stored['sid'] == str(sid)
    assert oauth.set.call_args.kwargs['ex'] == 600
    oauth.getdel.return_value = json.dumps(stored)
    with pytest.raises(HTTPException) as exc:
        await gh.complete(None, uuid4(), sid, params['state'][0], 'unused-code')
    assert exc.value.status_code == 403
    oauth.getdel.return_value = None
    with pytest.raises(HTTPException) as exc:
        await gh.complete(None, owner, sid, params['state'][0], 'unused-code')
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_github_tokens_stay_encrypted_and_owner_scoped(oauth):
    user_id = uuid4()
    token = 'test-not-a-real-token'
    encrypted = gh.cipher().encrypt(token.encode()).decode()
    assert token not in encrypted
    row = SimpleNamespace(login='learner', encrypted_token=encrypted, token_expires_at=None)
    db = SimpleNamespace(get=AsyncMock(return_value=row), scalar=AsyncMock(return_value=row), commit=AsyncMock(), rollback=AsyncMock())
    assert await gh.token_for(db, user_id) == token
    assert user_id in db.scalar.call_args.args[0].compile().params.values()
    status = await gh.connection_status(db, user_id)
    assert 'token' not in json.dumps(status)
    db.scalar.return_value = None
    with pytest.raises(HTTPException) as exc: await gh.token_for(db, uuid4())
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_legacy_sql_cannot_bypass_the_sandbox():
    import httpx
    from app.main import app
    from app.core.deps import AuthorizationService
    from app.api.v1.user.chat_sql import get_text_to_sql_service
    auth = SimpleNamespace(get_current_user=AsyncMock(return_value=SimpleNamespace(id=uuid4())))
    unsafe_factory = AsyncMock(side_effect=AssertionError('Legacy SQL service must not execute'))
    original = dict(app.dependency_overrides)
    app.dependency_overrides[AuthorizationService] = lambda: auth
    app.dependency_overrides[get_text_to_sql_service] = unsafe_factory
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://fixture') as client:
            response = await client.post('/api/v1/chat-sql/complete', json={'question':'Read database', 'previous_sql':'SELECT * FROM public.user'})
        assert response.status_code == 410
        unsafe_factory.assert_not_called()
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(original)


@pytest.mark.asyncio
async def test_connected_github_transport_failure_clears_task_local_credential(monkeypatch):
    import httpx
    from app.agent.github_access import github_access_token
    from app.agent import mcp_server
    from app.agent.tools import external_handler, GithubRepository
    monkeypatch.setattr(gh, 'token_for', AsyncMock(return_value='not-a-real-token'))
    monkeypatch.setattr(mcp_server, 'github_repository', AsyncMock(side_effect=httpx.ConnectError('offline')))
    ctx = SimpleNamespace(db=None, user=SimpleNamespace(id=uuid4()), sources=[])
    with pytest.raises(HTTPException) as exc:
        await external_handler('github_repository')(ctx, GithubRepository(owner='learner', repo='demo'))
    assert exc.value.status_code == 502
    assert github_access_token.get() is None
    assert 'not-a-real-token' not in str(exc.value.detail)
