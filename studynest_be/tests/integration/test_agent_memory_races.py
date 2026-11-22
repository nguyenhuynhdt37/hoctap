"""Adversarial memory deletion/consent races against independent PostgreSQL sessions."""
import asyncio
import os
from uuid import uuid4
import pytest
from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from tests.integration.test_learning_agent_security import domain
from app.agent.memory import MemoryService,MemoryConsentInput,MemoryProposal
from app.db.models.database import User,TutorChatThreads,TutorChatMessages
from app.db.models.learning_memory import LearningMemoryItem,AgentThreadSummary,LearningMemoryConsent

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Explicit scratch DB required')]


async def test_proposal_cannot_survive_concurrent_consent_revocation(async_engine):
    async with AsyncSession(async_engine,expire_on_commit=False) as setup:
        user=User(fullname='Memory race fixture',email=f'{uuid4()}@example.test',password='unused')
        setup.add(user);await setup.flush();user_id=user.id
        await MemoryService(setup,user_id).set_consent_async(MemoryConsentInput(enabled=True))
    first=None;second=None
    try:
        async with AsyncSession(async_engine,expire_on_commit=False) as one,AsyncSession(async_engine,expire_on_commit=False) as two:
            writer=MemoryService(one,user_id);revoker=MemoryService(two,user_id)
            entered=asyncio.Event();gate=asyncio.Event();original=writer._scope_access_async
            async def pause(*args,**kwargs):
                entered.set();await gate.wait();return await original(*args,**kwargs)
            writer._scope_access_async=pause
            first=asyncio.create_task(writer.propose_async(MemoryProposal(scope='profile',kind='learning_goal',content='Never retain after revoke')))
            await asyncio.wait_for(entered.wait(),3)
            second=asyncio.create_task(revoker.set_consent_async(MemoryConsentInput(enabled=False)))
            await asyncio.sleep(.05)
            assert not second.done(),'Revocation must serialize with the already admitted proposal'
            gate.set()
            proposed,_=await asyncio.wait_for(asyncio.gather(first,second),5)
            async with AsyncSession(async_engine) as observer:
                row=await observer.get(LearningMemoryItem,proposed['id'])
                assert row.status=='deleted' and row.content=='' and row.evidence==[]
                assert not (await observer.get(LearningMemoryConsent,user_id)).enabled
    finally:
        for task in [first,second]:
            if task and not task.done():task.cancel()
        await asyncio.gather(*(t for t in [first,second] if t),return_exceptions=True)
        async with AsyncSession(async_engine) as cleanup:
            await cleanup.execute(delete(User).where(User.id==user_id));await cleanup.commit()


async def test_confirm_cannot_turn_deleted_superseded_target_into_live_tombstone(domain):
    d=domain;memory=MemoryService(d.db,d.learner.id)
    await memory.set_consent_async(MemoryConsentInput(enabled=True))
    old_input=MemoryProposal(scope='profile',kind='learning_goal',content='Old confirmed goal')
    old=await memory.propose_async(old_input);await memory.confirm_async(old['id'])
    new=await memory.propose_async(MemoryProposal(scope='profile',kind='learning_goal',content='New goal',supersedes_id=old['id']))
    await memory.delete_async(old['id'])
    with pytest.raises(HTTPException) as exc:await memory.confirm_async(new['id'])
    assert exc.value.status_code==409
    row=await d.db.get(LearningMemoryItem,old['id'])
    assert row.status=='deleted' and row.content==''
    with pytest.raises(HTTPException) as exc:await memory.propose_async(old_input)
    assert exc.value.status_code==409


async def test_disabled_memory_does_not_recreate_persistent_summary_projection(domain):
    d=domain;memory=MemoryService(d.db,d.learner.id)
    await memory.set_consent_async(MemoryConsentInput(enabled=False))
    thread=TutorChatThreads(user_id=d.learner.id,course_id=d.course.id,lesson_id=d.lesson.id,scope='lesson')
    d.db.add(thread);await d.db.flush()
    for i in range(14):
        d.db.add(TutorChatMessages(thread_id=thread.id,user_id=d.learner.id,
            role='user' if i%2==0 else 'assistant',content=f'Owned conversation turn {i}',sources=[]))
    await d.db.flush()
    context=await memory.conversation_context_async(thread.id,recent_limit=2)
    assert context['summary']
    assert await d.db.get(AgentThreadSummary,thread.id) is None
    await memory.set_consent_async(MemoryConsentInput(enabled=True))
    await memory.conversation_context_async(thread.id,recent_limit=2)
    assert await d.db.get(AgentThreadSummary,thread.id) is None
    from app.agent.semantic_compaction import request_compaction
    assert await request_compaction(d.db,d.learner.id,thread.id,{'should_compact':True,'percent':90})
    assert await d.db.get(AgentThreadSummary,thread.id) is not None
    await memory.set_consent_async(MemoryConsentInput(enabled=False))
    await memory.conversation_context_async(thread.id,recent_limit=2)
    assert await d.db.get(AgentThreadSummary,thread.id) is None
