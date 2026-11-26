"""GitHub sign-in reuses app OAuth config, with separate browser-bound state."""
import base64
import hashlib
import html
import json
import re
import secrets
import time
from urllib.parse import unquote, urlencode, urlsplit
from uuid import UUID

import httpx
from fastapi import HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from redis.exceptions import RedisError
from sqlalchemy import func, select, text

from app.agent import github_connection as github
from app.core.redis import get_redis
from app.core.security import AuthError, SecurityService, authenticate_dpop, dpop_header, secret_matches
from app.core.settings import settings
from app.db.models.database import Role, User, UserRoles
from app.db.models.github_identity import GitHubIdentity
from app.libs.formats.datetime import now as get_now
from app.schemas.auth.github import GitHubExchangeRequest
from app.services.shares.auth import AuthService

NONCE_COOKIE = 'maymay_github_login'
GITHUB_CALLBACK_HEADERS = {"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}
_CODE_PATTERN = re.compile(r"[A-Za-z0-9_-]{43}")
_VERIFIER_PATTERN = re.compile(r"[A-Za-z0-9._~-]{43,128}")


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("ascii")).hexdigest()


def _exchange_key(code: str) -> str:
    return f"auth:github:exchange:{_digest(code)}"


def return_path(value):
    if not isinstance(value, str) or not value.startswith('/') or value.startswith('//') or any(c in value for c in ('\\', '\r', '\n')):
        return '/'
    if any(ord(c) < 32 or ord(c) == 127 for c in value):
        return '/'
    try:
        parsed = urlsplit(value)
    except ValueError:
        return '/'
    return value[:500] if not parsed.scheme and not parsed.netloc else '/'


def _normalize_origin(raw: str | None) -> str | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        parsed = urlsplit(raw.strip())
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or "@" in parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def frontend_origin():
    return _normalize_origin(settings.FRONTEND_URL) or "http://localhost:3000"


def _allowed_frontend_origins() -> set[str]:
    allowed = {
        frontend_origin(),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    }
    for raw in (settings.CORS_ALLOWED_ORIGINS or "").split(","):
        origin = _normalize_origin(raw)
        if origin:
            allowed.add(origin)
    return allowed


def _resolve_request_frontend_origin(request: Request | None) -> str:
    if request is not None:
        allowed = _allowed_frontend_origins()
        for header_name in ("origin", "referer"):
            candidate = _normalize_origin(request.headers.get(header_name))
            if candidate and candidate in allowed:
                return candidate
    return frontend_origin()


def _dpop_return_path(value: str) -> str:
    target = return_path(value)
    try:
        path = unquote(urlsplit(target).path, errors="strict")
    except ValueError:
        return "/"
    if "//" in path or return_path(path) != path:
        return "/"
    return target


async def _rate_limit_async(request: Request, stage: str) -> None:
    if request.client is None:
        return
    key = f"auth:github:rate:{stage}:{request.client.host}:{int(time.time()) // 60}"
    async with get_redis().pipeline(transaction=True) as pipeline:
        count, _ = await pipeline.incr(key).expire(key, 90).execute()
    if count > 120:
        raise HTTPException(429, "Bạn gửi quá nhanh. Vui lòng thử lại sau.",
                            headers={"Retry-After": "60", "Cache-Control": "no-store"})


async def begin_dpop_login_async(
    request: Request, response: Response, proof: str, challenge: str | None, redirect_to: str,
) -> dict:
    try:
        await _rate_limit_async(request, "start")
        jkt = await authenticate_dpop(request, proof)
        if challenge is None or not _CODE_PATTERN.fullmatch(challenge):
            raise HTTPException(400, "PKCE code_challenge không hợp lệ.",
                                headers={"Cache-Control": "no-store"})
        result = await github.authorize({
            "purpose": "login_dpop", "jkt": jkt, "code_challenge": challenge,
            "return_to": _dpop_return_path(redirect_to),
            "frontend_origin": _resolve_request_frontend_origin(request),
        }, "read:user user:email", bind_state=True)
    except RedisError:
        raise HTTPException(503, "Chưa khởi tạo được đăng nhập GitHub.",
                            headers={"Cache-Control": "no-store"}) from None
    response.headers["Cache-Control"] = "no-store"
    return result


