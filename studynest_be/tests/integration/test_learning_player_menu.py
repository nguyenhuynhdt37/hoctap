"""Learning-player menu: like, archive, gift, and email opt-outs.

Calls the shipped service functions and checkout_wallet_async. Requires
TEST_DATABASE_ASYNC_URL to point at an isolated database, never the
developer studynest database.
"""

import os
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import (
    CourseEnrollments,
    CourseFavourites,
    CourseSections,
    Courses,
    LessonProgress,
    Lessons,
    LessonTypeEnum,
    PlatformSettings,
    User,
    Wallets,
)
from app.services.shares.discounts import DiscountService
from app.services.shares.mailer import MailerService
from app.services.shares.transaction import TransactionsService
from app.services.shares.wallets import WalletsService
from app.services.user.course_enroll import CourseEnrolls
from app.services.user.favorites import CourseFavoriteService
from app.services.user.learning import LearningService
from app.services.user.learning_menu import (
    claim_course_gift,
    create_course_gift,
    get_player_menu_state,
    search_gift_recipients,
    set_announcement_emails,
    set_course_archived,
    set_promotional_emails,
    transfer_course_access,
)

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("TEST_DATABASE_ASYNC_URL"),
        reason="Explicit scratch DB required",
    ),
]


class _Embedding:
    async def update_user_embedding_adaptive(self, *args, **kwargs):
        return None


async def _quiet_gift_notice(self, **kwargs):
    return {"sent": True, "skipped": None}


async def make_user(db: AsyncSession, name: str) -> User:
    user = User(
        fullname=name,
        email=f"{uuid4().hex}@menu-learner.com",
        password="!disabled",
        promotional_email_opt_in=True,
    )
    db.add(user)
    await db.flush()
    return user


