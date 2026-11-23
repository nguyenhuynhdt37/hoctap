from collections import Counter
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.code_attempts import CodeTestAttempt
from app.db.models.database import LessonCodes, LessonProgress, Lessons, UserGamificationProfiles
from app.db.models.learning_hub import ReviewAnswer, ReviewItem
from app.db.models.quiz_attempts import QuizAttempt
from app.schemas.learning_hub import ReportCourse, WeeklyReport
from app.services.gamification.mission_clock import VIETNAM, daily_window
from app.services.user.learning_hub.common import active_courses


def week_window(now: datetime) -> tuple[datetime, datetime]:
    day, today, _ = daily_window(now)
    start = today - timedelta(days=day.weekday())
    return start, start + timedelta(days=7)


def review_activity_query(user_id, course_ids, start, end):
    return (
        select(Lessons.course_id.label("course_id"), ReviewAnswer.answered_at.label("activity_at"))
        .select_from(ReviewAnswer)
        .join(ReviewItem, ReviewItem.id == ReviewAnswer.item_id)
        .join(Lessons, Lessons.id == ReviewItem.lesson_id)
        .where(ReviewAnswer.user_id == user_id, Lessons.course_id.in_(course_ids),
               ReviewAnswer.answered_at >= start, ReviewAnswer.answered_at < end)
    )


class WeeklyService:
    def __init__(self, db: AsyncSession, *, now: datetime | None = None):
        self.db = db
        self.now = now

    async def _activity(self, user_id, course_ids, start, end, now):
        completed = (
            select(Lessons.course_id.label("course_id"), LessonProgress.completed_at.label("activity_at"),
                   literal("lesson").label("kind"))
            .select_from(LessonProgress)
            .join(Lessons, Lessons.id == LessonProgress.lesson_id)
            .where(LessonProgress.user_id == user_id, Lessons.course_id.in_(course_ids),
                   LessonProgress.course_id == Lessons.course_id, LessonProgress.is_completed.is_(True),
                   LessonProgress.completed_at >= start, LessonProgress.completed_at < end)
        )
        quizzes = (
            select(Lessons.course_id, QuizAttempt.created_at, literal("quiz"))
            .select_from(QuizAttempt).join(Lessons, Lessons.id == QuizAttempt.lesson_id)
            .where(QuizAttempt.user_id == user_id, Lessons.course_id.in_(course_ids),
                   Lessons.lesson_type == "quiz", QuizAttempt.total > 0,
                   QuizAttempt.created_at >= start, QuizAttempt.created_at < end)
        )
        code = (
            select(Lessons.course_id, CodeTestAttempt.created_at, literal("code"))
            .select_from(CodeTestAttempt)
            .join(LessonCodes, LessonCodes.id == CodeTestAttempt.exercise_id)
            .join(Lessons, Lessons.id == LessonCodes.lesson_id)
            .where(CodeTestAttempt.user_id == user_id, Lessons.course_id.in_(course_ids),
                   Lessons.lesson_type == "code", CodeTestAttempt.mode == "allowed", CodeTestAttempt.status == "passed",
                   CodeTestAttempt.result["saved"].as_boolean().is_(True),
                   CodeTestAttempt.created_at >= start, CodeTestAttempt.created_at < end)
        )
        reviews = review_activity_query(user_id, course_ids, start, end).add_columns(literal("review"))
        activity = union_all(completed, quizzes, code, reviews).subquery()
        day = func.date(func.timezone(VIETNAM.key, activity.c.activity_at))
        return await self.db.execute(
            select(activity.c.course_id, activity.c.kind, day, func.count())
            .where(activity.c.activity_at <= now)
            .group_by(activity.c.course_id, activity.c.kind, day)
        )

    async def report(self, user_id: UUID) -> WeeklyReport:
        now = self.now or datetime.now(UTC)
        start, end = week_window(now)
        courses = await active_courses(self.db, user_id)
        counts: Counter[str] = Counter()
        lessons_by_course: Counter[UUID] = Counter()
        days = set()
        if courses:
            for course_id, kind, day, count in await self._activity(user_id, list(courses), start, end, now):
                counts[kind] += count
                days.add(day)
                if kind == "lesson":
                    lessons_by_course[course_id] += count

        today = now.astimezone(VIETNAM).date()
        profile = (await self.db.execute(
            select(UserGamificationProfiles.current_streak, UserGamificationProfiles.last_active_date)
            .where(UserGamificationProfiles.user_id == user_id)
        )).one_or_none()
        streak = (
            profile.current_streak if profile and profile.last_active_date
            and today - timedelta(days=1) <= profile.last_active_date <= today else 0
        )
        top = sorted(lessons_by_course, key=lambda cid: (-lessons_by_course[cid], courses[cid].title.casefold(), cid))
        last_day = end.date() - timedelta(days=1)
        return WeeklyReport(
            week_start=start.date(), week_end=last_day, lessons_completed=counts["lesson"],
            quizzes_taken=counts["quiz"], reviews_done=counts["review"], study_days=len(days),
            streak=streak, top_courses=[ReportCourse(
                id=cid, title=courses[cid].title, thumbnail_url=courses[cid].thumbnail_url,
                lessons_completed=lessons_by_course[cid],
            ) for cid in top[:5]],
            share_text=(
                f"Tuần {start:%d/%m/%Y} đến {last_day:%d/%m/%Y}, em đã học {len(days)} ngày, "
                f"hoàn thành {counts['lesson']} bài, làm {counts['quiz']} lượt trắc nghiệm "
                f"và ôn {counts['review']} câu. Chuỗi học hiện tại là {streak} ngày."
            ),
        )
