import asyncio
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models.database import (
    Badges, CourseEnrollments, Courses, CourseSections, LessonProgress, LessonQuizOptions, LessonQuizzes,
    Lessons, LessonTypeEnum, User, UserBadges, UserGamificationProfiles,
)
from app.db.models.learning_hub import ReviewAnswer, ReviewItem
from app.db.models.learning_paths import BundleItem, BundleOrder, BundleOrderLine, BundleVersion, CourseBundle
from app.db.models.quiz_attempts import QuizAttempt
from app.schemas.learning_hub import ReviewAnswerInput, StudyGoalInput, StudyGoalPatch
from app.schemas.user.quiz_attempts import QuizAnswer, SubmitQuizAttempt
from app.services.gamification.badges import list_badges
from app.services.user.learning_hub.goals import GoalService
from app.services.user.learning_hub.mastery import MasteryService
from app.services.user.learning_hub.review import ReviewService
from app.services.user.learning_hub.weekly import WeeklyService
from app.services.user.quiz_attempts import QuizAttemptService

pytestmark = pytest.mark.asyncio
MONDAY = datetime(2026, 11, 22, 17, tzinfo=UTC)
NOW = MONDAY + timedelta(hours=10)


def learner():
    return User(fullname="Học viên kiểm thử", email=f"hub-{uuid4().hex}@test.invalid", password="!disabled")


@dataclass
class Curriculum:
    user: User
    course: Courses
    section: CourseSections
    enrollment: CourseEnrollments
    video: Lessons
    quiz: Lessons
    easy: LessonQuizzes
    hard: LessonQuizzes
    easy_wrong: LessonQuizOptions
    easy_right: LessonQuizOptions


async def curriculum(db, monkeypatch, *, attempt_at=NOW):
    async def discard(_event):
        pass

    monkeypatch.setattr("app.services.user.quiz_attempts.event_bus.publish", discard)
    user = learner()
    db.add(user)
    await db.flush()
    course = Courses(title="Toán", slug=f"hub-{uuid4().hex}", instructor_id=user.id)
    db.add(course)
    await db.flush()
    enrollment = CourseEnrollments(user_id=user.id, course_id=course.id, status="active")
    section = CourseSections(title="Số học", course_id=course.id, position=1)
    db.add_all([enrollment, section])
    await db.flush()
    video = Lessons(title="Bài giảng", lesson_type=LessonTypeEnum.VIDEO,
                    course_id=course.id, section_id=section.id, position=1)
    quiz = Lessons(title="Trắc nghiệm", lesson_type=LessonTypeEnum.QUIZ,
                   course_id=course.id, section_id=section.id, position=2)
    db.add_all([video, quiz])
    await db.flush()

    questions = []
    for difficulty in (1, 4):
        question = LessonQuizzes(lesson_id=quiz.id, section_id=section.id, course_id=course.id,
                                 question="Hai cộng hai bằng mấy?", explanation="Cộng hai lần.",
                                 difficulty_level=difficulty)
        db.add(question)
        await db.flush()
        wrong = LessonQuizOptions(quiz_id=question.id, text_="Năm", position=1, is_correct=False)
        right = LessonQuizOptions(quiz_id=question.id, text_="Bốn", position=2, is_correct=True)
        db.add_all([wrong, right])
        await db.flush()
        questions.append((question, wrong, right))

    (easy, easy_wrong, easy_right), (hard, _, hard_right) = questions
    attempt = await QuizAttemptService(db).submit_async(user.id, quiz.id, SubmitQuizAttempt(
        idempotency_key=uuid4(),
        answers=[QuizAnswer(question_id=easy.id, option_id=easy_wrong.id),
                 QuizAnswer(question_id=hard.id, option_id=hard_right.id)],
    ))
    row = await db.get(QuizAttempt, UUID(attempt["attempt_id"]))
    # Freeze the persisted clock so the same boundary is tested on every run.
    row.created_at = attempt_at
    await db.flush()
    return Curriculum(user, course, section, enrollment, video, quiz, easy, hard, easy_wrong, easy_right)


def answer(option):
    return ReviewAnswerInput(option_id=option.id, self_rating="remembered", idempotency_key=uuid4())


def complete(ctx, lesson, when):
    return LessonProgress(user_id=ctx.user.id, course_id=ctx.course.id, lesson_id=lesson.id,
                          is_completed=True, completed_at=when)


