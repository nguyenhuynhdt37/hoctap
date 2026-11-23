from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, column, func, select, true
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from app.db.models.database import CourseSections, Courses, LessonQuizOptions, LessonQuizzes, Lessons
from app.db.models.learning_hub import ReviewAnswer, ReviewItem
from app.db.models.quiz_attempts import QuizAttempt
from app.schemas.learning_hub import (
    ReviewAnswerInput, ReviewAnswerResult, ReviewQueue, ReviewQueueItem, ReviewRating,
)
from app.services.gamification.mission_clock import daily_window
from app.services.user.learning_access import require_lesson_access
from app.services.user.learning_hub.common import active_courses, lesson_href, lock_learner
from app.services.user.quiz_attempts import question_snapshot, quiz_snapshot_hash


def next_review(
    now: datetime, correct: bool, rating: ReviewRating, repetitions: int, interval_days: int, ease_factor: float,
) -> tuple[int, int, float, datetime]:
    remembered = correct and rating == "remembered"
    ease = round(min(3.0, max(1.3, ease_factor + (0.1 if remembered else -0.32))), 2)
    if remembered:
        repetitions += 1
        days = {1: 1, 2: 6}.get(repetitions, min(365, int(interval_days * ease + 0.5)))
    else:
        repetitions, days = 0, 1
    _, today_start, _ = daily_window(now)
    return repetitions, days, ease, today_start + timedelta(days=days)


@dataclass
class ReviewQuestion:
    quiz: LessonQuizzes
    options: list[LessonQuizOptions]

    @property
    def correct_options(self):
        return [option for option in self.options if option.is_correct]


@dataclass
class ReviewCard:
    item: ReviewItem
    question: ReviewQuestion
    lesson: Lessons
    course: Courses
    section: CourseSections | None

    def view(self):
        return ReviewQueueItem(
            item_id=self.item.id,
            quiz_id=self.question.quiz.id,
            question=self.question.quiz.question,
            options=[{"id": option.id, "text": option.text_} for option in self.question.options],
            due_at=self.item.due_at,
            difficulty=self.question.quiz.difficulty_level,
            course=self.course,
            section=self.section,
            lesson=self.lesson,
            lesson_href=lesson_href(self.course, self.lesson.id),
        )


