"""Vietnam calendar-month quota, shared by standalone and bundle refunds."""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select

from app.db.models.database import PlatformSettings, RefundRequests

VIETNAM = ZoneInfo("Asia/Ho_Chi_Minh")
PENDING = ("requested", "instructor_rejected")
APPROVED = ("instructor_approved", "admin_approved", "refunded")


def month_window(timestamp: datetime) -> tuple[datetime, datetime]:
    local = timestamp.astimezone(VIETNAM) if timestamp.tzinfo else timestamp.replace(tzinfo=VIETNAM)
    start = local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        return start, start.replace(year=start.year + 1, month=1)
    return start, start.replace(month=start.month + 1)


async def refund_quota(db, user_id, *, timestamp=None):
    start, reset = month_window(timestamp or datetime.now(VIETNAM))
    limit = await db.scalar(
        select(PlatformSettings.refund_max_courses_per_month)
        .order_by(PlatformSettings.updated_at.desc(), PlatformSettings.id).limit(1)
    )
    limit = 3 if limit is None else limit
    resolved = func.coalesce(RefundRequests.resolved_at, RefundRequests.created_at)
    used = await db.scalar(select(func.count(func.distinct(RefundRequests.purchase_item_id))).where(
        RefundRequests.user_id == user_id,
        or_(
            RefundRequests.status.in_(PENDING),
            and_(
                RefundRequests.status.in_(APPROVED),
                resolved >= start.replace(tzinfo=None),
                resolved < reset.replace(tzinfo=None),
            ),
        ),
    ))
    return {"limit": limit, "used": used, "remaining": max(0, limit - used), "resets_at": reset}


async def require_refund_quota(db, user_id, *, timestamp):
    # The caller holds the account's transaction-scoped purchase lock through commit.
    quota = await refund_quota(db, user_id, timestamp=timestamp)
    if quota["remaining"] < 1:
        raise HTTPException(409, "Bạn đã dùng hết hạn mức hoàn khóa học trong tháng.")
