"""Per-account GitHub OAuth credentials. No developer token or shared identity."""
import base64
import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, String, Text, BigInteger, DateTime
from app.core.auth_encryption import open_auth_payload, seal_auth_payload
from app.core.security import AuthError, require_active_account, secret_matches
from app.core.settings import settings
from app.core.redis import get_redis
from app.db.models.database import Base, Sessions, User
from app.libs.formats.datetime import has_expired
from uuid import UUID


class GitHubConnection(Base):
    __tablename__ = 'assistant_github_connections'
    __table_args__ = {'schema': 'public'}
    user_id: Mapped[UUID] = mapped_column(ForeignKey('public.user.id', ondelete='CASCADE'), primary_key=True)
    github_user_id: Mapped[int] = mapped_column(BigInteger)
    login: Mapped[str] = mapped_column(String(100))
    encrypted_token: Mapped[str] = mapped_column(Text)
    scopes: Mapped[str] = mapped_column(Text, default='')
    encrypted_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


def configured():
    return bool(settings.GITHUB_OAUTH_CLIENT_ID and settings.GITHUB_OAUTH_CLIENT_SECRET and settings.SECRET_KEY)


def cipher():
    if not settings.SECRET_KEY:
        raise HTTPException(503, 'Chưa cấu hình khóa mã hóa kết nối GitHub')
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(('hannes-github-v1:' + settings.SECRET_KEY).encode()).digest()))


def redirect_uri():
    return settings.GITHUB_OAUTH_REDIRECT_URI or (settings.FRONTEND_URL or 'http://localhost:3000').rstrip('/') + '/api/agent/github/callback'


async def connection_status(db, user_id):
    row = await db.get(GitHubConnection, user_id)
    return {'configured': configured(), 'connected': row is not None, 'login': row.login if row else None, 'read_only': True}


async def authorize(payload, scope, *, bind_state=False):
    if not configured():
        raise HTTPException(503, 'Kết nối GitHub chưa được bật trên hệ thống. Vui lòng liên hệ quản trị viên.')
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    saved = {**payload, 'verifier': verifier}
    if bind_state:
        saved['state_hash'] = hashlib.sha256(state.encode('ascii')).hexdigest()
    created = await get_redis().set(f'github:oauth:{state}', json.dumps(saved), ex=600, nx=True)
    if bind_state and not created:
        raise HTTPException(503, 'Chưa khởi tạo được đăng nhập GitHub.')
    return {'authorize_url': 'https://github.com/login/oauth/authorize?' + urlencode({'client_id':settings.GITHUB_OAUTH_CLIENT_ID,
        'redirect_uri':redirect_uri(),'scope':scope,'state':state,'code_challenge':challenge,'code_challenge_method':'S256'})}


async def begin(db, user_id, sid, *, jkt=None):
    payload = {'purpose': 'connect', 'user_id': str(user_id), 'sid': str(sid)}
    if jkt is not None:
        payload.update(purpose='connect_dpop', jkt=jkt)
    try:
        return await authorize(payload, 'read:user repo', bind_state=jkt is not None)
    except RedisError:
        raise HTTPException(503, 'Chưa thể khởi tạo liên kết GitHub.') from None


def _connect_grant_key(handle: str) -> str:
    return 'github:connect:finish:' + hashlib.sha256(handle.encode('ascii')).hexdigest()


async def stage_dpop_connection_async(state: str, code: str, raw: str, saved: dict) -> str:
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', state) or not secret_matches(
        saved.get('state_hash'), hashlib.sha256(state.encode('ascii')).hexdigest(),
    ):
        raise AuthError('invalid_token')
    try:
        redis = get_redis()
        if await redis.getdel(f'github:oauth:{state}') != raw:
            raise AuthError('invalid_token')
        handle = secrets.token_urlsafe(32)
        key = _connect_grant_key(handle)
        grant = {field: saved[field] for field in ('user_id', 'sid', 'jkt', 'verifier')}
        grant['code'] = code
        if await redis.set(key, seal_auth_payload(grant, key), ex=60, nx=True):
            return handle
    except RedisError:
        pass
    raise HTTPException(503, 'Chưa thể hoàn tất liên kết GitHub.')


async def finish_dpop_connection_async(db, identity, handle: str) -> dict:
    if identity.jkt is None or not re.fullmatch(r'[A-Za-z0-9_-]{43}', handle):
        raise AuthError('invalid_token')
    try:
        redis = get_redis()
        key = _connect_grant_key(handle)
        raw = await redis.get(key)
        grant = open_auth_payload(raw, key)
        if (grant is None or grant['user_id'] != str(identity.user_id) or grant['sid'] != str(identity.sid)
                or not secret_matches(grant['jkt'], identity.jkt) or await redis.getdel(key) != raw):
            raise AuthError('invalid_token')
    except RedisError:
        raise HTTPException(503, 'Chưa thể hoàn tất liên kết GitHub.') from None

    exchanged = await exchange_code(grant['code'], grant['verifier'])
    profile = await identity_profile(exchanged['access_token'])
    user = await db.scalar(select(User).where(User.id == identity.user_id).with_for_update(read=True)
                           .execution_options(populate_existing=True))
    require_active_account(user)
    session = await db.get(Sessions, identity.sid, populate_existing=True, with_for_update={'read': True})
    if (session is None or session.user_id != identity.user_id or session.is_revoked is not False
            or has_expired(session.expired_at) or not secret_matches(session.dpop_jkt, identity.jkt)):
        raise AuthError('session_revoked')
    return await _store_connection_async(db, identity.user_id, profile, exchanged)