def _dpop_callback_redirect(origin: str | None = None, **params: str) -> RedirectResponse:
    safe_origin = _normalize_origin(origin)
    target_origin = safe_origin if safe_origin in _allowed_frontend_origins() else frontend_origin()
    return RedirectResponse(target_origin + "/auth/github/callback?" + urlencode(params),
                            status_code=303, headers=GITHUB_CALLBACK_HEADERS)


async def _complete_dpop_callback_async(
    state: str, code: str | None, provider_error: str | None,
    raw: str, saved: dict, auth_service: AuthService,
) -> RedirectResponse:
    target_origin = saved.get("frontend_origin")
    try:
        if (not _CODE_PATTERN.fullmatch(state) or not secret_matches(saved.get("state_hash"), _digest(state))
                or await get_redis().getdel(f"github:oauth:{state}") != raw or provider_error or not code):
            return _dpop_callback_redirect(origin=target_origin, error="github_login_failed")
        exchanged = await github.exchange_code(code, saved["verifier"])
        profile = await github.identity_profile(exchanged["access_token"])
        user = await resolve_user(auth_service.db, profile, exchanged["access_token"])
        await auth_service.db.commit()
        # The pending grant carries identity only. Create the session after proof of possession.
        exchange_code = secrets.token_urlsafe(32)
        created = await get_redis().set(_exchange_key(exchange_code), json.dumps({
            "user_id": str(user.id), "jkt": saved["jkt"], "code_challenge": saved["code_challenge"],
            "return_to": saved["return_to"],
        }), ex=60, nx=True)
        if created:
            return _dpop_callback_redirect(origin=target_origin, code=exchange_code)
    except (HTTPException, RedisError, ValueError, TypeError, AttributeError):
        # Provider errors and account state share one browser-facing response.
        await auth_service.db.rollback()
    return _dpop_callback_redirect(origin=target_origin, error="github_login_failed")


async def exchange_dpop_login_async(
    request: Request, response: Response, schema: GitHubExchangeRequest, auth_service: AuthService,
) -> dict:
    code = schema.code.get_secret_value()
    verifier = schema.code_verifier.get_secret_value()
    try:
        await _rate_limit_async(request, "exchange")
        jkt = await authenticate_dpop(request, dpop_header(request))
        if not _CODE_PATTERN.fullmatch(code) or not _VERIFIER_PATTERN.fullmatch(verifier):
            raise AuthError("invalid_token")
        redis = get_redis()
        key = _exchange_key(code)
        raw = await redis.get(key)
        saved = json.loads(raw) if raw else {}
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).decode("ascii").rstrip("=")
        challenge_matches = secret_matches(saved.get("code_challenge"), challenge)
        key_matches = secret_matches(saved.get("jkt"), jkt)
        if not (challenge_matches and key_matches) or await redis.getdel(key) != raw:
            raise AuthError("invalid_token")
    except RedisError:
        raise HTTPException(503, "Chưa hoàn tất được đăng nhập GitHub.",
                            headers={"Cache-Control": "no-store"}) from None

    user = await auth_service.db.get(User, UUID(saved["user_id"]), with_for_update=True)
    if not user or user.deleted_at or user.is_banned:
        raise AuthError("invalid_token")
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    result = await auth_service._create_session(user.id, response, user_agent, ip, jkt=jkt)
    user.last_login_at = get_now()
    await auth_service.db.commit()
    await auth_service._broadcast_new_session(user.id, result["session_id"], user_agent, ip, login_method="github")
    return {**result, "redirect_to": _dpop_return_path(saved["return_to"])}


