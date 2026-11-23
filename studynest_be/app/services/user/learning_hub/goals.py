from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import Courses, LessonProgress, LessonQuizzes, Lessons
from app.db.models.learning_hub import StudyGoal
from app.db.models.learning_paths import BundleItem, BundleOrder, BundleOrderLine, BundleVersion
from app.schemas.learning_hub import (
    StudyGoalInput, StudyGoalPatch, StudyGoals, StudyGoalView, StudyPlan, StudyPlanDay, StudyPlanItem,
)
from app.services.gamification.mission_clock import VIETNAM, daily_window
from app.services.user.learning_hub.common import (
    active_courses, curriculum_query, lesson_href, lock_learner, owned_progress_join,
)
from app.services.user.learning_hub.weekly import review_activity_query

MAX_OPEN_GOALS = 5
MIN_TARGET_DAYS = 2
MAX_TARGET_DAYS = 366


def validate_target_date(today: date, target: date) -> None:
    days = (target - today).days
    if days < 0:
        raise HTTPException(422, "Ngày mục tiêu đã qua.")
    if days < MIN_TARGET_DAYS:
        raise HTTPException(422, f"Ngày mục tiêu phải cách hôm nay ít nhất {MIN_TARGET_DAYS} ngày.")
    if days > MAX_TARGET_DAYS:
        raise HTTPException(422, f"Ngày mục tiêu không được quá {MAX_TARGET_DAYS} ngày kể từ hôm nay.")