async def test_review_backfill_only_includes_wrong_questions_and_hides_lost_access(db_session, monkeypatch):
    ctx = await curriculum(db_session, monkeypatch)
    service = ReviewService(db_session, now=NOW)
    first = await service.queue(ctx.user.id, course_id=ctx.course.id, section_id=ctx.section.id, limit=1)
    assert first.due_count == 1
    card = first.items[0]
    assert card.quiz_id == ctx.easy.id
    assert set(card.options[0].model_dump()) == {"id", "text"}
    assert {"explanation", "correct_option_id"}.isdisjoint(card.model_dump())
    assert (await service.queue(ctx.user.id)).items[0].item_id == card.item_id

    ctx.enrollment.status = "refunded"
    await db_session.flush()
    assert (await service.queue(ctx.user.id)).due_count == 0
    with pytest.raises(HTTPException) as error:
        await service.answer(ctx.user.id, card.item_id, answer(ctx.easy_right))
    assert error.value.status_code == 404


async def test_changed_quiz_content_invalidates_card_and_reloads_current_question(db_session, monkeypatch):
    ctx = await curriculum(db_session, monkeypatch)
    service = ReviewService(db_session, now=NOW)
    old = (await service.queue(ctx.user.id)).items[0]
    ctx.easy.question = "Tính tổng của hai và hai."
    await db_session.flush()

    with pytest.raises(HTTPException) as error:
        await service.answer(ctx.user.id, old.item_id, answer(ctx.easy_right))
    assert error.value.status_code == 409
    replacement = (await service.queue(ctx.user.id)).items[0]
    assert replacement.quiz_id == old.quiz_id
    assert replacement.question == "Tính tổng của hai và hai."
    assert replacement.item_id != old.item_id
    assert await db_session.scalar(select(func.count()).select_from(ReviewItem).where(
        ReviewItem.user_id == ctx.user.id, ReviewItem.invalidated_at.is_not(None),
    )) == 1


async def test_review_replays_result_and_due_date_follows_vietnamese_midnight(db_session, monkeypatch):
    before_reset = MONDAY - timedelta(minutes=1)
    ctx = await curriculum(db_session, monkeypatch, attempt_at=before_reset)
    service = ReviewService(db_session, now=before_reset)
    item_id = (await service.queue(ctx.user.id)).items[0].item_id
    payload = answer(ctx.easy_wrong)
    submitted = await service.answer(ctx.user.id, item_id, payload)
    assert not submitted.correct
    assert submitted.correct_option_id == ctx.easy_right.id
    assert submitted.next_due_at == MONDAY
    assert submitted.due_count == 0
    assert await service.answer(ctx.user.id, item_id, payload) == submitted
    with pytest.raises(HTTPException) as error:
        await service.answer(ctx.user.id, item_id, answer(ctx.easy_right))
    assert error.value.status_code == 409
    with pytest.raises(HTTPException) as error:
        await service.answer(ctx.user.id, item_id, payload.model_copy(update={"option_id": ctx.easy_right.id}))
    assert error.value.status_code == 409
    assert (await ReviewService(db_session, now=MONDAY).queue(ctx.user.id)).due_count == 1


async def test_review_queue_and_answers_are_serialized_across_connections(async_engine, monkeypatch):
    sessions = async_sessionmaker(async_engine, expire_on_commit=False)
    async with sessions() as db:
        ctx = await curriculum(db, monkeypatch)
        await db.commit()

    async def queue():
        async with sessions() as db:
            return await ReviewService(db, now=NOW).queue(ctx.user.id)

    async def submit(item_id, payload, when=NOW):
        async with sessions() as db:
            try:
                return await ReviewService(db, now=when).answer(ctx.user.id, item_id, payload)
            except HTTPException as error:
                return error

    try:
        first, second = await asyncio.wait_for(asyncio.gather(queue(), queue()), timeout=15)
        item_id = first.items[0].item_id
        assert second.items[0].item_id == item_id

        payload = answer(ctx.easy_right)
        first_result, replay = await asyncio.wait_for(asyncio.gather(
            submit(item_id, payload), submit(item_id, payload),
        ), timeout=15)
        assert first_result == replay and first_result.correct
        async with sessions() as db:
            assert await db.scalar(select(func.count()).select_from(ReviewAnswer).where(
                ReviewAnswer.user_id == ctx.user.id,
            )) == 1

        later = first_result.next_due_at
        results = await asyncio.wait_for(asyncio.gather(
            submit(item_id, answer(ctx.easy_right), later), submit(item_id, answer(ctx.easy_right), later),
        ), timeout=15)
        conflicts = [result.status_code for result in results if isinstance(result, HTTPException)]
        assert conflicts == [409]
        async with sessions() as db:
            assert await db.scalar(select(func.count()).select_from(ReviewAnswer).where(
                ReviewAnswer.user_id == ctx.user.id,
            )) == 2
    finally:
        async with sessions() as db:
            await db.execute(delete(Lessons).where(Lessons.course_id == ctx.course.id))
            await db.execute(delete(Courses).where(Courses.id == ctx.course.id))
            await db.execute(delete(User).where(User.id == ctx.user.id))
            await db.commit()


