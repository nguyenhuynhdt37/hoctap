"""Owner checks shared by management, publication, coupons and checkout.

No caller-supplied instructor field is accepted. The actor ID must come from
backend authentication; role and account state are rechecked here.
"""

from fastapi import HTTPException
from sqlalchemy import select, text

from app.db.models.database import Courses, Role, User, UserRoles
from app.services.catalog import public_course, require_real_course


class BundleOwnershipPolicy:
    def __init__(self, db):
        self.db = db

    async def lecturer(self, actor_id):
        actor = await self.db.get(User, actor_id)
        permitted = await self.db.scalar(
            select(UserRoles.user_id)
            .join(Role, Role.id == UserRoles.role_id)
            .where(UserRoles.user_id == actor_id, Role.role_name == "LECTURER")
            .limit(1)
        )
        if not actor or actor.is_banned or actor.deleted_at or not permitted:
            raise HTTPException(
                403, "Chỉ tài khoản giảng viên đang hoạt động được quản lý combo"
            )
        return actor

    async def root(self, bundle_id, actor_id, *, lock=False):
        await self.lecturer(actor_id)
        # Explicit new columns keep this policy independent of legacy snapshots.
        query = "SELECT id, owner_id, origin, code, is_active, suspended_at FROM public.course_bundles WHERE id=:id AND owner_id=:owner AND origin='lecturer' AND deleted_at IS NULL"
        if lock:
            query += " FOR UPDATE"
        root = (
            (await self.db.execute(text(query), {"id": bundle_id, "owner": actor_id}))
            .mappings()
            .first()
        )
        if not root:
            raise HTTPException(404, "Không tìm thấy combo của bạn")
        return dict(root)

    async def courses(self, course_ids, actor_id, *, publishing=False, lock=False):
        await self.lecturer(actor_id)
        if len(course_ids) > 60 or len(set(course_ids)) != len(course_ids):
            raise HTTPException(
                422, "Combo tối đa 60 khóa khác nhau, không được lặp khóa"
            )
        if publishing and len(course_ids) < 2:
            raise HTTPException(422, "Combo cần ít nhất hai khóa học đủ điều kiện")
        query = (
            select(Courses)
            .where(
                Courses.id.in_(course_ids),
                Courses.instructor_id == actor_id,
                public_course(),
            )
            .order_by(Courses.id)
        )
        if lock:
            query = query.with_for_update(key_share=True)
        rows = (await self.db.scalars(query)).all()
        if len(rows) != len(course_ids):
            raise HTTPException(
                422,
                "Chỉ chọn khóa do bạn giảng dạy, đã duyệt, công khai và đủ điều kiện mở bán",
            )
        for course in rows:
            require_real_course(course)
            if course.currency != "VND":
                raise HTTPException(422, "Combo chỉ hỗ trợ khóa học có tiền tệ VND")
        return {course.id: course for course in rows}
