"""Employment claims are private, reviewed by admins, and never auto-grant access."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, or_, select, text

from app.db.models.catalog import Provider, ProviderJoinRequest, ProviderMember
from app.db.models.database import Role, User, UserRoles
from app.services.catalog import record
from app.services.providers import (
    ProviderService,
    directory_pattern,
    directory_search,
    rollback_on_error,
)


class JoinInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    provider_id: UUID
    position: str = Field(min_length=3, max_length=160)
    work_email: EmailStr | None = None
    evidence: str = Field(min_length=30, max_length=4000)
    current_employment_confirmed: Literal[True]


class JoinDecision(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    decision: Literal["approved", "rejected"]
    review_note: str = Field(min_length=10, max_length=2000)
    employment_checked: bool = False


class ProviderJoinService(ProviderService):
    async def listing_joins(
        self, *, user_id=None, status=None, page=1, size=12, search=None, sort="newest"
    ):
        stmt = (
            select(
                ProviderJoinRequest,
                Provider.name,
                Provider.verification_status,
                User.fullname,
            )
            .join(Provider, Provider.id == ProviderJoinRequest.provider_id)
            .join(User, User.id == ProviderJoinRequest.requester_id)
        )
        if user_id:
            stmt = stmt.where(ProviderJoinRequest.requester_id == user_id)
        if status:
            stmt = stmt.where(ProviderJoinRequest.status == status)
        if search:
            pattern = directory_pattern(search)
            stmt = stmt.where(
                or_(
                    directory_search(Provider.name, pattern),
                    directory_search(User.fullname, pattern),
                    directory_search(ProviderJoinRequest.position, pattern),
                )
            )
        ordering = {
            "newest": ProviderJoinRequest.created_at.desc(),
            "oldest": ProviderJoinRequest.created_at.asc(),
            "provider_name": Provider.name.asc(),
        }.get(sort, ProviderJoinRequest.created_at.desc())
        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = (
            await self.db.execute(
                stmt.order_by(ordering, ProviderJoinRequest.id)
                .offset((page - 1) * size)
                .limit(size)
            )
        ).all()
        return {
            "items": [
                {
                    **record(row),
                    "provider_name": name,
                    "provider_verification": verification,
                    "requester_name": fullname,
                }
                for row, name, verification, fullname in rows
            ],
            "total": total,
            "page": page,
            "page_size": size,
        }

    async def join_notice(self, row, title, content, *, admin=False):
        from app.schemas.shares.notification import NotificationCreateSchema
        from app.services.shares.notification import NotificationService

        return await NotificationService(self.db).stage_notification_async(
            NotificationCreateSchema(
                user_id=None if admin else row.requester_id,
                role_target=["ADMIN" if admin else "LECTURER"],
                type="provider",
                title=title,
                content=content,
                action="open_url",
                url=("/admin/providers" if admin else "/lecturer/providers")
                + "?view=joins",
                metadata={
                    "join_request_id": str(row.id),
                    "provider_id": str(row.provider_id),
                },
            )
        )

    @rollback_on_error
    async def submit_join(self, data, user_id):
        await self.db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:scope,0))"),
            {"scope": f"provider-join:{data.provider_id}:{user_id}"},
        )
        provider = await self.db.scalar(
            select(Provider).where(Provider.id == data.provider_id).with_for_update()
        )
        if (
            not provider
            or not provider.is_active
            or provider.verification_status != "verified"
        ):
            raise HTTPException(404, "Không tìm thấy đơn vị đang hoạt động")
        if provider.provider_type == "individual":
            raise HTTPException(
                422, "Chọn trường học hoặc đơn vị nơi bạn đang công tác"
            )
        member = await self.db.get(ProviderMember, (provider.id, user_id))
        if member and member.status == "active":
            raise HTTPException(409, "Bạn đã được cấp liên kết với đơn vị này")
        if await self.db.scalar(
            select(ProviderJoinRequest.id).where(
                ProviderJoinRequest.provider_id == provider.id,
                ProviderJoinRequest.requester_id == user_id,
                ProviderJoinRequest.status == "pending",
            )
        ):
            raise HTTPException(409, "Bạn đã có yêu cầu gia nhập đang chờ duyệt")
        row = ProviderJoinRequest(
            requester_id=user_id,
            **data.model_dump(exclude={"current_employment_confirmed"}),
        )
        self.db.add(row)
        await self.db.flush()
        notices = [
            await self.join_notice(
                row,
                "Yêu cầu gia nhập đơn vị mới",
                f"Có giảng viên đề nghị xác nhận công tác tại {provider.name}.",
                admin=True,
            ),
            await self.join_notice(
                row,
                "Đã nhận yêu cầu gia nhập",
                f"Admin sẽ kiểm tra thông tin công tác tại {provider.name}.",
            ),
        ]
        await self.commit_notifications(notices)
        return record(row)

    @rollback_on_error
    async def decide_join(self, request_id, data, admin_id):
        row = await self.db.scalar(
            select(ProviderJoinRequest)
            .where(ProviderJoinRequest.id == request_id)
            .with_for_update()
        )
        if not row:
            raise HTTPException(404, "Không tìm thấy yêu cầu")
        if row.status != "pending":
            raise HTTPException(409, "Yêu cầu đã được xử lý")
        provider = await self.db.scalar(
            select(Provider).where(Provider.id == row.provider_id).with_for_update()
        )
        if data.decision == "approved":
            if not data.employment_checked:
                raise HTTPException(
                    422,
                    "Admin cần đối chiếu thông tin công tác và ghi kết quả xác minh",
                )
            if not provider.is_active or provider.verification_status != "verified":
                raise HTTPException(
                    409, "Cần xác minh và kích hoạt đơn vị trước khi duyệt gia nhập"
                )
            lecturer = await self.db.scalar(
                select(User.id).where(
                    User.id == row.requester_id,
                    User.deleted_at.is_(None),
                    User.is_banned.is_not(True),
                    User.id.in_(
                        select(UserRoles.user_id)
                        .join(Role, Role.id == UserRoles.role_id)
                        .where(Role.role_name == "LECTURER")
                    ),
                )
            )
            if not lecturer:
                raise HTTPException(
                    409, "Tài khoản không còn là giảng viên đang hoạt động"
                )
            await self.set_membership(
                provider.id,
                row.requester_id,
                admin_id,
                "active",
                reason="Xác minh công tác: " + data.review_note,
                request_id=row.id,
            )
        row.status = data.decision
        row.review_note = data.review_note
        row.reviewed_by = admin_id
        row.decided_at = datetime.now(UTC)
        notice = await self.join_notice(
            row,
            "Đã duyệt gia nhập đơn vị"
            if row.status == "approved"
            else "Yêu cầu gia nhập bị từ chối",
            f"{provider.name}: {data.review_note}",
        )
        await self.commit_notifications([notice])
        return record(row)

    @rollback_on_error
    async def cancel_join(self, request_id, user_id):
        row = await self.db.scalar(
            select(ProviderJoinRequest)
            .where(
                ProviderJoinRequest.id == request_id,
                ProviderJoinRequest.requester_id == user_id,
            )
            .with_for_update()
        )
        if not row:
            raise HTTPException(404, "Không tìm thấy yêu cầu")
        if row.status != "pending":
            raise HTTPException(409, "Chỉ hủy được yêu cầu đang chờ duyệt")
        row.status = "cancelled"
        row.decided_at = datetime.now(UTC)
        notices = [
            await self.join_notice(
                row,
                "Giảng viên đã hủy yêu cầu gia nhập",
                "Yêu cầu gia nhập đã được người gửi hủy.",
                admin=True,
            ),
            await self.join_notice(
                row, "Đã hủy yêu cầu gia nhập", "Yêu cầu gia nhập của bạn đã được hủy."
            ),
        ]
        await self.commit_notifications(notices)
        return record(row)
