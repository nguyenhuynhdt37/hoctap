import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.event_bus.base import BaseEvent
from app.db.models.database import (
    CourseEnrollments, CourseSections, Courses, LevelsConfig, LessonCodes, LessonProgress, Lessons, LessonTypeEnum,
    MissionTemplates, PeakTransactions, RewardGrants, RewardInstances, Rewards, User, UserMissions,
    UserRewardInventory, XpTransactions,
)
from app.db.models.quiz_attempts import QuizAttempt
from app.db.models.code_attempts import CodeTestAttempt
from app.repositories.gamification.daily_checkin_repository import DailyCheckinRepository
from app.services.gamification import mission_subscriber
from app.services.gamification.mission_service import MissionService

pytestmark = pytest.mark.asyncio
NOW = datetime(2026, 11, 23, 10, tzinfo=UTC)


def learner():
    return User(fullname="Missions test", email=f"{uuid4().hex}@test.invalid", password="!disabled")


async def curriculum(db):
    user = learner()
    db.add(user)
    await db.flush()
    course = Courses(title="Khóa học thử nghiệm", slug=f"missions-{uuid4().hex}", instructor_id=user.id)
    db.add(course)
    await db.flush()
    section = CourseSections(title="Chương một", position=1, course_id=course.id)
    empty = CourseSections(title="Chương trống", position=2, course_id=course.id)
    enrollment = CourseEnrollments(user_id=user.id, course_id=course.id, status="active")
    db.add_all([section, empty, enrollment])
    await db.flush()
    video = Lessons(course_id=course.id, section_id=section.id, position=1,
                    title="Video", lesson_type=LessonTypeEnum.VIDEO)
    quiz = Lessons(course_id=course.id, section_id=section.id, position=2,
                   title="Quiz", lesson_type=LessonTypeEnum.QUIZ)
    db.add_all([video, quiz])
    await db.flush()
    return user, course, section, enrollment, video, quiz


def completion(user, course, lesson, at):
    return LessonProgress(user_id=user.id, course_id=course.id, lesson_id=lesson.id,
                          is_completed=True, completed_at=at)


def quiz_attempt(user, quiz, correct, total, at):
    return QuizAttempt(user_id=user.id, lesson_id=quiz.id, idempotency_key=uuid4(),
                       request_hash="a" * 64, content_hash="b" * 64, correct=correct,
                       total=total, details=[], created_at=at)


def for_course(overview):
    return {mission.template: mission for mission in overview.long_term[0].missions}


async def test_purchase_event_assigns_chapter_and_course_missions(db_session, monkeypatch):
    db = db_session
    user, course, section, _, _, _ = await curriculum(db)

    @asynccontextmanager
    async def same_transaction():
        yield db

    async def discard(_event):
        pass

    monkeypatch.setattr(mission_subscriber, "AsyncSessionLocal", same_transaction)
    monkeypatch.setattr(mission_subscriber.event_bus, "publish", discard)
    event = BaseEvent(event_name="course.purchased", user_id=user.id,
                      source_type="course", source_id=course.id)

    await mission_subscriber.handle_mission_progress(event)
    await mission_subscriber.handle_mission_progress(event)
    rows = list(await db.scalars(select(UserMissions).where(UserMissions.course_id == course.id)))
    assert sorted((row.template, row.target_count) for row in rows) == [
        ("chapter.complete", 2), ("chapter.quiz_pass", 1), ("course.complete", 2), ("course.weekly_streak", 3)
    ]
    assert {row.section_id for row in rows} == {None, section.id}


async def test_backfill_recomputes_chapter_quiz_course_and_weekly_progress(db_session):
    db = db_session
    user, course, section, _, video, quiz = await curriculum(db)
    service = MissionService(db, now=NOW)
    first = await service.overview(user.id)
    db.add_all([
        completion(user, course, video, NOW - timedelta(days=7)),
        quiz_attempt(user, quiz, 69, 100, NOW - timedelta(days=6)),
        quiz_attempt(user, quiz, 69, 100, NOW - timedelta(days=6)),
    ])
    await db.flush()

    partial = await service.overview(user.id)
    assert partial.long_term[0].progress_percent == 50
    missions = for_course(partial)
    assert {mission.id for mission in for_course(first).values()} == {mission.id for mission in missions.values()}
    assert missions["chapter.complete"].progress.current == 1
    assert missions["chapter.quiz_pass"].progress.current == 0
    assert missions["course.weekly_streak"].progress.current == 0

    db.add_all([
        completion(user, course, quiz, NOW - timedelta(days=5)),
        quiz_attempt(user, quiz, 7, 10, NOW - timedelta(days=5)),
    ])
    await db.flush()
    final = await service.overview(user.id)
    assert final.long_term[0].progress_percent == 100
    assert all(mission.status == "completed" for mission in for_course(final).values())
    assert for_course(final)["chapter.complete"].section.id == section.id
    assert final.xp.total_xp == 0
    assert final.xp.peak_balance == 0
    assert await service.overview(user.id) == final