def allocate_sessions(start, deadline, per_week, lessons, include_review):
    slots = []
    for week_start in range(0, (deadline - start).days + 1, 7):
        week = [start + timedelta(days=week_start + 7 * index // per_week) for index in range(per_week)]
        within_target = [day for day in week if day <= deadline]
        slots.extend((day, include_review and day == within_target[-1]) for day in within_target)

    per_session, extra = divmod(len(lessons), len(slots))
    schedule = []
    offset = 0
    for index, (day, review) in enumerate(slots):
        count = per_session + (index < extra)
        if count or review:
            schedule.append((day, lessons[offset:offset + count], review))
        offset += count
    return schedule


@dataclass
class Target:
    title: str
    thumbnail_url: str | None
    courses: dict[UUID, Courses]


class GoalService:
    def __init__(self, db: AsyncSession, *, now: datetime | None = None):
        self.db = db
        self.now = now

    def _time(self):
        now = self.now or datetime.now(UTC)
        today, _, _ = daily_window(now)
        return now, today

    async def _target(self, user_id, target_type, target_id, *, lock=False) -> Target | None:
        if target_type == "course":
            courses = await active_courses(self.db, user_id, [target_id], lock=lock)
            course = courses.get(target_id)
            return Target(course.title, course.thumbnail_url, courses) if course else None

        order = (await self.db.execute(
            select(BundleOrder.title, BundleOrder.version_id, BundleVersion.thumbnail_url)
            .join(BundleVersion, BundleVersion.id == BundleOrder.version_id)
            .where(BundleOrder.id == target_id, BundleOrder.user_id == user_id)
        )).one_or_none()
        if order is None:
            return None
        course_ids = list(await self.db.scalars(
            select(BundleOrderLine.course_id)
            .outerjoin(BundleItem, and_(BundleItem.version_id == order.version_id,
                                        BundleItem.course_id == BundleOrderLine.course_id))
            .where(BundleOrderLine.order_id == target_id)
            .order_by(BundleItem.position.asc().nulls_last(), BundleOrderLine.course_id)
        ))
        accessible = await active_courses(self.db, user_id, course_ids, lock=lock)
        courses = {cid: accessible[cid] for cid in course_ids if cid in accessible}
        return Target(order.title, order.thumbnail_url, courses) if courses else None

    async def _require_target(self, user_id, target_type, target_id, *, lock=False) -> Target:
        target = await self._target(user_id, target_type, target_id, lock=lock)
        if target is None:
            raise HTTPException(403, "Bạn chưa có quyền truy cập khóa học hoặc lộ trình này.")
        return target

    async def _get(self, user_id, goal_id) -> StudyGoal:
        goal = await self.db.scalar(select(StudyGoal).where(StudyGoal.id == goal_id, StudyGoal.user_id == user_id))
        if goal is None:
            raise HTTPException(404, "Không tìm thấy mục tiêu học tập.")
        return goal

    async def _lessons(self, user_id, target):
        has_question = select(LessonQuizzes.id).where(LessonQuizzes.lesson_id == Lessons.id).exists()
        rows = await self.db.execute(
            curriculum_query(list(target.courses))
            .add_columns(LessonProgress.is_completed, and_(Lessons.lesson_type == "quiz", has_question))
            .outerjoin(LessonProgress, owned_progress_join(user_id))
        )
        by_course = {course_id: [] for course_id in target.courses}
        completed = set()
        has_quiz = False
        for lesson, done, quiz in rows:
            by_course[lesson.course_id].append(lesson)
            if done:
                completed.add(lesson.id)
            has_quiz |= quiz
        return [lesson for group in by_course.values() for lesson in group], completed, has_quiz

    async def _check_limit(self, user_id, today, *, excluding=None):
        course_ids = list(await active_courses(self.db, user_id))
        accessible_orders = (
            select(BundleOrder.id)
            .join(BundleOrderLine, BundleOrderLine.order_id == BundleOrder.id)
            .where(BundleOrder.user_id == user_id, BundleOrderLine.course_id.in_(course_ids))
        )
        stmt = select(func.count()).select_from(StudyGoal).where(
            StudyGoal.user_id == user_id, StudyGoal.target_date >= today,
            or_(and_(StudyGoal.target_type == "course", StudyGoal.target_id.in_(course_ids)),
                and_(StudyGoal.target_type == "path", StudyGoal.target_id.in_(accessible_orders))),
        )
        if excluding is not None:
            stmt = stmt.where(StudyGoal.id != excluding)
        count = await self.db.scalar(stmt)
        if count >= MAX_OPEN_GOALS:
            raise HTTPException(422, f"Bạn chỉ có thể có tối đa {MAX_OPEN_GOALS} mục tiêu đang mở.")

    def _schedule(self, goal, lessons, completed, has_quiz):
        before_plan = completed.intersection(goal.baseline_completed_ids)
        return allocate_sessions(
            goal.plan_start_date, goal.target_date, goal.sessions_per_week,
            [lesson for lesson in lessons if lesson.id not in before_plan], has_quiz,
        )

    def _view(self, goal, target, lessons, completed, today, schedule):
        behind = sum(lesson.id not in completed for day, group, _ in schedule if day < today for lesson in group)
        return StudyGoalView(
            id=goal.id, target_type=goal.target_type, target_id=goal.target_id, target_date=goal.target_date,
            title=target.title, thumbnail_url=target.thumbnail_url, sessions_per_week=goal.sessions_per_week,
            created_at=goal.created_at, updated_at=goal.updated_at,
            progress_percent=round(100 * len(completed) / len(lessons), 2) if lessons else 0.0,
            on_track=behind == 0, behind_lessons=behind,
        )

    async def create(self, user_id: UUID, payload: StudyGoalInput) -> StudyGoalView:
        await lock_learner(self.db, "study-goals", user_id)
        now, today = self._time()
        validate_target_date(today, payload.target_date)
        target = await self._require_target(user_id, payload.target_type, payload.target_id, lock=True)
        await self._check_limit(user_id, today)
        lessons, completed, has_quiz = await self._lessons(user_id, target)
        goal = StudyGoal(
            user_id=user_id, **payload.model_dump(), plan_start_date=today + timedelta(days=1),
            baseline_completed_ids=sorted(completed), created_at=now, updated_at=now,
        )
        self.db.add(goal)
        await self.db.flush()
        schedule = self._schedule(goal, lessons, completed, has_quiz)
        result = self._view(goal, target, lessons, completed, today, schedule)
        await self.db.commit()
        return result

    async def list(self, user_id: UUID) -> StudyGoals:
        _, today = self._time()
        goals = await self.db.scalars(select(StudyGoal).where(StudyGoal.user_id == user_id)
                                     .order_by(StudyGoal.target_date, StudyGoal.id))
        results = []
        for goal in goals:
            target = await self._target(user_id, goal.target_type, goal.target_id)
            if target:
                lessons, completed, has_quiz = await self._lessons(user_id, target)
                schedule = self._schedule(goal, lessons, completed, has_quiz)
                results.append(self._view(goal, target, lessons, completed, today, schedule))
        return StudyGoals(items=results)

    async def get(self, user_id: UUID, goal_id: UUID) -> StudyGoalView:
        goal = await self._get(user_id, goal_id)
        target = await self._require_target(user_id, goal.target_type, goal.target_id)
        _, today = self._time()
        lessons, completed, has_quiz = await self._lessons(user_id, target)
        schedule = self._schedule(goal, lessons, completed, has_quiz)
        return self._view(goal, target, lessons, completed, today, schedule)

    async def patch(self, user_id: UUID, goal_id: UUID, payload: StudyGoalPatch) -> StudyGoalView:
        await lock_learner(self.db, "study-goals", user_id)
        now, today = self._time()
        goal = await self._get(user_id, goal_id)
        changes = {key: value for key, value in payload.model_dump(exclude_unset=True).items()
                   if value != getattr(goal, key)}
        target = await self._require_target(
            user_id, changes.get("target_type", goal.target_type), changes.get("target_id", goal.target_id),
            lock=True,
        )
        lessons, completed, has_quiz = await self._lessons(user_id, target)
        if changes:
            validate_target_date(today, changes.get("target_date", goal.target_date))
            await self._check_limit(user_id, today, excluding=goal.id)
            for key, value in changes.items():
                setattr(goal, key, value)
            goal.plan_start_date = today + timedelta(days=1)
            goal.baseline_completed_ids = sorted(completed)
            goal.updated_at = now
        schedule = self._schedule(goal, lessons, completed, has_quiz)
        result = self._view(goal, target, lessons, completed, today, schedule)
        await self.db.commit()
        return result

    async def delete(self, user_id: UUID, goal_id: UUID) -> None:
        await lock_learner(self.db, "study-goals", user_id)
        await self.db.delete(await self._get(user_id, goal_id))
        await self.db.commit()

    async def plan(self, user_id: UUID, goal_id: UUID) -> StudyPlan:
        goal = await self._get(user_id, goal_id)
        target = await self._require_target(user_id, goal.target_type, goal.target_id)
        now, today = self._time()
        lessons, completed, has_quiz = await self._lessons(user_id, target)
        schedule = self._schedule(goal, lessons, completed, has_quiz)
        view = self._view(goal, target, lessons, completed, today, schedule)

        reviewed = set()
        if has_quiz:
            start = datetime.combine(goal.plan_start_date, time.min, tzinfo=VIETNAM)
            end = datetime.combine(goal.target_date + timedelta(days=1), time.min, tzinfo=VIETNAM)
            activity = review_activity_query(user_id, list(target.courses), start, end).subquery()
            reviewed = set(await self.db.scalars(
                select(func.date(func.timezone(VIETNAM.key, activity.c.activity_at)))
                .where(activity.c.activity_at <= now).distinct()
            ))
        days = []
        for day, group, include_review in schedule:
            items = [StudyPlanItem(
                kind="lesson", lesson_id=lesson.id, title=lesson.title, done=lesson.id in completed,
                href=lesson_href(target.courses[lesson.course_id], lesson.id),
            ) for lesson in group]
            if include_review:
                href = f"/review?course_id={next(iter(target.courses))}" if len(target.courses) == 1 else "/review"
                items.append(StudyPlanItem(kind="review", lesson_id=None, title="Ôn tập trắc nghiệm",
                                           done=day in reviewed, href=href))
            days.append(StudyPlanDay(date=day, items=items))
        return StudyPlan(
            goal=view, days=days, completed_lessons=len(completed), total_lessons=len(lessons),
            on_track=view.on_track, behind_lessons=view.behind_lessons,
            suggestion=(
                "Bạn có thể tăng số buổi học mỗi tuần hoặc dời ngày mục tiêu."
                if not view.on_track else None
            ),
        )
