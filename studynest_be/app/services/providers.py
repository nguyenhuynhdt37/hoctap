import unicodedata
from datetime import UTC, datetime
from functools import wraps

from fastapi import Depends, HTTPException
from loguru import logger
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.db.models.catalog import (
    Grade,
    Provider,
    ProviderCreationRequest,
    ProviderMember,
    ProviderMembershipEvent,
    Subject,
    course_grades,
)
from app.db.models.database import Courses, Role, User, UserRoles
from app.db.sesson import get_session
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.catalog import CatalogService, public_course, record
from app.services.catalog_slugs import create_slugged
from app.services.shares.notification import NotificationService
from app.services.user.instructor_visibility import public_instructor

SESSION_DEP = Depends(get_session)
VIETNAMESE_ACCENTS = (
    "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"
)
VIETNAMESE_PLAIN = "".join(
    "d" if char == "đ" else unicodedata.normalize("NFD", char)[0]
    for char in VIETNAMESE_ACCENTS
)


def directory_search(column, pattern):
    return func.translate(
        func.lower(column), VIETNAMESE_ACCENTS, VIETNAMESE_PLAIN
    ).ilike(pattern)


def directory_pattern(search):
    return (
        "%"
        + "".join(
            char
            for char in unicodedata.normalize(
                "NFD", search.casefold().replace("đ", "d")
            )
            if not unicodedata.combining(char)
        )
        + "%"
    )


def rollback_on_error(method):
    """Every provider mutation owns its transaction, including staged notices."""

    @wraps(method)
    async def wrapped(self, *args, **kwargs):
        try:
            return await method(self, *args, **kwargs)
        except Exception:
            await self.db.rollback()
            raise

    return wrapped