async def begin_login(response, redirect_to='/'):
    if not settings.AUTH_ALLOW_COOKIE_COMPAT:
        raise AuthError("invalid_dpop_proof", use_dpop_proof=True)
    nonce = secrets.token_urlsafe(32)
    result = await github.authorize({'purpose':'login', 'nonce_hash':hashlib.sha256(nonce.encode()).hexdigest(), 'return_to':return_path(redirect_to)}, 'read:user user:email')
    response.set_cookie(NONCE_COOKIE, nonce, max_age=600, httponly=True, secure=frontend_origin().startswith('https://'), samesite='lax', path='/')
    response.headers['Cache-Control'] = 'no-store'
    return result


async def consume_login_state(state, nonce):
    raw = await get_redis().getdel(f'github:oauth:{state}')
    if not raw:
        raise HTTPException(400, 'Phiên xác thực đã hết hạn hoặc đã được dùng')
    saved = json.loads(raw)
    actual = hashlib.sha256((nonce or '').encode()).hexdigest()
    if saved.get('purpose') != 'login' or not secrets.compare_digest(saved.get('nonce_hash', ''), actual):
        raise HTTPException(403, 'Phiên đăng nhập không thuộc trình duyệt này')
    return saved


async def verified_email(token):
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get('https://api.github.com/user/emails', params={'per_page':100},
                headers={'Authorization':f'Bearer {token}', 'Accept':'application/vnd.github+json'})
        if response.status_code != 200 or not isinstance(response.json(), list):
            raise HTTPException(400, 'GitHub chưa cấp quyền đọc email đã xác minh')
        emails = [row for row in response.json() if row.get('verified') is True and isinstance(row.get('email'), str) and '@' in row['email']]
        primary = next((row for row in emails if row.get('primary') is True), emails[0] if emails else None)
        if primary is None:
            raise HTTPException(400, 'Hãy xác minh email trên GitHub trước khi đăng nhập')
        return primary['email'].strip().lower()
    except httpx.HTTPError:
        raise HTTPException(502, 'Chưa đọc được email GitHub. Vui lòng thử lại.') from None


async def resolve_user(db, profile, token):
    github_id = profile['id']
    # Serialize two callback requests for the same GitHub identity.
    await db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key,0))'), {'key':f'github-login:{github_id}'})
    identity = await db.get(GitHubIdentity, github_id)
    if identity:
        user = await db.get(User, identity.user_id)
        if not user or user.deleted_at or user.is_banned:
            raise HTTPException(403, 'Tài khoản đã bị khóa hoặc xóa')
        return user
    email = await verified_email(token)
    await db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key,0))'), {'key':f'github-email:{email}'})
    # Do not auto-link by an unverified public email or an unverified local account.
    matches = (await db.scalars(select(User).where(func.lower(User.email) == email).limit(2))).all()
    if len(matches) > 1:
        raise HTTPException(409, 'Email đang trùng tài khoản. Vui lòng đăng nhập bằng email trước.')
    user = matches[0] if matches else None
    if user:
        if user.deleted_at or user.is_banned:
            raise HTTPException(403, 'Tài khoản đã bị khóa hoặc xóa')
        if not user.is_verified_email:
            raise HTTPException(409, 'Hãy xác minh email tài khoản Mây Mây trước khi liên kết GitHub.')
    else:
        user = User(email=email, fullname=(profile.get('name') or profile.get('login') or 'Người dùng GitHub')[:200],
            avatar=profile.get('avatar_url'), password=await SecurityService.hash_password(secrets.token_urlsafe(48)),
            is_verified_email=True, email_verified_at=get_now(), create_at=get_now(), update_at=get_now())
        db.add(user)
        await db.flush()
        role = await db.scalar(select(Role).where(Role.role_name == 'USER'))
        if not role:
            role = Role(role_name='USER', details='Default customer role')
            db.add(role); await db.flush()
        db.add(UserRoles(user_id=user.id, role_id=role.id))
    db.add(GitHubIdentity(github_user_id=github_id, user_id=user.id))
    await db.flush()
    return user