class ReviewService:
    def __init__(self, db: AsyncSession, *, now: datetime | None = None):
        self.db = db
        self.now = now

    async def _wrong_questions(self, user_id, course_ids, now):
        # Extract only distinct question identities in Postgres, not historical answer snapshots.
        detail = func.jsonb_array_elements(QuizAttempt.details).table_valued(column("value", JSONB)).lateral()
        question_id = detail.c.value["question_id"].as_string()
        rows = await self.db.execute(
            select(QuizAttempt.lesson_id, question_id)
            .join(Lessons, Lessons.id == QuizAttempt.lesson_id)
            .join(detail, true())
            .where(QuizAttempt.user_id == user_id, Lessons.course_id.in_(course_ids),
                   Lessons.lesson_type == "quiz", QuizAttempt.created_at <= now,
                   QuizAttempt.correct < QuizAttempt.total,
                   QuizAttempt.details.contains([{"is_correct": False}]),
                   detail.c.value["is_correct"].as_boolean().is_(False), question_id.is_not(None))
            .distinct()
        )
        wrong: dict[UUID, set[str]] = defaultdict(set)
        for lesson_id, question in rows:
            wrong[lesson_id].add(question)
        return wrong

    async def _load_questions(self, lesson_ids):
        # Read the entire current version in a single statement, including option edits and deletions.
        rows = await self.db.execute(
            select(LessonQuizzes, LessonQuizOptions)
            .options(load_only(LessonQuizzes.id, LessonQuizzes.lesson_id, LessonQuizzes.question,
                               LessonQuizzes.explanation, LessonQuizzes.difficulty_level),
                     load_only(LessonQuizOptions.id, LessonQuizOptions.text_, LessonQuizOptions.is_correct,
                               LessonQuizOptions.position))
            .outerjoin(LessonQuizOptions, LessonQuizOptions.quiz_id == LessonQuizzes.id)
            .where(LessonQuizzes.lesson_id.in_(lesson_ids))
            .order_by(LessonQuizzes.id, func.coalesce(LessonQuizOptions.position, 0), LessonQuizOptions.id)
            .execution_options(populate_existing=True)
        )
        questions: dict[UUID, dict[UUID, ReviewQuestion]] = defaultdict(dict)
        for quiz, option in rows:
            lesson_questions = questions[quiz.lesson_id]
            if quiz.id not in lesson_questions:
                lesson_questions[quiz.id] = ReviewQuestion(quiz, [])
            if option is not None:
                lesson_questions[quiz.id].options.append(option)
        return questions

    async def _cards(self, user_id, now, course_id=None, *, requested_lesson_id=None):
        courses = await active_courses(self.db, user_id, [course_id] if course_id else None, lock=True)
        if not courses:
            return {}, set()
        wrong = await self._wrong_questions(user_id, list(courses), now)
        existing = list(await self.db.scalars(
            select(ReviewItem)
            .join(Lessons, Lessons.id == ReviewItem.lesson_id)
            .where(ReviewItem.user_id == user_id, ReviewItem.invalidated_at.is_(None),
                   Lessons.course_id.in_(list(courses)))
            .execution_options(populate_existing=True)
        ))
        lesson_ids = set(wrong) | {item.lesson_id for item in existing}
        if requested_lesson_id is not None:
            lesson_ids.add(requested_lesson_id)
        if not lesson_ids:
            return {}, set()

        lessons = await self.db.execute(
            select(Lessons, CourseSections)
            .options(load_only(Lessons.id, Lessons.course_id, Lessons.title, Lessons.lesson_type),
                     load_only(CourseSections.id, CourseSections.title, CourseSections.position))
            .outerjoin(CourseSections, and_(CourseSections.id == Lessons.section_id,
                                           CourseSections.course_id == Lessons.course_id))
            .where(Lessons.id.in_(lesson_ids), Lessons.course_id.in_(list(courses)))
            .execution_options(populate_existing=True)
        )
        allowed = {}
        for lesson, section in lessons:
            course = courses[lesson.course_id]
            if course.is_lock_lesson:
                try:
                    await require_lesson_access(self.db, user_id, lesson.id, course_id=course.id)
                except HTTPException as exc:
                    if exc.status_code in (403, 404):
                        continue
                    raise
            allowed[lesson.id] = (lesson, course, section)

        candidates = {}
        quiz_lessons = [lesson_id for lesson_id, (lesson, _, _) in allowed.items() if lesson.lesson_type == "quiz"]
        questions = await self._load_questions(quiz_lessons) if quiz_lessons else {}
        for lesson_id, quiz_set in questions.items():
            signature = quiz_snapshot_hash([question_snapshot(q.quiz, q.options) for q in quiz_set.values()])
            for quiz_id, question in quiz_set.items():
                if str(quiz_id) in wrong.get(lesson_id, ()) and len(question.correct_options) == 1:
                    candidates[quiz_id] = (signature, question)

        current = {}
        for item in existing:
            if item.lesson_id not in allowed:
                continue
            candidate = candidates.get(item.quiz_id)
            if candidate is None or item.content_hash != candidate[0] or item.lesson_id != candidate[1].quiz.lesson_id:
                item.invalidated_at = now
            else:
                current[item.quiz_id] = item
        # Release the partial unique index entries before inserting replacements.
        await self.db.flush()
        cards = {}
        for quiz_id, (signature, question) in candidates.items():
            lesson_id = question.quiz.lesson_id
            item = current.get(quiz_id)
            if item is None:
                item = ReviewItem(user_id=user_id, lesson_id=lesson_id, quiz_id=quiz_id,
                                  content_hash=signature, due_at=now)
                self.db.add(item)
            cards[quiz_id] = ReviewCard(item, question, *allowed[lesson_id])
        await self.db.flush()
        return cards, set(allowed)

    async def queue(self, user_id, *, course_id=None, section_id=None, limit=20):
        await lock_learner(self.db, "review", user_id)
        now = self.now or datetime.now(UTC)
        cards, _ = await self._cards(user_id, now, course_id)
        due = sorted(
            (card for card in cards.values()
             if card.item.due_at <= now and (section_id is None or (card.section.id if card.section else card.course.id) == section_id)),
            key=lambda card: (card.item.due_at, card.item.id),
        )
        result = ReviewQueue(due_count=len(due), items=[card.view() for card in due[:limit]])
        await self.db.commit()
        return result

    async def answer(self, user_id: UUID, item_id: UUID, payload: ReviewAnswerInput) -> ReviewAnswerResult:
        # Waiting behind another answer cannot make this request eligible for a new cycle.
        received_at = self.now or datetime.now(UTC)
        await lock_learner(self.db, "review", user_id)
        now = self.now or datetime.now(UTC)
        item = await self.db.scalar(select(ReviewItem).where(ReviewItem.id == item_id, ReviewItem.user_id == user_id))
        if item is None:
            raise HTTPException(404, "Không tìm thấy câu ôn tập.")

        cards, allowed_lessons = await self._cards(user_id, now, requested_lesson_id=item.lesson_id)
        if item.lesson_id not in allowed_lessons:
            raise HTTPException(404, "Câu ôn tập không còn khả dụng.")
        card = cards.get(item.quiz_id)
        if card is None or card.item.id != item_id:
            await self.db.commit()
            raise HTTPException(409, "Câu hỏi đã thay đổi. Vui lòng tải lại hàng đợi.")

        receipt = await self.db.scalar(select(ReviewAnswer).where(
            ReviewAnswer.user_id == user_id, ReviewAnswer.idempotency_key == payload.idempotency_key,
        ))
        if receipt is not None:
            if (receipt.item_id, receipt.option_id, receipt.self_rating) != (
                item_id, payload.option_id, payload.self_rating,
            ):
                raise HTTPException(409, "Yêu cầu trùng mã nhưng khác nội dung.")
            result = ReviewAnswerResult.model_validate(receipt.result)
            await self.db.commit()
            return result
        if card.item.due_at > received_at:
            raise HTTPException(409, "Câu hỏi chưa đến hạn ôn lại.")
        if all(option.id != payload.option_id for option in card.question.options):
            raise HTTPException(422, "Lựa chọn không thuộc câu hỏi.")

        correct_id = card.question.correct_options[0].id
        correct = payload.option_id == correct_id
        item.repetitions, item.interval_days, item.ease_factor, item.due_at = next_review(
            now, correct, payload.self_rating, item.repetitions, item.interval_days, item.ease_factor,
        )
        result = ReviewAnswerResult(
            correct=correct, correct_option_id=correct_id, explanation=card.question.quiz.explanation or "",
            next_due_at=item.due_at, interval_days=item.interval_days,
            due_count=sum(card.item.due_at <= now for card in cards.values()),
        )
        self.db.add(ReviewAnswer(
            user_id=user_id, item_id=item_id, idempotency_key=payload.idempotency_key,
            option_id=payload.option_id, self_rating=payload.self_rating, result=result.model_dump(mode="json"),
            answered_at=now,
        ))
        await self.db.commit()
        return result