class ProviderService:
    def __init__(self, db: AsyncSession = SESSION_DEP):
        self.db = db
        self.catalog = CatalogService(db)

    async def listing(
        self,
        page=1,
        size=20,
        search=None,
        admin=False,
        user_id=None,
        directory_user_id=None,
        provider_type=None,
        province=None,
        verification_status=None,
        is_active=None,
        sort="name_asc",
    ):
        stmt = select(Provider)
        if not admin:
            stmt = stmt.where(
                Provider.is_active.is_(True),
                Provider.verification_status == "verified",
            )
        if user_id:
            stmt = stmt.join(
                ProviderMember,
                ProviderMember.provider_id == Provider.id,
            ).where(
                ProviderMember.user_id == user_id, ProviderMember.status == "active"
            )
        if search:
            pattern = directory_pattern(search)
            stmt = stmt.where(
                or_(
                    directory_search(Provider.name, pattern),
                    directory_search(Provider.province, pattern),
                    Provider.school_code.ilike(pattern),
                )
            )
        if provider_type:
            stmt = stmt.where(Provider.provider_type == provider_type)
        if province:
            stmt = stmt.where(Provider.province == province)
        if admin and verification_status:
            stmt = stmt.where(Provider.verification_status == verification_status)
        if admin and is_active is not None:
            stmt = stmt.where(Provider.is_active == is_active)
        ordering = {
            "name_asc": Provider.name.asc(),
            "name_desc": Provider.name.desc(),
            "newest": Provider.created_at.desc(),
            "oldest": Provider.created_at.asc(),
        }.get(sort, Provider.name.asc())
        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = (
            await self.db.scalars(
                stmt.order_by(ordering, Provider.id)
                .offset((page - 1) * size)
                .limit(size)
            )
        ).all()
        member_ids = set()
        if directory_user_id:
            member_ids = set(
                (
                    await self.db.scalars(
                        select(ProviderMember.provider_id).where(
                            ProviderMember.user_id == directory_user_id,
                            ProviderMember.status == "active",
                            ProviderMember.provider_id.in_([row.id for row in rows]),
                        )
                    )
                ).all()
            )
        items = [record(p) if admin else self.catalog.public_provider(p) for p in rows]
        if directory_user_id:
            items = [
                {**item, "is_member": row.id in member_ids}
                for item, row in zip(items, rows)
            ]
        return {"items": items, "total": total, "page": page, "page_size": size}

    async def directory_options(self, admin=False):
        stmt = select(Provider.province).where(Provider.province.is_not(None))
        if not admin:
            stmt = stmt.where(
                Provider.is_active.is_(True), Provider.verification_status == "verified"
            )
        return {
            "provinces": (
                await self.db.scalars(stmt.distinct().order_by(Provider.province))
            ).all()
        }

    async def detail(self, slug):
        provider = await self.db.scalar(
            select(Provider).where(
                Provider.slug == slug,
                Provider.is_active.is_(True),
                Provider.verification_status == "verified",
            )
        )
        if not provider:
            raise HTTPException(404, "Không tìm thấy đơn vị")
        # Public instructor profiles only; never leak contact info or student records.
        teachers = (
            (
                await self.db.execute(
                    select(User.id, User.fullname, User.avatar).where(
                        public_instructor(),
                        provider.verification_status == "verified",
                        or_(
                            User.id.in_(
                                select(ProviderMember.user_id).where(
                                    ProviderMember.provider_id == provider.id,
                                    ProviderMember.status == "active",
                                )
                            ),
                            User.id.in_(
                                select(Courses.instructor_id).where(
                                    Courses.provider_id == provider.id, public_course()
                                )
                            ),
                        ),
                    )
                )
            )
            .mappings()
            .all()
        )
        public_ids = select(Courses.id).where(
            Courses.provider_id == provider.id, public_course()
        )
        subjects = (
            (
                await self.db.execute(
                    select(Subject.id, Subject.name, Subject.slug)
                    .join(Courses, Courses.subject_id == Subject.id)
                    .where(Courses.id.in_(public_ids))
                    .distinct()
                )
            )
            .mappings()
            .all()
        )
        grades = (
            (
                await self.db.execute(
                    select(Grade.id, Grade.name, Grade.grade_number)
                    .join(course_grades, course_grades.c.grade_id == Grade.id)
                    .where(course_grades.c.course_id.in_(public_ids))
                    .distinct()
                    .order_by(Grade.grade_number)
                )
            )
            .mappings()
            .all()
        )
        return {
            **self.catalog.public_provider(provider),
            "instructors": [dict(t) for t in teachers],
            "subjects": [dict(s) for s in subjects],
            "grades": [dict(g) for g in grades],
            "course_count": await self.db.scalar(
                select(func.count()).select_from(public_ids.subquery())
            ),
        }

    @staticmethod
    def normalized_name(name):
        return " ".join(unicodedata.normalize("NFKC", name).lower().split())

    async def name_lock(self, name):
        await self.db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))"),
            {"scope": "provider-name:" + self.normalized_name(name)},
        )

    async def matching_provider(self, name, exclude_id=None):
        stmt = select(Provider).where(
            func.lower(
                func.regexp_replace(
                    func.trim(func.normalize(Provider.name, text("NFKC"))),
                    r"\s+",
                    " ",
                    "g",
                )
            )
            == self.normalized_name(name)
        )
        if exclude_id:
            stmt = stmt.where(Provider.id != exclude_id)
        return await self.db.scalar(stmt.limit(1))

    async def notify(
        self,
        title,
        content,
        *,
        user_id=None,
        request_id=None,
        provider_id=None,
        admin=False,
    ):
        return await NotificationService(self.db).stage_notification_async(
            NotificationCreateSchema(
                user_id=user_id,
                role_target=["ADMIN" if admin else "LECTURER"],
                title=title,
                content=content,
                type="provider",
                action="open_url",
                url=("/admin/providers" if admin else "/lecturer/providers")
                + (f"?request_id={request_id}" if request_id else ""),
                metadata={
                    "request_id": str(request_id) if request_id else None,
                    "provider_id": str(provider_id) if provider_id else None,
                },
            )
        )

    async def commit_notifications(self, notifications):
        try:
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise
        for notification in notifications:
            try:
                await NotificationService(self.db).publish_notification_async(
                    notification
                )
            except Exception as error:  # noqa: BLE001 -- committed decisions must survive any delivery error
                # Durable records are committed; realtime cannot undo a decision.
                logger.exception(f"Provider notification delivery failed: {error}")

    @rollback_on_error
    async def save(self, schema, user_id, provider_id=None, admin=False):
        if not admin:
            raise HTTPException(
                403, "Chỉ admin quản lý đơn vị. Vui lòng gửi yêu cầu tạo đơn vị."
            )
        data = schema.model_dump()
        await self.name_lock(data["name"])
        provider = await self.db.get(Provider, provider_id) if provider_id else None
        if provider_id and not provider:
            raise HTTPException(404, "Không tìm thấy đơn vị")
        if (
            not provider or provider.name != data["name"]
        ) and await self.matching_provider(data["name"], provider_id):
            raise HTTPException(
                409, "Tên đơn vị đã tồn tại. Vui lòng quản lý đơn vị hiện có."
            )
        if provider and provider.slug != data["slug"]:
            raise HTTPException(409, "Giữ slug ổn định để bảo vệ liên kết")
        for key in ("logo_url", "banner_url"):
            if data.get(key) and not data[key].startswith("/api/storage/files/public/"):
                raise HTTPException(
                    422, "Ảnh đơn vị phải dùng kho file public của Mây Mây"
                )
        notifications = []
        try:
            if provider:
                changed = any(
                    getattr(provider, key) != value for key, value in data.items()
                )
                for key, value in data.items():
                    setattr(provider, key, value)
                if changed:
                    recipients = (
                        await self.db.scalars(
                            select(ProviderMember.user_id).where(
                                ProviderMember.provider_id == provider.id,
                                ProviderMember.status == "active",
                            )
                        )
                    ).all()
                    for recipient in recipients:
                        notifications.append(
                            await self.notify(
                                "Thông tin đơn vị được cập nhật",
                                f"Admin đã cập nhật đơn vị {provider.name}. Trạng thái: {'hoạt động' if provider.is_active else 'đã ẩn'}.",
                                user_id=recipient,
                                provider_id=provider.id,
                            )
                        )
            else:
                provider = await create_slugged(
                    self.db,
                    Provider,
                    data["name"],
                    data["slug"],
                    **{key: value for key, value in data.items() if key != "slug"},
                )
            await self.commit_notifications(notifications)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Đơn vị hoặc đường dẫn đã tồn tại") from None
        await self.db.refresh(provider)
        return record(provider)

    async def member_candidates(self, search):
        stmt = (
            select(User.id, User.fullname, User.email)
            .where(
                User.deleted_at.is_(None),
                User.is_banned.is_not(True),
                User.id.in_(
                    select(UserRoles.user_id)
                    .join(Role, Role.id == UserRoles.role_id)
                    .where(Role.role_name == "LECTURER")
                ),
                or_(
                    User.fullname.ilike("%" + search + "%"),
                    User.email.ilike("%" + search + "%"),
                ),
            )
            .order_by(User.fullname, User.id)
            .limit(20)
        )
        return {
            "items": [dict(row) for row in (await self.db.execute(stmt)).mappings()]
        }

    async def members(self, provider_id):
        if not await self.db.get(Provider, provider_id):
            raise HTTPException(404, "Không tìm thấy đơn vị")
        rows = (
            await self.db.execute(
                select(ProviderMember, User.fullname, User.email)
                .join(User, User.id == ProviderMember.user_id)
                .where(ProviderMember.provider_id == provider_id)
                .order_by(User.fullname)
            )
        ).all()
        return {
            "items": [
                {**record(member), "fullname": name, "email": email}
                for member, name, email in rows
            ]
        }

    async def record_membership_event(
        self, provider_id, user_id, actor_id, status, reason=None, request_id=None
    ):
        event = ProviderMembershipEvent(
            provider_id=provider_id,
            user_id=user_id,
            actor_id=actor_id,
            action="granted" if status == "active" else "revoked",
            status=status,
            reason=reason,
            details={"request_id": str(request_id)} if request_id else {},
            occurred_at=datetime.now(UTC),
        )
        self.db.add(event)
        await self.db.flush()

    async def set_membership(
        self, provider_id, user_id, actor_id, status, reason=None, request_id=None
    ):
        """Caller holds the provider lock and owns commit + notification delivery."""
        member = await self.db.get(ProviderMember, (provider_id, user_id))
        if member and member.status == status:
            return False
        if not member:
            if status != "active":
                raise HTTPException(404, "Giảng viên chưa được liên kết với đơn vị")
            member = ProviderMember(
                provider_id=provider_id, user_id=user_id, status="active"
            )
            self.db.add(member)
        member.status = status
        now = datetime.now(UTC)
        if status == "active":
            member.granted_by, member.granted_at = actor_id, now
            member.revoked_by = member.revoked_at = member.revocation_reason = None
        else:
            if not reason or not reason.strip():
                raise HTTPException(422, "Cần ghi lý do thu hồi liên kết giảng viên")
            member.revoked_by, member.revoked_at, member.revocation_reason = (
                actor_id,
                now,
                reason,
            )
        await self.record_membership_event(
            provider_id, user_id, actor_id, status, reason, request_id
        )
        return True

    @rollback_on_error
    async def member(self, provider_id, data, user_id, admin=False):
        if not admin:
            raise HTTPException(
                403, "Chỉ admin được cấp hoặc thu hồi liên kết giảng viên"
            )
        provider = await self.db.scalar(
            select(Provider).where(Provider.id == provider_id).with_for_update()
        )
        user = await self.db.get(User, data.user_id)
        if not provider or not user:
            raise HTTPException(404, "Đơn vị hoặc tài khoản không tồn tại")
        if data.status == "active" and (
            user.deleted_at
            or user.is_banned
            or not await self.db.scalar(
                select(UserRoles.id)
                .join(Role, Role.id == UserRoles.role_id)
                .where(UserRoles.user_id == data.user_id, Role.role_name == "LECTURER")
            )
        ):
            raise HTTPException(
                422, "Chỉ cấp liên kết cho tài khoản giảng viên đang hoạt động"
            )
        changed = await self.set_membership(
            provider_id, data.user_id, user_id, data.status, data.reason
        )
        if not changed:
            return {"message": "Liên kết giảng viên không thay đổi"}
        notification = await self.notify(
            "Liên kết đơn vị được cập nhật",
            f"Admin đã {'cấp quyền tham gia' if data.status == 'active' else 'thu hồi quyền tham gia'} đơn vị {provider.name}."
            + (f" Lý do: {data.reason}" if data.reason else ""),
            user_id=data.user_id,
            provider_id=provider_id,
        )
        await self.commit_notifications([notification])
        return {"message": "Đã cập nhật liên kết giảng viên"}

    async def membership_events(self, provider_id, page=1, size=10):
        if not await self.db.get(Provider, provider_id):
            raise HTTPException(404, "Không tìm thấy đơn vị")
        event = ProviderMembershipEvent
        actor = aliased(User)
        total = await self.db.scalar(
            select(func.count())
            .select_from(event)
            .where(event.provider_id == provider_id)
        )
        rows = (
            await self.db.execute(
                select(event, User.fullname, actor.fullname)
                .join(User, User.id == event.user_id)
                .outerjoin(actor, actor.id == event.actor_id)
                .where(event.provider_id == provider_id)
                .order_by(event.occurred_at.desc(), event.id.desc())
                .offset((page - 1) * size)
                .limit(size)
            )
        ).all()
        return {
            "items": [
                {**record(item), "instructor_name": name, "actor_name": actor_name}
                for item, name, actor_name in rows
            ],
            "total": total,
            "page": page,
            "page_size": size,
        }

    async def request_listing(
        self, *, user_id=None, page=1, size=10, status=None, search=None
    ):
        stmt = select(ProviderCreationRequest)
        if user_id:
            stmt = stmt.where(ProviderCreationRequest.requester_id == user_id)
        if status:
            stmt = stmt.where(ProviderCreationRequest.status == status)
        if search:
            stmt = stmt.where(ProviderCreationRequest.name.ilike("%" + search + "%"))
        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = (
            await self.db.scalars(
                stmt.order_by(
                    ProviderCreationRequest.created_at.desc(),
                    ProviderCreationRequest.id.desc(),
                )
                .offset((page - 1) * size)
                .limit(size)
            )
        ).all()
        return {
            "items": await self.request_records(rows),
            "total": total,
            "page": page,
            "page_size": size,
        }

    async def request_records(self, rows):
        """Bounded queries and minimal account columns for paginated queues."""
        if not rows:
            return []
        user_ids = {row.requester_id for row in rows} | {
            row.reviewed_by for row in rows if row.reviewed_by
        }
        users = {
            user.id: {"id": user.id, "fullname": user.fullname}
            for user in (
                await self.db.execute(
                    select(User.id, User.fullname).where(User.id.in_(user_ids))
                )
            ).all()
        }
        provider_ids = {row.provider_id for row in rows if row.provider_id}
        providers = (
            {
                provider.id: {
                    "id": provider.id,
                    "name": provider.name,
                    "slug": provider.slug,
                }
                for provider in (
                    await self.db.execute(
                        select(Provider.id, Provider.name, Provider.slug).where(
                            Provider.id.in_(provider_ids)
                        )
                    )
                ).all()
            }
            if provider_ids
            else {}
        )
        results = []
        for row in rows:
            result = record(row)
            result.pop("normalized_name", None)
            result["requester"] = users.get(
                row.requester_id,
                {"id": row.requester_id, "fullname": "Tài khoản đã xóa"},
            )
            result["reviewer"] = users.get(row.reviewed_by)
            result["provider"] = providers.get(row.provider_id)
            results.append(result)
        return results

    async def request_record(self, row):
        return (await self.request_records([row]))[0]

    async def request_detail(self, request_id, user_id=None, lock=False):
        stmt = select(ProviderCreationRequest).where(
            ProviderCreationRequest.id == request_id
        )
        if user_id:
            stmt = stmt.where(ProviderCreationRequest.requester_id == user_id)
        if lock:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        row = await self.db.scalar(stmt)
        if not row:
            raise HTTPException(404, "Không tìm thấy yêu cầu")
        return row

    @rollback_on_error
    async def submit_request(self, data, user_id):
        await self.name_lock(data.name)
        if await self.matching_provider(data.name):
            raise HTTPException(
                409,
                "Đơn vị đã có trong hệ thống. Không cần tạo yêu cầu trùng; liên hệ admin để được cấp quyền.",
            )
        if await self.db.scalar(
            select(ProviderCreationRequest.id).where(
                ProviderCreationRequest.normalized_name
                == self.normalized_name(data.name),
                ProviderCreationRequest.status == "pending",
            )
        ):
            raise HTTPException(
                409, "Đơn vị này đang có yêu cầu chờ duyệt. Vui lòng chờ admin xử lý."
            )
        row = ProviderCreationRequest(
            requester_id=user_id,
            normalized_name=self.normalized_name(data.name),
            **data.model_dump(),
        )
        try:
            self.db.add(row)
            await self.db.flush()
            notifications = [
                await self.notify(
                    "Yêu cầu tạo đơn vị mới",
                    f"Có yêu cầu tạo đơn vị {row.name} cần xét duyệt.",
                    request_id=row.id,
                    admin=True,
                ),
                await self.notify(
                    "Đã tiếp nhận yêu cầu tạo đơn vị",
                    f"Yêu cầu tạo {row.name} đang chờ admin xét duyệt.",
                    user_id=user_id,
                    request_id=row.id,
                ),
            ]
            await self.commit_notifications(notifications)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Đơn vị đang có yêu cầu chờ duyệt") from None
        return await self.request_record(row)

    @rollback_on_error
    async def decide_request(self, request_id, data, admin_id):
        row = await self.request_detail(request_id, lock=True)
        if row.status != "pending":
            raise HTTPException(
                409, "Yêu cầu đã được xử lý; vui lòng tải lại danh sách"
            )
        await self.name_lock(row.name)
        provider = None
        if data.decision == "approved":
            requester = await self.db.get(User, row.requester_id)
            if not requester or requester.deleted_at or requester.is_banned:
                raise HTTPException(409, "Tài khoản người gửi không còn khả dụng")
            if not await self.db.scalar(
                select(UserRoles.id)
                .join(Role, Role.id == UserRoles.role_id)
                .where(
                    UserRoles.user_id == row.requester_id, Role.role_name == "LECTURER"
                )
            ):
                raise HTTPException(409, "Người gửi không còn vai trò giảng viên")
            if data.provider_id:
                provider = await self.db.scalar(
                    select(Provider)
                    .where(Provider.id == data.provider_id)
                    .with_for_update()
                )
                if (
                    not provider
                    or not provider.is_active
                    or provider.verification_status != "verified"
                ):
                    raise HTTPException(
                        422, "Chỉ liên kết đơn vị đang hoạt động và đã xác minh"
                    )
            else:
                if await self.matching_provider(row.name):
                    raise HTTPException(
                        409, "Đơn vị đã tồn tại. Chọn liên kết vào đơn vị hiện có."
                    )
                provider = await create_slugged(
                    self.db,
                    Provider,
                    row.name,
                    name=row.name,
                    provider_type=row.provider_type,
                    description=row.description,
                    verification_status="verified",
                    is_active=True,
                )
            await self.set_membership(
                provider.id,
                row.requester_id,
                admin_id,
                "active",
                reason="Cấp liên kết sau khi duyệt yêu cầu tạo đơn vị",
                request_id=row.id,
            )
            row.provider_id = provider.id
        row.status, row.reviewed_by = data.decision, admin_id
        row.decided_at, row.review_note = datetime.now(UTC), data.note or None
        try:
            notification = await self.notify(
                "Yêu cầu tạo đơn vị được duyệt"
                if row.status == "approved"
                else "Yêu cầu tạo đơn vị bị từ chối",
                (
                    f"Bạn đã được cấp quyền giảng dạy tại {provider.name}."
                    if provider
                    else f"Yêu cầu {row.name} bị từ chối."
                )
                + (f" Ghi chú: {data.note}" if data.note else ""),
                user_id=row.requester_id,
                request_id=row.id,
                provider_id=row.provider_id,
            )
            await self.commit_notifications([notification])
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                409, "Yêu cầu hoặc đơn vị đã được cập nhật; vui lòng tải lại"
            ) from None
        return await self.request_record(row)

    @rollback_on_error
    async def cancel_request(self, request_id, user_id):
        row = await self.request_detail(request_id, user_id=user_id, lock=True)
        if row.status != "pending":
            raise HTTPException(409, "Chỉ hủy được yêu cầu đang chờ duyệt")
        row.status, row.decided_at = "cancelled", datetime.now(UTC)
        notifications = [
            await self.notify(
                "Yêu cầu tạo đơn vị đã hủy",
                f"Người gửi đã hủy yêu cầu {row.name}.",
                request_id=row.id,
                admin=True,
            ),
            await self.notify(
                "Đã hủy yêu cầu tạo đơn vị",
                f"Bạn đã hủy yêu cầu {row.name}.",
                user_id=user_id,
                request_id=row.id,
            ),
        ]
        await self.commit_notifications(notifications)
        return await self.request_record(row)
