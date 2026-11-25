from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
import jwt

from app.core.deps import AuthorizationService
from app.core.settings import settings
from app.db.models.database import User
from app.services.shares.payout import PayoutService
from app.services.shares.paypal_service import PayPalService

router = APIRouter(prefix="/lecturer/payout", tags=["lecturer • Payout"])


def _state_secret() -> str:
    secret = settings.SECRET_KEY or settings.JWT_SECRET
    if not secret:
        raise HTTPException(500, "Thiếu cấu hình khóa ký phiên OAuth.")
    return secret


@router.get("/connect-url")
async def get_paypal_connect_url(
    return_url: str | None = Query(default=None),
    scope: str = Query(default="openid"),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    user: User = await authorization_service.require_role(["LECTURER"])
    client_id = settings.PAYPAL_CLIENT_ID
    if not client_id:
        raise HTTPException(500, "Chưa cấu hình PAYPAL_CLIENT_ID trên máy chủ.")

    safe_return = (
        return_url
        if return_url and return_url.startswith(("http://", "https://"))
        else f"{settings.FRONTEND_URL}/lecturer/profile"
    )
    redirect_uri = settings.PAYPAL_REDIRECT_URI or f"{settings.BACKEND_URL}/api/v1/lecturer/payout/callback"
    state_token = jwt.encode(
        {
            "uid": str(user.id),
            "return_url": safe_return,
            "purpose": "paypal_connect",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        _state_secret(),
        algorithm="HS256",
    )

    is_sandbox = "sandbox" in (settings.PAYPAL_BASE_URL or "sandbox").lower()
    connect_base = (
        "https://www.sandbox.paypal.com/connect"
        if is_sandbox
        else "https://www.paypal.com/connect"
    )
    query = urlencode(
        {
            "flowEntry": "static",
            "client_id": client_id,
            "response_type": "code",
            "scope": scope or "openid",
            "redirect_uri": redirect_uri,
            "state": state_token,
        }
    )
    return {"url": f"{connect_base}?{query}"}


@router.get("/callback")
async def paypal_wallet_callback(
    request: Request,
    payout_service: PayoutService = Depends(PayoutService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    if not code or not state:
        raise HTTPException(400, "Thiếu code hoặc state từ PayPal.")

    user: User | None = None
    return_url: str | None = None

    # Ưu tiên xác thực qua signed JWT state (tránh lỗi mất cookie cross-host localhost vs 127.0.0.1)
    try:
        payload = jwt.decode(state, _state_secret(), algorithms=["HS256"])
        if payload.get("purpose") == "paypal_connect" and payload.get("uid"):
            user = await payout_service.db.get(User, uuid.UUID(payload["uid"]))
            return_url = payload.get("return_url")
    except jwt.PyJWTError:
        user = None

    if user is None:
        user = await authorization_service.require_role(["LECTURER"])

    paypal = PayPalService(request.app.state.http)
    return await payout_service.paypal_connect_callback_async(
        code,
        paypal,
        user,
        state,
        return_url=return_url,
    )
