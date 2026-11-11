import uuid

from fastapi import Depends, HTTPException
from sqlalchemy import and_, asc, desc, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.models.database import (
    Categories,
    CourseEnrollments,
    CourseFavourites,
    Courses,
    Role,
    Topics,
    Transactions,
    User,
    UserRoles,
    Wallets,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.catalog import public_course
from app.services.shares.notification import NotificationService


class LecturerService:
    """Service quản lý học tập của người dùng."""

    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
    ):
        self.db = db

    async def get_instructor_courses_async(
        self,
        lecturer_id: uuid.UUID,
        user_id: uuid.UUID | None,  # ⬅️ guest nếu None
        limit: int = 20,
        cursor: str | None = None,
        keyword: str | None = None,
        category_slug: str | None = None,
        topic_slug: str | None = None,
        level: str | None = None,
        sort: str = "created_at_desc",
    ):
        try:
            # ─────────────────────────────
            # BASE FILTER (published + approved)
            # ─────────────────────────────
            filters = [
                Courses.instructor_id == lecturer_id,
                public_course(),
            ]

            # ─────────────────────────────
            # KEYWORD FILTER
            # ─────────────────────────────
            if keyword:
                kw = f"%{keyword.lower()}%"
                filters.append(func.lower(Courses.title).ilike(kw))

            # ─────────────────────────────
            # CATEGORY FILTER
            # ─────────────────────────────
            if category_slug:
                filters.append(Courses.category.has(Categories.slug == category_slug))

            # ─────────────────────────────
            # TOPIC FILTER
            # ─────────────────────────────
            if topic_slug:
                filters.append(Courses.topic.has(Topics.slug == topic_slug))

            # ─────────────────────────────
            # LEVEL FILTER
            # ─────────────────────────────
            if level:
                filters.append(Courses.level == level)

            # ─────────────────────────────
            # CURSOR PAGINATION
            # ─────────────────────────────
            if cursor:
                filters.append(Courses.id > cursor)

            # ─────────────────────────────
            # SORTING MAP
            # ─────────────────────────────
            sort_map = {
                "created_at_desc": desc(Courses.created_at),
                "created_at_asc": asc(Courses.created_at),
                "views_desc": desc(Courses.views),
                "views_asc": asc(Courses.views),
                "rating_desc": desc(Courses.rating_avg),
                "rating_asc": asc(Courses.rating_avg),
                "enrolls_desc": desc(Courses.total_enrolls),
                "enrolls_asc": asc(Courses.total_enrolls),
            }
            order_clause = sort_map.get(sort, desc(Courses.created_at))

            # ====================================================================
            # CASE 1: USER GUEST (user_id = None)
            # ====================================================================
            if user_id is None:
                stmt = (
                    select(Courses)
                    .where(and_(*filters))
                    .order_by(order_clause)
                    .limit(limit + 1)
                    .options(
                        joinedload(Courses.category),
                        joinedload(Courses.topic),
                        joinedload(Courses.instructor),
                    )
                )

                rows = (await self.db.execute(stmt)).scalars().all()

                next_cursor = None
                if len(rows) > limit:
                    next_cursor = str(rows[-1].id)
                    rows = rows[:-1]

                items = [
                    {
                        "id": str(course.id),
                        "title": course.title,
                        "slug": course.slug,
                        "thumbnail": course.thumbnail_url,
                        "is_purchased": False,  # guest → false
                        "is_favorite": False,  # guest → false
                        "rating_avg": float(course.rating_avg or 0),
                        "rating_count": course.rating_count,
                        "total_enrolls": course.total_enrolls,
                        "views": course.views,
                        "level": course.level,
                        "language": course.language,
                        "base_price": course.base_price,
                        "category": {
                            "id": str(course.category.id) if course.category else None,
                            "name": course.category.name if course.category else None,
                            "slug": course.category.slug if course.category else None,
                        },
                        "topic": {
                            "id": str(course.topic.id) if course.topic else None,
                            "name": course.topic.name if course.topic else None,
                            "slug": course.topic.slug if course.topic else None,
                        },
                        "created_at": course.created_at,
                        "updated_at": course.updated_at,
                    }
                    for course in rows
                ]

                return {"items": items, "next_cursor": next_cursor}

            # ====================================================================
            # CASE 2: USER LOGGED-IN
            # ====================================================================
            stmt = (
                select(
                    Courses,
                    CourseEnrollments.id.label("enroll_id"),
                    CourseFavourites.user_id.label("fav_user_id"),
                )
                .outerjoin(
                    CourseEnrollments,
                    and_(
                        CourseEnrollments.course_id == Courses.id,
                        CourseEnrollments.user_id == user_id,
                        CourseEnrollments.status == "active",
                    ),
                )
                .outerjoin(
                    CourseFavourites,
                    and_(
                        CourseFavourites.course_id == Courses.id,
                        CourseFavourites.user_id == user_id,
                    ),
                )
                .where(and_(*filters))
                .order_by(order_clause)
                .limit(limit + 1)
                .options(
                    joinedload(Courses.category),
                    joinedload(Courses.topic),
                    joinedload(Courses.instructor),
                )
            )

            rows = (await self.db.execute(stmt)).all()

            next_cursor = None
            if len(rows) > limit:
                next_cursor = str(rows[-1][0].id)
                rows = rows[:-1]

            items = []
            for course, enroll_id, fav_user in rows:
                items.append(
                    {
                        "id": str(course.id),
                        "title": course.title,
                        "slug": course.slug,
                        "thumbnail": course.thumbnail_url,
                        "is_purchased": enroll_id is not None,
                        "is_favorite": fav_user is not None,
                        "rating_avg": float(course.rating_avg or 0),
                        "rating_count": course.rating_count,
                        "total_enrolls": course.total_enrolls,
                        "views": course.views,
                        "level": course.level,
                        "base_price": course.base_price,
                        "language": course.language,
                        "category": {
                            "id": str(course.category.id) if course.category else None,
                            "name": course.category.name if course.category else None,
                            "slug": course.category.slug if course.category else None,
                        },
                        "topic": {
                            "id": str(course.topic.id) if course.topic else None,
                            "name": course.topic.name if course.topic else None,
                            "slug": course.topic.slug if course.topic else None,
                        },
                        "created_at": course.created_at,
                        "updated_at": course.updated_at,
                    }
                )

            return {"items": items, "next_cursor": next_cursor}

        except Exception as e:
            await self.db.rollback()
            raise e

    async def get_instructor_detail_async(self, lecturer_id: uuid.UUID):
        try:
            # ─────────────────────────────
            # 1) Kiểm tra user có phải giảng viên không
            # ─────────────────────────────
            role_stmt = (
                select(Role.role_name)
                .join(UserRoles, UserRoles.role_id == Role.id)
                .where(
                    and_(UserRoles.user_id == lecturer_id, Role.role_name == "LECTURER")
                )
            )

            role = (await self.db.execute(role_stmt)).scalar_one_or_none()

            if role is None:
                # Không phải giảng viên
                return None

            # ─────────────────────────────
            # 2) Lấy thông tin giảng viên
            # ─────────────────────────────
            stmt = select(User).where(User.id == lecturer_id)
            user = (await self.db.execute(stmt)).scalar_one()

            return {
                "id": str(user.id),
                "name": user.fullname,
                "avatar": user.avatar,
                "instructor_description": user.instructor_description,
                "student_count": user.student_count or 0,
                "course_count": user.course_count or 0,
                "rating_avg": float(user.rating_avg or 0),
                "evaluated_count": user.evaluated_count or 0,
                # Social
                "facebook_url": user.facebook_url,
                # Extra info
                "created_at": user.create_at,
            }

        except Exception as e:
            await self.db.rollback()
            raise e

    async def get_top4_instructors_async(self):
        try:
            stmt = (
                select(User)
                .join(UserRoles, UserRoles.user_id == User.id)
                .join(Role, Role.id == UserRoles.role_id)
                .where(Role.role_name == "LECTURER", User.deleted_at.is_(None), User.is_banned.is_(False), exists(select(Courses.id).where(Courses.instructor_id == User.id, public_course())))
                .order_by(desc(User.student_count))
                .limit(4)
            )

            rows = (await self.db.execute(stmt)).scalars().all()

            return [
                {
                    "id": str(u.id),
                    "name": u.fullname,
                    "avatar": u.avatar,
                    "student_count": u.student_count or 0,
                    "course_count": u.course_count or 0,
                    "rating_avg": round(float(u.rating_avg or 0), 1),
                    "evaluated_count": u.evaluated_count or 0,
                }
                for u in rows
            ]

        except Exception as e:
            await self.db.rollback()
            raise e

    async def become_instructor_async(
        self, user: User, notification_service: NotificationService
    ):
        FEE = 1_000_000

        try:
            async with self.db.begin_nested():  # Transaction ACID full
                # 1) Kiểm tra đã là giảng viên chưa
                for ur in user.user_roles:
                    if ur.role and ur.role.role_name == "LECTURER":
                        raise HTTPException(400, "Bạn đã là giảng viên rồi")

                # 2) Lấy ví
                wallet = await self.db.scalar(
                    select(Wallets).where(Wallets.user_id == user.id)
                )
                if not wallet:
                    raise HTTPException(404, "Không tìm thấy ví")

                if wallet.balance < FEE:
                    raise HTTPException(
                        400, f"Bạn cần {FEE:,} VNĐ để đăng ký làm giảng viên"
                    )

                # 3) Trừ tiền
                wallet.balance -= FEE
                wallet.updated_at = get_now()

                # 4) Lấy/tạo role LECTURER
                lecturer_role = await self.db.scalar(
                    select(Role).where(Role.role_name == "LECTURER", User.deleted_at.is_(None), User.is_banned.is_(False), exists(select(Courses.id).where(Courses.instructor_id == User.id, public_course())))
                )
                if not lecturer_role:
                    lecturer_role = Role(
                        role_name="LECTURER",
                        details="Instructor of the system",
                    )
                    self.db.add(lecturer_role)
                    await self.db.flush()

                # 5) Thêm user role
                self.db.add(UserRoles(user_id=user.id, role_id=lecturer_role.id))

                # 6) Log transaction        
                transaction = Transactions(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    amount=FEE,
                    currency="VND",
                    type="fee",
                    method="wallet",
                    direction="out",
                    status="completed",
                    description="Đăng ký trở thành giảng viên",
                    created_at=get_now(),
                )
                self.db.add(transaction)
                await self.db.flush()



            # ============================
            #   Gửi thông báo sau commit
            # ============================
            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=user.id,
                    roles=["USER", "LECTURER"],
                    title="Trừ tiền đăng ký giảng viên 💰",
                    content=f"Số tiền {FEE:,} VNĐ đã được trừ khỏi ví của bạn.",
                    url="/lecturer/wallets",
                    type="wallet",
                    role_target=["USER", "LECTURER"],
                    metadata={"transaction_id": str(transaction.id)},
                    action="open_url",
                )
            )

            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=user.id,
                    roles=["USER", "LECTURER"],
                    title="Đăng ký giảng viên thành công 🎉",
                    content="Bạn đã chính thức trở thành giảng viên.",
                    url="/lecturer",
                    type="lecturer",
                    role_target=["USER", "LECTURER"],
                    metadata={"transaction_id": str(transaction.id)},
                    action="open_url",
                )
            )

            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=None,
                    roles=["ADMIN"],
                    title=f"{user.fullname} đã trở thành giảng viên",
                    content=f"Người dùng {user.fullname} đã đăng ký trở thành giảng viên.",
                    url=f"/admin/lecturers/{user.id}",
                    type="lecturer",
                    role_target=["ADMIN"],
                    metadata={"lecturer_id": str(user.id)},
                    action="open_url",
                )
            )

            return {"message": "Đăng ký giảng viên thành công"}

        except Exception as e:
            raise e
