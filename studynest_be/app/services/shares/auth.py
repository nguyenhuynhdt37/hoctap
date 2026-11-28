from __future__ import annotations

import asyncio
import hashlib
from datetime import timedelta
from typing import Any
from urllib.parse import quote
from uuid import UUID

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.encoders import jsonable_encoder
from google.auth.transport import requests
from google.oauth2 import id_token
from loguru import logger
from redis.exceptions import RedisError
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.expression import desc

from app.core.auth_encryption import open_auth_payload, seal_auth_payload
from app.core.redis import get_redis
from app.core.security import AuthError, SecurityService, authenticate_dpop, dpop_header, require_active_account, secret_matches
from app.core.settings import settings
from app.core.ws_manager import ws_manager
from app.db.models.database import EmailVerifications, Role, Sessions, SpentRefreshTokens, User, UserRoles
from app.db.models.user_identity import UserIdentity
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.libs.formats.datetime import has_expired, now_tzinfo
from app.schemas.auth.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleLogin,
    LoginUser,
    RefreshEmail,
    ResetPasswordRequest,
    SendOtp,
    UserCreate,
    VerifyEmail,
    VerifyOtp,
)
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.gamification.shop_service import ShopService
from app.services.shares.mailer import MailerService
from app.services.shares.otp import (
    LOGIN,
    OTP_TTL,
    RESET_PASSWORD,
    RESET_PASSWORD_TTL,
    VERIFY_EMAIL,
    limit_attempt_async,
    limit_issue_async,
)
from app.services.shares.notification import NotificationService
from app.services.shares.wallets import WalletsService


REFRESH_GRACE_SECONDS = 15
REFRESH_RETRY_SECONDS = 300
REFRESH_CACHE_PREFIX = "auth:refresh:result:v2:"
GOOGLE_PROVIDER = "google"
LEGACY_GOOGLE_PASSWORD = "google-oauth"


def _invalid_google_token(*, bound: bool) -> HTTPException:
    if bound:
        return AuthError("invalid_token")
    return HTTPException(400, "Không thể xác thực thông tin đăng nhập Google.")


async def revoke_user_sessions_async(
    db: AsyncSession,
    user_id: UUID,
    *,
    exclude_session_id: UUID | None = None,
) -> int:
    # Flush the account state first to keep the same user -> session lock order as refresh.
    await db.flush()
    stmt = update(Sessions).where(
        Sessions.user_id == user_id,
        Sessions.is_revoked.is_not(True),
    )
    if exclude_session_id is not None:
        stmt = stmt.where(Sessions.id != exclude_session_id)
    result = await db.execute(stmt.values(is_revoked=True))
    return int(result.rowcount or 0)


