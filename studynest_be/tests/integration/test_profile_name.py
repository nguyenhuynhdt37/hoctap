import os
from uuid import UUID, uuid4
from unittest.mock import AsyncMock
import pytest
from sqlalchemy import select, func
from tests.integration.test_agent_runtime import isolated_engine, principal, create
from app.agent import runtime
from app.agent.contracts import CreateRun
from app.db.models.agent import AgentRun, AgentToolCall
from types import SimpleNamespace

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Scratch DB required')]


@pytest.mark.parametrize('message', ['tớ tên gì', 'tớ tên gì v'])
async def test_own_name_uses_profile_without_full_context_tools_or_model(principal,monkeypatch,message):
    p=principal;session=await create(p)
    context=AsyncMock(side_effect=AssertionError('Name lookup must not build full context'))
    monkeypatch.setattr(runtime.AgentService,'_context_async',context)
    async with runtime.AsyncSessionLocal() as db:
        service=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
        result=await service.create_run_async(CreateRun(session_id=UUID(session['id']),message=message,idempotency_key=uuid4().hex),launch=False)
    run_id=UUID(result['id'])
    await runtime._worker(run_id,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run=await db.get(AgentRun,run_id)
        assert run.state=='completed' and 'Agent isolated test' in run.response
        assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==run_id))==0
    context.assert_not_awaited()


@pytest.mark.parametrize('mode', ['saved', 'empty', 'disabled'])
async def test_memory_inventory_uses_owned_database_without_model_or_lesson(principal, monkeypatch, mode):
    from datetime import timedelta
    from sqlalchemy import delete
    from app.db.models.database import User
    from app.db.models.learning_memory import LearningMemoryItem, LearningMemoryConsent
    p=principal; session=await create(p)
    context=AsyncMock(side_effect=AssertionError('Personal queries must not load lesson/model context'))
    monkeypatch.setattr(runtime.AgentService,'_context_async',context)
    foreign_id=uuid4()
    try:
        async with runtime.AsyncSessionLocal() as db:
            db.add(User(id=foreign_id,fullname='Foreign fixture',email=f'foreign-{foreign_id}@example.invalid',password='unused',is_banned=False))
            await db.flush()
            def item(owner, content, status='confirmed', **extra):
                return LearningMemoryItem(user_id=owner,scope='profile',kind='personal_fact',content=content,fingerprint=uuid4().hex,status=status,**extra)
            db.add(item(foreign_id,'FOREIGN_PRIVATE_SENTINEL'))
            if mode != 'empty':
                db.add_all([item(p.user_id,'Mình thích mèo'), item(p.user_id,'Mình muốn học Python','proposed'),
                            item(p.user_id,'DELETED_SENTINEL','deleted'),
                            item(p.user_id,'EXPIRED_SENTINEL',expires_at=runtime.now()-timedelta(days=1)),
                            item(p.user_id,'Tôi đã lưu ghi chú cũ')])
            if mode == 'disabled':
                db.add(LearningMemoryConsent(user_id=p.user_id,enabled=False))
            await db.commit()
            service=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
            result=await service.create_run_async(CreateRun(session_id=UUID(session['id']),message='trong memory tôi lưu gì',idempotency_key=uuid4().hex),launch=False)
        run_id=UUID(result['id'])
        await runtime._worker(run_id,p.user_id,str(p.sid))
        async with runtime.AsyncSessionLocal() as db:
            run=await db.get(AgentRun,run_id)
            assert run.state=='completed'
            if mode=='saved':
                assert 'Mình thích mèo' in run.response and 'Đề xuất chờ xác nhận' in run.response
                assert 'Tôi đã lưu ghi chú cũ' in run.response
            elif mode=='empty':
                assert 'chưa có mục' in run.response
            else:
                assert 'đang tắt' in run.response and 'Mình thích mèo' not in run.response
            assert all(word not in run.response for word in ['FOREIGN_PRIVATE_SENTINEL','DELETED_SENTINEL','EXPIRED_SENTINEL','Chưa có nguồn bài học'])
            assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==run_id))==0
            from app.db.models.agent import AgentEvent
            event=await db.scalar(select(AgentEvent).where(AgentEvent.run_id==run_id,AgentEvent.type=='run.completed'))
            assert event.payload['message']['sources']==[]
        context.assert_not_awaited()
    finally:
        async with runtime.AsyncSessionLocal() as db:
            await db.execute(delete(User).where(User.id==foreign_id)); await db.commit()


async def test_confirmed_manual_name_takes_priority_over_profile(principal, monkeypatch):
    from app.db.models.learning_memory import LearningMemoryItem
    p=principal;session=await create(p)
    monkeypatch.setattr(runtime.AgentService, '_context_async', AsyncMock(side_effect=AssertionError('No lesson context')))
    async with runtime.AsyncSessionLocal() as db:
        db.add(LearningMemoryItem(user_id=p.user_id,scope='profile',kind='personal_fact',content='tên tớ là huỳnh',fingerprint=uuid4().hex,status='confirmed',source_type='learner_declared'))
        db.add(LearningMemoryItem(user_id=p.user_id,scope='profile',kind='personal_fact',content='Tôi tên là PendingName',fingerprint=uuid4().hex,status='proposed',source_type='learner_declared'))
        await db.commit()
        result=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message='tớ tên gì v',idempotency_key=uuid4().hex),launch=False)
    run_id=UUID(result['id']);await runtime._worker(run_id,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run=await db.get(AgentRun,run_id)
        assert run.state=='completed' and '**huỳnh**' in run.response
        assert 'Agent isolated test' not in run.response and 'PendingName' not in run.response
        assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==run_id))==0
