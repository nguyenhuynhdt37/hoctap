from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import Numeric, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.code_attempts import CodeTestAttempt
from app.db.models.database import CourseSections, LessonCodes, LessonProgress, Lessons, UserCheckins
from app.db.models.quiz_attempts import QuizAttempt
from app.services.gamification.mission_clock import VIETNAM


@dataclass
class CourseEvidence:
    sections: dict[UUID, CourseSections] = field(default_factory=dict)
    lesson_counts: Counter[UUID | None] = field(default_factory=Counter)
    completed_counts: Counter[UUID | None] = field(default_factory=Counter)
    first_quizzes: dict[UUID | None, UUID] = field(default_factory=dict)
    best_quiz: dict[UUID | None, tuple[int, int]] = field(default_factory=dict)
    study_days: set[date] = field(default_factory=set)

    def weekly_progress(self, day: date, target: int) -> int:
        week = day - timedelta(days=day.weekday())
        counts = Counter(d - timedelta(days=d.weekday()) for d in self.study_days)
        if any(count >= target for count in counts.values()):
            return target
        return counts[week]


async def load_mission_evidence(
    db: AsyncSession,
    user_id: UUID,
    course_ids: list[UUID],
    day: date,
    start: datetime,
    now: datetime,
) -> tuple[dict[UUID, CourseEvidence], Counter[str]]:
    daily: Counter[str] = Counter()
    daily["daily_checkin.completed"] = await db.scalar(
        select(func.count()).select_from(UserCheckins)
        .where(UserCheckins.user_id == user_id, UserCheckins.checkin_date == day)
    )
    evidence = {course_id: CourseEvidence() for course_id in course_ids}
    if not evidence:
        return evidence, daily

    sections = await db.scalars(
        select(CourseSections).where(CourseSections.course_id.in_(course_ids))
        .order_by(CourseSections.position, CourseSections.id)
    )
    for section in sections:
        evidence[section.course_id].sections[section.id] = section

    lessons = await db.execute(
        select(Lessons.course_id, Lessons.section_id, Lessons.id, Lessons.lesson_type,
               LessonProgress.is_completed, LessonProgress.completed_at)
        .outerjoin(LessonProgress, and_(
            LessonProgress.lesson_id == Lessons.id,
            LessonProgress.course_id == Lessons.course_id,
            LessonProgress.user_id == user_id,
        ))
        .where(Lessons.course_id.in_(course_ids))
        .order_by(Lessons.position, Lessons.id)
    )
    for course_id, section_id, lesson_id, lesson_type, completed, completed_at in lessons:
        course = evidence[course_id]
        course.lesson_counts[section_id] += 1
        if lesson_type == "quiz":
            course.first_quizzes.setdefault(section_id, lesson_id)
        if completed:
            course.completed_counts[section_id] += 1
            if completed_at is not None and completed_at <= now:
                course.study_days.add(completed_at.astimezone(VIETNAM).date())
                if completed_at >= start:
                    daily["lesson.completed"] += 1

    # Select one attempt per lesson per local day and compare the exact score ratios below.
    quiz_day = func.date(func.timezone(VIETNAM.key, QuizAttempt.created_at))
    quiz_rows = await db.execute(
        select(Lessons.course_id, Lessons.section_id, QuizAttempt.lesson_id,
               QuizAttempt.correct, QuizAttempt.total, quiz_day)
        .join(Lessons, Lessons.id == QuizAttempt.lesson_id)
        .where(QuizAttempt.user_id == user_id, Lessons.course_id.in_(course_ids),
               Lessons.lesson_type == "quiz", QuizAttempt.total > 0, QuizAttempt.created_at <= now)
        .distinct(QuizAttempt.lesson_id, quiz_day)
        .order_by(QuizAttempt.lesson_id, quiz_day, (QuizAttempt.correct.cast(Numeric) / QuizAttempt.total).desc())
    )
    daily_quizzes = set()
    for course_id, section_id, lesson_id, correct, total, activity_date in quiz_rows:
        course = evidence[course_id]
        previous_correct, previous_total = course.best_quiz.get(section_id, (-1, 1))
        if correct * previous_total > previous_correct * total:
            course.best_quiz[section_id] = (correct, total)
        course.study_days.add(activity_date)
        if activity_date == day:
            daily_quizzes.add(lesson_id)
    daily["quiz.completed"] = len(daily_quizzes)

    code_day = func.date(func.timezone(VIETNAM.key, CodeTestAttempt.created_at))
    codes = await db.execute(
        select(Lessons.course_id, Lessons.id, code_day).distinct()
        .select_from(CodeTestAttempt)
        .join(LessonCodes, LessonCodes.id == CodeTestAttempt.exercise_id)
        .join(Lessons, Lessons.id == LessonCodes.lesson_id)
        .where(
            CodeTestAttempt.user_id == user_id, Lessons.course_id.in_(course_ids),
            Lessons.lesson_type == "code", CodeTestAttempt.mode == "allowed",
            CodeTestAttempt.status == "passed", CodeTestAttempt.result["saved"].as_boolean().is_(True),
            CodeTestAttempt.created_at <= now,
        )
    )
    daily_code = set()
    for course_id, lesson_id, activity_date in codes:
        evidence[course_id].study_days.add(activity_date)
        if activity_date == day:
            daily_code.add(lesson_id)
    daily["code.completed"] = len(daily_code)
    return evidence, daily
