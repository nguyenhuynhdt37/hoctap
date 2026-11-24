import asyncio
import uuid
from typing import Optional

import httpx
from app.core.ws_manager import ws_manager
from app.db.models.database import Notifications, UserPushTokens
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.libs.formats.datetime import serialize, to_utc_naive
from app.schemas.shares.notification import NotificationCreateSchema
from fastapi import Depends, HTTPException
from loguru import logger
from sqlalchemy import case, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession


async def send_expo_push_notifications_async(
    tokens: list[str], title: str, body: str, data: dict = None
):
    if not tokens:
        return

    url = "https://exp.host/--/api/v2/push/send"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
    }

    messages = []
    for token in tokens:
        if not token.startswith("ExponentPushToken"):
            continue
        messages.append(
            {
                "to": token,
                "title": title,
                "body": body,
                "data": data or {},
                "sound": "default",
            }
        )

    if not messages:
        return

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, headers=headers, json=messages, timeout=10.0
            )
            if response.status_code != 200:
                logger.error(f"[ExpoPush] Failed to send push: {response.text}")
            else:
                logger.info(
                    f"[ExpoPush] Sent {len(messages)} push notifications successfully."
                )
    except Exception as e:
        logger.error(f"[ExpoPush] Exception during push: {e}")


class NotificationService:
    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
    ):
        self.db = db

    # ==========================================================================
    # 📋 Lấy danh sách thông báo (đã thêm try/catch)
    # ==========================================================================
    async def get_notifications_async(
        self,
        user_id: uuid.UUID | None,
        role: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        type_: Optional[str] = None,
        is_read: Optional[bool] = None,
        sort_by: str = "created_at",
        order_dir: str = "desc",
    ):
        try:
            valid_sort_fields = {
                "title": Notifications.title,
                "type": Notifications.type,
                "is_read": Notifications.is_read,
                "created_at": Notifications.created_at,
                "read_at": Notifications.read_at,
            }

            sort_field = valid_sort_fields.get(sort_by, Notifications.created_at)
            sort_order = (
                sort_field.desc() if order_dir.lower() == "desc" else sort_field.asc()
            )

            # ADMIN → KHÔNG lọc user_id
            if role == "ADMIN":
                base_stmt = select(Notifications).where(
                    Notifications.role_target.op("&&")(["ADMIN"])
                )
            else:
                if not user_id:
                    raise HTTPException(400, "Thiếu user_id.")

                base_stmt = (
                    select(Notifications)
                    .where(Notifications.user_id == user_id)
                    .where(Notifications.role_target.op("&&")([role, "all"]))
                )

            # Type filter (gộp system + account vào nhóm hệ thống & tài khoản)
            if type_:
                if type_ == "system":
                    base_stmt = base_stmt.where(
                        Notifications.type.in_(["system", "account"])
                    )
                else:
                    base_stmt = base_stmt.where(Notifications.type == type_)

            # Read filter
            if is_read is not None:
                base_stmt = base_stmt.where(Notifications.is_read.is_(is_read))

            # Search
            if search and search.strip():
                keyword = f"%{search.strip().lower()}%"
                base_stmt = base_stmt.where(
                    Notifications.title.ilike(keyword)
                    | Notifications.content.ilike(keyword)
                )

            # Total
            total_stmt = select(func.count()).select_from(base_stmt.subquery())
            total = (await self.db.execute(total_stmt)).scalar_one()

            # Thống kê tổng & chưa đọc theo từng kênh (1 query GROUP BY nhẹ)
            if role == "ADMIN":
                cat_scope = Notifications.role_target.op("&&")(["ADMIN"])
            else:
                cat_scope = (Notifications.user_id == user_id) & (
                    Notifications.role_target.op("&&")([role, "all"])
                )

            cat_stmt = (
                select(
                    Notifications.type,
                    func.count().label("cnt"),
                    func.sum(
                        case((Notifications.is_read.is_(False), 1), else_=0)
                    ).label("unread_cnt"),
                )
                .where(cat_scope)
                .group_by(Notifications.type)
            )
            cat_rows = (await self.db.execute(cat_stmt)).all()

            category_counts: dict[str, dict[str, int]] = {
                "all": {"total": 0, "unread": 0},
            }
            unread = 0
            for row in cat_rows:
                raw_type = (row.type or "system").lower()
                bucket_key = "system" if raw_type in {"system", "account"} else raw_type
                c_total = int(row.cnt or 0)
                c_unread = int(row.unread_cnt or 0)
                unread += c_unread
                category_counts["all"]["total"] += c_total
                category_counts["all"]["unread"] += c_unread
                if bucket_key not in category_counts:
                    category_counts[bucket_key] = {"total": 0, "unread": 0}
                category_counts[bucket_key]["total"] += c_total
                category_counts[bucket_key]["unread"] += c_unread

            # Pagination
            offset = (page - 1) * limit
            items_stmt = base_stmt.order_by(sort_order).limit(limit).offset(offset)
            items = (await self.db.execute(items_stmt)).scalars().all()

            return {
                "total": total,
                "page": page,
                "limit": limit,
                "unread": unread,
                "category_counts": category_counts,
                "items": items,
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"[Notifications][Get] Lỗi truy vấn: {e}")
            raise HTTPException(500, "Lỗi hệ thống khi lấy thông báo.")

    # ==========================================================================
    # 📨 Tạo thông báo + WS (đã thêm try/catch)
    # ==========================================================================
    async def stage_notification_async(
        self, schema: NotificationCreateSchema
    ) -> Notifications:
        """Add a durable notification to the caller's transaction; do not commit/send."""
        roles = schema.role_target or ["USER"]
        if isinstance(roles, str):
            roles = [roles]
        notif = Notifications(
            id=uuid.uuid4(),
            user_id=schema.user_id or None,
            title=schema.title,
            content=schema.content,
            url=schema.url,
            type=schema.type or "system",
            role_target=roles,
            metadata_=schema.metadata or {},
            action=schema.action or "open_url",
            is_read=False,
            created_at=await to_utc_naive(get_now()),
        )
        self.db.add(notif)
        await self.db.flush()
        return notif

    async def create_notification_async(
        self, schema: NotificationCreateSchema
    ) -> Notifications:
        try:
            notif = await self.stage_notification_async(schema)
            await self.db.commit()
            await self.db.refresh(notif)
        except Exception as e:
            logger.exception(f"[Notifications][Create] Lỗi tạo thông báo: {e}")
            await self.db.rollback()
            raise HTTPException(500, "Lỗi hệ thống khi tạo thông báo.")
        return await self.publish_notification_async(notif)

    async def publish_notification_async(self, notif: Notifications) -> Notifications:
        """Best-effort realtime delivery for an already committed notification."""
        roles = notif.role_target or ["USER"]
        # ==========================================================================
        # 🛰 Gửi WebSocket (KHÔNG ảnh hưởng DB nếu lỗi)
        # ==========================================================================
        try:
            payload = {
                "type": "notification.created",
                "data": {
                    "id": str(notif.id),
                    "user_id": str(notif.user_id),
                    "title": notif.title,
                    "content": notif.content,
                    "url": notif.url,
                    "type": notif.type,
                    "role_target": notif.role_target or [],
                    "metadata": notif.metadata_ or {},
                    "action": notif.action,
                    "is_read": notif.is_read,
                    "read_at": (
                        await to_utc_naive(notif.read_at) if notif.read_at else None
                    ),
                    "created_at": await to_utc_naive(notif.created_at),
                    "updated_at": await to_utc_naive(notif.updated_at),
                },
            }

            payload = await serialize(payload)

            # Broadcast theo từng role
            user_id = str(notif.user_id) if notif.user_id else None

            for r in roles:
                if r == "ADMIN":
                    channel = "ADMIN"  # admin lấy chung
                else:
                    channel = f"{r}_{user_id}"

                logger.info(f"[WS][Notifications] Broadcasting to {channel}")
                await ws_manager.broadcast(channel, payload)

        except Exception as ws_err:
            # KHÔNG rollback DB — chỉ log
            logger.exception(f"[Notifications][WS] Lỗi WebSocket: {ws_err}")

        # ==========================================================================
        # 📲 Gửi Push Notification (Expo) (KHÔNG ảnh hưởng DB nếu lỗi)
        # ==========================================================================
        try:
            if notif.user_id:
                # Lấy danh sách push tokens của user
                tokens_stmt = select(UserPushTokens.token).where(
                    UserPushTokens.user_id == notif.user_id
                )
                tokens_result = await self.db.execute(tokens_stmt)
                tokens = [r[0] for r in tokens_result.all()]

                if tokens:
                    # Chạy gửi background để ko block response
                    asyncio.create_task(
                        send_expo_push_notifications_async(
                            tokens=tokens,
                            title=notif.title,
                            body=notif.content or "",
                            data={
                                "id": str(notif.id),
                                "url": notif.url or "",
                                "type": notif.type,
                                "metadata": notif.metadata_ or {},
                            },
                        )
                    )
        except Exception as push_err:
            logger.exception(
                f"[Notifications][Push] Lỗi gửi Push notification: {push_err}"
            )

        return notif

    async def mark_all_as_read(self, user_id: str, role: str):
        try:
            scope = (
                Notifications.role_target.op("@>")(["ADMIN"])
                if role == "ADMIN"
                else (
                    (Notifications.user_id == user_id)
                    & or_(
                        func.cardinality(Notifications.role_target) == 0,
                        Notifications.role_target.op("&&")([role, "all"]),
                    )
                )
            )
            stmt = (
                update(Notifications)
                .where(scope, Notifications.is_read.is_(False))
                .values(
                    is_read=True,
                    read_at=get_now(),
                )
            )

            await self.db.execute(stmt)
            await self.db.commit()
            return True

        except Exception as e:
            await self.db.rollback()
            raise e

    async def mark_as_read(
        self, notification_id: uuid.UUID, user_id: uuid.UUID, admin=False
    ):
        try:
            scope = Notifications.user_id == user_id
            if admin:
                scope = or_(scope, Notifications.role_target.op("@>")(["ADMIN"]))
            stmt = (
                update(Notifications)
                .where(
                    Notifications.id == notification_id,
                    scope,
                    Notifications.is_read.is_(False),  # chỉ update khi chưa đọc
                )
                .values(
                    is_read=True,
                    read_at=get_now(),
                )
                .returning(Notifications.id)
            )

            result = await self.db.execute(stmt)
            updated_id = result.scalar_one_or_none()

            # Không tìm thấy hoặc không phải owner -> coi như không làm gì
            if not updated_id:
                raise HTTPException(404, "Thông báo không tồn tại hoặc đã được đọc.")

            await self.db.commit()
            return {
                "success": True,
                "message": "Đã đánh dấu đã đọc.",
                "id": str(updated_id),
            }

        except Exception as e:
            await self.db.rollback()
            raise e

    async def mark_as_unread(
        self, notification_id: uuid.UUID, user_id: uuid.UUID, admin=False
    ):
        try:
            scope = Notifications.user_id == user_id
            if admin:
                scope = or_(scope, Notifications.role_target.op("@>")(["ADMIN"]))
            stmt = (
                update(Notifications)
                .where(
                    Notifications.id == notification_id,
                    scope,
                    Notifications.is_read.is_(True),
                )
                .values(is_read=False, read_at=None)
                .returning(Notifications.id)
            )
            result = await self.db.execute(stmt)
            updated_id = result.scalar_one_or_none()
            if not updated_id:
                raise HTTPException(
                    404, "Thông báo không tồn tại hoặc đang ở trạng thái chưa đọc."
                )
            await self.db.commit()
            return {
                "success": True,
                "message": "Đã đánh dấu chưa đọc.",
                "id": str(updated_id),
            }
        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise e

    async def delete_notification_async(
        self, notification_id: uuid.UUID, user_id: uuid.UUID, admin=False
    ):
        try:
            scope = Notifications.user_id == user_id
            if admin:
                scope = or_(scope, Notifications.role_target.op("@>")(["ADMIN"]))
            stmt = (
                delete(Notifications)
                .where(Notifications.id == notification_id, scope)
                .returning(Notifications.id)
            )
            result = await self.db.execute(stmt)
            deleted_id = result.scalar_one_or_none()
            if not deleted_id:
                raise HTTPException(404, "Không tìm thấy thông báo cần xóa.")
            await self.db.commit()
            return {"success": True, "id": str(deleted_id)}
        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise e

    async def delete_read_notifications_async(self, user_id: uuid.UUID, role: str):
        try:
            scope = (Notifications.user_id == user_id) & or_(
                func.cardinality(Notifications.role_target) == 0,
                Notifications.role_target.op("&&")([role, "all"]),
            )
            stmt = (
                delete(Notifications)
                .where(scope, Notifications.is_read.is_(True))
                .returning(Notifications.id)
            )
            result = await self.db.execute(stmt)
            deleted_ids = result.scalars().all()
            await self.db.commit()
            return {"success": True, "deleted_count": len(deleted_ids)}
        except Exception as e:
            await self.db.rollback()
            raise e

    async def register_push_token_async(
        self, user_id: uuid.UUID, token: str, device_type: str
    ) -> dict:
        try:
            # Check if token exists for this user
            stmt = select(UserPushTokens).where(
                UserPushTokens.user_id == user_id, UserPushTokens.token == token
            )
            existing = (await self.db.execute(stmt)).scalar_one_or_none()

            if existing:
                # Update device type if changed
                if existing.device_type != device_type:
                    existing.device_type = device_type
                    existing.updated_at = await to_utc_naive(get_now())
                    await self.db.commit()
                return {
                    "success": True,
                    "message": "Token already registered.",
                    "id": str(existing.id),
                }

            # Create new token record
            new_token = UserPushTokens(
                id=uuid.uuid4(),
                user_id=user_id,
                token=token,
                device_type=device_type,
                created_at=await to_utc_naive(get_now()),
                updated_at=await to_utc_naive(get_now()),
            )
            self.db.add(new_token)
            await self.db.commit()
            await self.db.refresh(new_token)
            return {
                "success": True,
                "message": "Token registered successfully.",
                "id": str(new_token.id),
            }
        except Exception as e:
            logger.exception(f"[Notifications][RegisterToken] Error: {e}")
            await self.db.rollback()
            raise HTTPException(500, "Lỗi hệ thống khi đăng ký token thông báo.")
