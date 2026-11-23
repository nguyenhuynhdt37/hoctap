import asyncio
import hashlib
import json
import secrets
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import httpx
import jwt
import pytest
from fastapi import FastAPI
from redis.exceptions import ConnectionError

from app.api.v1.shares import auth as routes
from app.core import security
from app.core.deps import AuthorizationService
from app.core.security import AuthError, SecurityService, auth_error_response
from app.services.shares import github_auth
from app.services.shares.auth import AuthService
from tests.unit.test_dpop_proof import b64, key, public_jwk

ORIGIN = "https://api.example"
FRONTEND = "https://app.example"
START = "/api/v1/auth/github/start"
EXCHANGE = "/api/v1/auth/github/exchange"
CALLBACK = "/api/v1/agent/github/callback"
VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"


class RedisMemory:
    def __init__(self):
        self.entries = {}
        self.clock = 0
        self.unavailable = False
        self.counters = {}

    def pipeline(self, *, transaction):
        redis = self

        class CounterPipeline:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                pass

            def incr(self, key):
                self.key = key
                return self

            def expire(self, key, seconds):
                return self

            async def execute(self):
                if redis.unavailable:
                    raise ConnectionError()
                redis.counters[self.key] = redis.counters.get(self.key, 0) + 1
                return redis.counters[self.key], True

        return CounterPipeline()

    async def set(self, key, value, *, ex, nx):
        if self.unavailable:
            raise ConnectionError()
        if nx and await self.get(key) is not None:
            return None
        self.entries[key] = (value, self.clock + ex)
        return True

    async def get(self, key):
        if self.unavailable:
            raise ConnectionError()
        value, expiration = self.entries.get(key, (None, 0))
        return value if expiration > self.clock else None

    async def getdel(self, key):
        value = await self.get(key)
        self.entries.pop(key, None)
        return value


def proof(key, path):
    return {"DPoP": jwt.encode({
        "htm": "POST", "htu": ORIGIN + path, "iat": int(time.time()),
        "jti": secrets.token_urlsafe(16),
    }, key, algorithm="ES256", headers={"typ": "dpop+jwt", "jwk": public_jwk(key)})}


@pytest.fixture
async def flow(monkeypatch):
    from app.api.v1.user.agent import router as agent_router

    settings = security.settings
    monkeypatch.setattr(settings, "PUBLIC_API_URL", ORIGIN)
    monkeypatch.setattr(settings, "FRONTEND_URL", FRONTEND)
    monkeypatch.setattr(settings, "GITHUB_OAUTH_REDIRECT_URI", ORIGIN + CALLBACK)
    monkeypatch.setattr(settings, "GITHUB_OAUTH_CLIENT_ID", "github-app")
    monkeypatch.setattr(settings, "GITHUB_OAUTH_CLIENT_SECRET", "github-secret")
    monkeypatch.setattr(settings, "SECRET_KEY", "test-secret")
    monkeypatch.setattr(settings, "JWT_SECRET", "test-signing-secret-32-characters")
    monkeypatch.setattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 10)
    monkeypatch.setattr(settings, "AUTH_ALLOW_COOKIE_COMPAT", False)
    redis = RedisMemory()
    for module in [github_auth, github_auth.github, security]:
        monkeypatch.setattr(module, "get_redis", lambda: redis)

    user = SimpleNamespace(id=uuid4(), deleted_at=None, is_banned=False, last_login_at=None)
    sessions = []
    db = SimpleNamespace(
        get=AsyncMock(side_effect=lambda model, ident, **kw: user if ident == user.id else None),
        commit=AsyncMock(), rollback=AsyncMock(), add=sessions.append,
    )

    async def flush():
        for session in sessions:
            if not session.id:
                session.id = uuid4()

    db.flush = flush
    service = AuthService(db=db, security=SecurityService(), mail_service=None, wallet_service=None)
    service._broadcast_new_session = AsyncMock()
    monkeypatch.setattr(github_auth, "resolve_user", AsyncMock(return_value=user))

    fake_github_requests = []
    http_client = httpx.AsyncClient

    def github_response(request):
        fake_github_requests.append(request)
        if request.url.path == "/login/oauth/access_token":
            return httpx.Response(200, json={"access_token": "provider-token"})
        if request.url.path == "/user":
            assert request.headers["Authorization"] == "Bearer provider-token"
            return httpx.Response(200, json={"id": 42, "login": "fixture"})
        return httpx.Response(404)

    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: http_client(
        transport=httpx.MockTransport(github_response), **kw,
    ))
    app = FastAPI(exception_handlers={AuthError: auth_error_response})
    app.include_router(routes.router, prefix="/api/v1")
    app.include_router(agent_router, prefix="/api/v1")
    app.dependency_overrides[AuthService] = lambda: service
    app.dependency_overrides[AuthorizationService] = object
    async with http_client(transport=httpx.ASGITransport(app=app), base_url=ORIGIN) as client:
        yield SimpleNamespace(client=client, redis=redis, user=user, sessions=sessions,
                              provider_requests=fake_github_requests, settings=settings)


