"""Bundle quotes and purchases with exact per-course allocations and atomic settlement."""

import hashlib
import json
from datetime import UTC, datetime, timedelta
from decimal import ROUND_DOWN, Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import delete, func, literal_column, select, text, update

from app.db.models.database import (
    CourseEnrollments,
    Courses,
    DiscountHistory,
    Discounts,
    InstructorEarnings,
    RewardInstances,
    PurchaseItems,
    Transactions,
    User,
    Wallets,
)
from app.db.models.learning_paths import (
    BundleItem,
    BundleOrder,
    BundleOrderLine,
    BundleVersion,
    CourseBundle,
    PathStage,
    PathVersion,
    StageGroup,
    StageOption,
)
from app.libs.formats.datetime import VIETNAM_TIMEZONE
from app.libs.formats.datetime import now as legacy_now
from app.schemas.learning_paths import BUNDLE_PRESENTATION_FIELDS
from app.services.billing_ledger import check_coupon_budget, hold_payment, lock_treasury, record_coupon_cost
from app.services.coin_math import allocate, price_to_coin
from app.services.coin_service import CoinService, PaymentSplit
from app.services.bundle_coupons import BundleCouponService
from app.services.coupon_settlement import CENT, billing_policy, coupon_cap, money, settle
from app.services.gamification.coupon_rewards import (
    REWARD_CODE_PREFIX, consume_discount, find_discount, reward_inventory_entry,
)
from app.services.catalog import public_course, record, require_real_course
from app.services.catalog_slugs import create_slugged


def allocate_price(total, weights):
    """Largest remainder, deterministic by input order; allocation sums exactly."""
    total = Decimal(total).quantize(CENT)
    weights = [Decimal(w) for w in weights]
    if total < 0 or any(w < 0 or not w.is_finite() for w in weights):
        raise ValueError("Invalid amount")
    weight = sum(weights)
    if not weight:
        if total:
            raise ValueError("Nonzero price without paid courses")
        return [Decimal("0.00") for _ in weights]
    exact = [total * w / weight for w in weights]
    result = [value.quantize(CENT, rounding=ROUND_DOWN) for value in exact]
    cents = int((total - sum(result)) / CENT)
    for i in sorted(range(len(weights)), key=lambda i: (-(exact[i] - result[i]), i))[
        :cents
    ]:
        result[i] += CENT
    return result


def allocate_coupon(prices, fee, sponsor, value, *, fixed=False, maximum=None, instructor_max=Decimal(90)):
    caps = [coupon_cap(price, fee, sponsor, instructor_max) for price in prices]
    if fixed:
        if value > sum(caps):
            raise HTTPException(422, "Mã giảm giá cố định vượt mức giảm cho phép.")
        total, weights = value, caps
    else:
        weights = [min(cap, money(price * value / 100)) for price, cap in zip(prices, caps)]
        total = sum(weights)
    if maximum is not None:
        total = min(total, maximum)
    return allocate_price(total, weights)


async def lock_purchase_user(db, user_id):
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))"),
        {"scope": "course-purchase:" + str(user_id)},
    )


