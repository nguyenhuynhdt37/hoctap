"""Durability and account boundaries in a disposable PostgreSQL database."""
import os
from types import SimpleNamespace
from uuid import UUID
import pytest
from sqlalchemy import delete, select
from tests.integration.test_learning_agent_security import domain
from app.agent.memory import MemoryConsentInput, MemoryProposal, MemoryService
from app.agent.sql_sandbox import account_query
from app.agent.tools import AccountSQL
from app.db.models.database import Courses, CourseEnrollments, LessonProgress, TutorChatMessages, TutorChatThreads, User
from app.db.models.learning_memory import LearningMemoryItem
from app.services.user.tutor_chat import TutorChatService

pytestmark = [pytest.mark.asyncio, pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'), reason='Explicit scratch DB required')]


async def test_lifetime_memory_and_history_survive_source_deletion(domain):
    d = domain
    learner_id = d.learner.id
    memory = MemoryService(d.db, d.learner.id)
    await memory.set_consent_async(MemoryConsentInput(enabled=True))
    source = Courses(title='Removable source', slug=f'removable-{d.learner.id}', instructor_id=d.course.instructor_id, is_lock_lesson=False, is_published=True, approval_status='approved')
    d.db.add(source); await d.db.flush()
    d.db.add(CourseEnrollments(user_id=d.learner.id, course_id=source.id, status='active')); await d.db.flush()
    item = await memory.propose_async(MemoryProposal(scope='course', course_id=source.id, kind='learning_goal', content='Learning goal preserved for my account'))
    await memory.confirm_async(item['id'])
    assert (await d.db.get(LearningMemoryItem, item['id'])).expires_at is None
    threads = TutorChatService(d.db)
    first = await threads.get_or_create_account_thread(d.learner.id)
    second = await threads.get_or_create_account_thread(d.learner.id)
    assert first['thread']['id'] == second['thread']['id']
    thread_id = UUID(first['thread']['id'])
    d.db.add(TutorChatMessages(thread_id=thread_id, user_id=d.learner.id, role='user', content='Remember my account history', sources=[]))
    await d.db.flush()
    await d.db.execute(delete(Courses).where(Courses.id == source.id))
    await d.db.commit()
    d.db.expire_all()
    saved = await d.db.get(LearningMemoryItem, item['id'])
    assert saved.course_id is None and saved.content == item['content'] and saved.expires_at is None
    assert await d.db.get(TutorChatThreads, thread_id)
    assert await d.db.scalar(select(TutorChatMessages).where(TutorChatMessages.thread_id == thread_id))
    # Removing the account is the lifetime boundary.
    await d.db.execute(delete(User).where(User.id == learner_id))
    await d.db.commit()
    d.db.expire_all()
    assert await d.db.get(LearningMemoryItem, item['id']) is None
    assert await d.db.get(TutorChatThreads, thread_id) is None


async def test_sql_snapshot_only_contains_the_current_users_rows(domain):
    d = domain
    d.db.add_all([
        LessonProgress(user_id=d.learner.id, course_id=d.course.id, lesson_id=d.lesson.id, is_completed=False),
        LessonProgress(user_id=d.outsider.id, course_id=d.course.id, lesson_id=d.lesson.id, is_completed=True),
    ])
    await d.db.flush()
    result = await account_query(SimpleNamespace(db=d.db, user=d.learner), AccountSQL(sql='SELECT count(*), sum(completed) FROM my_progress'))
    assert result['rows'] == [[1, 0]]
    result = await account_query(SimpleNamespace(db=d.db, user=d.outsider), AccountSQL(sql='SELECT count(*) FROM my_progress'))
    assert result['rows'] == [[0]]