async def begin(flow, key, redirect="/my-learning?q=1"):
    response = await flow.client.post(START, headers=proof(key, START), json={
        "redirect_to": redirect, "code_challenge": CHALLENGE,
    })
    assert response.status_code == 200, response.text
    assert "set-cookie" not in response.headers
    assert response.headers["cache-control"] == "no-store"
    return parse_qs(urlsplit(response.json()["authorize_url"]).query)


async def callback(flow, state, **params):
    return await flow.client.get(CALLBACK, params={"state": state, **params})


async def redeem(flow, key, code, verifier=VERIFIER, headers=None):
    return await flow.client.post(EXCHANGE, headers=proof(key, EXCHANGE) if headers is None else headers,
                                  json={"code": code, "code_verifier": verifier})


async def test_dpop_github_round_trip_with_concurrent_exchange(flow, key):
    query = await begin(flow, key)
    assert query["code_challenge_method"] == ["S256"]
    assert query["code_challenge"] != [CHALLENGE]
    state = query["state"][0]
    response = await callback(flow, state, code="provider-code")
    assert response.status_code == 303
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["cache-control"] == "no-store"
    assert "set-cookie" not in response.headers
    location = urlsplit(response.headers["location"])
    assert location._replace(query="").geturl() == FRONTEND + "/auth/github/callback"
    params = parse_qs(location.query)
    assert set(params) == {"code"}
    code = params["code"][0]
    assert len(code) == 43
    assert not flow.sessions
    provider_form = parse_qs(flow.provider_requests[0].content.decode())
    assert provider_form["code"] == ["provider-code"]
    assert b64(hashlib.sha256(provider_form["code_verifier"][0].encode()).digest()) == query["code_challenge"][0]

    replay = await callback(flow, state, code="provider-code")
    assert "code=" not in replay.headers.get("location", "")
    assert len(flow.provider_requests) == 2
    responses = await asyncio.gather(redeem(flow, key, code), redeem(flow, key, code))
    assert sorted(r.status_code for r in responses) == [200, 401]
    success = next(r for r in responses if r.status_code == 200)
    tokens = success.json()
    assert success.headers["cache-control"] == "no-store"
    assert "set-cookie" not in success.headers
    assert tokens["token_type"] == "DPoP"
    assert tokens["redirect_to"] == "/my-learning?q=1"
    assert tokens["expires_in"] == 600
    claims = jwt.decode(tokens["access_token"], flow.settings.JWT_SECRET, algorithms=[flow.settings.ALGORITHM])
    assert len(flow.sessions) == 1
    session = flow.sessions[0]
    assert claims["cnf"]["jkt"] == session.dpop_jkt
    assert claims["sid"] == tokens["session_id"] == str(session.id)
    assert claims["sub"] == str(flow.user.id)
    assert session.refresh_token_hash == await SecurityService.hash_token(tokens["refresh_token"])


@pytest.mark.parametrize("redirect", ["//evil.example", "/%2Fevil.example", "/%5Cevil.example", "/a/..//evil.example"])
async def test_dpop_github_requires_verifier_and_key_and_sanitizes_redirect(flow, key, redirect):
    from cryptography.hazmat.primitives.asymmetric import ec

    query = await begin(flow, key, redirect)
    result = await callback(flow, query["state"][0], code="provider-code")
    code = parse_qs(urlsplit(result.headers["location"]).query)["code"][0]
    missing = await redeem(flow, key, code, headers={})
    assert missing.status_code == 401 and missing.json()["code"] == "invalid_dpop_proof"
    wrong_key = await redeem(flow, ec.generate_private_key(ec.SECP256R1()), code)
    wrong_verifier = await redeem(flow, key, code, verifier="a" * 43)
    unknown_code = await redeem(flow, key, "a" * 43)
    assert wrong_key.status_code == wrong_verifier.status_code == unknown_code.status_code == 401
    assert wrong_key.json() == wrong_verifier.json() == unknown_code.json()
    assert not flow.sessions
    success = await redeem(flow, key, code)
    assert success.status_code == 200 and success.json()["redirect_to"] == "/"