class BundleService:
    def __init__(self, db):
        self.db = db

    async def require_sales_policy(self, bundle_id, version_id=None):
        # Legacy rows stay on the existing checkout. Lecturer combos sell as soon
        # as the owner publishes them; there is no admin approval step.
        if not await self.db.scalar(
            text("SELECT to_regclass('public.bundle_version_reviews')")
        ):
            return None
        row = (
            (
                await self.db.execute(
                    text(
                        "SELECT origin, suspended_at FROM public.course_bundles WHERE id=:id"
                    ),
                    {"id": bundle_id},
                )
            )
            .mappings()
            .first()
        )
        if not row or row["origin"] != "lecturer":
            return None
        if row["suspended_at"]:
            raise HTTPException(409, "Combo giảng viên đang tạm ngừng")
        return "lecturer"

    async def create(self, data, admin_id, version_id=None, *, commit=True):
        presentation = data.model_dump(
            include=set(BUNDLE_PRESENTATION_FIELDS), exclude_unset=True
        )
        version = None
        if version_id:
            version = await self.db.scalar(
                select(BundleVersion)
                .where(BundleVersion.id == version_id)
                .with_for_update()
            )
            if not version or version.status != "draft":
                raise HTTPException(
                    409,
                    "Chỉ sửa được bản nháp; hãy tạo phiên bản mới từ bản đã xuất bản",
                )
            if data.bundle_id and data.bundle_id != version.bundle_id:
                raise HTTPException(422, "Combo không khớp bản nháp")
        root_id = version.bundle_id if version else data.bundle_id
        if root_id:
            bundle = await self.db.scalar(
                select(CourseBundle).where(CourseBundle.id == root_id).with_for_update()
            )
            if not bundle or bundle.deleted_at:
                raise HTTPException(404, "Không tìm thấy combo")
        else:
            bundle = await create_slugged(self.db, CourseBundle, data.title, data.slug)
        courses = (
            await self.db.scalars(
                select(Courses).where(Courses.id.in_(data.course_ids))
            )
        ).all()
        if len(courses) != len(data.course_ids):
            raise HTTPException(422, "Có khóa học không tồn tại")
        for course in courses:
            require_real_course(course)
        if any(c.currency != "VND" for c in courses):
            raise HTTPException(422, "Combo hiện hỗ trợ VND")
        if data.path_version_id:
            linked = await self.db.get(PathVersion, data.path_version_id)
            if not linked or linked.status != "published":
                raise HTTPException(422, "Lộ trình phải được xuất bản trước")
        if version:
            await self.db.execute(
                delete(BundleItem).where(BundleItem.version_id == version.id)
            )
            version.title = data.title
            version.description = data.description
            for field, value in presentation.items():
                setattr(version, field, value)
            version.price = data.price
            version.path_version_id = data.path_version_id
        else:
            number = (
                await self.db.scalar(
                    select(func.max(BundleVersion.version)).where(
                        BundleVersion.bundle_id == bundle.id
                    )
                )
                or 0
            ) + 1
            version = BundleVersion(
                bundle_id=bundle.id,
                version=number,
                title=data.title,
                description=data.description,
                price=data.price,
                currency="VND",
                path_version_id=data.path_version_id,
                status="draft",
                created_by=admin_id,
                **presentation,
            )
            self.db.add(version)
        await self.db.flush()
        by_id = {c.id: c for c in courses}
        for position, course_id in enumerate(data.course_ids, 1):
            self.db.add(
                BundleItem(
                    version_id=version.id,
                    course_id=course_id,
                    position=position,
                    list_price=by_id[course_id].base_price or 0,
                    allocated_price=0,
                )
            )
        if commit:
            await self.db.commit()
        else:
            await self.db.flush()
        return await self.detail(version.id, admin=True)

    async def learning_metadata(self, version_ids):
        """Public author and ordered course count, fetched once for a page."""
        if not version_ids:
            return {}
        rows = (
            await self.db.execute(
                select(
                    BundleVersion.id,
                    User.id.label("instructor_id"),
                    User.fullname,
                    func.count(BundleItem.id).label("course_count"),
                )
                .select_from(BundleVersion)
                .join(CourseBundle, CourseBundle.id == BundleVersion.bundle_id)
                .outerjoin(
                    User,
                    User.id == literal_column("public.course_bundles.owner_id"),
                )
                .outerjoin(BundleItem, BundleItem.version_id == BundleVersion.id)
                .where(BundleVersion.id.in_(version_ids))
                .group_by(BundleVersion.id, User.id, User.fullname)
            )
        ).all()
        return {
            row.id: {
                "course_count": row.course_count,
                "instructor": {"id": row.instructor_id, "name": row.fullname}
                if row.instructor_id
                else None,
            }
            for row in rows
        }

    async def listing(
        self,
        admin=False,
        page=1,
        limit=12,
        keyword="",
        status=None,
        active=None,
        history_id=None,
        price_filter="all",
        sort="title",
    ):
        stmt = (
            select(BundleVersion, CourseBundle.slug, CourseBundle.is_active)
            .join(CourseBundle, CourseBundle.id == BundleVersion.bundle_id)
            .where(CourseBundle.deleted_at.is_(None))
        )
        latest_stmt = select(
            BundleVersion.bundle_id, func.max(BundleVersion.version).label("number")
        )
        if not admin:
            latest_stmt = latest_stmt.where(BundleVersion.status == "published")
        if not history_id:
            latest = latest_stmt.group_by(BundleVersion.bundle_id).subquery()
            stmt = stmt.join(
                latest,
                (latest.c.bundle_id == BundleVersion.bundle_id)
                & (latest.c.number == BundleVersion.version),
            )
        else:
            stmt = stmt.where(CourseBundle.id == history_id)
        if not admin:
            stmt = stmt.where(CourseBundle.is_active.is_(True))
            stmt = stmt.where(text("public.course_bundles.origin = 'lecturer'"))
        if keyword:
            stmt = stmt.where(BundleVersion.title.ilike("%" + keyword + "%"))
        if status:
            stmt = stmt.where(BundleVersion.status == status)
        if active is not None:
            stmt = stmt.where(CourseBundle.is_active == active)
        if price_filter == "free":
            stmt = stmt.where(BundleVersion.price == 0)
        elif price_filter == "paid":
            stmt = stmt.where(BundleVersion.price > 0)

        sort_columns = {
            "title": BundleVersion.title,
            "recent": BundleVersion.published_at.desc().nulls_last(),
            "price_asc": BundleVersion.price.asc(),
            "price_desc": BundleVersion.price.desc(),
        }
        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = (
            await self.db.execute(
                stmt.order_by(
                    sort_columns[sort], BundleVersion.version.desc(), BundleVersion.id
                )
                .offset((page - 1) * limit)
                .limit(limit)
            )
        ).all()
        metadata = await self.learning_metadata([v.id for v, _, _ in rows])
        return {
            "items": [
                {**record(v), "slug": slug, "is_active": visible, **metadata[v.id]}
                for v, slug, visible in rows
            ],
            "total": total,
            "page": page,
            "limit": limit,
        }

    async def by_slug(self, slug):
        version = await self.db.scalar(
            select(BundleVersion)
            .join(CourseBundle, CourseBundle.id == BundleVersion.bundle_id)
            .where(
                CourseBundle.slug == slug,
                CourseBundle.is_active.is_(True),
                CourseBundle.deleted_at.is_(None),
                BundleVersion.status == "published",
                text("public.course_bundles.origin = 'lecturer'"),
            )
            .order_by(BundleVersion.version.desc())
            .limit(1)
        )
        if not version:
            raise HTTPException(404, "Không tìm thấy combo")
        return await self.detail(version.id)

    async def detail(self, version_id, admin=False):
        version = await self.db.get(BundleVersion, version_id)
        if not version:
            raise HTTPException(404, "Không tìm thấy combo")
        root = await self.db.get(CourseBundle, version.bundle_id)
        if root.deleted_at:
            raise HTTPException(404, "Combo đã lưu trữ")
        if not admin and (not root.is_active or version.status != "published"):
            raise HTTPException(404, "Không tìm thấy combo")
        rows = (
            await self.db.execute(
                select(BundleItem, Courses)
                .join(Courses, Courses.id == BundleItem.course_id)
                .where(BundleItem.version_id == version.id)
                .order_by(BundleItem.position)
            )
        ).all()
        visible = set(
            (
                await self.db.scalars(
                    select(Courses.id).where(
                        Courses.id.in_([c.id for _, c in rows]), public_course()
                    )
                )
            ).all()
        )
        metadata = await self.learning_metadata([version.id])
        return {
            **record(version),
            **metadata[version.id],
            "is_active": root.is_active,
            "slug": root.slug,
            "items": [
                {
                    "course_id": c.id,
                    "position": item.position,
                    "title": c.title
                    if c.id in visible or admin
                    else "Khóa học tạm ngừng nhận đăng ký",
                    "slug": c.slug if c.id in visible or admin else None,
                    "thumbnail": c.thumbnail_url if c.id in visible or admin else None,
                    "list_price": str(item.list_price),
                    "allocated_price": str(item.allocated_price),
                    "available": c.id in visible,
                }
                for item, c in rows
            ],
            "refund_policy": "Hoàn theo phần tiền thực trả của từng khóa và trong thời hạn giữ doanh thu; không tính lại theo giá lẻ hiện tại.",
        }

    async def publish(self, version_id, *, commit=True):
        version = await self.db.scalar(
            select(BundleVersion)
            .where(BundleVersion.id == version_id)
            .with_for_update()
        )
        if not version or version.status != "draft":
            raise HTTPException(409, "Chỉ có thể xuất bản bản nháp")
        # Root lock coordinates publishing a newer version with a buyer's quote.
        root = await self.db.scalar(
            select(CourseBundle)
            .where(CourseBundle.id == version.bundle_id)
            .with_for_update()
        )
        if not root or root.deleted_at:
            raise HTTPException(404, "Combo đã lưu trữ")
        await self.require_sales_policy(root.id, version.id)
        latest_published = await self.db.scalar(
            select(func.max(BundleVersion.version)).where(
                BundleVersion.bundle_id == root.id, BundleVersion.status == "published"
            )
        )
        if latest_published is not None and latest_published >= version.version:
            raise HTTPException(
                409, "Đã có bản xuất bản mới hơn; hãy tạo phiên bản mới từ bản hiện tại"
            )
        rows = (
            await self.db.execute(
                select(BundleItem, Courses)
                .join(Courses, Courses.id == BundleItem.course_id)
                .where(BundleItem.version_id == version.id)
                .order_by(BundleItem.position)
                .with_for_update(of=Courses, key_share=True)
            )
        ).all()
        if len(version.description.strip()) < 20:
            raise HTTPException(
                422, "Cần giới thiệu combo ít nhất 20 ký tự trước khi xuất bản"
            )
        if not rows:
            raise HTTPException(422, "Combo phải có khóa học")
        visible = set(
            (
                await self.db.scalars(
                    select(Courses.id).where(
                        Courses.id.in_([c.id for _, c in rows]), public_course()
                    )
                )
            ).all()
        )
        if len(visible) != len(rows):
            raise HTTPException(422, "Các khóa phải được duyệt và công khai")
        if any(c.currency != "VND" for _, c in rows):
            raise HTTPException(422, "Combo chỉ hỗ trợ VND")
        weights = [Decimal(c.base_price or 0) for _, c in rows]
        if version.price > sum(weights):
            raise HTTPException(422, "Giá combo không được vượt tổng giá lẻ")
        allocation = allocate_price(version.price, weights)
        if version.path_version_id:
            linked = await self.db.get(PathVersion, version.path_version_id)
            if not linked or linked.status != "published":
                raise HTTPException(422, "Lộ trình liên kết không hợp lệ")
            groups = (
                await self.db.execute(
                    select(StageOption.group_id, StageOption.course_id)
                    .join(StageGroup, StageGroup.id == StageOption.group_id)
                    .join(PathStage, PathStage.id == StageGroup.stage_id)
                    .where(PathStage.version_id == linked.id)
                )
            ).all()
            selected = {c.id for _, c in rows}
            if not selected <= {g.course_id for g in groups} or any(
                not any(g.group_id == group and g.course_id in selected for g in groups)
                for group in {g.group_id for g in groups}
            ):
                raise HTTPException(
                    422,
                    "Combo phải phủ ít nhất một khóa mỗi học phần và chỉ gồm khóa thuộc lộ trình",
                )
        for (item, course), price in zip(rows, allocation):
            item.list_price = course.base_price or 0
            item.allocated_price = price
        await self.db.flush()
        version.status = "published"
        version.published_at = datetime.now(UTC)
        if commit:
            await self.db.commit()
        else:
            await self.db.flush()
        return await self.detail(version.id, admin=True)

    async def quote(self, version_id, user_id=None, lock=False, coupon_code=None):
        stmt = select(BundleVersion).where(BundleVersion.id == version_id)
        version = await self.db.scalar(stmt)
        if not version or version.status != "published":
            raise HTTPException(404, "Không tìm thấy combo")
        root_stmt = select(CourseBundle).where(CourseBundle.id == version.bundle_id)
        if lock:
            root_stmt = root_stmt.with_for_update(read=True)
        root = await self.db.scalar(root_stmt)
        lecturer_sale = await self.require_sales_policy(root.id, version.id)
        latest = await self.db.scalar(
            select(func.max(BundleVersion.version)).where(
                BundleVersion.bundle_id == root.id, BundleVersion.status == "published"
            )
        )
        if root.deleted_at or not root.is_active or version.version != latest:
            raise HTTPException(409, "Combo đã có thay đổi; hãy tải lại thông tin")
        rows_stmt = (
            select(BundleItem, Courses)
            .join(Courses, Courses.id == BundleItem.course_id)
            .where(BundleItem.version_id == version.id)
            .order_by(BundleItem.position)
        )
        if lock:
            ids = select(BundleItem.course_id).where(
                BundleItem.version_id == version.id
            )
            await self.db.execute(
                select(Courses.id)
                .where(Courses.id.in_(ids))
                .order_by(Courses.id)
                .with_for_update(key_share=True)
            )
        rows = (await self.db.execute(rows_stmt)).all()
        owned = (
            set(
                (
                    await self.db.scalars(
                        select(CourseEnrollments.course_id).where(
                            CourseEnrollments.user_id == user_id,
                            CourseEnrollments.status == "active",
                        )
                    )
                ).all()
            )
            if user_id
            else set()
        )
        visible = set(
            (
                await self.db.scalars(
                    select(Courses.id).where(
                        Courses.id.in_([c.id for _, c in rows]), public_course()
                    )
                )
            ).all()
        )
        if any(c.id not in visible and c.id not in owned for _, c in rows):
            raise HTTPException(
                409, "Một khóa trong combo đang ngừng bán; chưa thể thanh toán"
            )
        owner_id = None
        if lecturer_sale:
            from app.services.bundle_ownership import BundleOwnershipPolicy

            owner_id = await self.db.scalar(
                text("SELECT owner_id FROM public.course_bundles WHERE id=:id"),
                {"id": root.id},
            )
            await BundleOwnershipPolicy(self.db).lecturer(owner_id)
            if any(course.instructor_id != owner_id for _, course in rows):
                raise HTTPException(
                    409, "Một khóa trong combo không còn thuộc giảng viên"
                )
        if not rows or sum(i.allocated_price for i, _ in rows) != version.price:
            raise HTTPException(409, "Combo chưa được phân bổ giá hợp lệ")
        items = [
            {
                "course_id": str(c.id),
                "title": c.title,
                "instructor_id": str(c.instructor_id),
                "list_price": str(i.list_price),
                "allocated_price": str(i.allocated_price),
                "already_owned": c.id in owned,
                "payable": str(Decimal(0) if c.id in owned else i.allocated_price),
            }
            for i, c in rows
        ]
        prices = [Decimal(item["payable"]) for item in items]
        subtotal = sum(prices)
        policy = await billing_policy(self.db, lock=lock)
        fee = policy.platform_fee
        coupon, reward, reward_instance = None, None, None
        sponsor, value, fixed, maximum = None, None, False, None
        if coupon_code and coupon_code.strip().upper().startswith(REWARD_CODE_PREFIX):
            reward = await find_discount(self.db, coupon_code, lock=lock, reward_only=True)
            owned_reward = await reward_inventory_entry(self.db, reward.id, user_id) if reward and user_id else None
            if not owned_reward or not reward.is_active or (reward.usage_count or 0) >= 1:
                raise HTTPException(422, "Mã thưởng không còn hiệu lực hoặc không thuộc về bạn.")
            reward_instance = await self.db.get(RewardInstances, owned_reward.reward_instance_id)
            sponsor, value = "platform", reward.percent_value
        else:
            coupon = await BundleCouponService(self.db).resolve(
                root.id, coupon_code, subtotal, user_id, lock,
            )
            if coupon:
                sponsor, value = BundleCouponService.sponsor(coupon, owner_id), coupon.value
                fixed, maximum = coupon.discount_type == "fixed", coupon.max_discount

        discounts = [Decimal("0.00")] * len(prices)
        if sponsor:
            discounts = allocate_coupon(
                prices, fee, sponsor, value, fixed=fixed, maximum=maximum,
                instructor_max=Decimal(policy.discount_max_percent),
            )
            if not sum(discounts):
                raise HTTPException(422, "Mã không giảm được giá khóa học trong combo này.")

        for item, price, reduction in zip(items, prices, discounts):
            item["coupon_discount"] = str(reduction)
            item["payable"] = str(price - reduction)
        refund_days = int(policy.hold_days)
        if refund_days < 0:
            raise HTTPException(503, "Chính sách hoàn tiền chưa được cấu hình hợp lệ")
        discount = sum(discounts)
        total = subtotal - discount
        canonical = {
            "version_id": str(version.id),
            "user_id": str(user_id) if user_id else None,
            "items": items,
            "total": str(total),
            "subtotal": str(subtotal),
            "discount_amount": str(discount),
            "coupon_id": str(coupon.id) if coupon else None,
            "coupon_code": coupon.code if coupon else (reward_instance.code_masked if reward_instance else None),
            "reward_discount_id": str(reward.id) if reward else None,
            "coupon_sponsor": sponsor,
            "platform_fee": str(fee),
            "currency": "VND",
            "refund_days": refund_days,
        }
        digest = hashlib.sha256(
            json.dumps(canonical, sort_keys=True, ensure_ascii=False).encode()
        ).hexdigest()
        return {
            **canonical,
            "quote_hash": digest,
            "title": version.title,
            "full_price": str(version.price),
            "owned_credit": str(version.price - subtotal),
            "policy": "Trừ phần đã sở hữu trước, sau đó áp dụng tối đa một mã ưu đãi của combo hoặc mã thưởng cá nhân. Hoàn tiền theo số thực trả của từng khóa.",
        }

    async def receipt(self, order_id, user_id):
        order = await self.db.scalar(
            select(BundleOrder).where(
                BundleOrder.id == order_id, BundleOrder.user_id == user_id
            )
        )
        if not order:
            raise HTTPException(404, "Không tìm thấy đơn combo")
        lines = (
            await self.db.execute(
                select(
                    BundleOrderLine, PurchaseItems.status, InstructorEarnings.hold_until
                )
                .outerjoin(
                    PurchaseItems, PurchaseItems.id == BundleOrderLine.purchase_item_id
                )
                .outerjoin(
                    InstructorEarnings,
                    InstructorEarnings.id == BundleOrderLine.earning_id,
                )
                .where(BundleOrderLine.order_id == order.id)
                .order_by(BundleOrderLine.title)
            )
        ).all()
        return {
            **record(order),
            "lines": [
                {
                    **record(line),
                    "purchase_status": status,
                    "refund_deadline": deadline.replace(
                        tzinfo=VIETNAM_TIMEZONE
                    ).isoformat()
                    if deadline
                    else None,
                }
                for line, status, deadline in lines
            ],
        }

    async def checkout(self, data, user_id):
        try:
            await lock_purchase_user(self.db, user_id)
            buyer = await self.db.get(User, user_id)
            if not buyer or buyer.is_banned or buyer.deleted_at:
                raise HTTPException(403, "Tài khoản không được phép mua khóa học")
            existing = await self.db.scalar(
                select(BundleOrder).where(
                    BundleOrder.user_id == user_id,
                    BundleOrder.idempotency_key == str(data.idempotency_key),
                )
            )
            if existing:
                if (
                    existing.version_id != data.version_id
                    or existing.quote_hash != data.quote_hash
                ):
                    raise HTTPException(
                        409, "Khóa idempotency đã dùng cho yêu cầu khác"
                    )
                return await self.receipt(existing.id, user_id)
            quote = await self.quote(
                data.version_id, user_id, lock=True, coupon_code=data.coupon_code
            )
            if quote["quote_hash"] != data.quote_hash:
                raise HTTPException(
                    409, "Giá hoặc quyền sở hữu đã thay đổi; hãy xem lại báo giá"
                )
            total = Decimal(quote["total"])
            wallet = await self.db.scalar(
                select(Wallets).where(Wallets.user_id == user_id).with_for_update()
            )
            if wallet and (wallet.is_locked or wallet.currency != "VND"):
                raise HTTPException(409, "Ví đang khóa hoặc không dùng VND")
            fee = Decimal(quote["platform_fee"])
            hold_days = quote["refund_days"]
            sponsor = quote["coupon_sponsor"]
            policy = await billing_policy(self.db, lock=True)
            treasury = await lock_treasury(self.db) if total else None
            discount_amount = Decimal(quote["discount_amount"])
            if sponsor == "platform":
                await check_coupon_budget(self.db, policy, discount_amount)
            reward_id = UUID(quote["reward_discount_id"]) if quote["reward_discount_id"] else None
            active_teachers = set(
                (
                    await self.db.scalars(
                        select(Courses.instructor_id)
                        .join(
                            CourseEnrollments, CourseEnrollments.course_id == Courses.id
                        )
                        .where(
                            CourseEnrollments.user_id == user_id,
                            CourseEnrollments.status == "active",
                        )
                    )
                ).all()
            )
            new_teachers = {
                UUID(item["instructor_id"])
                for item in quote["items"]
                if not item["already_owned"]
            } - active_teachers
            now = legacy_now()
            order = BundleOrder(
                user_id=user_id,
                version_id=data.version_id,
                idempotency_key=str(data.idempotency_key),
                quote_hash=data.quote_hash,
                title=quote["title"],
                total_paid=total,
                coupon_id=UUID(quote["coupon_id"]) if quote["coupon_id"] else None,
                coupon_code=quote["coupon_code"],
                reward_discount_id=reward_id,
                discount_amount=discount_amount,
                currency="VND",
            )
            self.db.add(order)
            await self.db.flush()
            split = PaymentSplit(0, 0)
            if total:
                hold_payment(self.db, treasury, total, note=f"Combo {order.id}: giữ chờ đối soát")
                # Trả bằng Coin: thưởng trước (có trần), thiếu Coin thật thì từ chối (HTTP 400, chưa trừ gì).
                split = await CoinService(self.db).debit_for_purchase_async(
                    user_id, price_to_coin(total, policy.coin_vnd_rate), ref_id=order.id)
            line_paid = {
                item["course_id"]: settle(
                    Decimal(item["allocated_price"]), fee, sponsor, Decimal(item["coupon_discount"]),
                    instructor_max=Decimal(policy.discount_max_percent),
                ).paid
                for item in quote["items"] if not item["already_owned"]
            }
            weights = list(line_paid.values())
            bonus_parts = dict(zip(line_paid, allocate(split.bonus_use, weights)))
            paid_parts = dict(zip(line_paid, allocate(split.paid_use, weights)))
            for item in quote["items"]:
                course = await self.db.get(Courses, UUID(item["course_id"]))
                line = BundleOrderLine(
                    order_id=order.id,
                    course_id=course.id,
                    title=course.title,
                    instructor_id=course.instructor_id,
                    list_price=Decimal(item["list_price"]),
                    paid=Decimal(item["payable"]),
                    already_owned=item["already_owned"],
                )
                if item["already_owned"]:
                    self.db.add(line)
                    continue
                require_real_course(course)
                if course.instructor_id == user_id:
                    raise HTTPException(
                        409,
                        "Giảng viên không mua khóa do chính mình cung cấp trong combo",
                    )
                base = Decimal(item["allocated_price"])
                reduction = Decimal(item["coupon_discount"])
                amounts = settle(base, fee, sponsor, reduction, instructor_max=Decimal(policy.discount_max_percent))
                paid = amounts.paid
                if paid > 0:
                    tx = Transactions(
                        id=uuid4(),
                        user_id=user_id,
                        course_id=course.id,
                        ref_id=order.id,
                        amount=paid,
                        type="purchase",
                        currency="VND",
                        direction="out",
                        method="wallet",
                        gateway="internal_wallet",
                        status="completed",
                        description=f"Combo: {order.title} · {course.title}",
                        created_at=now,
                        confirmed_at=now,
                    )
                    self.db.add(tx)
                    await self.db.flush()
                    pi = PurchaseItems(
                        id=uuid4(),
                        transaction_id=tx.id,
                        user_id=user_id,
                        course_id=course.id,
                        original_price=Decimal(item["list_price"]),
                        discounted_price=paid,
                        discount_amount=Decimal(item["list_price"]) - paid,
                        discount_id=reward_id if reduction else None,
                        settlement_base_price=base,
                        settlement_platform_fee=fee,
                        coupon_sponsor=sponsor if reduction else None,
                        coin_bonus_used=bonus_parts.get(item["course_id"], 0),
                        coin_paid_used=paid_parts.get(item["course_id"], 0),
                        status="completed",
                        course_snapshot={
                            "title": course.title,
                            "bundle_order_id": str(order.id),
                            "bundle_version_id": str(data.version_id),
                            "list_price": item["list_price"],
                            "allocated_price": item["payable"],
                            "refund_days": quote["refund_days"],
                            "bundle_coupon_code": quote["coupon_code"],
                            "bundle_coupon_discount": item["coupon_discount"],
                        },
                        created_at=now,
                    )
                    self.db.add(pi)
                    await self.db.flush()
                    line.purchase_item_id = pi.id
                    record_coupon_cost(self.db, pi, reduction, bundle_coupon_id=order.coupon_id)
                    if reward_id and reduction:
                        self.db.add(DiscountHistory(
                            user_id=user_id, purchase_item_id=pi.id, discount_id=reward_id,
                            discounted_amount=reduction, created_at=now,
                        ))
                    earning = InstructorEarnings(
                        id=uuid4(),
                        transaction_id=tx.id,
                        instructor_id=course.instructor_id,
                        purchase_item_id=pi.id,
                        amount_platform=amounts.platform,
                        amount_instructor=amounts.instructor,
                        status="holding",
                        hold_until=now + timedelta(days=hold_days),
                        purchase_snapshot={
                            "course_title": course.title,
                            "purchase_item_id": str(pi.id),
                            "bundle_order_id": str(order.id),
                            "price_paid": str(paid),
                        },
                        created_at=now,
                    )
                    self.db.add(earning)
                    await self.db.flush()
                    line.earning_id = earning.id
                # Preserve inactive enrollment history if one exists, without duplicates.
                enrollment = await self.db.scalar(
                    select(CourseEnrollments)
                    .where(
                        CourseEnrollments.user_id == user_id,
                        CourseEnrollments.course_id == course.id,
                    )
                    .order_by(CourseEnrollments.enrolled_at.desc())
                    .limit(1)
                )
                if enrollment:
                    enrollment.status = "active"
                else:
                    self.db.add(
                        CourseEnrollments(
                            user_id=user_id,
                            course_id=course.id,
                            progress=0,
                            status="active",
                            enrolled_at=now,
                        )
                    )
                self.db.add(line)
                await self.db.execute(
                    update(Courses)
                    .where(Courses.id == course.id)
                    .values(total_enrolls=func.coalesce(Courses.total_enrolls, 0) + 1)
                )
            if reward_id:
                await consume_discount(self.db, await self.db.get(Discounts, reward_id), user_id)
            if new_teachers:
                await self.db.execute(
                    update(User)
                    .where(User.id.in_(new_teachers))
                    .values(student_count=func.coalesce(User.student_count, 0) + 1)
                )
            await self.db.commit()
            return await self.receipt(order.id, user_id)
        except Exception:
            await self.db.rollback()
            raise
