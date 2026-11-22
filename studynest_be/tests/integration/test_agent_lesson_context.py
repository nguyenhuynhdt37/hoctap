"""Full lesson pages, own notes and completion authority against isolated PostgreSQL."""

import os
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.agent.contracts import RunState
from app.agent.learning_context import ContentPage, complete, content, course_context
from app.agent.runtime import AgentService
from app.db.models.database import (
    CourseEnrollments,
    Courses,
    LessonChunks,
    LessonNotes,
    Lessons,
)
from tests.integration.test_learning_agent_security import domain  # noqa: F401

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("TEST_DATABASE_ASYNC_URL"), reason="Explicit scratch DB required"
    ),
]


def context(d):
    service = AgentService(d.db, d.learner, str(uuid4()))
    service.session = SimpleNamespace(
        course_id=d.course.id, lesson_id=d.lesson.id, capabilities=[], snapshot={}
    )
    service.run = SimpleNamespace(thread_id=None)
    return service


async def test_entire_content_is_readable_by_pages_and_notes_stay_private(domain):
    d = domain
    text = "lesson context " * 2200
    d.db.add(
        LessonChunks(
            lesson_id=d.lesson.id, chunk_index=1, text_=text, source_kind="unknown"
        )
    )
    d.db.add_all(
        [
            LessonNotes(
                lesson_id=d.lesson.id,
                user_id=d.learner.id,
                time_seconds=479,
                content="Tôi cần ôn lại phần này",
            ),
            LessonNotes(
                lesson_id=d.lesson.id,
                user_id=d.course.instructor_id,
                time_seconds=1,
                content="PRIVATE OTHER NOTES",
            ),
        ]
    )
    await d.db.flush()
    ctx = context(d)
    chunks = []
    offset = 0
    while True:
        page = await content(ctx, ContentPage(section="transcript", offset=offset))
        chunks.append(page["content"])
        if page["next_offset"] is None:
            break
        offset = page["next_offset"]
    assert "".join(chunks) == text
    notes = await content(ctx, ContentPage(section="notes"))
    assert "479s" in notes["content"] and "Tôi cần ôn lại" in notes["content"]
    assert "PRIVATE OTHER" not in notes["content"]
    exercises = await content(ctx, ContentPage(section="exercises"))
    quiz = await content(ctx, ContentPage(section="quiz"))
    assert "TEACHER_SECRET" not in str(exercises) + str(quiz)
    assert "HIDDEN" not in str(exercises) + str(quiz)


async def test_active_lesson_and_current_course_are_authoritative(domain):
    d = domain
    ctx = context(d)
    result = await course_context(ctx, None)
    assert result["active_lesson_id"] == str(d.lesson.id)
    assert [row["id"] for row in result["lessons"] if row["is_active"]] == [
        str(d.lesson.id)
    ]
    other = Courses(
        title="Other",
        slug="other-" + uuid4().hex,
        instructor_id=d.course.instructor_id,
        is_lock_lesson=False,
    )
    d.db.add(other)
    await d.db.flush()
    foreign = Lessons(
        course_id=other.id,
        title="Foreign",
        lesson_type="article",
        description="OUTSIDE COURSE",
        position=0,
    )
    d.db.add(foreign)
    d.db.add(
        CourseEnrollments(course_id=other.id, user_id=d.learner.id, status="active")
    )
    await d.db.flush()
    with pytest.raises(HTTPException) as exc:
        await content(ctx, ContentPage(lesson_id=foreign.id))
    assert exc.value.status_code == 403


async def test_tool_cannot_complete_code_without_saved_passing_tests_or_unwatched_video(
    domain,
):
    d = domain
    ctx = context(d)
    with pytest.raises(HTTPException) as exc:
        await complete(ctx, None)
    assert exc.value.status_code == 409


async def test_article_completion_persists_and_is_idempotent(domain):
    d = domain
    d.lesson.lesson_type = "article"
    await d.db.flush()
    ctx = context(d)
    result = await complete(ctx, None)
    assert result["is_completed"] is True
    repeat = await complete(ctx, None)
    assert repeat["status"] == "already_completed"


async def test_model_cannot_complete_without_user_request(domain):
    d = domain
    ctx = context(d)
    run = SimpleNamespace(
        message="Giải thích bài học này", session_id=uuid4(), state=RunState.PLANNING
    )
    from unittest.mock import AsyncMock

    ctx._assert_running_async = AsyncMock(return_value=run)
    ctx.get_session_async = AsyncMock(return_value=ctx.session)
    with pytest.raises(HTTPException) as exc:
        await ctx._execute_tool_async(uuid4(), "learning.complete_lesson", {})
    assert exc.value.status_code == 403


async def test_unwatched_video_is_not_completed_by_agent(domain):
    d = domain
    d.lesson.lesson_type = "video"
    await d.db.flush()
    with pytest.raises(HTTPException) as exc:
        await complete(context(d), None)
    assert exc.value.status_code == 409
    assert "30%" in exc.value.detail


async def test_quiz_completion_rejects_stale_attempt_then_uses_current_evidence(domain):
    from app.db.models.quiz_attempts import QuizAttempt
    from app.services.user.quiz_attempts import QuizAttemptService

    d = domain
    d.lesson.lesson_type = "quiz"
    await d.db.flush()
    attempt = QuizAttempt(
        user_id=d.learner.id,
        lesson_id=d.lesson.id,
        idempotency_key=uuid4(),
        request_hash="a" * 64,
        content_hash="b" * 64,
        correct=1,
        total=1,
        details=[],
    )
    d.db.add(attempt)
    await d.db.flush()
    with pytest.raises(HTTPException) as exc:
        await complete(context(d), None)
    assert exc.value.status_code == 409
    attempt.content_hash = await QuizAttemptService(d.db).current_content_hash_async(
        d.learner.id, d.lesson.id
    )
    await d.db.flush()
    result = await complete(context(d), None)
    assert result["is_completed"] is True


async def test_course_contents_cannot_unlock_locked_lesson(domain):
    d = domain
    d.course.is_lock_lesson = True
    locked = Lessons(
        course_id=d.course.id,
        title="Locked",
        lesson_type="article",
        description="LOCKED CONTENT",
        position=10,
        is_preview=False,
    )
    d.db.add(locked)
    await d.db.flush()
    with pytest.raises(HTTPException) as exc:
        await content(context(d), ContentPage(lesson_id=locked.id))
    assert exc.value.status_code == 403