async def callback_response_async(request, state, code, provider_error, auth_service, authorization):
    try:
        raw = await get_redis().get(f'github:oauth:{state}')
    except RedisError:
        return HTMLResponse("Chưa xác minh được phiên GitHub. Vui lòng thử lại.",
                            status_code=503, headers=GITHUB_CALLBACK_HEADERS)
    saved = json.loads(raw) if raw else {}
    if saved.get("purpose") == "login_dpop":
        return await _complete_dpop_callback_async(state, code, provider_error, raw, saved, auth_service)
    login = saved.get('purpose') == 'login'
    target = return_path(saved.get('return_to', '/'))
    try:
        if not raw:
            raise HTTPException(400, 'Phiên xác thực đã hết hạn. Hãy thử lại.')
        if login:
            if not settings.AUTH_ALLOW_COOKIE_COMPAT:
                raise AuthError("invalid_dpop_proof", use_dpop_proof=True)
            verified_state = await consume_login_state(state, request.cookies.get(NONCE_COOKIE))
            if provider_error or not code:
                raise HTTPException(400, 'Bạn chưa cấp quyền đăng nhập GitHub')
            exchanged = await github.exchange_code(code, verified_state['verifier'])
            profile = await github.identity_profile(exchanged['access_token'])
            user = await resolve_user(auth_service.db, profile, exchanged['access_token'])
            result = RedirectResponse(frontend_origin() + target, status_code=303)
            user_agent = request.headers.get('user-agent')
            ip = request.client.host if request.client else None
            session = await auth_service._create_session(user.id, result, user_agent, ip)
            user.last_login_at = get_now()
            await auth_service.db.commit()
            await auth_service._broadcast_new_session(user.id, session['session_id'], user_agent, ip, login_method='github')
            result.delete_cookie(NONCE_COOKIE, path='/')
            result.headers['Referrer-Policy'] = 'no-referrer'
            return result
        if provider_error or not code:
            raise HTTPException(400, 'Bạn chưa cấp quyền kết nối GitHub')
        if saved.get('purpose') == 'connect_dpop':
            handle = await github.stage_dpop_connection_async(state, code, raw, saved)
            event = json.dumps({'type': 'hannes:github-link-pending', 'handle': handle})
            origin = json.dumps(frontend_origin()).replace('<', r'\u003c')
            return HTMLResponse(
                '<!doctype html><html lang="vi"><meta charset="utf-8"><title>Xác nhận kết nối GitHub</title>'
                '<p>Quay lại Mây Mây để hoàn tất liên kết.</p>'
                f'<script>if(window.opener){{window.opener.postMessage({event},{origin});window.close();}}</script></html>',
                headers=GITHUB_CALLBACK_HEADERS,
            )
        if saved.get('purpose') != 'connect':
            raise AuthError('invalid_token')
        identity = await authorization.get_current_identity()
        await github.complete(auth_service.db, identity.user_id, identity.sid, state, code)
        return HTMLResponse('<!doctype html><html lang="vi"><meta charset="utf-8"><title>Đã kết nối GitHub</title><p>Đã kết nối GitHub với tài khoản của bạn. Bạn có thể đóng cửa sổ này.</p><script>if(window.opener){window.opener.postMessage({type:"hannes:github-connected"},' + json.dumps(frontend_origin()) + ');window.close();}</script></html>',
            headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'})
    except HTTPException as exc:
        await auth_service.db.rollback()
        if login:
            result = RedirectResponse(frontend_origin() + '/login?' + urlencode({'github_error':str(exc.detail), 'redirect':target}), status_code=303)
            result.delete_cookie(NONCE_COOKIE, path='/')
            result.headers['Cache-Control'] = 'no-store'
            return result
        return HTMLResponse('<!doctype html><html lang="vi"><meta charset="utf-8"><title>Chưa kết nối GitHub</title><p>' + html.escape(str(exc.detail)) + '</p></html>', status_code=exc.status_code, headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'})