async def test_completed_missions_are_monotonic_when_lessons_are_added(db_session):
    db = db_session
    user, course, section, _, video, quiz = await curriculum(db)
    db.add_all([completion(user, course, lesson, NOW) for lesson in (video, quiz)])
    await db.flush()
    service = MissionService(db, now=NOW)
    before = for_course(await service.overview(user.id))

    db.add(Lessons(course_id=course.id, section_id=section.id, position=3,
                   title="Bài bổ sung", lesson_type=LessonTypeEnum.VIDEO))
    await db.flush()
    overview = await service.overview(user.id)
    after = for_course(overview)
    assert overview.long_term[0].progress_percent == 66.67
    for kind in ("chapter.complete", "course.complete"):
        assert after[kind] == before[kind]
        assert after[kind].status == "completed"


async def test_daily_missions_reset_at_vietnam_midnight(db_session):
    db = db_session
    user, course, _, _, video, quiz = await curriculum(db)
    midnight = datetime(2026, 11, 22, 17, 0, tzinfo=UTC)
    db.add(completion(user, course, video, midnight - timedelta(seconds=2)))
    await db.flush()
    before = MissionService(db, now=midnight - timedelta(seconds=1))
    first = await before.overview(user.id)
    completed = next(m for m in first.daily if m.template == "lesson.completed" and m.progress.target == 1)
    assert completed.status == "completed"
    assert first.daily_resets_at.isoformat() == "2026-11-23T00:00:00+07:00"

    db.add_all([quiz_attempt(user, quiz, 1, 2, midnight), quiz_attempt(user, quiz, 1, 2, midnight)])
    await db.flush()
    after = MissionService(db, now=midnight)
    second = await after.overview(user.id)
    assert len(second.daily) == len(first.daily)
    assert {m.id for m in second.daily}.isdisjoint(m.id for m in first.daily)
    assert all(m.progress.current == 0 for m in second.daily if m.template == "lesson.completed")
    assert next(m for m in second.daily if m.template == "quiz.completed").progress.current == 1
    with pytest.raises(HTTPException, match="hết hạn"):
        await after.claim(user.id, completed.id)


async def test_daily_code_counts_distinct_lessons_with_saved_full_passes(db_session):
    db = db_session
    user, course, section, _, _, _ = await curriculum(db)
    lesson = Lessons(course_id=course.id, section_id=section.id, position=3,
                     title="Thực hành", lesson_type=LessonTypeEnum.CODE)
    db.add(lesson)
    await db.flush()
    exercise = LessonCodes(lesson_id=lesson.id, title="Bài tập")
    db.add(exercise)
    await db.flush()
    service = MissionService(db, now=NOW)

    def code_attempt(mode, status, saved):
        return CodeTestAttempt(user_id=user.id, exercise_id=exercise.id, content_hash="a" * 64,
                               suite_hash="b" * 64, mode=mode, status=status, files_manifest=[],
                               result={"saved": saved}, created_at=NOW)

    db.add_all([code_attempt("sample", "passed", True), code_attempt("allowed", "passed", False)])
    assert next(m for m in (await service.overview(user.id)).daily if m.template == "code.completed").progress.current == 0
    db.add_all([code_attempt("allowed", "passed", True), code_attempt("allowed", "passed", True)])
    assert next(m for m in (await service.overview(user.id)).daily if m.template == "code.completed").progress.current == 1


async def test_refunded_course_is_excluded_and_claimed_xp_is_retained(db_session, monkeypatch):
    db = db_session
    user, course, _, enrollment, video, quiz = await curriculum(db)

    async def discard(_event):
        pass

    monkeypatch.setattr(mission_subscriber.event_bus, "publish", discard)
    service = MissionService(db, now=NOW)
    db.add_all([completion(user, course, lesson, NOW) for lesson in (video, quiz)])
    await db.flush()
    first = await service.overview(user.id)
    missions = for_course(first)
    result = await service.claim(user.id, missions["chapter.complete"].id)
    await db.delete(enrollment)
    await db.flush()

    refunded = await service.overview(user.id)
    assert refunded.long_term == []
    assert refunded.xp.total_xp == result.xp.total_xp
    db.add(quiz_attempt(user, quiz, 10, 10, NOW))
    await db.flush()
    assert next(
        m for m in (await service.overview(user.id)).daily if m.template == "quiz.completed"
    ).progress.current == 0
    assert await service.claim(user.id, missions["chapter.complete"].id) == result
    with pytest.raises(HTTPException) as missing:
        await service.claim(user.id, missions["course.complete"].id)
    assert missing.value.status_code == 404


