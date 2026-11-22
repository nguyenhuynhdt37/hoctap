"""Per-account GitHub OAuth credentials. No developer token or shared identity."""
import base64
import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, String, Text, BigInteger, DateTime
from app.core.settings import settings
from app.core.redis import get_redis
from app.db.models.database import Base
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


async def authorize(payload, scope):
    if not configured():
        raise HTTPException(503, 'Kết nối GitHub chưa được bật trên hệ thống. Vui lòng liên hệ quản trị viên.')
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    await get_redis().set(f'github:oauth:{state}', json.dumps({**payload, 'verifier':verifier}), ex=600, nx=True)
    return {'authorize_url': 'https://github.com/login/oauth/authorize?' + urlencode({'client_id':settings.GITHUB_OAUTH_CLIENT_ID,
        'redirect_uri':redirect_uri(),'scope':scope,'state':state,'code_challenge':challenge,'code_challenge_method':'S256'})}


async def begin(db, user_id, sid):
    return await authorize({'purpose':'connect','user_id':str(user_id),'sid':str(sid)}, 'read:user repo')


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
    token = exchanged['access_token']
    profile = await identity_profile(token)
    row = await db.get(GitHubConnection, user_id)
    if not row:
        row = GitHubConnection(user_id=user_id)
        db.add(row)
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
