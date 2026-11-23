from collections import defaultdict
from datetime import UTC, datetime
from statistics import mean
from typing import NamedTuple
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from app.db.models.database import CourseSections, LessonQuizzes
from app.db.models.quiz_attempts import QuizAttempt
from app.schemas.learning_hub import (
    CourseCard, CourseMastery, CourseMasterySummary, LessonMastery, MasteryCourses, MasteryStatus, SectionMastery,
)
from app.services.user.learning_hub.common import active_courses, curriculum_query, lesson_href

SOLID_PERCENT = 80
EVIDENCE_HALF_LIFE_DAYS = 14
RETENTION_HALF_LIFE_DAYS = 60
RECENT_ATTEMPTS = 12


class Assessment(NamedTuple):
    score: float | None
    status: MasteryStatus
    wrong_count: int
    last_seen_at: datetime | None
    accuracy: float | None


def classify(has_quiz: bool, score: float | None, accuracy: float | None) -> MasteryStatus:
    if not has_quiz:
        return "no_quiz"
    if score is None:
        return "not_started"
    if score >= SOLID_PERCENT:
        return "solid"
    if accuracy is not None and accuracy >= SOLID_PERCENT:
        return "fading"
    return "needs_review"


def age_days(now: datetime, timestamp: datetime) -> float:
    return max(0, (now - timestamp).total_seconds() / 86400)


def attempt_accuracy(attempt, difficulties: dict[str, int]) -> tuple[float, int] | None:
    if not attempt.details:
        if attempt.total <= 0:
            return None
        return 100 * attempt.correct / attempt.total, attempt.total - attempt.correct

    points = maximum = wrong = 0
    for answer in attempt.details:
        weight = difficulties.get(answer.get("question_id"))
        correct = answer.get("is_correct")
        if weight is None or not isinstance(correct, bool):
            continue
        maximum += weight
        if correct:
            points += weight
        else:
            wrong += 1
    return (100 * points / maximum, wrong) if maximum else None


def assess(attempts, difficulties: dict[str, int], now: datetime) -> Assessment:
    if not difficulties:
        return Assessment(None, "no_quiz", 0, None, None)
    samples = [(attempt.created_at, *evidence) for attempt in attempts
               if (evidence := attempt_accuracy(attempt, difficulties)) is not None]
    if not samples:
        return Assessment(None, "not_started", 0, None, None)
    latest, _, wrong = samples[0]
    weights = [2 ** (-age_days(latest, timestamp) / EVIDENCE_HALF_LIFE_DAYS) for timestamp, _, _ in samples]
    accuracy = sum(weight * sample[1] for weight, sample in zip(weights, samples)) / sum(weights)
    score = round(accuracy * 2 ** (-age_days(now, latest) / RETENTION_HALF_LIFE_DAYS), 2)
    return Assessment(score, classify(True, score, accuracy), wrong, latest, accuracy)


def aggregate(assessments: list[Assessment]) -> tuple[float | None, MasteryStatus]:
    scored = [item for item in assessments if item.score is not None]
    score = round(mean(item.score for item in scored), 2) if scored else None
    accuracy = mean(item.accuracy for item in scored) if scored else None
    return score, classify(any(item.status != "no_quiz" for item in assessments), score, accuracy)


class MasteryService:
    def __init__(self, db: AsyncSession, *, now: datetime | None = None):
        self.db = db
        self.now = now

    async def _assessments(self, user_id, lessons):
        quiz_lessons = [lesson.id for lesson in lessons if lesson.lesson_type == "quiz"]
        difficulties: dict[UUID, dict[str, int]] = defaultdict(dict)
        attempts: dict[UUID, list] = defaultdict(list)
        now = self.now or datetime.now(UTC)
        if quiz_lessons:
            questions = await self.db.execute(
                select(LessonQuizzes.lesson_id, LessonQuizzes.id, LessonQuizzes.difficulty_level)
                .where(LessonQuizzes.lesson_id.in_(quiz_lessons))
            )
            for lesson_id, quiz_id, difficulty in questions:
                difficulties[lesson_id][str(quiz_id)] = max(1, difficulty or 1)

        if difficulties:
            ranked = (
                select(QuizAttempt.id, func.row_number().over(
                    partition_by=QuizAttempt.lesson_id, order_by=(QuizAttempt.created_at.desc(), QuizAttempt.id.desc()),
                ).label("rank"))
                .where(QuizAttempt.user_id == user_id, QuizAttempt.lesson_id.in_(list(difficulties)),
                       QuizAttempt.total > 0, QuizAttempt.created_at <= now)
                .subquery()
            )
            rows = await self.db.scalars(
                select(QuizAttempt)
                .join(ranked, ranked.c.id == QuizAttempt.id)
                .where(ranked.c.rank <= RECENT_ATTEMPTS)
                .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
            )
            for row in rows:
                attempts[row.lesson_id].append(row)
        return {lesson.id: assess(attempts[lesson.id], difficulties[lesson.id], now) for lesson in lessons}

    async def courses(self, user_id: UUID) -> MasteryCourses:
        courses = await active_courses(self.db, user_id)
        if not courses:
            return MasteryCourses(courses=[])
        lessons = list(await self.db.scalars(curriculum_query(list(courses))))
        assessment = await self._assessments(user_id, lessons)
        by_course = defaultdict(list)
        for lesson in lessons:
            by_course[lesson.course_id].append(assessment[lesson.id])
        results = []
        for course in sorted(courses.values(), key=lambda course: (course.title.casefold(), course.id)):
            items = by_course[course.id]
            score, status = aggregate(items)
            results.append(CourseMasterySummary(
                **CourseCard.model_validate(course).model_dump(), course_score=score, status=status,
                quiz_lessons=sum(item.status != "no_quiz" for item in items), total_lessons=len(items),
            ))
        return MasteryCourses(courses=results)

    async def course(self, user_id: UUID, course_id: UUID) -> CourseMastery:
        courses = await active_courses(self.db, user_id, [course_id])
        if course_id not in courses:
            raise HTTPException(403, "Bạn chưa có quyền truy cập khóa học này.")
        course = courses[course_id]
        lessons = list(await self.db.scalars(curriculum_query([course_id])))
        assessment = await self._assessments(user_id, lessons)
        sections = list(await self.db.scalars(
            select(CourseSections)
            .options(load_only(CourseSections.id, CourseSections.title, CourseSections.position))
            .where(CourseSections.course_id == course_id)
            .order_by(CourseSections.position, CourseSections.id)
        ))
        section_ids = {section.id for section in sections}
        by_section = defaultdict(list)
        for lesson in lessons:
            item = assessment[lesson.id]
            section_id = lesson.section_id if lesson.section_id in section_ids else course_id
            by_section[section_id].append(LessonMastery(
                id=lesson.id, title=lesson.title, lesson_type=lesson.lesson_type, position=lesson.position,
                has_quiz=item.status != "no_quiz", score=item.score, status=item.status,
                last_seen_at=item.last_seen_at, wrong_count=item.wrong_count, href=lesson_href(course, lesson.id),
            ))

        def section_view(section_id, title, position):
            items = by_section[section_id]
            score, status = aggregate([assessment[item.id] for item in items])
            return SectionMastery(id=section_id, title=title, position=position, score=score, status=status, lessons=items)

        views = [section_view(section.id, section.title, section.position) for section in sections]
        if course_id in by_section:
            views.append(section_view(course_id, "Bài học khác", sections[-1].position + 1 if sections else 1))
        score, status = aggregate(list(assessment.values()))
        return CourseMastery(course=course, course_score=score, status=status, sections=views)