async def test_state_and_exchange_expire_and_cancel_is_generic(flow, key):
    expired = await begin(flow, key)
    flow.redis.clock += 600
    expired_result = await callback(flow, expired["state"][0], code="provider-code")
    assert "code=" not in expired_result.headers.get("location", "")
    assert not flow.provider_requests

    canceled = await begin(flow, key)
    canceled_result = await callback(flow, canceled["state"][0], error="private-details")
    assert canceled_result.headers["location"] == FRONTEND + "/auth/github/callback?error=github_login_failed"
    assert "set-cookie" not in canceled_result.headers
    assert not flow.provider_requests

    valid = await begin(flow, key)
    result = await callback(flow, valid["state"][0], code="provider-code")
    code = parse_qs(urlsplit(result.headers["location"]).query)["code"][0]
    flow.redis.clock += 60
    assert (await redeem(flow, key, code)).status_code == 401
    assert not flow.sessions


async def test_cookie_start_and_callback_keep_legacy_behavior(flow):
    flow.settings.AUTH_ALLOW_COOKIE_COMPAT = True
    response = await flow.client.post(START, json={"redirect_to": "/my-learning"})
    assert response.status_code == 200 and "maymay_github_login=" in response.headers["set-cookie"]
    query = parse_qs(urlsplit(response.json()["authorize_url"]).query)
    result = await callback(flow, query["state"][0], code="provider-code")
    assert result.headers["location"] == FRONTEND + "/my-learning"
    names = {cookie.split("=")[0] for cookie in result.headers.get_list("set-cookie")}
    assert names == {"access_token", "refresh_token", "maymay_github_login"}
    assert len(flow.sessions) == 1 and flow.sessions[0].dpop_jkt is None


async def test_invalid_dpop_start_proof_does_not_fall_back_to_cookie(flow, key):
    flow.settings.AUTH_ALLOW_COOKIE_COMPAT = True
    body = {"code_challenge": CHALLENGE}
    response = await flow.client.post(START, headers=proof(key, EXCHANGE), json=body)
    assert response.status_code == 401 and "set-cookie" not in response.headers


async def test_callback_rejects_state_without_matching_digest(flow, key):
    query = await begin(flow, key)
    state = query["state"][0]
    redis_key = "github:oauth:" + state
    saved = json.loads(await flow.redis.get(redis_key))
    saved["state_hash"] = "0" * 64
    await flow.redis.set(redis_key, json.dumps(saved), ex=600, nx=False)
    result = await callback(flow, state, code="provider-code")
    assert result.headers["location"] == FRONTEND + "/auth/github/callback?error=github_login_failed"
    assert not flow.provider_requests


async def test_redis_unavailability_fails_closed(flow, key):
    query = await begin(flow, key)
    response = await callback(flow, query["state"][0], code="provider-code")
    code = parse_qs(urlsplit(response.headers["location"]).query)["code"][0]
    flow.redis.unavailable = True
    result = await redeem(flow, key, code)
    assert result.status_code == 503 and result.headers["cache-control"] == "no-store"
    assert "set-cookie" not in result.headers and not flow.sessions


async def test_ban_between_callback_and_exchange_prevents_session_creation(flow, key):
    query = await begin(flow, key)
    response = await callback(flow, query["state"][0], code="provider-code")
    code = parse_qs(urlsplit(response.headers["location"]).query)["code"][0]
    flow.user.is_banned = True
    result = await redeem(flow, key, code)
    assert result.status_code == 401 and result.json()["code"] == "invalid_token"
    assert not flow.sessions


def test_github_logs_hide_oauth_codes_and_state():
    from app.core.log_redaction import redact

    for path in [CALLBACK, "/api/agent/github/callback", "/auth/github/callback"]:
        message = redact(f'GET {path}?code=private-code&state=private-state&view=1 HTTP/1.1')
        assert "private-code" not in message and "private-state" not in message
        assert "view=1" in message
        assert "private-code" not in redact(f"GET {path}?%63ode=private-code HTTP/1.1")
    assert redact({"code_verifier": "private-verifier", "code": "private-exchange"}) == {
        "code_verifier": "[REDACTED]", "code": "[REDACTED]",
    }