class AuthService:
    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        security: SecurityService = Depends(SecurityService),
        mail_service: MailerService = Depends(MailerService),
        wallet_service: WalletsService = Depends(WalletsService),
    ):
        self.db = db
        self.security = security
        self.mail_service = mail_service
        self.wallet_service = wallet_service

    async def _send_mail_or_503(self, mail_coro):
        try:
            return await mail_coro
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error_code": "MAIL_SEND_FAILED",
                    "message": "Không gửi được email. Vui lòng kiểm tra SMTP hoặc đổi tài khoản gửi mail.",
                },
            ) from exc

    async def _login_jkt(self, request: Request | None) -> str | None:
        proof = dpop_header(request) if request is not None else None
        if proof is not None:
            return await authenticate_dpop(request, proof)
        if not (settings.AUTH_ALLOW_COOKIE_COMPAT or settings.AUTH_ALLOW_UNBOUND_BEARER):
            raise AuthError("invalid_dpop_proof", use_dpop_proof=True)
        return None

    async def _create_session(
        self, user_id: Any, res: Response, user_agent: str | None = None,
        ip: str | None = None, *, jkt: str | None = None,
    ):
        refresh_token = await self.security.generate_refresh_token()
        new_session = Sessions(
            user_id=user_id,
            refresh_token_hash=await self.security.hash_token(refresh_token),
            dpop_jkt=jkt,
            user_agent=user_agent,
            ip_address=ip,
            expired_at=now_tzinfo() + timedelta(days=30),
        )
        self.db.add(new_session)
        await self.db.flush()
        result = await self._session_tokens(new_session, refresh_token, "Login successful")
        self._set_token_response(res, result, bound=jkt is not None)
        return result

    async def _session_tokens(self, session: Sessions, refresh_token: str, message: str) -> dict:
        result = {
            "message": message,
            "session_id": str(session.id),
            "expired_at": session.expired_at,
            "refresh_token": refresh_token,
            "access_token": await self.security.create_access_token(
                str(session.user_id), str(session.id), jkt=session.dpop_jkt,
            ),
        }
        if session.dpop_jkt is not None:
            result.update(token_type="DPoP", expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        return result

    def _set_token_response(self, res: Response, result: dict, *, bound: bool) -> None:
        res.headers["Cache-Control"] = "no-store"
        if not bound and settings.AUTH_ALLOW_COOKIE_COMPAT:
            self._set_session_cookies(res, result["access_token"], result["refresh_token"])

    def _set_session_cookies(self, res, access_token, refresh_token):
        for name, value, max_age in [
            ("access_token", access_token, int(float(settings.ACCESS_TOKEN_EXPIRE_MINUTES) * 60)),
            ("refresh_token", refresh_token, 60 * 60 * 24 * 30),
        ]:
            res.set_cookie(name, value, httponly=True,
                           secure=settings.FRONTEND_URL.startswith("https://"),
                           samesite="lax", max_age=max_age, path="/")

    async def _broadcast_new_session(
        self,
        user_id: Any,
        session_id: str,
        user_agent: str | None = None,
        ip: str | None = None,
        login_method: str = "password",
        explicit_device_type: str | None = None,
    ) -> None:
        try:
            active_other_session = await self.db.scalar(
                select(Sessions.id).where(
                    Sessions.user_id == user_id,
                    Sessions.id != session_id,
                    Sessions.is_revoked.is_(False),
                    Sessions.expired_at >= now_tzinfo(),
                )
            )
            if not active_other_session:
                return

            device_type = self._detect_device_type(user_agent, explicit_type=explicit_device_type)
            session_payload = {
                "id": session_id,
                "device_type": device_type,
                "ip_address": ip,
                "user_agent": user_agent,
                "login_method": login_method,
                "created_at": get_now().isoformat(),
            }

            notification = await NotificationService(self.db).create_notification_async(
                NotificationCreateSchema(
                    user_id=user_id,
                    title="Phát hiện đăng nhập mới",
                    content=(
                        f"Có đăng nhập mới bằng {login_method} trên {device_type}. "
                        f"IP: {ip or 'không rõ'}."
                    ),
                    type="security",
                    role_target=["USER"],
                    action="review_session",
                    metadata={
                        "event": "auth.new_session",
                        "session": session_payload,
                    },
                )
            )

            await ws_manager.broadcast(
                f"AUTH_{user_id}",
                {
                    "type": "auth.new_session",
                    "data": {
                        "notification_id": str(notification.id),
                        "session": session_payload,
                    },
                },
            )
        except Exception:
            pass

    def _detect_device_type(self, user_agent: str | None, explicit_type: str | None = None) -> str:
        if explicit_type and explicit_type.upper() in ["IOS", "ANDROID", "WEB"]:
            return explicit_type.upper()
            
        ua_lower = (user_agent or "").lower()
        
        # iOS Keywords
        if any(k in ua_lower for k in ["iphone", "ipad", "ipod", "ios", "cfnetwork", "darwin"]):
            return "IOS"
            
        # Android Keywords
        if any(k in ua_lower for k in ["android", "okhttp", "dalvik"]):
            return "ANDROID"
            
        # General Mobile keyword
        if "mobile" in ua_lower:
            return "ANDROID"
            
        return "WEB"

    async def login_async(
        self, schema: LoginUser, res: Response, user_agent: str | None = None,
        ip: str | None = None, *, request: Request | None = None,
    ):
        jkt = await self._login_jkt(request)
        clean_email = schema.email.strip().lower()
        try:
            stmt = (
                select(User)
                .where(User.email.ilike(clean_email))
                .options(selectinload(User.user_roles).selectinload(UserRoles.role))
            )
            result = await self.db.execute(stmt)
            user: User | None = result.scalar()

            # 1️⃣ CHƯA CÓ THÔNG TIN EMAIL TRÊN HỆ THỐNG
            if not user:
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error_code": "ACCOUNT_NOT_FOUND",
                        "message": "Thông tin tài khoản không chính xác (Email chưa được đăng ký trên hệ thống).",
                    },
                )

            if user.deleted_at:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error_code": "ACCOUNT_DELETED",
                        "message": "Tài khoản đã bị xóa",
                        "deleted_at": user.deleted_at.isoformat(),
                        "reason": user.banned_reason,
                    },
                )

            # 2️⃣ KIỂM TRA MẬT KHẨU (hỗ trợ phục hồi tự động cho tài khoản chưa verify cũ bị lưu password rỗng)
            stored_pw = user.password or ""
            latest_pending: EmailVerifications | None = None
            if not user.is_verified_email:
                latest_pending = await self.db.scalar(
                    select(EmailVerifications)
                    .where(
                        EmailVerifications.user_id == user.id,
                        EmailVerifications.purpose == VERIFY_EMAIL,
                    )
                    .order_by(desc(EmailVerifications.created_at), desc(EmailVerifications.id))
                    .limit(1)
                )
                if not stored_pw and latest_pending and latest_pending.pending_password_hash:
                    stored_pw = latest_pending.pending_password_hash

            password_ok = False
            if stored_pw:
                password_ok = await self.security.verify_password(schema.password, stored_pw)
            elif not user.is_verified_email:
                # Tự chữa lành cho tài khoản chưa xác thực cũ từng bị xóa rỗng mật khẩu khi resend
                new_pw_hash = await self.security.hash_password(schema.password)
                user.password = new_pw_hash
                stored_pw = new_pw_hash
                password_ok = True

            if not password_ok:
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error_code": "INVALID_CREDENTIALS",
                        "message": "Thông tin tài khoản hoặc mật khẩu không chính xác.",
                    },
                )

            # Đồng bộ lại user.password nếu vừa lấy từ pending_password_hash
            if not user.password and stored_pw:
                user.password = stored_pw

            # 3️⃣ TÀI KHOẢN CHƯA XÁC THỰC EMAIL -> TỰ ĐỘNG GỬI LẠI MAIL OTP CHUẨN
            if not user.is_verified_email:
                otp_sent_now = False
                now_dt = get_now()
                recently_sent = (
                    latest_pending is not None
                    and latest_pending.created_at is not None
                    and latest_pending.expired_at is not None
                    and not has_expired(latest_pending.expired_at)
                    and (now_dt - latest_pending.created_at).total_seconds() < 55
                )
                if not recently_sent:
                    try:
                        await limit_issue_async(user.email, VERIFY_EMAIL, ip)
                        await self._issue_otp_async(
                            user,
                            VERIFY_EMAIL,
                            pending_password_hash=user.password or stored_pw,
                        )
                        otp_sent_now = True
                    except HTTPException as mail_exc:
                        if mail_exc.status_code != 429:
                            raise
                        await self.db.commit()
                else:
                    await self.db.commit()

                raise HTTPException(
                    status_code=403,
                    detail={
                        "error_code": "EMAIL_NOT_VERIFIED",
                        "message": (
                            f"Tài khoản chưa được xác thực email. Đã gửi mã xác thực 6 chữ số tới {user.email}."
                            if otp_sent_now
                            else f"Tài khoản chưa được xác thực email. Vui lòng nhập mã xác thực 6 chữ số đã gửi tới {user.email}."
                        ),
                        "email": user.email,
                        "otp_sent": otp_sent_now,
                    },
                )

            # 4️⃣ TÀI KHOẢN BỊ KHÓA
            if user.is_banned:
                if user.banned_until and has_expired(user.banned_until):
                    user.is_banned = False
                    user.banned_until = None
                    user.banned_reason = None
                else:
                    ban_code = (
                        "ACCOUNT_BANNED_TEMPORARY"
                        if user.banned_until
                        else "ACCOUNT_BANNED_PERMANENT"
                    )
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error_code": ban_code,
                            "message": "Tài khoản bị khóa",
                            "reason": user.banned_reason,
                            "banned_until": (
                                user.banned_until.isoformat()
                                if user.banned_until
                                else None
                            ),
                            "is_permanent": user.banned_until is None,
                        },
                    )

            # 5️⃣ TẠO PHIÊN (SESSION) MỚI
            login_result = await self._create_session(user.id, res, user_agent, ip, jkt=jkt)

            user.last_login_at = get_now()
            await self.db.commit()
            await self._broadcast_new_session(
                user.id,
                login_result["session_id"],
                user_agent,
                ip,
                login_method="password",
                explicit_device_type=schema.device_type,
            )

            return login_result
        except HTTPException:
            raise
        except Exception:
            await self.db.rollback()
            raise

    async def check_email_async(self, email: str) -> dict[str, Any]:
        user = await self.db.scalar(select(User).where(User.email == email))
        if user is not None and (user.is_verified_email or user.deleted_at or user.is_banned):
            return {"available": False, "message": "Email đã được sử dụng"}
        return {"available": True, "message": "Email khả dụng"}

    async def _issue_otp_async(
        self, user: User, purpose: str, *, pending_password_hash: str | None = None,
    ) -> None:
        # Callers lock existing users before replacing their challenge.
        await self.db.execute(delete(EmailVerifications).where(
            EmailVerifications.user_id == user.id,
            EmailVerifications.purpose == purpose,
        ))
        code = await self.security.generate_otp()
        self.db.add(EmailVerifications(
            user_id=user.id, purpose=purpose, code=code,
            expired_at=get_now() + timedelta(seconds=OTP_TTL),
            pending_password_hash=pending_password_hash,
        ))
        send = (self.mail_service.send_verification_email if purpose == VERIFY_EMAIL
                else self.mail_service.send_login_otp_email)
        await self.db.commit()
        await self._send_mail_or_503(send(email=user.email, fullname=user.fullname or "", code=code))

    async def register_async(self, schema: UserCreate, *, ip: str | None = None) -> dict[str, Any]:
        clean_email = schema.email.strip().lower()
        await limit_issue_async(clean_email, VERIFY_EMAIL, ip)
        password_hash = await self.security.hash_password(schema.password)
        try:
            user = await self.db.scalar(select(User).where(User.email.ilike(clean_email)).with_for_update())
            if user is not None and (user.is_verified_email or user.deleted_at or user.is_banned):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"error_code": "EMAIL_TAKEN", "message": "Email đã được sử dụng trên hệ thống."},
                )
            if user is None:
                user = User(
                    email=clean_email,
                    fullname=(schema.full_name or "").strip(),
                    password=password_hash,
                    is_verified_email=False,
                    create_at=get_now(),
                    grade_level=schema.grade_level,
                    learning_track=schema.learning_track,
                )
                self.db.add(user)
                await self.db.flush()
                role = await self.db.scalar(select(Role).where(Role.role_name == "USER"))
                if not role:
                    role = Role(role_name="USER", details="Customers use the service of the system")
                    self.db.add(role)
                    await self.db.flush()
                self.db.add(UserRoles(user_id=user.id, role_id=role.id))
            else:
                user.email = clean_email
                user.password = password_hash
                user.fullname = (schema.full_name or user.fullname or "").strip()
                if schema.grade_level is not None:
                    user.grade_level = schema.grade_level
                if schema.learning_track is not None:
                    user.learning_track = schema.learning_track
            await self._issue_otp_async(user, VERIFY_EMAIL, pending_password_hash=password_hash)
            return {
                "message": f"Đã gửi mã xác thực 6 chữ số tới {clean_email}.",
                "email": clean_email,
            }
        except HTTPException:
            raise
        except Exception:
            await self.db.rollback()
            raise

    async def logout_async(self, res: Response, *, sid: UUID, user_id: UUID, bound: bool):
        try:
            stmt = select(Sessions).where(Sessions.id == sid, Sessions.user_id == user_id).with_for_update()
            session = (await self.db.execute(stmt)).scalar_one_or_none()
            if not session:
                raise AuthError("session_revoked")
            session.is_revoked = True
            await self.db.commit()

            if not bound and settings.AUTH_ALLOW_COOKIE_COMPAT:
                res.delete_cookie(key="access_token", path="/")
                res.delete_cookie(key="refresh_token", path="/")
            return "Logout done"
        except Exception:
            await self.db.rollback()
            raise

    async def refesh_email_async(self, schema: RefreshEmail, *, ip: str | None = None):
        clean_email = schema.email.strip().lower()
        await limit_issue_async(clean_email, VERIFY_EMAIL, ip)
        try:
            user = await self.db.scalar(select(User).where(User.email.ilike(clean_email)).with_for_update())
            if not user:
                raise HTTPException(
                    404,
                    {
                        "error_code": "ACCOUNT_NOT_FOUND",
                        "message": "Thông tin tài khoản không chính xác (Email chưa được đăng ký trên hệ thống).",
                    },
                )
            if user.deleted_at or user.is_banned:
                raise HTTPException(403, "Tài khoản đã bị khóa hoặc xóa.")
            if user.is_verified_email:
                raise HTTPException(
                    409,
                    {"error_code": "EMAIL_ALREADY_VERIFIED", "message": "Email đã được xác thực. Bạn có thể đăng nhập ngay."},
                )
            # Giữ nguyên mật khẩu người dùng đã đặt lúc đăng ký (tuyệt đối không xóa trắng mật khẩu)
            prev_verif = await self.db.scalar(
                select(EmailVerifications)
                .where(
                    EmailVerifications.user_id == user.id,
                    EmailVerifications.purpose == VERIFY_EMAIL,
                )
                .order_by(desc(EmailVerifications.created_at), desc(EmailVerifications.id))
                .limit(1)
            )
            preserved_hash = user.password or (
                prev_verif.pending_password_hash if prev_verif else None
            )
            if preserved_hash and not user.password:
                user.password = preserved_hash
            await self._issue_otp_async(
                user, VERIFY_EMAIL, pending_password_hash=preserved_hash
            )
            return {"sent": True, "message": f"Đã gửi mã xác thực mới tới {user.email}."}
        except HTTPException:
            raise
        except Exception:
            await self.db.rollback()
            raise

    async def _check_otp_async(
        self, user: User, purpose: str, submitted: str,
        ip: str | None, error: HTTPException,
    ) -> EmailVerifications:
        verification = await self.db.scalar(
            select(EmailVerifications).where(
                EmailVerifications.user_id == user.id,
                EmailVerifications.purpose == purpose,
            ).order_by(desc(EmailVerifications.created_at), desc(EmailVerifications.id)).limit(1)
        )
        await limit_attempt_async(str(user.id), str(verification.id) if verification else None, ip)
        if (not verification or has_expired(verification.expired_at)
                or not secret_matches(submitted.strip(), verification.code)):
            raise error
        return verification

    async def _consume_otp_async(self, user: User, verification: EmailVerifications, error: HTTPException):
        consumed = await self.db.scalar(
            delete(EmailVerifications).where(
                EmailVerifications.id == verification.id,
                EmailVerifications.user_id == user.id,
                EmailVerifications.purpose == verification.purpose,
                EmailVerifications.expired_at > get_now(),
            ).returning(EmailVerifications.id)
        )
        if consumed != verification.id:
            raise error

    async def verify_email_async(self, schema: VerifyEmail, res: Response, *, request: Request | None = None):
        jkt = await self._login_jkt(request)
        clean_email = schema.email.strip().lower()
        user_agent = request.headers.get("user-agent") if request is not None else None
        ip = request.client.host if request is not None and request.client else None
        try:
            user: User | None = await self.db.scalar(
                select(User)
                .options(selectinload(User.user_roles).selectinload(UserRoles.role))
                .where(User.email.ilike(clean_email))
            )
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "error_code": "ACCOUNT_NOT_FOUND",
                        "message": "Thông tin tài khoản không chính xác (Email chưa được đăng ký trên hệ thống).",
                    },
                )

            if user.deleted_at or user.is_banned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tài khoản đã bị khóa hoặc xóa.",
                )

            if user.is_verified_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email này đã được xác thực. Vui lòng đăng nhập.",
                )
            error = HTTPException(400, "Mã xác thực không hợp lệ hoặc đã hết hạn.")
            verification = await self._check_otp_async(user, VERIFY_EMAIL, schema.code, ip, error)
            password_hash = (
                await self.security.hash_password(schema.new_password)
                if schema.new_password is not None
                else (verification.pending_password_hash or user.password)
            )
            await self.db.refresh(user, attribute_names=["is_verified_email", "is_banned", "deleted_at", "password"],
                                  with_for_update=True)
            if user.deleted_at or user.is_banned:
                raise HTTPException(403, "Tài khoản đã bị khóa hoặc xóa.")
            if user.is_verified_email:
                raise HTTPException(409, "Email này đã được xác thực. Vui lòng đăng nhập.")
            await self._consume_otp_async(user, verification, error)
            if password_hash:
                user.password = password_hash
            user.is_verified_email = True
            user.email_verified_at = get_now()
            user.update_at = get_now()
            user.last_login_at = get_now()

            # Tạo phiên đăng nhập ngay sau khi xác nhận mã số (Auto-login)
            login_result = await self._create_session(
                user.id, res, user_agent=user_agent, ip=ip, jkt=jkt
            )

            # Tự động tạo ví cho người dùng mới xác thực
            await self.wallet_service.get_or_create_wallet_async(user.id)

            await self.db.commit()
            await self.db.refresh(user)
            await self._broadcast_new_session(
                user.id,
                login_result["session_id"],
                user_agent,
                ip,
                login_method="email_verify",
            )
            
            roles = [ur.role.role_name for ur in user.user_roles if ur.role]
            return {
                **login_result,
                "user": {
                    "id": user.id,
                    "fullname": user.fullname,
                    "email": user.email,
                    "avatar": user.avatar,
                    "bio": user.bio,
                    "facebook_url": user.facebook_url,
                    "is_verified_email": bool(user.is_verified_email),
                    "email_verified_at": (
                        user.email_verified_at if user.is_verified_email else None
                    ),
                    "roles": roles,
                }
            }
        except Exception:
            await self.db.rollback()
            raise

    async def me_async(self, user: User) -> dict[str, Any]:
        # Tự động tạo ví nếu chưa có (Self-healing)
        await self.wallet_service.get_or_create_wallet_async(user.id)
        shop = ShopService(self.db)
        await shop.profiles.backfill_levels(user.id)
        equipment = await shop.equipment(user.id)
        await self.db.commit()

        roles = [ur.role.role_name for ur in user.user_roles if ur.role]

        # Chuẩn hóa PayPal payer_id (nếu dạng URL)
        raw_payer_id = user.paypal_payer_id
        paypal_payer_id = raw_payer_id.split("/")[-1] if raw_payer_id else None

        return {
            "id": user.id,
            "fullname": user.fullname,
            "email": user.email,
            "avatar": user.avatar,
            "equipment": equipment,
            "bio": user.bio,
            "facebook_url": user.facebook_url,
            # ====== Info cơ bản ======
            "birthday": user.birthday,
            "conscious": user.conscious,
            "district": user.district,
            "citizenship_identity": user.citizenship_identity,
            # ====== Account status ======
            "is_verified_email": bool(user.is_verified_email),
            "email_verified_at": (
                user.email_verified_at if user.is_verified_email else None
            ),
            "is_banned": bool(user.is_banned),
            "banned_reason": user.banned_reason,
            "banned_until": user.banned_until,
            "last_login_at": user.last_login_at,
            # ====== Auth ======
            "roles": roles,
            # ====== Preferences ======
            "preferences_str": user.preferences_str,
            # ====== Learning Goals ======
            "learning_goals": user.learning_goals,
            "daily_goal_minutes": user.daily_goal_minutes,
            "preferred_learning_style": user.preferred_learning_style,
            # ====== PayPal (chuẩn hóa để dùng rút tiền) ======
            "paypal_email": user.paypal_email,
            "paypal_payer_id": paypal_payer_id,
            "paypal_raw_payer_id": user.paypal_payer_id,  # để debug nếu cần
            # ====== System timestamps ======
            "created_at": user.create_at,
            "updated_at": user.update_at,
        }

    async def _create_google_user(self, email: str, info: dict[str, Any]) -> User | None:
        fullname = info.get("name")
        avatar = info.get("picture")
        now = get_now()
        user = await self.db.scalar(
            insert(User).values(
                email=email,
                fullname=fullname if isinstance(fullname, str) else "",
                avatar=avatar if isinstance(avatar, str) else None,
                password="",
                is_verified_email=True,
                email_verified_at=now,
                create_at=now,
                update_at=now,
            ).on_conflict_do_nothing(index_elements=[User.email]).returning(User)
        )
        if user is None:
            return None

        role_query = select(Role.id).where(Role.role_name == "USER")
        role_id = await self.db.scalar(role_query)
        if role_id is None:
            await self.db.execute(
                insert(Role).values(role_name="USER", details="Default customer role")
                .on_conflict_do_nothing(index_elements=[Role.role_name])
            )
            role_id = (await self.db.execute(role_query)).scalar_one()
        self.db.add(UserRoles(user_id=user.id, role_id=role_id))
        return user

    @staticmethod
    def _require_active_google_account(user: User) -> None:
        if user.deleted_at is not None or user.is_banned:
            raise HTTPException(403, "Tài khoản đã bị khóa hoặc xóa.")

    async def _resolve_google_user(self, subject: str, info: dict[str, Any], *, bound: bool) -> User:
        linked_user_query = (
            select(User).join(UserIdentity, UserIdentity.user_id == User.id)
            .where(
                UserIdentity.provider == GOOGLE_PROVIDER,
                UserIdentity.provider_subject == subject,
            ).with_for_update(of=User)
        )
        user = await self.db.scalar(linked_user_query)
        if user is None:
            # Serialize first logins for the same subject, including when their emails differ.
            await self.db.execute(
                text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
                {"key": f"google-login:{subject}"},
            )
            user = await self.db.scalar(linked_user_query)
        if user is not None:
            self._require_active_google_account(user)
            return user

        email = info.get("email")
        if (
            not isinstance(email, str) or len(email) > 254 or email.count("@") != 1
            or email.startswith("@") or email.endswith("@")
            or any(char.isspace() or char == "\0" for char in email)
        ):
            raise _invalid_google_token(bound=bound)

        by_email = select(User).where(User.email == email).with_for_update()
        user = await self.db.scalar(by_email)
        if user is None:
            user = await self._create_google_user(email, info)
            if user is not None:
                self.db.add(UserIdentity(
                    provider=GOOGLE_PROVIDER, provider_subject=subject, user_id=user.id, email_at_link=email,
                ))
                return user
            # Another signup inserted this email after the first lookup.
            user = await self.db.scalar(by_email)
            if user is None:
                raise HTTPException(409, "Chưa thể đăng nhập Google. Vui lòng thử lại.")

        self._require_active_google_account(user)
        # Google controls consumer Gmail addresses. Neither a current Workspace
        # address nor a verified third-party email proves historical ownership.
        # A personal Gmail address that Google reports as verified AND that the
        # account already verified by email proves the same person owns both, so it may
        # link even when the account signs in with a password. Legacy Google accounts
        # keep linking without the token's verification flag, as before.
        is_personal_gmail = email.rsplit("@", 1)[1].lower() == "gmail.com" and "hd" not in info
        google_confirms_email = info.get("email_verified") is True
        can_link_legacy = (
            user.is_verified_email is True and is_personal_gmail
            and (user.password == LEGACY_GOOGLE_PASSWORD or google_confirms_email)
        )
        if not can_link_legacy or await self.db.scalar(
            select(UserIdentity.user_id).where(
                UserIdentity.user_id == user.id, UserIdentity.provider == GOOGLE_PROVIDER,
            )
        ) is not None:
            raise HTTPException(
                409, "Không thể tự liên kết tài khoản với Google. Vui lòng dùng cách đăng nhập trước đây hoặc liên hệ hỗ trợ.",
            )

        self.db.add(UserIdentity(
            provider=GOOGLE_PROVIDER, provider_subject=subject, user_id=user.id, email_at_link=email,
        ))
        return user

    async def login_google_async(
        self, schema: GoogleLogin, res: Response, user_agent: str | None = None,
        ip: str | None = None, *, request: Request | None = None,
    ):
        jkt = await self._login_jkt(request)
        client_id = settings.GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE.strip()
        if not client_id:
            raise HTTPException(
                503, "Đăng nhập Google chưa được cấu hình trên máy chủ."
            )
        try:
            info = await asyncio.to_thread(
                id_token.verify_oauth2_token,
                schema.credential,
                requests.Request(),
                client_id,
            )
        except Exception:
            raise _invalid_google_token(bound=jkt is not None) from None

        subject = info.get("sub")
        if (
            info.get("email_verified") is not True
            or not isinstance(subject, str) or not 1 <= len(subject) <= 255
            or not all("!" <= char <= "~" for char in subject)
        ):
            raise _invalid_google_token(bound=jkt is not None)

        try:
            user = await self._resolve_google_user(subject, info, bound=jkt is not None)
            login_result = await self._create_session(user.id, res, user_agent, ip, jkt=jkt)
            user.last_login_at = get_now()
            await self.db.commit()
            await self._broadcast_new_session(
                user.id,
                login_result["session_id"],
                user_agent,
                ip,
                login_method="google",
                explicit_device_type=schema.device_type,
            )
            return login_result

        except DBAPIError:
            await self.db.rollback()
            raise HTTPException(503, "Chưa thể đăng nhập Google. Vui lòng thử lại.") from None
        except Exception:
            await self.db.rollback()
            raise

    async def _authorize_refresh_async(
        self, jkt: str | None, token: str, request: Request | None, proof: str | None, from_cookie: bool,
    ) -> None:
        if jkt is not None:
            if from_cookie or request is None:
                raise AuthError("invalid_dpop_proof", use_dpop_proof=True)
            await authenticate_dpop(request, proof, hash_claim="rth", token=token, expected_jkt=jkt)
        elif proof is not None:
            raise AuthError("invalid_dpop_proof")
        elif not (settings.AUTH_ALLOW_COOKIE_COMPAT if from_cookie else settings.AUTH_ALLOW_UNBOUND_BEARER):
            raise AuthError("invalid_token")

    async def _find_refresh_session_async(self, token_hash: str) -> Sessions | None:
        for column in (Sessions.refresh_token_hash, Sessions.previous_refresh_hash):
            session = await self.db.scalar(select(Sessions).where(column == token_hash))
            if session is not None:
                return session
        return None

    async def _refresh_grace_async(self, redis, token_hash: str, session_id: UUID | None):
        # Resolve the Redis chain before taking a row lock. Validate its tip against the locked row.
        candidate = None
        for _ in range(5):
            cache_key = REFRESH_CACHE_PREFIX + token_hash
            result = open_auth_payload(await redis.get(cache_key), cache_key)
            if not result:
                break
            if session_id is None:
                session_id = UUID(result["session_id"])
            if result["session_id"] != str(session_id):
                break
            token_hash = await self.security.hash_token(result["refresh_token"])
            candidate = (result, token_hash)
        return session_id, candidate

    async def refresh_token_async(
        self, refresh_token: str | None, res: Response, *, request: Request | None = None,
        from_cookie: bool = False, operation_id: UUID | None = None,
    ):
        if (
            not isinstance(refresh_token, str) or not refresh_token
            or not refresh_token.isascii() or len(refresh_token) > 2048
            or (from_cookie and not settings.AUTH_ALLOW_COOKIE_COMPAT)
        ):
            raise AuthError("invalid_token")

        proof = dpop_header(request) if request is not None else None
        token_hash = await self.security.hash_token(refresh_token)
        redis = get_redis()
        cache_key = REFRESH_CACHE_PREFIX + token_hash
        lock = redis.lock("auth:refresh:lock:" + token_hash, timeout=15, blocking_timeout=0.5)
        try:
            async with asyncio.timeout(2):
                acquired = await lock.acquire()
        except (RedisError, TimeoutError):
            raise HTTPException(503, "Chưa thể làm mới phiên. Vui lòng thử lại.") from None
        if not acquired:
            raise HTTPException(503, "Phiên đang được làm mới. Vui lòng thử lại.")

        try:
            snapshot = await self._find_refresh_session_async(token_hash)
            spent = None
            if snapshot is None or (
                operation_id is not None and snapshot.dpop_jkt is not None
                and not secret_matches(snapshot.refresh_token_hash, token_hash)
            ):
                spent = await self.db.get(SpentRefreshTokens, token_hash)
                if snapshot is None and spent is not None:
                    snapshot = await self.db.get(Sessions, spent.session_id)

            candidate = None
            if snapshot is None:
                # A legacy chain can still resolve a token older than the previous hash.
                async with asyncio.timeout(2):
                    session_id, candidate = await self._refresh_grace_async(redis, token_hash, None)
                if session_id is None:
                    raise AuthError("invalid_token")
                snapshot = await self.db.get(Sessions, session_id)
            if snapshot is None:
                raise AuthError("invalid_token")
            session_id, user_id, jkt = snapshot.id, snapshot.user_id, snapshot.dpop_jkt
            async with asyncio.timeout(2):
                await self._authorize_refresh_async(jkt, refresh_token, request, proof, from_cookie)
                matching_operation = spent is not None and operation_id is not None and spent.operation_id == operation_id
                if candidate is None and not matching_operation and not secret_matches(snapshot.refresh_token_hash, token_hash):
                    _, candidate = await self._refresh_grace_async(redis, token_hash, session_id)

            await self.db.execute(text("SET LOCAL lock_timeout = '2s'"))
            user = await self.db.scalar(
                select(User).where(User.id == user_id).with_for_update(read=True).execution_options(
                    populate_existing=True,
                )
            )
            require_active_account(user)
            session = await self.db.get(Sessions, session_id, populate_existing=True, with_for_update=True)
            if session is None or session.user_id != user_id or session.dpop_jkt != jkt:
                raise AuthError("invalid_token")
            if session.is_revoked is not False or has_expired(session.expired_at):
                raise AuthError("session_revoked")
            bound = jkt is not None
            current = secret_matches(session.refresh_token_hash, token_hash)

            if not current:
                spent = (await self.db.get(SpentRefreshTokens, token_hash, populate_existing=True)
                         if bound else None)
                if spent is not None and spent.session_id != session_id:
                    raise AuthError("invalid_token")
                rotated_at = (session.previous_rotated_at
                              if secret_matches(session.previous_refresh_hash, token_hash)
                              else spent.rotated_at if spent is not None else None)
                if spent is not None and operation_id is not None and spent.operation_id == operation_id:
                    binding = f"refresh-operation:{session_id}:{token_hash}:{operation_id}"
                    result = open_auth_payload(spent.encrypted_result, binding)
                    if (result is None or now_tzinfo() >= spent.rotated_at + timedelta(seconds=REFRESH_RETRY_SECONDS)
                            or not secret_matches(
                                session.refresh_token_hash, await self.security.hash_token(result["refresh_token"]),
                            )):
                        raise AuthError("invalid_token")
                    result = jsonable_encoder(await self._session_tokens(
                        session, result["refresh_token"], "Session refreshed",
                    ))
                    await self.db.rollback()
                    self._set_token_response(res, result, bound=True)
                    return result
                if rotated_at is not None and now_tzinfo() >= rotated_at + timedelta(seconds=REFRESH_GRACE_SECONDS):
                    if not bound:
                        # A delayed response must not erase a different tab's new cookie.
                        raise AuthError("invalid_token", clear_cookies=False)
                    session.is_revoked = True
                    await self.db.commit()
                    logger.warning("Bound refresh token reused after grace period; session revoked")
                    raise AuthError("session_revoked")
                if candidate is not None and secret_matches(session.refresh_token_hash, candidate[1]):
                    await self.db.rollback()
                    self._set_token_response(res, candidate[0], bound=bound)
                    return candidate[0]
                stale_legacy = not bound and (rotated_at is not None or candidate is not None)
                raise AuthError("invalid_token", clear_cookies=not stale_legacy)

            new_refresh = await self.security.generate_refresh_token()
            rotated_at = now_tzinfo()
            prior_hash = session.previous_refresh_hash
            session.previous_refresh_hash = token_hash
            session.previous_rotated_at = rotated_at
            session.refresh_token_hash = await self.security.hash_token(new_refresh)
            session.expired_at = rotated_at + timedelta(days=30)
            session.updated_at = rotated_at
            result = jsonable_encoder(await self._session_tokens(session, new_refresh, "Session refreshed"))
            sealed = seal_auth_payload(result, cache_key)
            if bound:
                if prior_hash is not None:
                    await self.db.execute(
                        update(SpentRefreshTokens).where(
                            SpentRefreshTokens.token_hash == prior_hash,
                            SpentRefreshTokens.session_id == session_id,
                            SpentRefreshTokens.encrypted_result.is_not(None),
                        ).values(encrypted_result=None)
                    )
                binding = f"refresh-operation:{session_id}:{token_hash}:{operation_id}"
                self.db.add(SpentRefreshTokens(
                    token_hash=token_hash, session_id=session_id, rotated_at=rotated_at,
                    operation_id=operation_id,
                    encrypted_result=seal_auth_payload(result, binding) if operation_id else None,
                ))
            await self.db.commit()
            self._set_token_response(res, result, bound=bound)
            try:
                async with asyncio.timeout(2):
                    await redis.set(cache_key, sealed, ex=REFRESH_GRACE_SECONDS)
            except (RedisError, TimeoutError):
                logger.warning("Refresh rotation committed; short grace cache unavailable")
            return result
        except (RedisError, TimeoutError):
            await self.db.rollback()
            raise HTTPException(503, "Chưa thể làm mới phiên. Vui lòng thử lại.") from None
        except DBAPIError as exc:
            await self.db.rollback()
            if getattr(exc.orig, "sqlstate", None) in {"55P03", "40P01"}:
                raise HTTPException(503, "Phiên đang được làm mới. Vui lòng thử lại.") from None
            raise
        except BaseException:
            await self.db.rollback()
            raise
        finally:
            try:
                async with asyncio.timeout(2):
                    await lock.release()
            except (RedisError, TimeoutError):
                logger.warning("Refresh lock release failed; lock will expire")

    def _serialize_session(self, session: Sessions, current_sid: str | None = None) -> dict[str, Any]:
        user_agent = session.user_agent or ""

        return {
            "id": str(session.id),
            "device_type": self._detect_device_type(user_agent),
            "device_name": session.device_name,
            "ip_address": session.ip_address,
            "user_agent": session.user_agent,
            "last_used_at": session.updated_at,
            "created_at": session.created_at,
            "expired_at": session.expired_at,
            "is_current": str(session.id) == str(current_sid) if current_sid else False,
        }

    async def list_sessions_async(self, user_id: Any, current_sid: str | None = None):
        stmt = (
            select(Sessions)
            .where(
                Sessions.user_id == user_id,
                Sessions.is_revoked.is_(False),
                Sessions.expired_at >= now_tzinfo(),
            )
            .order_by(desc(Sessions.created_at))
        )
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()
        return {
            "sessions": [self._serialize_session(session, current_sid) for session in sessions],
            "total": len(sessions)
        }

    async def logout_all_async(self, user_id: Any, keep_sid: str | None = None):
        # Thu hồi tất cả các session của user
        stmt = select(Sessions).where(Sessions.user_id == user_id, Sessions.is_revoked.is_(False))
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()
        revoked_count = 0
        revoked_session_ids: list[str] = []
        
        for session in sessions:
            if keep_sid and str(session.id) == str(keep_sid):
                continue
            session.is_revoked = True
            revoked_count += 1
            revoked_session_ids.append(str(session.id))
            
        await self.db.commit()
        return {
            "message": "Đã đăng xuất khỏi các thiết bị",
            "revoked_count": revoked_count,
            "revoked_session_ids": revoked_session_ids,
        }

    async def revoke_session_async(self, session_id: str, user_id: Any):
        import uuid
        try:
            if isinstance(session_id, str):
                session_id = uuid.UUID(session_id)
        except Exception:
            raise HTTPException(400, "Invalid session ID format")

        stmt = select(Sessions).where(Sessions.id == session_id, Sessions.user_id == user_id)
        session = (await self.db.execute(stmt)).scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên đăng nhập")

        session.is_revoked = True
        await self.db.commit()
        return {"message": "Đã đăng xuất thiết bị thành công", "revoked_session_id": str(session.id)}

    async def send_otp_async(self, schema: SendOtp, *, ip: str | None = None):
        self._require_login_otp_purpose(schema.purpose)
        await limit_issue_async(schema.email, LOGIN, ip)
        try:
            user = await self.db.scalar(select(User).where(User.email == schema.email).with_for_update())
            self._require_otp_user(user)
            await self._issue_otp_async(user, LOGIN)
            return {
                "message": "Mã OTP đã được gửi đến email của bạn",
                "resend_available_in": 60,
                "otp_expires_in": OTP_TTL,
            }
        except Exception:
            await self.db.rollback()
            raise

    @staticmethod
    def _require_login_otp_purpose(purpose: str) -> None:
        # "authenticate" is the existing mobile login purpose.
        if purpose not in {LOGIN, "authenticate"}:
            raise HTTPException(400, "Mục đích mã OTP không hợp lệ.")

    @staticmethod
    def _require_otp_user(user: User | None) -> None:
        if user is None:
            raise HTTPException(404, "Không tìm thấy người dùng")
        if user.deleted_at or user.is_banned:
            raise HTTPException(403, {"error_code": "ACCOUNT_BANNED", "message": "Tài khoản không khả dụng"})
        if not user.is_verified_email:
            raise HTTPException(403, {"error_code": "EMAIL_NOT_VERIFIED", "message": "Vui lòng xác thực email"})

    async def verify_otp_login_async(
        self, schema: VerifyOtp, res: Response, user_agent: str | None = None,
        ip: str | None = None, *, request: Request | None = None,
    ):
        self._require_login_otp_purpose(schema.purpose)
        jkt = await self._login_jkt(request)
        try:
            identifier = schema.email or schema.phone
            if not identifier:
                raise HTTPException(400, "Email hoặc số điện thoại là bắt buộc")
            stmt = select(User).where(User.email == identifier)
            user = (await self.db.execute(stmt)).scalar_one_or_none()
            self._require_otp_user(user)

            error = AuthError("invalid_token") if jkt is not None else HTTPException(
                401, {"error_code": "INVALID_OTP", "message": "Mã OTP không đúng hoặc đã hết hạn"},
            )
            verification = await self._check_otp_async(user, LOGIN, schema.otp_code, ip, error)
            await self.db.refresh(user, attribute_names=["is_verified_email", "is_banned", "deleted_at"],
                                  with_for_update=True)
            self._require_otp_user(user)
            await self._consume_otp_async(user, verification, error)

            login_result = await self._create_session(user.id, res, user_agent, ip, jkt=jkt)
            user.last_login_at = get_now()
            await self.db.commit()
            await self._broadcast_new_session(
                user.id, login_result["session_id"], user_agent, ip, login_method="otp",
                explicit_device_type=schema.device_type,
            )
            return login_result
        except Exception:
            await self.db.rollback()
            raise

    @staticmethod
    def _hash_reset_code(user_id: UUID, code: str) -> str:
        return hashlib.sha256(f"reset:{user_id}:{code.strip()}".encode("utf-8")).hexdigest()

    async def forgot_password_async(
        self, schema: ForgotPasswordRequest, *, ip: str | None = None
    ) -> dict[str, Any]:
        email = schema.email.strip().lower()

        try:
            # Throttle before any lookup so unknown addresses cost the same as real ones.
            await limit_issue_async(email, RESET_PASSWORD, ip)

            # Exact, case-insensitive match. ilike() would treat "%" and "_" in the address
            # as wildcards and could pick (and mail) an unrelated account.
            user = await self.db.scalar(
                select(User).where(func.lower(User.email) == email).with_for_update()
            )
            if user is None or user.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "error_code": "ACCOUNT_NOT_FOUND",
                        "message": "Thông tin tài khoản không chính xác (Email chưa được đăng ký trên hệ thống).",
                    },
                )
            if user.is_banned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error_code": "ACCOUNT_BANNED",
                        "message": "Tài khoản đang bị khóa, không thể đặt lại mật khẩu.",
                    },
                )

            await self.db.execute(
                delete(EmailVerifications).where(
                    EmailVerifications.user_id == user.id,
                    EmailVerifications.purpose == RESET_PASSWORD,
                )
            )
            code = await self.security.generate_otp()
            code_hash = self._hash_reset_code(user.id, code)
            self.db.add(
                EmailVerifications(
                    user_id=user.id,
                    purpose=RESET_PASSWORD,
                    code=code_hash,
                    expired_at=get_now() + timedelta(seconds=RESET_PASSWORD_TTL),
                )
            )
            await self.db.commit()

            frontend_base = str(
                getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            ).rstrip("/")
            reset_link = (
                f"{frontend_base}/reset-password"
                f"?email={quote(user.email)}&code={quote(code)}"
            )
            await self._send_mail_or_503(
                self.mail_service.send_reset_password_email(
                    email=user.email,
                    fullname=user.fullname or "",
                    reset_link=reset_link,
                    code=code,
                )
            )
            return {
                "message": f"Đã gửi mã xác thực 6 chữ số và liên kết đặt lại mật khẩu tới {email}.",
                "email": email,
                "expires_in_seconds": RESET_PASSWORD_TTL,
                "resend_cooldown_seconds": 60,
            }
        except HTTPException:
            raise
        except Exception:
            await self.db.rollback()
            raise

    async def reset_password_async(
        self, schema: ResetPasswordRequest, *, ip: str | None = None
    ) -> dict[str, Any]:
        email = schema.email.strip().lower()
        provided_code = schema.code.strip()

        invalid_err = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_RESET_CODE",
                "message": "Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng yêu cầu mã mới.",
            },
        )

        try:
            user = await self.db.scalar(
                select(User).where(func.lower(User.email) == email).with_for_update()
            )
            if user is None or user.deleted_at is not None or user.is_banned:
                await limit_attempt_async(email, None, ip)
                raise invalid_err

            verification = await self.db.scalar(
                select(EmailVerifications)
                .where(
                    EmailVerifications.user_id == user.id,
                    EmailVerifications.purpose == RESET_PASSWORD,
                )
                .order_by(desc(EmailVerifications.created_at))
                .with_for_update()
            )
            await limit_attempt_async(
                str(user.id),
                str(verification.id) if verification else None,
                ip,
            )

            if (
                verification is None
                or not verification.code
                or verification.expired_at is None
                or has_expired(verification.expired_at)
            ):
                if verification is not None:
                    await self.db.delete(verification)
                    await self.db.commit()
                raise invalid_err

            expected_hash = self._hash_reset_code(user.id, provided_code)
            if not secret_matches(expected_hash, verification.code):
                raise invalid_err

            user.password = await self.security.hash_password(schema.new_password)
            user.is_verified_email = True

            # Xóa toàn bộ mã reset cũ (dùng 1 lần) & thu hồi toàn bộ phiên đăng nhập cũ
            await self.db.execute(
                delete(EmailVerifications).where(
                    EmailVerifications.user_id == user.id,
                    EmailVerifications.purpose == RESET_PASSWORD,
                )
            )
            await revoke_user_sessions_async(self.db, user.id)
            await self.db.commit()

            return {
                "message": "Đặt lại mật khẩu thành công! Tất cả phiên đăng nhập cũ đã được đăng xuất. Vui lòng đăng nhập bằng mật khẩu mới.",
            }
        except HTTPException:
            raise
        except Exception:
            await self.db.rollback()
            raise

    async def change_password_async(
        self,
        user_id: UUID,
        schema: ChangePasswordRequest,
        *,
        current_session_id: UUID | None = None,
        ip: str | None = None,
    ) -> dict[str, Any]:
        try:
            schema.validate_business_rules()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_PASSWORD_INPUT", "message": str(exc)},
            ) from None

        try:
            await limit_attempt_async(f"change-password:{user_id}", None, ip)

            user = await self.db.scalar(
                select(User).where(User.id == user_id).with_for_update()
            )
            if user is None or user.deleted_at is not None or user.is_banned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"error_code": "ACCOUNT_UNAVAILABLE", "message": "Tài khoản không khả dụng."},
                )

            if not user.password or not await self.security.verify_password(
                schema.current_password, user.password
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error_code": "INVALID_CURRENT_PASSWORD",
                        "message": "Mật khẩu hiện tại không chính xác. Nếu bạn đăng nhập bằng Google/GitHub, hãy dùng chức năng Quên mật khẩu để đặt mật khẩu mới.",
                    },
                )

            if await self.security.verify_password(schema.new_password, user.password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error_code": "SAME_PASSWORD",
                        "message": "Mật khẩu mới phải khác mật khẩu hiện tại.",
                    },
                )

            user.password = await self.security.hash_password(schema.new_password)
            revoked_count = 0
            if schema.logout_other_sessions:
                revoked_count = await revoke_user_sessions_async(
                    self.db,
                    user.id,
                    exclude_session_id=current_session_id,
                )
            await self.db.commit()

            message = (
                f"Đổi mật khẩu thành công! Đã đăng xuất {revoked_count} phiên đăng nhập trên thiết bị khác."
                if revoked_count > 0
                else "Đổi mật khẩu thành công!"
            )
            return {
                "message": message,
                "revoked_other_sessions": revoked_count,
            }
        except HTTPException:
            raise
        except Exception:
            await self.db.rollback()
            raise