async def test_mastery_uses_server_graded_difficulty_weighted_attempts(db_session, monkeypatch):
    ctx = await curriculum(db_session, monkeypatch)
    service = MasteryService(db_session, now=NOW)
    summary = (await service.courses(ctx.user.id)).courses[0]
    assert (summary.course_score, summary.status, summary.quiz_lessons, summary.total_lessons) == (80, "solid", 1, 2)
    detail = await service.course(ctx.user.id, ctx.course.id)
    video, quiz = detail.sections[0].lessons
    assert (video.status, video.score, quiz.status, quiz.score, quiz.wrong_count) == ("no_quiz", None, "solid", 80, 1)
    assert quiz.last_seen_at == NOW
    ctx.enrollment.status = "cancelled"
    await db_session.flush()
    assert (await service.courses(ctx.user.id)).courses == []


async def test_goal_plan_preserves_dates_and_tracks_overdue_and_finished_items(db_session, monkeypatch):
    ctx = await curriculum(db_session, monkeypatch)
    service = GoalService(db_session, now=NOW)
    goal = await service.create(ctx.user.id, StudyGoalInput(
        target_type="course", target_id=ctx.course.id, target_date=date(2026, 11, 30), sessions_per_week=2,
    ))
    assert (await service.list(ctx.user.id)).items == [goal]
    plan = await service.plan(ctx.user.id, goal.id)
    assert plan.on_track and plan.total_lessons == 2
    assert [day.date for day in plan.days] == [date(2026, 11, 24), date(2026, 11, 27)]
    assert [[item.kind for item in day.items] for day in plan.days] == [["lesson"], ["lesson", "review"]]

    advanced = GoalService(db_session, now=NOW + timedelta(days=4))
    assert (await advanced.get(ctx.user.id, goal.id)).behind_lessons == 1
    db_session.add(complete(ctx, ctx.video, NOW + timedelta(days=4)))
    await db_session.flush()
    current = ReviewService(db_session, now=NOW + timedelta(days=4))
    item = (await current.queue(ctx.user.id)).items[0]
    await current.answer(ctx.user.id, item.item_id, answer(ctx.easy_right))
    updated = await advanced.plan(ctx.user.id, goal.id)
    assert [day.date for day in updated.days] == [day.date for day in plan.days]
    assert updated.on_track and updated.completed_lessons == 1
    assert updated.days[0].items[0].done and updated.days[1].items[1].done

    changed = await advanced.patch(ctx.user.id, goal.id, StudyGoalPatch(
        target_date=date(2026, 12, 4), sessions_per_week=3,
    ))
    assert (changed.target_date, changed.sessions_per_week) == (date(2026, 12, 4), 3)
    assert all(item.lesson_id != ctx.video.id for day in (await advanced.plan(ctx.user.id, goal.id)).days
               for item in day.items)
    await advanced.delete(ctx.user.id, goal.id)
    with pytest.raises(HTTPException) as error:
        await advanced.get(ctx.user.id, goal.id)
    assert error.value.status_code == 404


async def test_goal_requires_active_course_or_buyers_bundle_order(db_session, monkeypatch):
    ctx = await curriculum(db_session, monkeypatch)
    outsider = learner()
    db_session.add(outsider)
    bundle = CourseBundle(slug=f"bundle-{uuid4().hex}")
    db_session.add(bundle)
    await db_session.flush()
    version = BundleVersion(bundle_id=bundle.id, title="Lộ trình Toán", version=1, price=0,
                            status="draft", description="", created_by=ctx.user.id)
    db_session.add(version)
    await db_session.flush()
    order = BundleOrder(user_id=ctx.user.id, version_id=version.id, title=version.title, total_paid=0,
                        idempotency_key=uuid4().hex, quote_hash="a" * 64)
    db_session.add_all([order, BundleItem(course_id=ctx.course.id, version_id=version.id, position=1)])
    await db_session.flush()
    db_session.add(BundleOrderLine(order_id=order.id, course_id=ctx.course.id, title=ctx.course.title,
                                   instructor_id=ctx.user.id, list_price=0, paid=0, already_owned=True))
    await db_session.flush()
    service = GoalService(db_session, now=NOW)

    def payload(kind, target):
        return StudyGoalInput(target_type=kind, target_id=target, target_date=date(2026, 12, 1), sessions_per_week=2)

    for data in [payload("course", ctx.course.id), payload("path", order.id)]:
        with pytest.raises(HTTPException) as error:
            await service.create(outsider.id, data)
        assert error.value.status_code == 403
    goal = await service.create(ctx.user.id, payload("path", order.id))
    assert goal.title == "Lộ trình Toán"
    assert (await service.plan(ctx.user.id, goal.id)).total_lessons == 2
    ctx.enrollment.status = "refunded"
    await db_session.flush()
    assert (await service.list(ctx.user.id)).items == []
    with pytest.raises(HTTPException) as error:
        await service.plan(ctx.user.id, goal.id)
    assert error.value.status_code == 403