async def make_course(db: AsyncSession, instructor: User, *, price: str, slug: str) -> Courses:
    course = Courses(
        title="Khóa học menu",
        slug=slug,
        instructor_id=instructor.id,
        is_published=True,
        approval_status="approved",
        base_price=Decimal(price),
        currency="VND",
        level="all",
        delivery_type="recorded_video",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    db.add(course)
    await db.flush()
    return course


async def enroll(db: AsyncSession, user: User, course: Courses, progress: str) -> CourseEnrollments:
    section = CourseSections(title="Phần 1", position=1, course_id=course.id)
    db.add(section)
    await db.flush()
    lesson = Lessons(
        title="Bài 1",
        lesson_type=LessonTypeEnum.ARTICLE,
        position=1,
        section_id=section.id,
        course_id=course.id,
    )
    db.add(lesson)
    await db.flush()
    row = CourseEnrollments(
        user_id=user.id,
        course_id=course.id,
        status="active",
        progress=Decimal(progress),
    )
    db.add(row)
    db.add(
        LessonProgress(
            user_id=user.id,
            course_id=course.id,
            lesson_id=lesson.id,
            is_completed=True,
        )
    )
    await db.flush()
    return row


async def enrollment_count(db: AsyncSession, user_id, course_id) -> int:
    return (
        await db.scalar(
            select(func.count())
            .select_from(CourseEnrollments)
            .where(
                CourseEnrollments.user_id == user_id,
                CourseEnrollments.course_id == course_id,
            )
        )
        or 0
    )


async def favourite_member(db: AsyncSession, user_id, course_id) -> bool:
    row = await db.scalar(
        select(CourseFavourites).where(
            CourseFavourites.user_id == user_id,
            CourseFavourites.course_id == course_id,
        )
    )
    return row is not None


async def ensure_wallet(db: AsyncSession, user: User, balance: str) -> None:
    db.add(Wallets(user_id=user.id, balance=Decimal(balance), currency="VND"))
    await db.flush()


async def ensure_platform_settings(db: AsyncSession) -> None:
    existing = await db.scalar(select(PlatformSettings).limit(1))
    if existing is not None:
        return
    db.add(
        PlatformSettings(
            platform_fee=Decimal("0.3000"),
            hold_days=7,
            payout_min_balance=Decimal("100000"),
            payout_schedule="mon-wed-fri",
            currency="VND",
            allow_wallet_topup=True,
            allow_auto_withdraw=False,
            max_discounts_per_course=2,
            discount_max_percent=90,
            discount_min_price=Decimal("1000"),
            course_min_price=Decimal("10000"),
            course_max_price=Decimal("20000000"),
            course_default_language="vi",
            embedding_dim=3072,
            search_top_k=8,
            rag_max_chunks=50,
            llm_model="auto",
            max_login_attempts=5,
            lock_time_minutes=15,
            updated_at=datetime(2026, 1, 1),
        )
    )
    await db.flush()


async def test_like_flips_and_archive_hides_without_losing_access(db_session: AsyncSession):
    instructor = await make_user(db_session, "Giảng viên")
    learner = await make_user(db_session, "Học viên")
    stranger = await make_user(db_session, "Khách")
    course = await make_course(
        db_session,
        instructor,
        price="100000",
        slug="menu-like-" + uuid4().hex,
    )
    enrollment = await enroll(db_session, learner, course, "37.50")
    lesson_done = await db_session.scalar(
        select(LessonProgress).where(LessonProgress.user_id == learner.id)
    )
    favourites = CourseFavoriteService(db_session, _Embedding())
    tasks = BackgroundTasks()

    liked = await favourites.toggle_favorite_course_async(course.id, tasks, learner)
    assert liked["is_favourite"] is True
    assert await favourite_member(db_session, learner.id, course.id) is True
    await db_session.refresh(enrollment)
    assert enrollment.archived_at is None

    unliked = await favourites.toggle_favorite_course_async(course.id, tasks, learner)
    assert unliked["is_favourite"] is False
    assert await favourite_member(db_session, learner.id, course.id) is False

    await favourites.toggle_favorite_course_async(course.id, tasks, learner)
    checked = await favourites.check_is_favorite_course_async(course.id, learner)
    assert checked["is_favourite"] is True

    archived = await set_course_archived(db_session, learner.id, course.id, True)
    assert archived["is_archived"] is True
    assert archived["status"] == "active"
    assert Decimal(str(archived["progress"])) == Decimal("37.50")

    purchases = CourseEnrolls(db_session, _Embedding())
    listed = await purchases.get_user_courses_async(learner.id)
    assert course.id not in {row["id"] for row in listed["courses"]}
    assert listed["total"] == 0

    learning = LearningService(db_session, piston=None)
    access = await learning.get_course_enrolled_async(course.slug, learner)
    assert access["id"] == course.id

    await db_session.refresh(enrollment)
    await db_session.refresh(lesson_done)
    assert enrollment.status == "active"
    assert Decimal(str(enrollment.progress)) == Decimal("37.50")
    assert lesson_done.is_completed is True
    assert await favourite_member(db_session, learner.id, course.id) is True

    restored = await set_course_archived(db_session, learner.id, course.id, False)
    assert restored["is_archived"] is False
    listed_again = await purchases.get_user_courses_async(learner.id)
    assert course.id in {row["id"] for row in listed_again["courses"]}
    assert listed_again["total"] == 1
    await db_session.refresh(enrollment)
    assert Decimal(str(enrollment.progress)) == Decimal("37.50")
    assert await favourite_member(db_session, learner.id, course.id) is True

    with pytest.raises(HTTPException) as rejected:
        await set_course_archived(db_session, stranger.id, course.id, True)
    assert rejected.value.status_code == 409
    assert await enrollment_count(db_session, stranger.id, course.id) == 0
    await db_session.refresh(enrollment)
    assert enrollment.archived_at is None


async def test_priced_gift_enrolls_recipient_only_after_checkout(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(MailerService, "send_gift_claim_notice", _quiet_gift_notice)
    instructor = await make_user(db_session, "Giảng viên")
    sender = await make_user(db_session, "Người tặng")
    recipient = await make_user(db_session, "Người nhận")
    course = await make_course(
        db_session,
        instructor,
        price="150000",
        slug="menu-gift-" + uuid4().hex,
    )
    sender_enrollment = await enroll(db_session, sender, course, "64.00")
    lesson_done = await db_session.scalar(
        select(LessonProgress).where(LessonProgress.user_id == sender.id)
    )
    await ensure_wallet(db_session, sender, "500000")
    await ensure_platform_settings(db_session)

    created = await create_course_gift(db_session, sender, course.id, recipient.email)
    gift_id = UUID(created["gift_id"])
    assert created["requires_payment"] is True
    assert await enrollment_count(db_session, recipient.id, course.id) == 0
    assert await enrollment_count(db_session, sender.id, course.id) == 1

    with pytest.raises(HTTPException) as unpaid:
        await claim_course_gift(db_session, gift_id, recipient)
    assert unpaid.value.status_code == 409
    assert await enrollment_count(db_session, recipient.id, course.id) == 0

    checkout = TransactionsService(db_session)
    result = await checkout.checkout_wallet_async(
        user=sender,
        course_ids=[course.id],
        discount_code=None,
        wallets_service=WalletsService(db_session, _Embedding()),
        discount_service=DiscountService(db_session),
        gift_id=gift_id,
    )
    assert result["is_free"] is False
    assert await enrollment_count(db_session, recipient.id, course.id) == 1
    assert await enrollment_count(db_session, sender.id, course.id) == 1

    recipient_row = await db_session.scalar(
        select(CourseEnrollments).where(
            CourseEnrollments.user_id == recipient.id,
            CourseEnrollments.course_id == course.id,
        )
    )
    assert recipient_row is not None
    assert recipient_row.status == "active"

    await db_session.refresh(sender_enrollment)
    await db_session.refresh(lesson_done)
    assert Decimal(str(sender_enrollment.progress)) == Decimal("64.00")
    assert sender_enrollment.status == "active"
    assert lesson_done.is_completed is True

    second = await claim_course_gift(db_session, gift_id, recipient)
    assert second["enrolled"] is False
    assert await enrollment_count(db_session, recipient.id, course.id) == 1
    assert await enrollment_count(db_session, sender.id, course.id) == 1


async def test_free_gift_claim_enrolls_recipient_without_payment(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(MailerService, "send_gift_claim_notice", _quiet_gift_notice)
    instructor = await make_user(db_session, "Giảng viên")
    sender = await make_user(db_session, "Người tặng")
    recipient = await make_user(db_session, "Người nhận")
    course = await make_course(
        db_session,
        instructor,
        price="0",
        slug="menu-free-" + uuid4().hex,
    )
    sender_enrollment = await enroll(db_session, sender, course, "12.00")
    created = await create_course_gift(db_session, sender, course.id, recipient.email)
    assert created["requires_payment"] is False
    assert await enrollment_count(db_session, recipient.id, course.id) == 0

    claimed = await claim_course_gift(db_session, UUID(created["gift_id"]), recipient)
    assert claimed["enrolled"] is True
    assert await enrollment_count(db_session, recipient.id, course.id) == 1
    assert await enrollment_count(db_session, sender.id, course.id) == 1
    await db_session.refresh(sender_enrollment)
    assert Decimal(str(sender_enrollment.progress)) == Decimal("12.00")

    again = await claim_course_gift(db_session, UUID(created["gift_id"]), recipient)
    assert again["enrolled"] is False
    assert await enrollment_count(db_session, recipient.id, course.id) == 1


async def test_transfer_requires_new_owner_and_keeps_sender_history(
    db_session: AsyncSession,
):
    instructor = await make_user(db_session, "Giảng viên")
    sender = await make_user(db_session, "Người chuyển Menu")
    recipient = await make_user(db_session, "Người nhận Menu")
    owner = await make_user(db_session, "Người đã có Menu")
    course = await make_course(
        db_session,
        instructor,
        price="90000",
        slug="menu-transfer-" + uuid4().hex,
    )
    sender_enrollment = await enroll(db_session, sender, course, "64.00")
    await enroll(db_session, owner, course, "10.00")
    sender_lesson = await db_session.scalar(
        select(LessonProgress).where(LessonProgress.user_id == sender.id)
    )
    learning = LearningService(db_session, piston=None)
    purchases = CourseEnrolls(db_session, _Embedding())

    found = await search_gift_recipients(db_session, sender, course.id, "Menu")
    by_id = {row["user_id"]: row for row in found["recipients"]}
    assert str(sender.id) not in by_id
    assert by_id[str(recipient.id)]["already_owns"] is False
    assert by_id[str(owner.id)]["already_owns"] is True
    assert (await search_gift_recipients(db_session, sender, course.id, "M"))["recipients"] == []

    with pytest.raises(HTTPException) as owned:
        await transfer_course_access(db_session, sender, course.id, owner.id)
    assert owned.value.status_code == 409
    await db_session.refresh(sender_enrollment)
    assert sender_enrollment.status == "active"
    assert Decimal(str(sender_enrollment.progress)) == Decimal("64.00")
    assert await enrollment_count(db_session, recipient.id, course.id) == 0

    moved = await transfer_course_access(db_session, sender, course.id, recipient.id)
    assert moved["transferred"] is True
    await db_session.refresh(sender_enrollment)
    await db_session.refresh(sender_lesson)
    assert sender_enrollment.status == "transferred"
    assert Decimal(str(sender_enrollment.progress)) == Decimal("64.00")
    assert sender_lesson.is_completed is True

    with pytest.raises(HTTPException) as sender_blocked:
        await learning.get_course_enrolled_async(course.slug, sender)
    assert sender_blocked.value.status_code == 403
    sender_list = await purchases.get_user_courses_async(sender.id)
    assert course.id not in {row["id"] for row in sender_list["courses"]}

    recipient_row = await db_session.scalar(
        select(CourseEnrollments).where(
            CourseEnrollments.user_id == recipient.id,
            CourseEnrollments.course_id == course.id,
        )
    )
    assert recipient_row is not None
    assert recipient_row.status == "active"
    assert Decimal(str(recipient_row.progress)) == Decimal("0")
    assert recipient_row.last_accessed is None
    recipient_lessons = await db_session.scalar(
        select(func.count())
        .select_from(LessonProgress)
        .where(
            LessonProgress.user_id == recipient.id,
            LessonProgress.course_id == course.id,
        )
    )
    assert recipient_lessons == 0
    access = await learning.get_course_enrolled_async(course.slug, recipient)
    assert access["id"] == course.id
    recipient_list = await purchases.get_user_courses_async(recipient.id)
    assert course.id in {row["id"] for row in recipient_list["courses"]}
    listed = next(row for row in recipient_list["courses"] if row["id"] == course.id)
    assert listed["gifted_by_name"] == sender.fullname
    menu = await get_player_menu_state(db_session, recipient, course.id)
    assert menu["gifted_by_name"] == sender.fullname
    sender_menu = await get_player_menu_state(db_session, sender, course.id)
    assert sender_menu["gifted_by_name"] is None

    with pytest.raises(HTTPException) as again:
        await transfer_course_access(db_session, sender, course.id, recipient.id)
    assert again.value.status_code == 409
    assert await enrollment_count(db_session, recipient.id, course.id) == 1


async def test_email_opt_out_blocks_only_its_category(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    learner = await make_user(db_session, "Học viên")
    instructor = await make_user(db_session, "Giảng viên")
    course = await make_course(
        db_session,
        instructor,
        price="0",
        slug="menu-mail-" + uuid4().hex,
    )
    other = await make_course(
        db_session,
        instructor,
        price="0",
        slug="menu-mail-other-" + uuid4().hex,
    )
    sent: list[str] = []

    async def capture(message, template_name=None):
        sent.append(message.subject)

    mailer = MailerService()
    monkeypatch.setattr(mailer.fastmail, "send_message", capture)

    opened = await mailer.send_course_announcement_email(
        db_session,
        user_id=learner.id,
        course_id=course.id,
        email=learner.email,
        fullname=learner.fullname,
        course_title=course.title,
        body="Lịch học mới",
    )
    assert opened["sent"] is True
    assert len(sent) == 1

    await set_announcement_emails(db_session, learner.id, course.id, False)
    blocked = await mailer.send_course_announcement_email(
        db_session,
        user_id=learner.id,
        course_id=course.id,
        email=learner.email,
        fullname=learner.fullname,
        course_title=course.title,
        body="Lịch học mới",
    )
    assert blocked["sent"] is False
    assert blocked["skipped"] == "announcement"
    assert len(sent) == 1

    other_course = await mailer.send_course_announcement_email(
        db_session,
        user_id=learner.id,
        course_id=other.id,
        email=learner.email,
        fullname=learner.fullname,
        course_title=other.title,
        body="Khóa khác",
    )
    assert other_course["sent"] is True
    assert len(sent) == 2

    promo = await mailer.send_promotional_email(
        db_session,
        user_id=learner.id,
        email=learner.email,
        fullname=learner.fullname,
        subject="Ưu đãi",
        body="Giảm giá",
    )
    assert promo["sent"] is True
    assert len(sent) == 3

    await set_promotional_emails(db_session, learner.id, False)
    promo_off = await mailer.send_promotional_email(
        db_session,
        user_id=learner.id,
        email=learner.email,
        fullname=learner.fullname,
        subject="Ưu đãi tiếp",
        body="Giảm giá",
    )
    assert promo_off["sent"] is False
    assert promo_off["skipped"] == "promotional"
    assert len(sent) == 3

    verified = await mailer.send_verification_email(
        learner.email, learner.fullname, "123456"
    )
    assert verified["sent"] is True
    assert len(sent) == 4
    assert sent[-1] == "Xác thực email - Mây Mây"
