"""GitHub sign-in reuses app OAuth config, with separate browser-bound state."""
import hashlib
import html
import json
import secrets
from urllib.parse import urlencode, urlsplit
import httpx
from fastapi import HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import func, select, text
from app.agent import github_connection as github
from app.core.redis import get_redis
from app.core.settings import settings
from app.core.security import SecurityService
from app.db.models.database import Role, User, UserRoles
from app.db.models.github_identity import GitHubIdentity
from app.libs.formats.datetime import now as get_now

NONCE_COOKIE = 'maymay_github_login'


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


def frontend_origin():
    parsed = urlsplit(settings.FRONTEND_URL or 'http://localhost:3000')
    return f'{parsed.scheme}://{parsed.netloc}'


async def begin_login(response, redirect_to='/'):
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


async def callback_response(request, state, code, provider_error, auth_service, authorization):
    raw = await get_redis().get(f'github:oauth:{state}')
    saved = json.loads(raw) if raw else {}
    login = saved.get('purpose') == 'login'
    target = return_path(saved.get('return_to', '/'))
    try:
        if not raw:
            raise HTTPException(400, 'Phiên xác thực đã hết hạn. Hãy thử lại.')
        if login:
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
        user = await authorization.get_current_user()
        sid = await authorization.get_current_sid()
        if user.is_banned or user.deleted_at:
            raise HTTPException(403, 'Tài khoản không khả dụng')
        await github.complete(auth_service.db, user.id, sid, state, code)
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
