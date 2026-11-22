"""Learning-player menu: archive, one-recipient gifts, and email opt-outs.

Like stays on CourseFavoriteService. Gift enrollment of a priced course happens
only from checkout fulfillment (complete_paid_gift). A gift never enrolls the
buyer, and archive never changes enrollment.status or progress.
"""

from __future__ import annotations

import secrets
import uuid
from decimal import Decimal

from fastapi import HTTPException
from loguru import logger
from sqlalchemy import func, or_, select
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import (
    CourseEnrollments,
    CourseFavourites,
    Courses,
    PurchaseItems,
    RefundRequests,
    User,
)
from app.db.models.learning_menu import CourseAnnouncementPreference, CourseGift
from app.libs.formats.datetime import now as get_now


def _normalize_email(value: str) -> str:
    email = (value or "").strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=400, detail="Email người nhận không hợp lệ")
    local, _, domain = email.partition("@")
    if not local or "." not in domain:
        raise HTTPException(status_code=400, detail="Email người nhận không hợp lệ")
    return email


async def announcement_emails_enabled(
    db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID
) -> bool:
    row = await db.scalar(
        select(CourseAnnouncementPreference).where(
            CourseAnnouncementPreference.user_id == user_id,
            CourseAnnouncementPreference.course_id == course_id,
        )
    )
    if row is None:
        return True
    return bool(row.enabled)


async def promotional_emails_enabled(db: AsyncSession, user_id: uuid.UUID) -> bool:
    value = await db.scalar(
        select(User.promotional_email_opt_in).where(User.id == user_id)
    )
    if value is None:
        return True
    return bool(value)


