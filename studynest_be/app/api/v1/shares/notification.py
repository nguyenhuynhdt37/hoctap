import asyncio
import json
import uuid
from uuid import UUID

from app.core.deps import AuthorizationService, receive_bounded_ws_text_async
from app.core.settings import settings
from app.core.ws_manager import ws_manager
from app.db.models.database import User
from app.schemas.shares.notification import (
    NotificationCreateSchema,
    PushTokenRegisterRequest,
)
from app.schemas.shares.presence import (
    PresenceBulkRequest,
    PresenceBulkResponse,
    PresenceResponse,
)
from app.services.shares.notification import NotificationService
from app.services.shares.presence import PresenceService
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException
from loguru import logger

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    await websocket.accept()

    active_role = websocket.query_params.get("role_name")
    if active_role not in {"USER", "LECTURER", "ADMIN"}:
        await websocket.close(code=4401)
        return
    user: User | None = await AuthorizationService.get_require_role_ws(websocket, [active_role])

    # Không có user → đóng luôn (đã đóng trong deps.py)
    if not user:
        logger.warning("[WS][Notifications] Rejecting WS: user is None (already closed in deps)")
        return

    user_id = str(user.id)
    channel = ""
    auth_channel = f"AUTH_{user_id}"
    connection_id = str(uuid.uuid4())
    presence_service = PresenceService()
    if active_role == "ADMIN":
        channel = active_role
        logger.info(f"[WS][Notifications] ADMIN {user.email} connected to {channel}")
    else:
        # Channel cá nhân theo từng role
        channel = f"{active_role}_{user_id}"
        logger.info(f"[WS][Notifications] User {user.email} connected to {channel}")
        # Cho join vào đúng channel
    await ws_manager.connect(websocket, channel)
    if auth_channel != channel:
        await ws_manager.connect(websocket, auth_channel)
    await presence_service.mark_online(user_id, connection_id)

    try:
        while True:
            try:
                raw_message = await asyncio.wait_for(
                    receive_bounded_ws_text_async(websocket),
                    timeout=max(settings.PRESENCE_TTL_SECONDS / 2, 15),
                )
            except asyncio.TimeoutError:
                await presence_service.heartbeat(user_id, connection_id)
                continue

            status = "online"
            try:
                payload = json.loads(raw_message)
                if payload.get("type") == "presence.away":
                    status = "away"
            except json.JSONDecodeError:
                pass

            await presence_service.heartbeat(user_id, connection_id, status=status)
    except (WebSocketDisconnect, WebSocketException) as exc:
        if isinstance(exc, WebSocketException):
            await websocket.close(code=exc.code)
        ws_manager.disconnect(websocket, channel)
        if auth_channel != channel:
            ws_manager.disconnect(websocket, auth_channel)
        await presence_service.mark_offline(user_id, connection_id)
    except Exception as exc:
        logger.warning(f"[WS][Notifications] disconnected with error: {exc}")
        ws_manager.disconnect(websocket, channel)
        if auth_channel != channel:
            ws_manager.disconnect(websocket, auth_channel)
        await presence_service.mark_offline(user_id, connection_id)


@router.get("/presence/me", response_model=PresenceResponse)
async def get_my_presence(
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    presence_service: PresenceService = Depends(PresenceService),
):
    user = await authorization_service.get_current_user()
    return await presence_service.get_presence(str(user.id))


@router.post("/presence/bulk", response_model=PresenceBulkResponse)
async def get_bulk_presence(
    schema: PresenceBulkRequest,
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    presence_service: PresenceService = Depends(PresenceService),
):
    await authorization_service.get_current_user()
    users = await presence_service.get_bulk_presence(schema.user_ids)
    return PresenceBulkResponse(users=users)


@router.get("/user")
async def get_user_notifications(
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    type_: str | None = None,
    is_read: bool | None = None,
    sort_by: str = "created_at",
    order_dir: str = "desc",
):
    user = await authorization_service.get_current_user()
    return await service.get_notifications_async(
        user_id=user.id,
        role="USER",
        page=page,
        limit=limit,
        search=search,
        type_=type_,
        is_read=is_read,
        sort_by=sort_by,
        order_dir=order_dir,
    )


@router.get("/lecturer")
async def get_lecturer_notifications(
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    type_: str | None = None,
    is_read: bool | None = None,
    sort_by: str = "created_at",
    order_dir: str = "desc",
):
    user = await authorization_service.require_role(["LECTURER"])
    return await service.get_notifications_async(
        user_id=user.id,
        role="LECTURER",
        page=page,
        limit=limit,
        search=search,
        type_=type_,
        is_read=is_read,
        sort_by=sort_by,
        order_dir=order_dir,
    )


@router.get("/admin")
async def get_admin_notifications(
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    type_: str | None = None,
    is_read: bool | None = None,
    sort_by: str = "created_at",
    order_dir: str = "desc",
):
    user = await authorization_service.require_role(["ADMIN"])
    return await service.get_notifications_async(
        user_id=user.id,
        role="ADMIN",
        page=page,
        limit=limit,
        search=search,
        type_=type_,
        is_read=is_read,
        sort_by=sort_by,
        order_dir=order_dir,
    )


@router.post("/read-all/user")
async def read_all_notifications(
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization_service.get_current_user()
    ok = await service.mark_all_as_read(str(user.id), "USER")
    return {"success": ok}


@router.post("/read-all/lecturer")
async def read_all_notifications_lecturer(
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization_service.require_role(["LECTURER"])
    ok = await service.mark_all_as_read(str(user.id), "LECTURER")
    return {"success": ok}


@router.post("/read-all/admin")
async def read_all_notifications_admin(
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization_service.require_role(["ADMIN"])
    ok = await service.mark_all_as_read(str(user.id), "ADMIN")
    return {"success": ok}


@router.post("/read/{notification_id}")
async def read_notification(
    notification_id: UUID,
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization_service.get_current_user()
    roles = await authorization_service.get_list_role_in_user(user)
    updated = await service.mark_as_read(notification_id, user.id, admin="ADMIN" in roles)
    return updated


@router.post("/push-tokens")
async def register_push_token(
    body: PushTokenRegisterRequest,
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization_service.get_current_user()
    result = await service.register_push_token_async(
        user.id, body.token, body.device_type
    )
    return result


@router.post("/test-device")
async def send_test_device_notification(
    service: NotificationService = Depends(NotificationService),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
):
    """Tạo và phát 1 thông báo thử nghiệm realtime qua WebSocket để kiểm chứng thông báo thiết bị."""
    user = await authorization_service.get_current_user()
    roles = await authorization_service.get_list_role_in_user(user)
    target_role = "USER" if "USER" in roles else (roles[0] if roles else "USER")
    notif = await service.create_notification_async(
        NotificationCreateSchema(
            user_id=user.id,
            role_target=[target_role],
            title="Thông báo thiết bị Mây Mây đã sẵn sàng!",
            content="Hệ thống thông báo realtime và thông báo thiết bị của bạn đang hoạt động chuẩn xác.",
            url="/notifications",
            type="system",
            action="test_device",
        )
    )
    return {
        "success": True,
        "notification_id": str(notif.id),
        "role_target": target_role,
    }
