"""Real PostgreSQL memory isolation/lifecycle and public catalog evidence."""
import os
from datetime import UTC,datetime,timedelta
from uuid import uuid4
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from tests.integration.test_learning_agent_security import domain
from app.agent.memory import MemoryConsentInput,MemoryProposal,MemoryService
from app.agent.advisor import AdvisorInput,CourseAdvisorService
from app.db.models.database import TutorChatMessages,TutorChatThreads
from app.db.models.learning_memory import LearningMemoryItem

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Explicit scratch DB required')]

async def test_consent_confirm_isolation_delete_and_tombstone(domain):
    d=domain;memory=MemoryService(d.db,d.learner.id)
    await memory.set_consent_async(MemoryConsentInput(enabled=True,retention_days=30))
    proposal=MemoryProposal(scope='course',course_id=d.course.id,kind='learning_goal',content='Luyện vòng lặp')
    item=await memory.propose_async(proposal)
    assert not await memory.context_async(d.course.id,d.lesson.id)
    confirmed=await memory.confirm_async(item['id'])
    assert confirmed['status']=='confirmed'
    assert len(await memory.context_async(d.course.id,d.lesson.id))==1
    other=MemoryService(d.db,d.outsider.id)
    with pytest.raises(HTTPException) as exc: await other.delete_async(item['id'])
    assert exc.value.status_code==404
    await memory.delete_async(item['id'])
    assert not await memory.context_async(d.course.id,d.lesson.id)
    with pytest.raises(HTTPException) as exc: await memory.propose_async(proposal)
    assert exc.value.status_code==409
    row=await d.db.get(LearningMemoryItem,item['id'])
    assert row.content=='' and row.evidence==[]

async def test_agent_memory_requires_owned_evidence_and_revocation_erases(domain):
    d=domain;memory=MemoryService(d.db,d.learner.id)
    await memory.set_consent_async(MemoryConsentInput(enabled=True))
    data=MemoryProposal(scope='lesson',lesson_id=d.lesson.id,kind='review_topic',content='Vòng lặp')
    with pytest.raises(HTTPException) as exc: await memory.propose_async(data,from_agent=True)
    assert exc.value.status_code==422
    thread=TutorChatThreads(user_id=d.learner.id,course_id=d.course.id,lesson_id=d.lesson.id,scope='lesson')
    d.db.add(thread);await d.db.flush()
    message=TutorChatMessages(thread_id=thread.id,user_id=d.learner.id,role='user',content='Mình muốn ôn vòng lặp',sources=[])
    d.db.add(message);await d.db.flush()
    data.evidence_message_ids=[message.id]
    item=await memory.propose_async(data,from_agent=True)
    assert item['confidence']==0 and item['source_type']=='agent_proposed'
    await memory.confirm_async(item['id'])
    await memory.set_consent_async(MemoryConsentInput(enabled=False))
    assert (await memory.consent_async())['enabled'] is False
    assert not await memory.context_async(d.course.id,d.lesson.id)
    await d.db.refresh(await d.db.get(LearningMemoryItem,item['id']))
    assert (await d.db.get(LearningMemoryItem,item['id'])).content==''

async def test_expiration_and_public_metadata_advice(domain):
    d=domain;memory=MemoryService(d.db,d.learner.id)
    await memory.set_consent_async(MemoryConsentInput(enabled=True))
    item=await memory.propose_async(MemoryProposal(scope='profile',kind='learning_goal',content='Học Python'))
    await memory.confirm_async(item['id'])
    row=await d.db.get(LearningMemoryItem,item['id']);row.expires_at=datetime.now(UTC)-timedelta(seconds=1);await d.db.flush()
    assert not await memory.context_async(d.course.id,d.lesson.id)
    advisor=CourseAdvisorService(d.db)
    result=await advisor.advise_async(AdvisorInput(course_id=d.course.id,grade=12))
    assert result.course_id==d.course.id and result.sources[0]['type']=='course_metadata'
    d.course.is_published=False;await d.db.flush()
    with pytest.raises(HTTPException) as exc: await advisor.course_context_async(d.course.id)
    assert exc.value.status_code==404
