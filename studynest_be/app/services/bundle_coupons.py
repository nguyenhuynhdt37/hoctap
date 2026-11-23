"""Bundle-only promotions. Checkout locks one coupon before checking its usage."""

from datetime import UTC, datetime
from decimal import Decimal

from app.db.models.learning_paths import BundleCoupon, BundleOrder, CourseBundle
from app.services.catalog import record
from app.services.coupon_settlement import billing_policy, instructor_max_percent
from app.services.gamification.coupon_rewards import REWARD_CODE_PREFIX
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError


class BundleCouponService:
    def __init__(self, db):
        self.db = db

    async def root(self, bundle_id):
        root = await self.db.get(CourseBundle, bundle_id)
        if not root or root.deleted_at:
            raise HTTPException(404, "Không tìm thấy combo")
        return root

    async def owned(self, bundle_id, actor_id):
        from app.services.bundle_ownership import BundleOwnershipPolicy

        root = await BundleOwnershipPolicy(self.db).root(bundle_id, actor_id)
        if root["suspended_at"]:
            raise HTTPException(409, "Combo đang tạm ngừng")
        return root

    async def listing_owned(self, bundle_id, actor_id):
        await self.owned(bundle_id, actor_id)
        return await self.listing(bundle_id)

    async def save_owned(self, bundle_id, data, actor_id, coupon_id=None):
        await self.owned(bundle_id, actor_id)
        return await self.save(bundle_id, data, actor_id, coupon_id, sponsor="instructor")

    async def active_owned(self, bundle_id, coupon_id, active, actor_id):
        await self.owned(bundle_id, actor_id)
        return await self.active(bundle_id, coupon_id, active, owner_id=actor_id)

    @staticmethod
    def sponsor(coupon, lecturer_owner_id=None):
        return coupon.sponsor or (
            "instructor" if coupon.created_by == lecturer_owner_id else "platform"
        )

    async def listing(self, bundle_id):
        await self.root(bundle_id)
        rows = (
            await self.db.execute(
                select(BundleCoupon, func.count(BundleOrder.id))
                .outerjoin(BundleOrder, BundleOrder.coupon_id == BundleCoupon.id)
                .where(BundleCoupon.bundle_id == bundle_id)
                .group_by(BundleCoupon.id)
                .order_by(BundleCoupon.ends_at.desc())
            )
        ).all()
        return {"items": [{**record(c), "usage_count": count} for c, count in rows]}

    async def save(self, bundle_id, data, admin_id, coupon_id=None, *, sponsor="platform"):
        await self.root(bundle_id)
        if data.code.startswith(REWARD_CODE_PREFIX):
            raise HTTPException(422, "Tiền tố này dành riêng cho mã thưởng.")
        if sponsor == "instructor" and data.discount_type == "percent":
            policy = await billing_policy(self.db)
            if Decimal(data.value) > instructor_max_percent(policy):
                raise HTTPException(422, "Mức giảm vượt giới hạn dành cho giảng viên.")
        if coupon_id:
            item = await self.db.scalar(
                select(BundleCoupon)
                .where(
                    BundleCoupon.id == coupon_id, BundleCoupon.bundle_id == bundle_id
                )
                .with_for_update()
            )
            if not item:
                raise HTTPException(404, "Không tìm thấy mã ưu đãi")
            if sponsor == "instructor" and (
                item.created_by != admin_id or self.sponsor(item, admin_id) != "instructor"
            ):
                raise HTTPException(403, "Bạn chỉ được sửa mã do mình tài trợ.")
            used = await self.db.scalar(
                select(func.count())
                .select_from(BundleOrder)
                .where(BundleOrder.coupon_id == item.id)
            )
            if used and item.code != data.code:
                raise HTTPException(
                    409, "Mã đã phát sinh đơn hàng; hãy tạo mã mới để đổi tên"
                )
        else:
            item = BundleCoupon(bundle_id=bundle_id, created_by=admin_id, sponsor=sponsor)
            self.db.add(item)
        for key, value in data.model_dump().items():
            setattr(item, key, value)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Mã ưu đãi đã tồn tại; hãy chọn mã khác") from None
        return record(item)

    async def active(self, bundle_id, coupon_id, active, *, owner_id=None):
        await self.root(bundle_id)
        item = await self.db.scalar(
            select(BundleCoupon)
            .where(BundleCoupon.id == coupon_id, BundleCoupon.bundle_id == bundle_id)
            .with_for_update()
        )
        if not item:
            raise HTTPException(404, "Không tìm thấy mã ưu đãi")
        if owner_id and (item.created_by != owner_id or self.sponsor(item, owner_id) != "instructor"):
            raise HTTPException(403, "Bạn chỉ được sửa mã do mình tài trợ.")
        item.is_active = active
        await self.db.commit()
        return record(item)

    async def resolve(self, bundle_id, code, subtotal, user_id=None, lock=False):
        if not code or not code.strip():
            return None
        stmt = select(BundleCoupon).where(
            BundleCoupon.bundle_id == bundle_id,
            BundleCoupon.code == code.strip().upper(),
        )
        if lock:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        coupon = await self.db.scalar(stmt)
        now = datetime.now(UTC)
        if (
            not coupon
            or not coupon.is_active
            or not coupon.starts_at <= now < coupon.ends_at
        ):
            raise HTTPException(
                422, "Mã không hợp lệ, đã tạm dừng hoặc ngoài thời gian áp dụng"
            )
        if subtotal <= 0 or subtotal < coupon.min_total:
            raise HTTPException(
                422, "Phần cần thanh toán chưa đạt mức tối thiểu của mã ưu đãi"
            )
        uses = (
            select(func.count())
            .select_from(BundleOrder)
            .where(BundleOrder.coupon_id == coupon.id)
        )
        if (
            coupon.max_uses is not None
            and await self.db.scalar(uses) >= coupon.max_uses
        ):
            raise HTTPException(422, "Mã ưu đãi đã hết lượt sử dụng")
        if (
            user_id
            and await self.db.scalar(uses.where(BundleOrder.user_id == user_id))
            >= coupon.per_user_limit
        ):
            raise HTTPException(422, "Bạn đã dùng hết số lượt của mã ưu đãi này")
        return coupon
