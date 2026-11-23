import hashlib
import json
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import Request

from app.agent import github_connection
from app.core.deps import AccessIdentity
from app.core.security import AuthError
from app.libs.formats.datetime import now_tzinfo
from app.services.shares import github_auth


async def test_github_link_callback_stages_only_and_finish_requires_same_session_and_key(monkeypatch):
    cache = {}
    redis = SimpleNamespace(
        get=AsyncMock(side_effect=cache.get),
        getdel=AsyncMock(side_effect=lambda key: cache.pop(key, None)),
    )

    async def store(key, value, *, ex, nx):
        assert ex == 60 and nx
        cache[key] = value
        return True
    redis.set = AsyncMock(side_effect=store)
    monkeypatch.setattr(github_connection, "get_redis", lambda: redis)
    monkeypatch.setattr(github_auth, "get_redis", lambda: redis)

    identity = AccessIdentity(uuid4(), uuid4(), int(now_tzinfo().timestamp()) + 60, "thumbprint")
    state = "s" * 43
    oauth_key = f"github:oauth:{state}"
    cache[oauth_key] = json.dumps({
        "purpose": "connect_dpop", "state_hash": hashlib.sha256(state.encode()).hexdigest(),
        "user_id": str(identity.user_id), "sid": str(identity.sid), "jkt": identity.jkt, "verifier": "provider-verifier",
    })
    session = SimpleNamespace(
        user_id=identity.user_id, is_revoked=False, dpop_jkt=identity.jkt,
        expired_at=now_tzinfo() + timedelta(minutes=1),
    )
    db = SimpleNamespace(scalar=AsyncMock(return_value=SimpleNamespace(is_banned=False, deleted_at=None)),
                         get=AsyncMock(return_value=session), rollback=AsyncMock())
    auth_service = SimpleNamespace(db=db)
    authorization = SimpleNamespace(get_current_identity=AsyncMock())
    provider = AsyncMock(return_value={"access_token": "provider-token"})
    profile = AsyncMock(return_value={"id": 42, "login": "github-user"})
    save = AsyncMock(return_value={"connected": True})
    monkeypatch.setattr(github_connection, "exchange_code", provider)
    monkeypatch.setattr(github_connection, "identity_profile", profile)
    monkeypatch.setattr(github_connection, "_store_connection_async", save)

    callback = await github_auth.callback_response_async(
        Request({"type": "http", "headers": []}), state, "provider-code", None, auth_service, authorization,
    )
    assert callback.status_code == 200 and callback.headers["cache-control"] == "no-store"
    event = callback.body.decode().split("postMessage(", 1)[1].split("},", 1)[0] + "}"
    handle = json.loads(event)["handle"]
    assert "provider-code" not in callback.body.decode()
    assert "provider-code" not in next(iter(cache.values()))
    assert oauth_key not in cache
    authorization.get_current_identity.assert_not_awaited()
    provider.assert_not_awaited()
    save.assert_not_awaited()

    for wrong in (
        AccessIdentity(identity.user_id, uuid4(), identity.expires_at, identity.jkt),
        AccessIdentity(identity.user_id, identity.sid, identity.expires_at, "another-key"),
    ):
        with pytest.raises(AuthError):
            await github_connection.finish_dpop_connection_async(db, wrong, handle)
    assert await github_connection.finish_dpop_connection_async(db, identity, handle) == {"connected": True}
    with pytest.raises(AuthError):
        await github_connection.finish_dpop_connection_async(db, identity, handle)
    save.assert_awaited_once_with(db, identity.user_id, {"id": 42, "login": "github-user"}, {"access_token": "provider-token"})
    provider.assert_awaited_once_with("provider-code", "provider-verifier")