async def test_weekly_report_uses_local_monday_and_counts_only_current_entitlements(db_session, monkeypatch):
    ctx = await curriculum(db_session, monkeypatch, attempt_at=MONDAY)
    db_session.add_all([
        complete(ctx, ctx.video, MONDAY - timedelta(seconds=1)),
        complete(ctx, ctx.quiz, MONDAY),
        UserGamificationProfiles(user_id=ctx.user.id, last_active_date=date(2026, 11, 22), current_streak=4),
    ])
    await db_session.flush()
    review = ReviewService(db_session, now=MONDAY)
    item = (await review.queue(ctx.user.id)).items[0]
    await review.answer(ctx.user.id, item.item_id, answer(ctx.easy_right))

    previous = await WeeklyService(db_session, now=MONDAY - timedelta(seconds=1)).report(ctx.user.id)
    current = await WeeklyService(db_session, now=NOW).report(ctx.user.id)
    assert (previous.week_start, previous.week_end, previous.lessons_completed, previous.reviews_done) == (
        date(2026, 11, 16), date(2026, 11, 22), 1, 0,
    )
    assert (current.week_start, current.week_end, current.lessons_completed, current.quizzes_taken,
            current.reviews_done, current.study_days, current.streak) == (
        date(2026, 11, 23), date(2026, 11, 29), 1, 1, 1, 1, 4,
    )
    assert current.top_courses[0].id == ctx.course.id and current.top_courses[0].lessons_completed == 1
    ctx.enrollment.status = "refunded"
    await db_session.flush()
    empty = await WeeklyService(db_session, now=NOW).report(ctx.user.id)
    assert (empty.lessons_completed, empty.quizzes_taken, empty.reviews_done, empty.study_days) == (0, 0, 0, 0)


async def test_badges_are_scoped_to_requested_user_and_include_earned_inactive_awards(db_session):
    user, other = learner(), learner()
    active = Badges(name=f"Chăm học {uuid4()}", image_url="/badge.svg")
    earned = Badges(name=f"Ngôi sao {uuid4()}", image_url="/star.svg", description="Học đều", is_active=False)
    deleted = Badges(name=f"Đã xóa {uuid4()}", image_url="/old.svg", deleted_at=NOW)
    db_session.add_all([user, other, active, earned, deleted])
    await db_session.flush()
    db_session.add_all([
        UserBadges(user_id=user.id, badge_id=earned.id, unlocked_at=NOW),
        UserBadges(user_id=other.id, badge_id=active.id, unlocked_at=NOW),
        UserBadges(user_id=user.id, badge_id=deleted.id, unlocked_at=NOW),
    ])
    await db_session.flush()
    badges = {badge.id: badge for badge in (await list_badges(db_session, user.id)).badges}
    assert badges[earned.id].earned and badges[earned.id].earned_at == NOW
    assert not badges[active.id].earned and badges[active.id].earned_at is None
    assert deleted.id not in badges


async def test_goal_limit_only_counts_accessible_unexpired_goals(db_session, monkeypatch):
    ctx = await curriculum(db_session, monkeypatch)
    service = GoalService(db_session, now=NOW)
    payload = StudyGoalInput(
        target_type="course", target_id=ctx.course.id, target_date=date(2026, 11, 30), sessions_per_week=2,
    )
    for _ in range(5):
        await service.create(ctx.user.id, payload)
    with pytest.raises(HTTPException) as error:
        await service.create(ctx.user.id, payload)
    assert error.value.status_code == 422

    other_course = Courses(title="Lý", slug=f"hub-{uuid4().hex}", instructor_id=ctx.user.id)
    db_session.add(other_course)
    await db_session.flush()
    db_session.add(CourseEnrollments(user_id=ctx.user.id, course_id=other_course.id, status="active"))
    ctx.enrollment.status = "refunded"
    await db_session.flush()
    other_target = payload.model_copy(update={"target_id": other_course.id})
    assert (await service.create(ctx.user.id, other_target)).target_id == other_course.id