async def get_player_menu_state(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> dict:
    course = await db.get(Courses, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại")
    favourite = await db.scalar(
        select(CourseFavourites).where(
            CourseFavourites.user_id == user.id,
            CourseFavourites.course_id == course_id,
        )
    )
    enrollment = await db.scalar(
        select(CourseEnrollments).where(
            CourseEnrollments.user_id == user.id,
            CourseEnrollments.course_id == course_id,
        )
    )
    price = Decimal(str(course.base_price or 0))
    return {
        "is_favourite": favourite is not None,
        "is_archived": bool(enrollment is not None and enrollment.archived_at is not None),
        "announcement_emails": await announcement_emails_enabled(db, user.id, course_id),
        "promotional_emails": await promotional_emails_enabled(db, user.id),
        "requires_payment": price > 0,
        "price": str(price),
        "gifted_by_name": await gifted_by_name(db, user.id, course_id),
    }


async def set_course_archived(
    db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID, archived: bool
) -> dict:
    enrollment = await db.scalar(
        select(CourseEnrollments).where(
            CourseEnrollments.user_id == user_id,
            CourseEnrollments.course_id == course_id,
        )
    )
    if enrollment is None:
        raise HTTPException(status_code=409, detail="Bạn chưa đăng ký khóa học này")
    enrollment.archived_at = get_now() if archived else None
    await db.commit()
    return {
        "is_archived": enrollment.archived_at is not None,
        "status": enrollment.status,
        "progress": enrollment.progress,
    }


async def set_announcement_emails(
    db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID, enabled: bool
) -> dict:
    course = await db.get(Courses, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại")
    row = await db.scalar(
        select(CourseAnnouncementPreference).where(
            CourseAnnouncementPreference.user_id == user_id,
            CourseAnnouncementPreference.course_id == course_id,
        )
    )
    if row is None:
        db.add(
            CourseAnnouncementPreference(
                user_id=user_id, course_id=course_id, enabled=enabled
            )
        )
    else:
        row.enabled = enabled
    await db.commit()
    return {"announcement_emails": enabled}


async def set_promotional_emails(
    db: AsyncSession, user_id: uuid.UUID, enabled: bool
) -> dict:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    user.promotional_email_opt_in = enabled
    await db.commit()
    return {"promotional_emails": enabled}


async def enroll_learner_if_absent(
    db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID, now
) -> bool:
    """Create one active enrollment. Leave an existing row, including its progress, alone."""
    existed = await db.scalar(
        select(CourseEnrollments).where(
            CourseEnrollments.user_id == user_id,
            CourseEnrollments.course_id == course_id,
        )
    )
    if existed is not None:
        return False

    course = await db.scalar(select(Courses).where(Courses.id == course_id))
    prior_with_instructor = 0
    if course is not None:
        prior_with_instructor = (
            await db.scalar(
                select(func.count())
                .select_from(CourseEnrollments)
                .join(Courses, Courses.id == CourseEnrollments.course_id)
                .where(
                    CourseEnrollments.user_id == user_id,
                    Courses.instructor_id == course.instructor_id,
                )
            )
            or 0
        )

    db.add(
        CourseEnrollments(
            id=uuid.uuid4(),
            user_id=user_id,
            course_id=course_id,
            enrolled_at=now,
            progress=Decimal("0"),
            status="active",
        )
    )
    if course is not None:
        course.total_enrolls = (course.total_enrolls or 0) + 1
        if prior_with_instructor == 0:
            instructor = await db.scalar(select(User).where(User.id == course.instructor_id))
            if instructor is not None:
                instructor.student_count = (instructor.student_count or 0) + 1
    await db.flush()
    return True


def gifted_by_name_subquery(user_id: uuid.UUID):
    """Latest claimed giver for the outer course row."""
    giver = aliased(User)
    return (
        select(giver.fullname)
        .select_from(CourseGift)
        .join(giver, giver.id == CourseGift.sender_id)
        .where(
            CourseGift.course_id == Courses.id,
            CourseGift.recipient_user_id == user_id,
            CourseGift.status == "claimed",
        )
        .order_by(
            CourseGift.claimed_at.desc().nulls_last(),
            CourseGift.created_at.desc(),
        )
        .limit(1)
        .correlate(Courses)
        .scalar_subquery()
    )


async def gifted_by_name(
    db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID
) -> str | None:
    giver = aliased(User)
    return await db.scalar(
        select(giver.fullname)
        .join(CourseGift, CourseGift.sender_id == giver.id)
        .where(
            CourseGift.course_id == course_id,
            CourseGift.recipient_user_id == user_id,
            CourseGift.status == "claimed",
        )
        .order_by(
            CourseGift.claimed_at.desc().nulls_last(),
            CourseGift.created_at.desc(),
        )
        .limit(1)
    )


async def search_gift_recipients(
    db: AsyncSession, sender: User, course_id: uuid.UUID, query: str
) -> dict:
    course = await db.get(Courses, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại")
    keyword = (query or "").strip().lower()
    if len(keyword) < 2:
        return {"recipients": []}
    pattern = f"%{keyword}%"
    owns = (
        select(CourseEnrollments.id)
        .where(
            CourseEnrollments.user_id == User.id,
            CourseEnrollments.course_id == course_id,
        )
        .exists()
    )
    rows = (
        await db.execute(
            select(
                User.id,
                User.fullname,
                User.email,
                User.avatar,
                owns.label("already_owns"),
            )
            .where(User.id != sender.id)
            .where(User.deleted_at.is_(None))
            .where(or_(User.is_banned.is_(False), User.is_banned.is_(None)))
            .where(
                or_(
                    func.lower(User.fullname).like(pattern),
                    func.lower(User.email).like(pattern),
                )
            )
            .order_by(User.fullname.asc())
            .limit(8)
        )
    ).all()
    return {
        "recipients": [
            {
                "user_id": str(row.id),
                "fullname": row.fullname,
                "email": row.email,
                "avatar": row.avatar,
                "already_owns": bool(row.already_owns),
            }
            for row in rows
        ]
    }


async def transfer_course_access(
    db: AsyncSession, sender: User, course_id: uuid.UUID, recipient_user_id: uuid.UUID
) -> dict:
    """Move access to someone who has never owned the course.

    The sender's enrollment row, progress, and lesson history stay. Only
    status leaves "active", which is what learning access checks require.
    The recipient gets a new enrollment at 0% and no lesson-progress rows.
    """
    if recipient_user_id == sender.id:
        raise HTTPException(status_code=400, detail="Không thể tặng khóa học cho chính bạn")
    course = await db.get(Courses, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại")
    recipient = await db.get(User, recipient_user_id)
    if recipient is None or recipient.deleted_at is not None or recipient.is_banned:
        raise HTTPException(status_code=404, detail="Không tìm thấy người nhận")

    sender_enrollment = await db.scalar(
        select(CourseEnrollments)
        .where(
            CourseEnrollments.user_id == sender.id,
            CourseEnrollments.course_id == course_id,
            CourseEnrollments.status == "active",
        )
        .with_for_update()
    )
    if sender_enrollment is None:
        raise HTTPException(status_code=409, detail="Bạn không còn quyền truy cập khóa học này")

    pending_or_approved_refund = await db.scalar(
        select(RefundRequests.id)
        .join(PurchaseItems, PurchaseItems.id == RefundRequests.purchase_item_id)
        .where(
            RefundRequests.user_id == sender.id,
            PurchaseItems.course_id == course_id,
            RefundRequests.status.in_(
                ("requested", "instructor_approved", "admin_approved", "refunded")
            ),
        )
        .limit(1)
    )
    if pending_or_approved_refund is not None:
        raise HTTPException(
            status_code=409,
            detail="Khóa học đang có yêu cầu hoàn tiền nên không thể chuyển tặng",
        )

    already = await db.scalar(
        select(CourseEnrollments.id).where(
            CourseEnrollments.user_id == recipient.id,
            CourseEnrollments.course_id == course_id,
        )
    )
    if already is not None:
        raise HTTPException(status_code=409, detail="Người này đã sở hữu khóa học")

    kept_progress = sender_enrollment.progress
    sender_enrollment.status = "transferred"
    created = await enroll_learner_if_absent(db, recipient.id, course_id, get_now())
    if not created:
        sender_enrollment.status = "active"
        raise HTTPException(status_code=409, detail="Người này đã sở hữu khóa học")
    given_at = get_now()
    db.add(
        CourseGift(
            id=uuid.uuid4(),
            sender_id=sender.id,
            course_id=course_id,
            recipient_email=(recipient.email or "").strip().lower(),
            recipient_user_id=recipient.id,
            status="claimed",
            claim_token=secrets.token_urlsafe(24),
            fulfilled_at=given_at,
            claimed_at=given_at,
        )
    )
    await db.commit()
    return {
        "transferred": True,
        "recipient_user_id": str(recipient.id),
        "sender_status": sender_enrollment.status,
        "sender_progress": str(kept_progress if kept_progress is not None else 0),
    }


async def create_course_gift(
    db: AsyncSession, sender: User, course_id: uuid.UUID, recipient_email: str
) -> dict:
    email = _normalize_email(recipient_email)
    if email == (sender.email or "").strip().lower():
        raise HTTPException(status_code=400, detail="Không thể tặng khóa học cho chính bạn")
    course = await db.get(Courses, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại")
    price = Decimal(str(course.base_price or 0))
    gift = CourseGift(
        id=uuid.uuid4(),
        sender_id=sender.id,
        course_id=course.id,
        recipient_email=email,
        status="unpaid" if price > 0 else "claimable",
        claim_token=secrets.token_urlsafe(24),
    )
    db.add(gift)
    await db.commit()
    if gift.status == "claimable":
        await notify_gift_recipient(db, gift)
    return {
        "gift_id": str(gift.id),
        "status": gift.status,
        "requires_payment": price > 0,
        "price": str(price),
    }


async def list_incoming_gifts(db: AsyncSession, user: User) -> dict:
    email = (user.email or "").strip().lower()
    rows = (
        await db.execute(
            select(CourseGift, Courses.title, Courses.slug)
            .join(Courses, Courses.id == CourseGift.course_id)
            .where(CourseGift.recipient_email == email)
            .where(CourseGift.status.in_(("claimable", "fulfilled")))
            .order_by(CourseGift.created_at.desc())
        )
    ).all()
    return {
        "gifts": [
            {
                "gift_id": str(gift.id),
                "course_id": str(gift.course_id),
                "course_title": title,
                "course_slug": slug,
                "status": gift.status,
            }
            for gift, title, slug in rows
        ]
    }


async def load_gift_for_checkout(
    db: AsyncSession,
    gift_id: uuid.UUID,
    payer_id: uuid.UUID,
    course_ids: list[uuid.UUID],
) -> CourseGift:
    gift = await db.scalar(
        select(CourseGift).where(CourseGift.id == gift_id).with_for_update()
    )
    if gift is None or gift.sender_id != payer_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy quà tặng")
    if gift.status != "unpaid":
        raise HTTPException(status_code=409, detail="Quà tặng không còn chờ thanh toán")
    if len(course_ids) != 1 or course_ids[0] != gift.course_id:
        raise HTTPException(
            status_code=400,
            detail="Thanh toán quà tặng chỉ gồm đúng một khóa học được tặng",
        )
    course = await db.get(Courses, gift.course_id)
    price = Decimal(str(course.base_price or 0)) if course is not None else Decimal("0")
    if price <= 0:
        raise HTTPException(
            status_code=400, detail="Khóa học miễn phí không đi qua thanh toán"
        )
    return gift


async def complete_paid_gift(db: AsyncSession, gift: CourseGift, now) -> dict:
    """Checkout success path. Enrolls the recipient, never the buyer."""
    if gift.status == "claimed":
        return {"enrolled": False}
    if gift.status not in {"unpaid", "fulfilled"}:
        raise HTTPException(status_code=409, detail="Quà tặng không thể thanh toán")

    gift.fulfilled_at = gift.fulfilled_at or now
    recipient = await db.scalar(
        select(User).where(func.lower(User.email) == gift.recipient_email)
    )
    if recipient is None:
        gift.status = "fulfilled"
        await db.flush()
        return {"enrolled": False}

    gift.recipient_user_id = recipient.id
    created = await enroll_learner_if_absent(db, recipient.id, gift.course_id, now)
    gift.status = "claimed"
    gift.claimed_at = now
    await db.flush()
    return {"enrolled": created}


async def claim_course_gift(
    db: AsyncSession, gift_id: uuid.UUID, recipient: User
) -> dict:
    gift = await db.scalar(
        select(CourseGift).where(CourseGift.id == gift_id).with_for_update()
    )
    if gift is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy quà tặng")
    if gift.recipient_email != (recipient.email or "").strip().lower():
        raise HTTPException(status_code=403, detail="Email không khớp người nhận")
    if gift.status == "unpaid":
        raise HTTPException(status_code=409, detail="Quà tặng chưa được thanh toán")
    if gift.status == "claimed":
        return {"enrolled": False, "already_claimed": True}
    if gift.status not in {"claimable", "fulfilled"}:
        raise HTTPException(status_code=409, detail="Quà tặng không thể nhận")

    created = await enroll_learner_if_absent(
        db, recipient.id, gift.course_id, get_now()
    )
    gift.status = "claimed"
    gift.recipient_user_id = recipient.id
    gift.claimed_at = get_now()
    await db.commit()
    await notify_gift_recipient(db, gift)
    return {"enrolled": created, "already_claimed": False}


async def notify_gift_recipient(db: AsyncSession, gift: CourseGift) -> None:
    """Transactional claim notice. Promotional opt-out does not block it."""
    try:
        from app.services.shares.mailer import MailerService

        course = await db.get(Courses, gift.course_id)
        if course is None:
            return
        recipient = await db.scalar(
            select(User).where(func.lower(User.email) == gift.recipient_email)
        )
        mailer = MailerService()
        await mailer.send_gift_claim_notice(
            email=gift.recipient_email,
            fullname=recipient.fullname if recipient is not None else "bạn",
            course_title=course.title,
        )
    except Exception as exc:
        logger.warning(f"[GIFT] Không gửi được thư nhận quà: {exc}")
