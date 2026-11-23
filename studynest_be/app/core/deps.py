import asyncio
import json
import time
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Literal
from uuid import UUID

from urllib.parse import urlsplit

from fastapi import Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, WebSocketException
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.requests import HTTPConnection

from app.core.context import get_request
from app.core.security import (
    AuthError,
    SecurityService,
    authenticate_dpop,
    dpop_header,
    require_active_account,
    secret_matches,
)
from app.core.settings import settings
from app.db.models.database import Sessions, User, UserRoles
from app.db.sesson import AsyncSessionLocal, get_session
from app.libs.formats.datetime import has_expired, now as get_now, to_utc_naive


def _browser_origin_allowed(origin: str | None) -> bool:
    """True only for an Origin explicitly trusted by CORS config (same set as app.main)."""
    if not origin:
        return False
    allowed = {"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001",
               "http://127.0.0.1:3001", "http://localhost:19006"}
    allowed.update(v.strip().rstrip("/") for v in settings.CORS_ALLOWED_ORIGINS.split(",") if v.strip())
    if settings.FRONTEND_URL:
        parts = urlsplit(settings.FRONTEND_URL)
        if parts.scheme and parts.netloc:
            allowed.add(f"{parts.scheme}://{parts.netloc}")
    return origin not in {"null", "*"} and origin.rstrip("/") in allowed


def require_cookie_origin(request: Request, *, internal_refresh: bool = False) -> None:
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return
    origins = request.headers.getlist("origin")
    referers = request.headers.getlist("referer")
    if not origins and not referers and internal_refresh:
        secret = settings.AUTH_INTERNAL_REFRESH_SECRET
        supplied = request.headers.getlist("x-auth-internal-refresh")
        if len(secret) >= 32 and len(supplied) == 1 and secret_matches(supplied[0], secret):
            return
    if len(origins) == 1 and _browser_origin_allowed(origins[0]):
        return
    if not origins and len(referers) == 1:
        try:
            parts = urlsplit(referers[0])
            if not parts.username and not parts.password and _browser_origin_allowed(f"{parts.scheme}://{parts.netloc}"):
                return
        except ValueError:
            pass
    raise HTTPException(403, "Origin không hợp lệ.", headers={"Cache-Control": "no-store"})


WS_TEXT_LIMIT = 8192


async def receive_bounded_ws_text_async(websocket: WebSocket) -> str:
    message = await websocket.receive()
    if message["type"] == "websocket.disconnect":
        raise WebSocketDisconnect(message["code"], message.get("reason", ""))
    data = message.get("text")
    if data is None:
        if len(message.get("bytes") or b"") > WS_TEXT_LIMIT:
            raise WebSocketException(1009)
        raise WebSocketException(1003)
    if len(data) > WS_TEXT_LIMIT or len(data.encode("utf-8")) > WS_TEXT_LIMIT:
        raise WebSocketException(1009)
    return data


@dataclass(frozen=True)
class AccessCredentials:
    scheme: Literal["dpop", "bearer", "cookie"]
    token: str = field(repr=False)
    proof: str | None = field(default=None, repr=False)


@dataclass(frozen=True)
class AccessIdentity:
    user_id: UUID
    sid: UUID
    expires_at: int
    jkt: str | None


def _connection_credentials(
    connection: HTTPConnection, legacy: AccessCredentials | None = None,
) -> AccessCredentials | None:
    headers = connection.headers.getlist("authorization")
    proof = dpop_header(connection)
    if headers:
        parts = headers[0].split()
        if len(headers) != 1 or len(parts) != 2:
            raise AuthError("invalid_token")
        scheme, token = parts[0].lower(), parts[1]
        if scheme not in {"bearer", "dpop"}:
            raise AuthError("invalid_token")
        return AccessCredentials(scheme, token, proof)
    if proof is not None:
        raise AuthError("invalid_dpop_proof")
    if legacy is not None:
        return legacy

    if connection.scope["type"] == "websocket":
        # The current realtime clients send unbound Bearer credentials in the query.
        if settings.AUTH_ALLOW_UNBOUND_BEARER:
            token = connection.query_params.get("token") or connection.query_params.get("access_token")
            if token:
                return AccessCredentials("bearer", token)
        # Legacy cookie web clients may authenticate the handshake with their session cookie, but ONLY
        # from an explicitly allowed browser Origin: a missing/foreign Origin means a cross-site page
        # (CSWSH) or a non-browser client, and an ambient cookie must never authenticate it.
        if (
            settings.AUTH_ALLOW_COOKIE_COMPAT
            and (cookie := connection.cookies.get("access_token"))
            and _browser_origin_allowed(connection.headers.get("origin"))
        ):
            return AccessCredentials("cookie", cookie)
        return None
    if settings.AUTH_ALLOW_COOKIE_COMPAT and (cookie := connection.cookies.get("access_token")):
        require_cookie_origin(connection)
        return AccessCredentials("cookie", cookie)
    return None


