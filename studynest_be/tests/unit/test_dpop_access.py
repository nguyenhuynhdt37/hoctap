import base64
import hashlib
import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Depends, FastAPI, WebSocket
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError

from app.agent import dictation
from app.api.v1.gamification import websocket as gamification
from app.api.v1.shares import notification
from app.api.v1.shares.auth import router
from app.api.v1.user import learning
from app.services.user import tutor_voice
from app.core import deps, security
from app.middleware.request_context import RequestContextMiddleware
from app.services.shares.auth import AuthService
from app.core.settings import settings


def b64(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def make_key():
    key = ec.generate_private_key(ec.SECP256R1())
    point = key.public_key().public_numbers()
    jwk = {"crv": "P-256", "kty": "EC", "x": b64(point.x.to_bytes(32, "big")),
           "y": b64(point.y.to_bytes(32, "big"))}
    jkt = b64(hashlib.sha256(json.dumps(jwk, sort_keys=True, separators=(",", ":")).encode()).digest())
    return key, jwk, jkt


def proof_for(key, jwk, token, method="GET", path="/me"):
    claims = {"htm": method, "htu": f"https://api.example{path}", "iat": int(time.time()), "jti": uuid4().hex}
    if token is not None:
        claims["ath"] = b64(hashlib.sha256(token.encode()).digest())
    return jwt.encode(claims, key, algorithm="ES256", headers={"typ": "dpop+jwt", "jwk": jwk})


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_API_URL", "https://api.example")
    monkeypatch.setattr(settings, "AUTH_ALLOW_COOKIE_COMPAT", True)
    monkeypatch.setattr(settings, "AUTH_ALLOW_UNBOUND_BEARER", True)
    monkeypatch.setattr(settings, "DPOP_JTI_FAIL_OPEN_ON_GET", True)
    key, jwk, jkt = make_key()
    seen = set()

    class Redis:
        async def set(self, name, value, *, nx, ex):
            assert nx and ex == 120
            if name in seen:
                return None
            seen.add(name)
            return True

    redis = Redis()
    monkeypatch.setattr(security, "get_redis", lambda: redis)
    app = FastAPI()
    app.add_exception_handler(security.AuthError, security.auth_error_response)
    app.add_middleware(RequestContextMiddleware)
    app.include_router(router, prefix="/api/v1")
    app.include_router(gamification.router)
    app.include_router(notification.router)
    app.include_router(learning.router)
    user = SimpleNamespace(
        id=uuid4(), user_roles=[], last_login_at=None, deleted_at=None, email="test@example.com",
        is_verified_email=True, is_banned=False, password="unused-test-hash",
    )
    session = SimpleNamespace(id=uuid4(), dpop_jkt=jkt, expired_at=None, is_revoked=False)
    from datetime import UTC, datetime, timedelta
    session.expired_at = datetime.now(UTC) + timedelta(minutes=5)
    db = SimpleNamespace(commit=AsyncMock(), refresh=AsyncMock(), rollback=AsyncMock())
    created = []

    def add(row):
        row.id = uuid4()
        created.append(row)

    async def execute(stmt):
        if stmt.column_descriptions[0]["entity"].__name__ == "User":
            return SimpleNamespace(scalar=lambda: user)
        return SimpleNamespace(scalar_one_or_none=lambda: session)

    db.add, db.flush, db.execute = add, AsyncMock(), execute

    async def scalar(stmt):
        if stmt.column_descriptions[0]["entity"].__name__ == "User":
            return user
        return None if session.is_revoked else session

    db.scalar = scalar

    signer = security.SecurityService()
    signer.verify_password = AsyncMock(return_value=True)
    service = AuthService(db, signer, None, None)
    app.dependency_overrides[deps.AuthorizationService] = lambda: deps.AuthorizationService(db, signer)
    app.dependency_overrides[AuthService] = lambda: service

    @app.api_route("/me", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    async def me(auth: deps.AuthorizationService = Depends(deps.AuthorizationService)):
        await auth.get_current_user()
        return {"sid": await auth.get_current_sid()}

    @app.api_route("/read-only", methods=["GET", "POST"])
    async def read_only(auth: deps.AuthorizationService = Depends(deps.AuthorizationService)):
        await auth.get_current_identity(allow_read_fallback=True)
        return {"ok": True}

    @app.websocket("/voice")
    async def voice_ws(websocket: WebSocket):
        await tutor_voice.run_tutor_voice(websocket)

    @app.websocket("/ws")
    async def ws(websocket: WebSocket):
        await websocket.accept()
        if await deps.AuthorizationService.get_require_role_ws(websocket):
            await websocket.send_json({"ok": True})

    @app.websocket("/dictation")
    async def dictation_ws(websocket: WebSocket):
        await dictation.run(websocket)

    class DBContext:
        async def __aenter__(self):
            return db

        async def __aexit__(self, *args):
            return None

    monkeypatch.setattr(deps, "AsyncSessionLocal", DBContext)
    with TestClient(app) as client:
        yield SimpleNamespace(client=client, key=key, jwk=jwk, jkt=jkt, redis=redis,
                              user=user, session=session, service=service, created=created, db=db)


@pytest.fixture
async def token(api):
    service = security.SecurityService()
    return await service.create_access_token(str(api.user.id), str(api.session.id), jkt=api.jkt)


async def test_bound_token_requires_proof_even_in_bearer_or_cookie(api, token):
    for credentials in ({"Authorization": f"Bearer {token}"}, {"Cookie": f"access_token={token}"},
                        {"Authorization": f"DPoP {token}"}):
        response = api.client.get("/me", headers=credentials)
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == 'DPoP error="use_dpop_proof"'
        assert response.json()["code"] == "invalid_dpop_proof"


async def test_replay_is_rejected_but_sid_lookup_can_reuse_request_auth(api, token):
    headers = {"Authorization": f"DPoP {token}", "DPoP": proof_for(api.key, api.jwk, token)}
    assert api.client.get("/me", headers=headers).json() == {"sid": str(api.session.id)}
    response = api.client.get("/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_dpop_proof"


async def test_valid_proof_with_wrong_key_is_rejected(api, token):
    key, jwk, _ = make_key()
    response = api.client.get("/me", headers={
        "Authorization": f"DPoP {token}", "DPoP": proof_for(key, jwk, token),
    })
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_dpop_proof"


async def test_replay_store_outage_fails_open_only_for_configured_get(api, token, monkeypatch):
    api.redis.set = AsyncMock(side_effect=ConnectionError)
    for method, path, expected in [
        ("GET", "/me", 503), ("GET", "/api/v1/auth/me", 503),
        ("GET", "/read-only", 200), ("POST", "/read-only", 503),
    ]:
        response = api.client.request(method, path, headers={
            "Authorization": f"DPoP {token}", "DPoP": proof_for(api.key, api.jwk, token, method, path),
        })
        assert response.status_code == expected
    api.db.commit.assert_not_awaited()

    monkeypatch.setattr(settings, "DPOP_JTI_FAIL_OPEN_ON_GET", False)
    response = api.client.get("/read-only", headers={
        "Authorization": f"DPoP {token}", "DPoP": proof_for(api.key, api.jwk, token, path="/read-only"),
    })
    assert response.status_code == 503

async def test_websocket_requires_bound_proof_in_first_frame(api, token):
    from starlette.websockets import WebSocketDisconnect

    with api.client.websocket_connect("/ws", headers={"Cookie": "access_token=old-cookie"}) as websocket:
        websocket.send_json({"type": "auth", "token": token, "dpop": proof_for(api.key, api.jwk, token, path="/ws")})
        assert websocket.receive_json() == {"type": "auth_ok"}
        assert websocket.receive_json() == {"ok": True}
    with api.client.websocket_connect("/ws") as websocket:
        websocket.send_json({"type": "ping"})
        with pytest.raises(WebSocketDisconnect) as error:
            websocket.receive_json()
        assert error.value.code == 4401


def test_login_binds_session_and_emits_no_cookies(api, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ALLOW_COOKIE_COMPAT", False)
    monkeypatch.setattr(settings, "AUTH_ALLOW_UNBOUND_BEARER", False)
    path = "/api/v1/auth/login"
    body = {"email": "test@example.com", "password": "test-only-password"}
    assert api.client.post(path, json=body).json()["code"] == "invalid_dpop_proof"
    assert api.client.post(path, json=body, headers={"DPoP": "bad-proof"}).status_code == 401
    assert not api.created

    headers = {"DPoP": proof_for(api.key, api.jwk, None, method="POST", path=path)}
    response = api.client.post(path, json=body, headers=headers)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "set-cookie" not in response.headers
    result = response.json()
    assert result["token_type"] == "DPoP"
    assert result["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    claims = jwt.decode(result["access_token"], api.service.security.secret_key, algorithms=[api.service.security.algorithm])
    assert claims["cnf"] == {"jkt": api.jkt}
    assert api.created[0].dpop_jkt == api.jkt
    assert result["session_id"] == str(api.created[0].id)


async def test_logout_requires_auth_and_only_revokes_the_authenticated_session(api, token):
    path = "/api/v1/auth/logout"
    assert api.client.post(path, params={"session_id": str(api.session.id)}).status_code == 401
    assert not api.session.is_revoked
    headers = {"Authorization": f"DPoP {token}", "DPoP": proof_for(api.key, api.jwk, token, "POST", path)}
    assert api.client.post(path, params={"session_id": str(uuid4())}, headers=headers).status_code == 401
    assert not api.session.is_revoked
    headers["DPoP"] = proof_for(api.key, api.jwk, token, "POST", path)
    response = api.client.post(path, params={"session_id": str(api.session.id)}, headers=headers)
    assert response.status_code == 200
    assert "set-cookie" not in response.headers
    assert api.session.is_revoked


def test_refresh_body_takes_priority_over_cookie(api):
    api.service.refresh_token_async = AsyncMock(return_value={"ok": True})
    response = api.client.post(
        "/api/v1/auth/refresh", json={"refresh_token": "body-value"}, headers={"Cookie": "refresh_token=cookie-value"},
    )
    assert response.status_code == 200
    call = api.service.refresh_token_async.await_args
    assert call.args[0] == "body-value"
    assert call.kwargs["from_cookie"] is False


async def test_legacy_bearer_and_cookie_have_independent_http_flags(api, monkeypatch):
    api.session.dpop_jkt = None
    token = await api.service.security.create_access_token(str(api.user.id), str(api.session.id))
    bearer = {"Authorization": f"Bearer {token}"}
    cookie = {"Cookie": f"access_token={token}"}
    assert api.client.get("/me", headers=bearer).status_code == 200
    assert api.client.get("/me", headers=cookie).status_code == 200
    monkeypatch.setattr(settings, "AUTH_ALLOW_COOKIE_COMPAT", False)
    assert api.client.get("/me", headers=bearer).status_code == 200
    assert api.client.get("/me", headers=cookie).status_code == 401
    monkeypatch.setattr(settings, "AUTH_ALLOW_UNBOUND_BEARER", False)
    assert api.client.get("/me", headers=bearer).status_code == 401


async def test_expired_access_with_valid_proof_has_refreshable_code(api):
    signer = security.SecurityService()
    signer.access_token_expire_minutes = -1
    token = await signer.create_access_token(str(api.user.id), str(api.session.id), jkt=api.jkt)
    response = api.client.get("/me", headers={
        "Authorization": f"DPoP {token}", "DPoP": proof_for(api.key, api.jwk, token),
    })
    assert response.status_code == 401
    assert response.json()["code"] == "token_expired"


async def test_websocket_query_only_accepts_legacy_bearer(api, token):
    from starlette.websockets import WebSocketDisconnect

    with api.client.websocket_connect("/ws?access_token=" + token) as websocket:
        with pytest.raises(WebSocketDisconnect) as error:
            websocket.receive_json()
        assert error.value.code == 4401

    api.session.dpop_jkt = None
    old = await api.service.security.create_access_token(str(api.user.id), str(api.session.id))
    with api.client.websocket_connect("/ws?access_token=" + old) as websocket:
        assert websocket.receive_json() == {"ok": True}


def test_websocket_closes_if_first_frame_does_not_arrive_within_five_seconds(api):
    from starlette.websockets import WebSocketDisconnect

    with api.client.websocket_connect("/ws") as websocket:
        with pytest.raises(WebSocketDisconnect) as error:
            websocket.receive_json()
        assert error.value.code == 4401


async def test_dictation_accepts_bound_frame_before_acquiring_provider_lease(api, token, monkeypatch):
    principal = AsyncMock()
    # Another lease occupies the account, so an authenticated request gets
    # the lease error without contacting the transcription provider.
    lease = AsyncMock(return_value=False)
    monkeypatch.setattr(dictation, "enabled", lambda: None)
    monkeypatch.setattr(dictation, "principal", principal)
    monkeypatch.setattr(dictation, "get_redis", lambda: SimpleNamespace(set=lease))
    with api.client.websocket_connect("/dictation") as websocket:
        websocket.send_json({
            "type": "auth", "token": token,
            "dpop": proof_for(api.key, api.jwk, token, path="/dictation"),
        })
        assert websocket.receive_json() == {"type": "auth_ok"}
        response = websocket.receive_json()
        assert response["type"] == "error"
        assert "phiên nhập giọng nói khác" in response["message"]
    principal.assert_awaited_once_with(str(api.user.id), str(api.session.id))
    lease.assert_awaited_once()


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
async def test_csrf_checks_cookie_credentials_and_ignores_ambient_cookie_for_bearer(api, monkeypatch, method):
    monkeypatch.setattr(settings, "CORS_ALLOWED_ORIGINS", "https://app.example")
    api.session.dpop_jkt = None
    access = await api.service.security.create_access_token(str(api.user.id), str(api.session.id))
    cookie = {"Cookie": f"access_token={access}"}
    for context in ({}, {"Origin": "https://evil.app.example", "Referer": "https://app.example/page"}):
        assert api.client.request(method, "/me", headers={**cookie, **context}).status_code == 403
    assert api.client.request(method, "/me", headers={**cookie, "Referer": "https://app.example/page"}).status_code == 200
    assert api.client.request(method, "/me", headers={**cookie, "Origin": "https://app.example"}).status_code == 200
    assert api.client.request(method, "/me", headers={
        **cookie, "Authorization": f"Bearer {access}", "Origin": "https://invalid.example",
    }).status_code == 200


async def test_cookie_logout_and_security_alert_use_origin_guard(api, monkeypatch):
    monkeypatch.setattr(settings, "CORS_ALLOWED_ORIGINS", "https://app.example")
    api.session.dpop_jkt = None
    access = await api.service.security.create_access_token(str(api.user.id), str(api.session.id))
    cookie = {"Cookie": f"access_token={access}"}
    for path in ("logout", "security-alert-test"):
        blocked = api.client.post(
            "/api/v1/auth/" + path, headers={**cookie, "Origin": "https://attacker.invalid"},
        )
        assert blocked.status_code == 403
    assert not api.session.is_revoked
    response = api.client.post("/api/v1/auth/logout", headers={**cookie, "Origin": "https://app.example"})
    assert response.status_code == 200
    assert api.session.is_revoked


def test_cookie_refresh_only_allows_trusted_origin_or_authenticated_internal_call(api, monkeypatch):
    monkeypatch.setattr(settings, "CORS_ALLOWED_ORIGINS", "https://app.example")
    monkeypatch.setattr(settings, "AUTH_INTERNAL_REFRESH_SECRET", "test-internal-refresh-secret-with-enough-entropy")
    api.service.refresh_token_async = AsyncMock(return_value={"ok": True})
    path = "/api/v1/auth/refresh"
    cookie = {"Cookie": "refresh_token=test-token"}
    internal = {"X-Auth-Internal-Refresh": settings.AUTH_INTERNAL_REFRESH_SECRET}
    for headers in ({}, {"X-Auth-Internal-Refresh": "wrong"}, {**internal, "Origin": "https://evil.invalid"}):
        assert api.client.post(path, headers={**cookie, **headers}).status_code == 403
    api.service.refresh_token_async.assert_not_awaited()
    for headers in (internal, {"Origin": "https://app.example"}, {"Referer": "https://app.example/document"}):
        assert api.client.post(path, headers={**cookie, **headers}).status_code == 200
        assert api.service.refresh_token_async.await_args.kwargs["from_cookie"]
    assert api.client.post(path).status_code == 200
    assert not api.service.refresh_token_async.await_args.kwargs["from_cookie"]


@pytest.mark.parametrize("disabled,status", [("banned", 403), ("deleted", 401)])
async def test_http_rejects_inactive_account_before_touch_or_identity_only_logout(api, token, disabled, status):
    api.user.is_banned = disabled == "banned"
    api.user.banned_until = None
    api.user.banned_reason = "test"
    api.user.deleted_at = object() if disabled == "deleted" else None
    for method, path in (("GET", "/api/v1/auth/me"), ("POST", "/api/v1/auth/logout")):
        response = api.client.request(method, path, headers={
            "Authorization": f"DPoP {token}", "DPoP": proof_for(api.key, api.jwk, token, method, path),
        })
        assert response.status_code == status
    api.db.commit.assert_not_awaited()
    assert not api.session.is_revoked


@pytest.mark.parametrize("path", ["/ws", "/dictation", "/voice", "/ws/gamification"])
def test_auth_frame_byte_limit_precedes_json_parsing(api, monkeypatch, path):
    from starlette.websockets import WebSocketDisconnect

    monkeypatch.setattr(dictation, "enabled", lambda: None)
    with api.client.websocket_connect(path) as socket:
        socket.send_text('{"type":"auth","padding":"' + 'é' * 4200 + '"}')
        with pytest.raises(WebSocketDisconnect) as exc:
            socket.receive_json()
        assert exc.value.code == 1009


async def test_voice_ack_precedes_provider_status_and_banned_account_is_closed(api, token, monkeypatch):
    from starlette.websockets import WebSocketDisconnect

    monkeypatch.setattr(settings, "TUTOR_VOICE_ENABLED", False)
    api.user.user_roles = [SimpleNamespace(role=SimpleNamespace(role_name="USER"))]
    with api.client.websocket_connect("/voice") as socket:
        socket.send_json({"type": "auth", "token": token, "dpop": proof_for(api.key, api.jwk, token, path="/voice")})
        assert socket.receive_json() == {"type": "auth_ok"}
        assert socket.receive_json()["type"] == "error"
    api.user.is_banned = True
    api.user.banned_until = api.user.banned_reason = None
    with api.client.websocket_connect("/voice") as socket:
        socket.send_json({"type": "auth", "token": token, "dpop": proof_for(api.key, api.jwk, token, path="/voice")})
        with pytest.raises(WebSocketDisconnect) as exc:
            socket.receive_json()
        assert exc.value.code == 4401


@pytest.mark.parametrize("change", ["revoke", "role", "expiry"])
async def test_gamification_idle_socket_rechecks_access_and_leaves_room(api, token, monkeypatch, change):
    from starlette.websockets import WebSocketDisconnect

    now = time.time()
    clock = SimpleNamespace(time=lambda: now)
    monkeypatch.setattr(gamification, "time", clock)
    monkeypatch.setattr(gamification, "_RECHECK_SECONDS", 0.01)
    api.user.user_roles = [SimpleNamespace(role=SimpleNamespace(role_name="USER"))]
    path = "/ws/gamification"
    with api.client.websocket_connect(path) as socket:
        socket.send_json({"type": "auth", "token": token, "dpop": proof_for(api.key, api.jwk, token, path=path)})
        assert socket.receive_json() == {"type": "auth_ok"}
        if change == "revoke":
            api.session.is_revoked = True
        elif change == "role":
            api.user.user_roles.clear()
        else:
            now = (await api.service.security.decode_access_token(token))["exp"] + 1
        with pytest.raises(WebSocketDisconnect) as exc:
            socket.receive_json()
        assert exc.value.code == 4401
    assert f"gamification_{api.user.id}" not in gamification.ws_manager.active_connections


def test_stale_cookie_refresh_does_not_clear_successor_cookie(api, monkeypatch):
    monkeypatch.setattr(settings, "CORS_ALLOWED_ORIGINS", "https://app.example")
    api.service.refresh_token_async = AsyncMock(side_effect=security.AuthError("invalid_token", clear_cookies=False))
    result = api.client.post("/api/v1/auth/refresh", headers={
        "Origin": "https://app.example", "Cookie": "refresh_token=stale",
    })
    assert result.status_code == 401 and result.json()["code"] == "invalid_token"
    assert "set-cookie" not in result.headers


@pytest.mark.parametrize("route", ["notification", "comments"])
async def test_notification_and_comments_ack_precedes_subscription(api, token, monkeypatch, route):
    if route == "notification":
        path = "/notifications/ws/notifications"
        target = path + "?role_name=USER"
        presence = SimpleNamespace(mark_online=AsyncMock(), mark_offline=AsyncMock(), heartbeat=AsyncMock())
        monkeypatch.setattr(notification, "PresenceService", lambda: presence)
    else:
        path = target = f"/learning/ws/comments/{uuid4()}"
    api.user.user_roles = [SimpleNamespace(role=SimpleNamespace(role_name="USER"))]
    with api.client.websocket_connect(target) as socket:
        socket.send_json({"type": "auth", "token": token, "dpop": proof_for(api.key, api.jwk, token, path=path)})
        assert socket.receive_json() == {"type": "auth_ok"}


@pytest.mark.parametrize("length,code", [(8, 4401), (8193, 1009)])
def test_binary_auth_message_closes_with_expected_code(api, length, code):
    from starlette.websockets import WebSocketDisconnect

    with api.client.websocket_connect("/ws") as socket:
        socket.send_bytes(b"x" * length)
        with pytest.raises(WebSocketDisconnect) as exc:
            socket.receive_json()
        assert exc.value.code == code


async def test_gamification_rejects_oversized_messages_after_auth(api, token):
    from starlette.websockets import WebSocketDisconnect

    api.user.user_roles = [SimpleNamespace(role=SimpleNamespace(role_name="USER"))]
    path = "/ws/gamification"
    with api.client.websocket_connect(path) as socket:
        socket.send_json({"type": "auth", "token": token, "dpop": proof_for(api.key, api.jwk, token, path=path)})
        assert socket.receive_json() == {"type": "auth_ok"}
        socket.send_text("x" * 8193)
        with pytest.raises(WebSocketDisconnect) as exc:
            socket.receive_json()
        assert exc.value.code == 1009
    assert f"gamification_{api.user.id}" not in gamification.ws_manager.active_connections