async def test_purchase_event_for_inactive_course_does_not_assign(db_session):
    db = db_session
    user, course, _, enrollment, video, _ = await curriculum(db)
    enrollment.status = "refunded"
    db.add(completion(user, course, video, NOW))
    await db.flush()
    service = MissionService(db, now=NOW)
    await service.refresh_from_event(BaseEvent(
        event_name="course.purchased", user_id=user.id, source_type="course", source_id=course.id,
    ))
    result = await service.overview(user.id)
    assert not result.long_term
    assert not any(mission.progress.current for mission in result.daily)
    assert await db.scalar(select(func.count()).select_from(UserMissions).where(
        UserMissions.course_id == course.id,
    )) == 0


async def test_concurrent_claim_credits_each_ledger_once_and_replays_snapshot(async_engine, monkeypatch):
    sessions = async_sessionmaker(async_engine, expire_on_commit=False)

    async def discard(_event):
        pass

    monkeypatch.setattr(mission_subscriber.event_bus, "publish", discard)
    user = learner()
    async with sessions() as db:
        db.add(user)
        await db.flush()
        user_id = user.id
        levels = {row.level: row for row in await db.scalars(
            select(LevelsConfig).where(LevelsConfig.level.in_((2, 3, 4)))
        )}
        award = levels[2].xp_required + levels[3].xp_required + levels[4].xp_required
        expected_bonus = sum(
            int(cfg.get("reward_peak") or cfg.get("peak") or cfg.get("peak_wallet") or 0)
            for cfg in (row.rewards_config or {} for row in levels.values())
        )
        template = await db.get(MissionTemplates, "daily_lesson_one")
        mission = UserMissions(
            user_id=user_id, scope="daily", template=template.template, template_key=template.key,
            title=template.title, description=template.description, event_type=template.template,
            cycle_date=NOW.date(), target_count=1, current_count=1, status="completed",
            completed_at=NOW, reward_xp=award, reward_peak_wallet=19,
        )
        db.add(mission)
        await db.commit()
        mission_id = mission.id

    async def claim():
        async with sessions() as db:
            return await MissionService(db, now=NOW).claim(user_id, mission_id)

    try:
        first, second = await asyncio.gather(claim(), claim())
        assert first == second == await claim()
        assert first.xp.total_xp == award
        assert first.level_up.from_level == 1
        assert first.level_up.to >= 4
        assert first.level_up.peak_bonus == expected_bonus
        assert [(reward.level, reward.coins) for reward in first.level_up.rewards] == [
            (level, levels[level].rewards_config["reward_peak"]) for level in (2, 3, 4)
        ]
        assert first.xp.peak_balance == 19 + expected_bonus
        async with sessions() as db:
            grants = dict((await db.execute(
                select(RewardGrants.reward_kind, RewardGrants.amount).where(
                    RewardGrants.user_id == user_id, RewardGrants.mission_id == mission_id,
                )
            )).all())
            assert grants == {"xp": award, "peak": 19}
            level_grants = dict((await db.execute(
                select(RewardGrants.level, RewardGrants.amount).where(
                    RewardGrants.user_id == user_id, RewardGrants.reward_kind == "level",
                )
            )).all())
            assert level_grants == {reward.level: reward.coins for reward in first.level_up.rewards}
            assert await db.scalar(select(func.count()).select_from(XpTransactions).where(
                XpTransactions.user_id == user_id,
            )) == 1
            assert await db.scalar(select(func.sum(PeakTransactions.amount)).where(
                PeakTransactions.user_id == user_id,
            )) == 19 + expected_bonus
            wallet = DailyCheckinRepository(db)
            balance = await wallet.get_or_create_peak_balance(user_id)
            await wallet.credit_peak_wallet(balance, 5)
            await db.commit()
        assert await claim() == first
    finally:
        async with sessions() as db:
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()


async def test_inventory_uses_owner_and_returns_mask_and_expiry(db_session):
    db = db_session
    user, other = learner(), learner()
    reward = Rewards(title="Mã thưởng khóa học", reward_type="coupon")
    db.add_all([user, other, reward])
    await db.flush()

    for owner, expires_at, status in (
        (user, NOW + timedelta(days=1), "available"),
        (user, NOW - timedelta(days=1), "available"),
        (user, NOW + timedelta(days=1), "used"),
        (user, NOW + timedelta(days=1), "revoked"),
        (other, NOW + timedelta(days=1), "available"),
    ):
        instance = RewardInstances(reward_id=reward.id, code_encrypted="ciphertext-placeholder",
                                   code_masked="••••ABC", max_percent=15,
                                   expires_at=expires_at, status=status)
        db.add(instance)
        await db.flush()
        db.add(UserRewardInventory(user_id=owner.id, reward_type="coupon",
                                   reward_id=reward.id, reward_instance_id=instance.id))
    await db.flush()

    response = await MissionService(db, now=NOW).inventory(user.id)
    assert response.peak_balance == 0
    assert sorted(coupon.status for coupon in response.coupons) == ["available", "expired", "revoked", "used"]
    assert all(coupon.code_masked == "••••ABC" and coupon.max_percent == 15 for coupon in response.coupons)
    assert "ciphertext" not in response.model_dump_json()