class AuthorizationService:
    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        security: SecurityService = Depends(SecurityService),
    ):
        self.db = db
        self.security = security

    async def _authenticate(
        self, connection: HTTPConnection, credentials: AccessCredentials, *, allow_read_fallback: bool = False,
    ) -> AccessIdentity:
        token = credentials.token
        if not isinstance(token, str) or not token or not token.isascii() or len(token) > 8192:
            raise AuthError("invalid_token")
        try:
            payload = await self.security.decode_access_token(token, verify_exp=False)
            user_id, sid = UUID(payload["sub"]), UUID(payload["sid"])
            expires_at = payload["exp"]
            if type(expires_at) is not int:
                raise ValueError
        except (ValueError, TypeError, AttributeError):
            raise AuthError("invalid_token") from None

        jkt = None
        if "cnf" in payload:
            cnf = payload["cnf"]
            jkt = cnf.get("jkt") if isinstance(cnf, dict) else None
            if not isinstance(jkt, str) or not jkt:
                raise AuthError("invalid_token")
            if credentials.scheme != "dpop":
                raise AuthError("invalid_dpop_proof", use_dpop_proof=True)
            await authenticate_dpop(
                connection, credentials.proof, hash_claim="ath", token=token, expected_jkt=jkt,
                allow_read_fallback=allow_read_fallback,
            )
        elif credentials.scheme == "dpop" or credentials.proof is not None:
            raise AuthError("invalid_dpop_proof")
        elif credentials.scheme == "bearer" and not settings.AUTH_ALLOW_UNBOUND_BEARER:
            raise AuthError("invalid_token")
        elif credentials.scheme == "cookie" and not settings.AUTH_ALLOW_COOKIE_COMPAT:
            raise AuthError("invalid_token")

        return AccessIdentity(user_id, sid, expires_at, jkt)

    async def _validate_session(self, identity: AccessIdentity) -> Sessions:
        session = await self.db.scalar(select(Sessions).where(
            Sessions.id == identity.sid,
            Sessions.user_id == identity.user_id,
            Sessions.is_revoked.is_(False),
        ))
        if not session or has_expired(session.expired_at):
            raise AuthError("session_revoked")
        if session.dpop_jkt is None:
            if identity.jkt is not None:
                raise AuthError("invalid_token")
        elif not secret_matches(identity.jkt, session.dpop_jkt):
            raise AuthError("invalid_token")
        if identity.expires_at <= time.time():
            raise AuthError("token_expired")
        return session

    async def _load_user(self, identity: AccessIdentity) -> User:
        user = await self.db.scalar(select(User).where(User.id == identity.user_id).options(
            selectinload(User.user_roles).selectinload(UserRoles.role),
        ))
        require_active_account(user)
        return user

    async def _http_identity(
        self, request: Request, credentials: AccessCredentials | None = None, *,
        allow_read_fallback: bool = False,
    ) -> tuple[AccessIdentity, Sessions, User]:
        # A single request can call both get_current_user() and get_current_sid().
        # Reuse the completed authentication without consuming the proof twice.
        cached = getattr(request.state, "access_identity", None)
        if cached is None:
            credentials = credentials or _connection_credentials(request)
            if credentials is None:
                raise AuthError("invalid_token")
            identity = await self._authenticate(
                request, credentials, allow_read_fallback=allow_read_fallback,
            )
            user = await self._load_user(identity)
            cached = (identity, await self._validate_session(identity), user)
            # Never reuse a potentially degraded authentication in a stricter call.
            if not allow_read_fallback:
                request.state.access_identity = cached
        return cached

    async def get_current_identity(self, *, allow_read_fallback: bool = False) -> AccessIdentity:
        """The outage fallback is only for explicitly audited, read-only, non-sensitive GETs."""
        return (await self._http_identity(get_request(), allow_read_fallback=allow_read_fallback))[0]

    async def get_current_sid(self) -> str:
        return str((await self.get_current_identity()).sid)

    async def get_legacy_access_binding_async(self) -> tuple[AccessIdentity, str]:
        request = get_request()
        identity, _, _ = await self._http_identity(request)
        if identity.jkt is not None:
            raise AuthError("invalid_dpop_proof", use_dpop_proof=True)
        credentials = _connection_credentials(request)
        if credentials is None:
            raise AuthError("invalid_token")
        return identity, credentials.scheme

    async def _http_user(self, session: Sessions, user: User) -> User:
        user.last_login_at = await to_utc_naive(get_now())
        session.updated_at = get_now()
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_current_user(self) -> User:
        _, session, user = await self._http_identity(get_request())
        return await self._http_user(session, user)

    async def get_current_user_if_any(self) -> User | None:
        request = get_request()
        credentials = _connection_credentials(request)
        if credentials is None:
            return None
        try:
            _, session, user = await self._http_identity(request, credentials)
            return await self._http_user(session, user)
        except AuthError as exc:
            # Preserve anonymous behavior on public pages for stale legacy credentials.
            legacy = credentials.scheme == "cookie" or (
                credentials.scheme == "bearer" and settings.AUTH_ALLOW_UNBOUND_BEARER
            )
            if legacy and exc.code != "invalid_dpop_proof":
                return None
            raise

    async def require_role(self, required_roles: list[str] | None = None) -> User:
        user = await self.get_current_user()
        if required_roles and not any(role in required_roles for role in await self.get_list_role_in_user(user)):
            raise HTTPException(status_code=403, detail="Permission denied")
        return user

    @staticmethod
    async def get_list_role_in_user(user: User) -> list[str]:
        return [ur.role.role_name for ur in user.user_roles if ur.role]

    async def _websocket_user(
        self, websocket: WebSocket, required_roles: list[str] | None,
        legacy: AccessCredentials | None, require_frame: bool, legacy_binding: AccessIdentity | None,
    ) -> User:
        identity = getattr(websocket.state, "access_identity", None)
        if identity is None:
            credentials = None if require_frame or legacy_binding else _connection_credentials(websocket, legacy)
            if legacy_binding is not None:
                identity = legacy_binding
            elif credentials is None:
                frame = json.loads(await receive_bounded_ws_text_async(websocket))
                if not isinstance(frame, dict) or frame.get("type") != "auth":
                    raise AuthError("invalid_token")
                credentials = AccessCredentials("dpop", frame.get("token"), frame.get("dpop"))
                identity = await self._authenticate(websocket, credentials)
                websocket.state.auth_frame_pending_ack = True
            else:
                if credentials.scheme == "dpop":
                    raise AuthError("invalid_dpop_proof")
                identity = await self._authenticate(websocket, credentials)

        # Revalidate without replaying the proof on an established socket.
        user = await self._load_user(identity)
        await self._validate_session(identity)
        if required_roles and not any(role in required_roles for role in await self.get_list_role_in_user(user)):
            raise AuthError("invalid_token")
        websocket.state.access_identity = identity
        return user

    @staticmethod
    async def acknowledge_ws_auth_async(websocket: WebSocket) -> None:
        if getattr(websocket.state, "auth_frame_pending_ack", False):
            await websocket.send_json({"type": "auth_ok"})
            websocket.state.auth_frame_pending_ack = False

    @staticmethod
    async def get_require_role_ws(
        websocket: WebSocket, required_roles: list[str] | None = None, *,
        legacy: AccessCredentials | None = None, require_frame: bool = False,
        legacy_binding: AccessIdentity | None = None, defer_auth_ack: bool = False,
    ) -> User | None:
        try:
            async with asyncio.timeout(5):
                async with AsyncSessionLocal() as db:
                    authorization = AuthorizationService(db=db, security=SecurityService())
                    user = await authorization._websocket_user(
                        websocket, required_roles, legacy, require_frame, legacy_binding,
                    )
                if not defer_auth_ack:
                    await AuthorizationService.acknowledge_ws_auth_async(websocket)
                return user
        except WebSocketDisconnect:
            return None
        except WebSocketException as exc:
            await websocket.close(code=1009 if exc.code == 1009 else 4401)
            return None
        except (HTTPException, TimeoutError, ValueError, KeyError, RecursionError):
            pass
        except Exception:
            logger.warning("WebSocket authentication unavailable")
        await websocket.close(code=4401)
        return None


@lru_cache(maxsize=1)
def get_authorization_service() -> AuthorizationService:
    """Shared authorization service."""
    return AuthorizationService()