async def exchange_code(code, verifier):
    if not configured():
        raise HTTPException(503, 'GitHub OAuth chưa cấu hình')
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.post('https://github.com/login/oauth/access_token', headers={'Accept':'application/json'},
                data={'client_id':settings.GITHUB_OAUTH_CLIENT_ID,'client_secret':settings.GITHUB_OAUTH_CLIENT_SECRET,
                      'code':code,'redirect_uri':redirect_uri(),'code_verifier':verifier})
        if response.status_code != 200 or not response.json().get('access_token'):
            raise HTTPException(400, 'GitHub chưa cấp quyền. Hãy xác thực lại.')
        return response.json()
    except httpx.HTTPError:
        raise HTTPException(502, 'Chưa kết nối được GitHub. Vui lòng thử lại.') from None


async def identity_profile(token):
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get('https://api.github.com/user', headers={'Authorization':f'Bearer {token}', 'Accept':'application/vnd.github+json'})
        if response.status_code != 200:
            raise HTTPException(502, 'Chưa xác minh được tài khoản GitHub')
        profile = response.json()
        if not isinstance(profile.get('id'), int) or isinstance(profile['id'], bool) or profile['id'] <= 0:
            raise HTTPException(502, 'Danh tính GitHub không hợp lệ')
        return profile
    except httpx.HTTPError:
        raise HTTPException(502, 'Chưa kết nối được GitHub. Vui lòng thử lại.') from None


async def complete(db, user_id, sid, state, code):
    if not configured():
        raise HTTPException(503, 'GitHub OAuth chưa cấu hình')
    raw = await get_redis().getdel(f'github:oauth:{state}')
    if not raw:
        raise HTTPException(400, 'Phiên xác thực đã hết hạn hoặc đã được sử dụng')
    saved = json.loads(raw)
    if saved['user_id'] != str(user_id) or saved['sid'] != str(sid):
        raise HTTPException(403, 'Phiên xác thực không thuộc tài khoản đang đăng nhập')
    if saved.get('purpose', 'connect') != 'connect':
        raise HTTPException(400, 'Phiên xác thực không dùng để kết nối repository')
    exchanged = await exchange_code(code, saved['verifier'])
    profile = await identity_profile(exchanged['access_token'])
    return await _store_connection_async(db, user_id, profile, exchanged)


async def _store_connection_async(db, user_id, profile, exchanged):
    row = await db.get(GitHubConnection, user_id, with_for_update=True)
    if not row:
        row = GitHubConnection(user_id=user_id)
        db.add(row)
    row.encrypted_refresh_token = None
    row.github_user_id, row.login = profile['id'], profile['login']
    store_credentials(row, exchanged)
    await db.commit()
    return await connection_status(db, user_id)


def store_credentials(row, exchanged):
    row.encrypted_token = cipher().encrypt(exchanged['access_token'].encode()).decode()
    if 'scope' in exchanged:
        row.scopes = exchanged['scope']
    refresh = exchanged.get('refresh_token')
    if refresh:
        row.encrypted_refresh_token = cipher().encrypt(refresh.encode()).decode()
    seconds = exchanged.get('expires_in')
    row.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(seconds)) if seconds else None


async def token_for(db, user_id):
    # Serialize refresh rotation so simultaneous tools never reuse a stale refresh token.
    row = await db.scalar(select(GitHubConnection).where(GitHubConnection.user_id == user_id).with_for_update())
    if not row:
        raise HTTPException(409, 'Hãy nhấn Kết nối GitHub và xác thực tài khoản trước khi đọc repo.')
    try:
        if row.token_expires_at and row.token_expires_at <= datetime.now(timezone.utc) + timedelta(seconds=60):
            if not row.encrypted_refresh_token:
                raise HTTPException(409, 'Kết nối GitHub đã hết hạn. Hãy xác thực lại.')
            refresh = cipher().decrypt(row.encrypted_refresh_token.encode()).decode()
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.post('https://github.com/login/oauth/access_token',
                    headers={'Accept':'application/json'}, data={
                        'client_id':settings.GITHUB_OAUTH_CLIENT_ID,
                        'client_secret':settings.GITHUB_OAUTH_CLIENT_SECRET,
                        'grant_type':'refresh_token', 'refresh_token':refresh})
            exchanged = response.json()
            if response.status_code != 200 or not isinstance(exchanged, dict) or not exchanged.get('access_token'):
                raise HTTPException(409, 'Kết nối GitHub cần xác thực lại')
            store_credentials(row, exchanged)
        token = cipher().decrypt(row.encrypted_token.encode()).decode()
        await db.commit()
        return token
    except InvalidToken:
        await db.rollback()
        raise HTTPException(409, 'Kết nối GitHub cần xác thực lại') from None
    except (httpx.HTTPError, ValueError, TypeError):
        await db.rollback()
        raise HTTPException(502, 'Chưa gia hạn được kết nối GitHub. Vui lòng thử lại.') from None
    except HTTPException:
        await db.rollback()
        raise
