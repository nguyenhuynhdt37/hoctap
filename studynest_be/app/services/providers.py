from app.db.models.catalog import (
    Grade,
    Provider,
    ProviderMember,
    Subject,
    course_grades,
)
from app.db.models.database import Courses, User
from app.db.sesson import get_session
from app.services.catalog import CatalogService, public_course, record
from app.services.catalog_slugs import create_slugged
from fastapi import Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

SESSION_DEP = Depends(get_session)


class ProviderService:
    def __init__(self, db: AsyncSession = SESSION_DEP):
        self.db = db
        self.catalog = CatalogService(db)

    async def listing(self, page=1, size=20, search=None, admin=False, user_id=None):
        stmt = select(Provider)
        if not admin:
            stmt = stmt.where(Provider.is_active.is_(True))
        if user_id:
            stmt = stmt.join(
                ProviderMember, ProviderMember.provider_id == Provider.id
            ).where(
                ProviderMember.user_id == user_id, ProviderMember.status == "active"
            )
        if search:
            stmt = stmt.where(Provider.name.ilike("%" + search + "%"))
        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = (
            await self.db.scalars(
                stmt.order_by(Provider.name, Provider.id)
                .offset((page - 1) * size)
                .limit(size)
            )
        ).all()
        return {
            "items": [
                record(p) if admin else self.catalog.public_provider(p) for p in rows
            ],
            "total": total,
            "page": page,
            "page_size": size,
        }

    async def detail(self, slug):
        provider = await self.db.scalar(
            select(Provider).where(Provider.slug == slug, Provider.is_active.is_(True))
        )
        if not provider:
            raise HTTPException(404, "Không tìm thấy đơn vị")
        # Public instructor profiles only; never leak contact info or student records.
        teachers = (
            (
                await self.db.execute(
                    select(User.id, User.fullname, User.avatar).where(
                        or_(
                            User.id.in_(
                                select(ProviderMember.user_id).where(
                                    ProviderMember.provider_id == provider.id,
                                    ProviderMember.status == "active",
                                    ProviderMember.role == "instructor",
                                )
                            ),
                            User.id.in_(
                                select(Courses.instructor_id).where(
                                    Courses.provider_id == provider.id, public_course()
                                )
                            ),
                        )
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

    async def save(self, schema, user_id, provider_id=None, admin=False):
        provider = (
            await self.db.get(Provider, provider_id) if provider_id else Provider()
        )
        if not provider:
            raise HTTPException(404, "Không tìm thấy đơn vị")
        if provider_id and not admin:
            await self.catalog.provider_permission(
                provider_id, user_id, roles=("owner", "manager")
            )
        data = schema.model_dump()
        if provider_id and provider.slug != data["slug"]:
            raise HTTPException(409, "Giữ slug ổn định để bảo vệ liên kết")
        if not admin and provider_id:
            # Material edits require re-verification.
            provider.verification_status = "pending"
        for key, value in data.items():
            if (
                key in ("logo_url", "banner_url")
                and value
                and not value.startswith("/api/storage/files/public/")
            ):
                raise HTTPException(
                    422, "Ảnh đơn vị phải dùng kho file public của Mây Mây"
                )
            setattr(provider, key, value)
        self.db.add(provider)
        try:
            if not provider_id:
                self.db.expunge(provider)
                provider = await create_slugged(
                    self.db,
                    Provider,
                    data["name"],
                    data["slug"],
                    **{key: value for key, value in data.items() if key != "slug"},
                )
            await self.db.flush()
            if not provider_id:
                self.db.add(
                    ProviderMember(
                        provider_id=provider.id,
                        user_id=user_id,
                        role="owner",
                        status="active",
                    )
                )
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Slug đơn vị đã tồn tại") from None
        await self.db.refresh(provider)
        return record(provider)

    async def member(self, provider_id, data, user_id, admin=False):
        if not admin:
            await self.catalog.provider_permission(
                provider_id, user_id, roles=("owner",)
            )
        # Serialize membership changes; the final active owner cannot be removed.
        provider = await self.db.scalar(
            select(Provider).where(Provider.id == provider_id).with_for_update()
        )
        if not provider or not await self.db.get(User, data.user_id):
            raise HTTPException(404, "Đơn vị hoặc tài khoản không tồn tại")
        owners = (
            await self.db.scalars(
                select(ProviderMember).where(
                    ProviderMember.provider_id == provider_id,
                    ProviderMember.role == "owner",
                    ProviderMember.status == "active",
                )
            )
        ).all()
        if (
            len(owners) == 1
            and owners[0].user_id == data.user_id
            and (data.role != "owner" or data.status != "active")
        ):
            raise HTTPException(409, "Cần giữ ít nhất một chủ sở hữu hoạt động")
        await self.db.execute(
            insert(ProviderMember)
            .values(provider_id=provider_id, **data.model_dump())
            .on_conflict_do_update(
                index_elements=["provider_id", "user_id"],
                set_={"role": data.role, "status": data.status},
            )
        )
        await self.db.commit()
        return {"message": "Đã cập nhật thành viên"}
