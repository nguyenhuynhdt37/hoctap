"""True PostgreSQL run/action tests. Explicit disposable DB is mandatory."""
import asyncio
import os
from datetime import timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import delete, select

from app.agent.contracts import ActionReceipt, CreateRun, CreateSession, ScreenSnapshot
from app.agent.runtime import AgentService, TASKS, _worker, now
from app.db.models.agent import AgentEvent, AgentRun, AgentSession, AgentToolCall
from app.db.models.database import Courses, CourseEnrollments, LessonProgress, Lessons, Sessions, TutorChatMessages, User
from app.db.sesson import AsyncSessionLocal

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Requires explicit scratch DB')]


@pytest_asyncio.fixture(autouse=True)
async def isolated_engine(monkeypatch):
    from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
    from sqlalchemy.pool import NullPool
    import app.agent.runtime as runtime
    engine=create_async_engine(os.environ['TEST_DATABASE_ASYNC_URL'],poolclass=NullPool)
    factory=async_sessionmaker(engine,expire_on_commit=False)
    monkeypatch.setattr(runtime,'AsyncSessionLocal',factory)
    from unittest.mock import AsyncMock
    monkeypatch.setattr('app.agent.context_window.model_window',AsyncMock(return_value=(1048576,'fixture_metadata')))
    import app.agent.maintenance as maintenance
    monkeypatch.setattr(maintenance,'AsyncSessionLocal',factory)
    monkeypatch.setitem(globals(),'AsyncSessionLocal',factory)
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def principal():
    async with AsyncSessionLocal() as db:
        user=User(id=uuid4(),fullname='Agent isolated test',email=f'agent-{uuid4().hex}@example.invalid',password='unused-test-hash',is_banned=False)
        db.add(user)
        row=(await db.execute(select(Lessons,Courses).join(Courses,Courses.id==Lessons.course_id).where(Courses.deleted_at.is_(None)).limit(1))).first()
        assert row,'Scratch DB must contain a course and lesson'
        lesson,course=row
        sid=uuid4()
        db.add(Sessions(id=sid,user_id=user.id,refresh_token_hash=uuid4().hex,expired_at=now()+timedelta(hours=1),is_revoked=False))
        db.add(CourseEnrollments(user_id=user.id,course_id=course.id,status='active'))
        db.add(LessonProgress(user_id=user.id,course_id=course.id,lesson_id=lesson.id,is_completed=False))
        ids=SimpleNamespace(user_id=user.id,sid=sid,course_id=course.id,lesson_id=lesson.id)
        await db.commit()
    try:
        yield ids
    finally:
        async with AsyncSessionLocal() as db:
            # The fixture owns only its fresh user; cascades remove its agent evidence.
            await db.execute(delete(User).where(User.id==ids.user_id))
            await db.commit()


async def service(db,p):
    return AgentService(db,SimpleNamespace(id=p.user_id),p.sid)


async def create(p,capabilities=None):
    async with AsyncSessionLocal() as db:
        s=await service(db,p)
        session=await s.create_session_async(CreateSession(page_instance_id=f'test-page-{uuid4()}',route='/learning/test',course_id=p.course_id,lesson_id=p.lesson_id,capabilities=capabilities or ['video.pause','video.seek']))
        await s.context_async(UUID(session['id']),ScreenSnapshot(page_instance_id=session['page_instance_id'],revision=1,captured_at=now(),route='/learning/test',course_id=p.course_id,lesson_id=p.lesson_id))
        return session


async def poll(run_id,event_type):
    for _ in range(100):
        async with AsyncSessionLocal() as db:
            row=await db.scalar(select(AgentEvent).where(AgentEvent.run_id==run_id,AgentEvent.type==event_type).order_by(AgentEvent.sequence))
            state=await db.scalar(select(AgentRun.state).where(AgentRun.id==run_id))
            if row:
                return row.payload
            if state in {'failed','expired'}:
                detail=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==run_id))).all()
                pytest.fail(f'Run terminated {state}: {[(x.type,x.payload) for x in detail]}')
        await asyncio.sleep(.05)
    pytest.fail(f'Timed out waiting for {event_type}')


async def test_owner_and_auth_session_isolation(principal):
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        foreign=AgentService(db,SimpleNamespace(id=uuid4()),uuid4())
        with pytest.raises(HTTPException) as exc:
            await foreign.get_session_async(UUID(session['id']))
        assert exc.value.status_code==404
        another_auth=AgentService(db,SimpleNamespace(id=principal.user_id),uuid4())
        with pytest.raises(HTTPException) as exc:
            await another_auth.get_session_async(UUID(session['id']))
        assert exc.value.status_code==404


async def test_pause_waits_for_verified_receipt_and_replay_is_idempotent(principal):
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        body=CreateRun(session_id=UUID(session['id']),message='Tạm dừng video',idempotency_key=f'run-{uuid4()}')
        result=await s.create_run_async(body,launch=False)
        same=await s.create_run_async(body,launch=False)
        assert result['id']==same['id']
    run_id=UUID(result['id'])
    task=asyncio.create_task(_worker(run_id,principal.user_id,str(principal.sid)))
    try:
        request=await poll(run_id,'ui.action_requested')
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            assert (await s.get_run_async(run_id)).state=='executing'
            receipt=ActionReceipt(page_instance_id=request['page_instance_id'],context_revision=request['context_revision'],lesson_id=principal.lesson_id,status='completed',verified=True,result={'is_playing':False})
            assert (await s.receipt_async(run_id,UUID(request['action_id']),receipt))['accepted']
            assert (await s.receipt_async(run_id,UUID(request['action_id']),receipt))['duplicate']
        await asyncio.wait_for(task,5)
        completed=await poll(run_id,'run.completed')
        assert completed['message']['content']
        async with AsyncSessionLocal() as db:
            run=await db.get(AgentRun,run_id)
            assert run.state=='completed'
            message=await db.get(TutorChatMessages,UUID(completed['message']['id']))
            assert message.content==run.response
            events=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==run_id).order_by(AgentEvent.sequence))).all()
            assert [e.sequence for e in events]==list(range(1,len(events)+1))
            assert len([e for e in events if e.type=='ui.action_requested'])==1
    finally:
        task.cancel();await asyncio.gather(task,return_exceptions=True)


async def test_active_run_lock_prevents_conflicting_text_voice(principal):
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        first=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Tạm dừng video',idempotency_key=f'run-{uuid4()}'),launch=False)
        with pytest.raises(HTTPException) as exc:
            await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Phát video',channel='voice',idempotency_key=f'run-{uuid4()}'),launch=False)
        assert exc.value.status_code==409
        await s.cancel_async(UUID(first['id']))
        next_run=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Phát video',channel='voice',idempotency_key=f'run-{uuid4()}'),launch=False)
        assert next_run['id']!=first['id']
        await s.cancel_async(UUID(next_run['id']))


async def test_stale_context_and_wrong_receipt_never_complete(principal):
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        result=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Tạm dừng video',idempotency_key=f'run-{uuid4()}'),launch=False)
    run_id=UUID(result['id'])
    task=asyncio.create_task(_worker(run_id,principal.user_id,str(principal.sid)))
    try:
        request=await poll(run_id,'ui.action_requested')
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            with pytest.raises(HTTPException) as exc:
                await s.receipt_async(run_id,UUID(request['action_id']),ActionReceipt(page_instance_id='incorrect-page',context_revision=request['context_revision'],lesson_id=principal.lesson_id,status='completed',verified=True))
            assert exc.value.status_code==409
            await db.rollback()
            await s.cancel_async(run_id)
        await asyncio.wait_for(task,5)
        async with AsyncSessionLocal() as db:
            run=await db.get(AgentRun,run_id)
            assert run.state=='cancelled'
            assert await db.scalar(select(AgentEvent.id).where(AgentEvent.run_id==run_id,AgentEvent.type=='run.completed')) is None
    finally:
        task.cancel();await asyncio.gather(task,return_exceptions=True)


async def test_write_tool_cannot_run_before_approval_and_reject_never_calls_handler(principal,monkeypatch):
    from app.agent.contracts import ApprovalDecision,RunState
    from app.agent.tools import Empty,REGISTRY,ToolDefinition
    from unittest.mock import AsyncMock
    handler=AsyncMock(return_value={'changed':True})
    monkeypatch.setitem(REGISTRY,'fixture.write',ToolDefinition('fixture.write','Deterministic approval fixture',Empty,risk='write',requires_approval=True,handler=handler))
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Lưu mục tiêu học',idempotency_key=f'run-{uuid4()}'),launch=False)
        run=await s.get_run_async(UUID(value['id']),lock=True)
        await s._transition_async(run,RunState.RESOLVING)
        await s._transition_async(run,RunState.EXECUTING)
        await db.commit()
    run_id=UUID(value['id'])
    async def execute():
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            return await s.execute_tool_async(run_id,'fixture.write',{})
    task=asyncio.create_task(execute())
    try:
        approval=await poll(run_id,'tool.awaiting_approval')
        handler.assert_not_awaited()
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            await s.approval_async(run_id,UUID(approval['approval_id']),ApprovalDecision(decision='rejected',page_instance_id=session['page_instance_id'],context_revision=1))
        with pytest.raises(HTTPException) as exc:
            await asyncio.wait_for(task,5)
        assert exc.value.status_code==403
        handler.assert_not_awaited()
        async with AsyncSessionLocal() as db:
            call=await db.scalar(select(AgentToolCall).where(AgentToolCall.run_id==run_id))
            assert call.status=='failed'
            s=await service(db,principal);await s.cancel_async(run_id)
    finally:
        task.cancel();await asyncio.gather(task,return_exceptions=True)


async def test_write_approval_is_bound_to_exact_run_and_executes_once(principal,monkeypatch):
    from app.agent.contracts import ApprovalDecision,RunState
    from app.agent.tools import Empty,REGISTRY,ToolDefinition
    from unittest.mock import AsyncMock
    handler=AsyncMock(return_value={'changed':True})
    monkeypatch.setitem(REGISTRY,'fixture.write',ToolDefinition('fixture.write','Deterministic approval fixture',Empty,risk='write',requires_approval=True,idempotent=False,handler=handler))
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Lưu mục tiêu học',idempotency_key=f'run-{uuid4()}'),launch=False)
        run=await s.get_run_async(UUID(value['id']),lock=True)
        await s._transition_async(run,RunState.RESOLVING);await s._transition_async(run,RunState.EXECUTING);await db.commit()
    run_id=UUID(value['id'])
    async def execute():
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            result=await s.execute_tool_async(run_id,'fixture.write',{})
            await s.finish_async(run_id,'Đã lưu kết quả fixture')
            return result
    task=asyncio.create_task(execute())
    try:
        approval=await poll(run_id,'tool.awaiting_approval')
        handler.assert_not_awaited()
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            body=ApprovalDecision(decision='approved',page_instance_id=session['page_instance_id'],context_revision=1)
            await s.approval_async(run_id,UUID(approval['approval_id']),body)
            await s.approval_async(run_id,UUID(approval['approval_id']),body)
        result=await asyncio.wait_for(task,5)
        assert result['verified'] and result['changed']
        handler.assert_awaited_once()
        async with AsyncSessionLocal() as db:
            assert (await db.get(AgentRun,run_id)).state=='completed'
    finally:
        task.cancel();await asyncio.gather(task,return_exceptions=True)


async def test_maintenance_expires_orphan_without_replay_and_redacts_expired_memory(principal,monkeypatch):
    from app.agent.maintenance import run_once_async
    from app.core.settings import settings
    from app.db.models.learning_memory import LearningMemoryItem
    monkeypatch.setattr(settings,'AGENT_ENABLED',True)
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Retention-only request',idempotency_key=f'run-{uuid4()}'),launch=False)
        run=await s.get_run_async(UUID(value['id']),lock=True)
        run.heartbeat_at=now()-timedelta(seconds=60)
        run.worker_id='dead-worker-test'
        call=AgentToolCall(id=uuid4(),run_id=run.id,name='video.pause',arguments={},arguments_hash='0'*64,status='awaiting_receipt',risk='navigation')
        db.add(call)
        expired_memory=LearningMemoryItem(id=uuid4(),user_id=principal.user_id,scope='profile',kind='learning_goal',content='Expired learner statement',fingerprint=uuid4().hex,status='confirmed',confidence=100,evidence=[{'message_id':str(uuid4())}],source_type='learner_declared',expires_at=now()-timedelta(days=1))
        current_memory=LearningMemoryItem(id=uuid4(),user_id=principal.user_id,scope='profile',kind='learning_goal',content='Current learner statement',fingerprint=uuid4().hex,status='confirmed',confidence=100,evidence=[],source_type='learner_declared',expires_at=now()+timedelta(days=1))
        db.add_all([expired_memory,current_memory])
        old_id,current_id=expired_memory.id,current_memory.id
        await db.commit()
    result=await run_once_async()
    assert result['expired_runs']>=1 and result['expired_memory']>=1
    async with AsyncSessionLocal() as db:
        run=await db.get(AgentRun,UUID(value['id']))
        assert run.state=='expired' and run.last_error=='worker_lost'
        call=await db.scalar(select(AgentToolCall).where(AgentToolCall.run_id==run.id))
        assert call.status=='expired' and call.receipt is None
        old=await db.get(LearningMemoryItem,old_id)
        assert old.content=='' and old.evidence==[] and old.status=='deleted'
        current=await db.get(LearningMemoryItem,current_id)
        assert current.content=='Current learner statement' and current.status=='confirmed'


async def test_maintenance_retention_removes_tool_payloads_but_keeps_tutor_history(principal,monkeypatch):
    from app.agent.maintenance import run_once_async,metrics_async
    from app.core.settings import settings
    monkeypatch.setattr(settings,'AGENT_ENABLED',True)
    monkeypatch.setattr(settings,'AGENT_EVENT_RETENTION_DAYS',30)
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Preserved legacy conversation',idempotency_key=f'run-{uuid4()}'),launch=False)
        await s.cancel_async(UUID(value['id']))
        run=await s.get_run_async(UUID(value['id']),lock=True)
        run.updated_at=now()-timedelta(days=31)
        thread_id=run.thread_id
        await db.commit()
    result=await run_once_async()
    assert result['purged_runs']>=1
    async with AsyncSessionLocal() as db:
        assert await db.get(AgentRun,UUID(value['id'])) is None
        assert await db.scalar(select(AgentEvent.id).where(AgentEvent.run_id==UUID(value['id']))) is None
        assert await db.scalar(select(TutorChatMessages.id).where(TutorChatMessages.thread_id==thread_id,TutorChatMessages.content=='Preserved legacy conversation')) is not None
        metrics=await metrics_async(db,principal.user_id)
        assert 'Preserved legacy conversation' not in str(metrics)


async def test_model_financial_tool_and_fabricated_completion_are_rejected(principal):
    from app.agent.contracts import RunState
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Mở bài tiếp theo',idempotency_key=f'run-{uuid4()}'),launch=False)
        run_id=UUID(value['id'])
        run=await s.get_run_async(run_id,lock=True)
        await s._transition_async(run,RunState.RESOLVING);await s._transition_async(run,RunState.PLANNING);await db.commit()
        with pytest.raises(HTTPException) as exc:
            await s.execute_tool_async(run_id,'wallet.transfer',{'amount':100})
        assert exc.value.status_code==403
        await s.finish_async(run_id,'Mình đã tua đến phút 3 [99].')
        run=await s.get_run_async(run_id)
        assert run.state=='partially_completed'
        assert 'chưa có bằng chứng' in run.response
        assert '[99]' not in run.response
        assert await db.scalar(select(AgentEvent.id).where(AgentEvent.run_id==run_id,AgentEvent.type=='tool.denied')) is not None
        assert await db.scalar(select(AgentToolCall.id).where(AgentToolCall.run_id==run_id)) is None


async def test_memory_tool_durable_telemetry_never_retains_content_after_delete(principal):
    import json
    from app.agent.contracts import RunState
    from app.agent.memory import MemoryConsentInput,MemoryService
    session=await create(principal)
    marker='private-memory-'+uuid4().hex
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        await MemoryService(db,principal.user_id).set_consent_async(MemoryConsentInput(enabled=True,retention_days=30))
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message=marker,idempotency_key=f'run-{uuid4()}'),launch=False)
        run_id=UUID(value['id'])
        run=await s.get_run_async(run_id,lock=True)
        evidence=await db.scalar(select(TutorChatMessages.id).where(TutorChatMessages.thread_id==run.thread_id,TutorChatMessages.role=='user',TutorChatMessages.content==marker))
        await s._transition_async(run,RunState.RESOLVING);await s._transition_async(run,RunState.EXECUTING);await db.commit()
        result=await s.execute_tool_async(run_id,'memory.propose',{'scope':'lesson','kind':'learning_goal','content':marker,
            'course_id':str(principal.course_id),'lesson_id':str(principal.lesson_id),'evidence_message_ids':[str(evidence)]})
        assert result['proposal']['content']==marker  # Ephemeral result remains useful.
        memory_id=UUID(str(result['proposal']['id']))
        await MemoryService(db,principal.user_id).confirm_async(memory_id)
        read=await s.execute_tool_async(run_id,'memory.read',{})
        assert marker in json.dumps(read)
        await MemoryService(db,principal.user_id).delete_async(memory_id)
        calls=(await db.scalars(select(AgentToolCall).where(AgentToolCall.run_id==run_id))).all()
        events=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==run_id))).all()
        assert all(marker not in json.dumps(c.arguments) and marker not in json.dumps(c.result) for c in calls)
        assert all(marker not in json.dumps(e.payload) for e in events)
        assert all(c.arguments_hash for c in calls)
        await s.cancel_async(run_id)


async def test_stale_read_navigation_retries_once_with_new_action_and_revision(principal):
    session=await create(principal)
    async with AsyncSessionLocal() as db:
        s=await service(db,principal)
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message='Tạm dừng video',idempotency_key=f'run-{uuid4()}'),launch=False)
    run_id=UUID(value['id']);task=asyncio.create_task(_worker(run_id,principal.user_id,str(principal.sid)))
    try:
        first=await poll(run_id,'ui.action_requested')
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            await s.context_async(UUID(session['id']),ScreenSnapshot(page_instance_id=session['page_instance_id'],revision=2,captured_at=now(),route='/learning/test',course_id=principal.course_id,lesson_id=principal.lesson_id))
            await s.receipt_async(run_id,UUID(first['action_id']),ActionReceipt(page_instance_id=first['page_instance_id'],context_revision=first['context_revision'],lesson_id=principal.lesson_id,status='stale_context',verified=False))
        second=None
        for _ in range(100):
            async with AsyncSessionLocal() as db:
                requests=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==run_id,AgentEvent.type=='ui.action_requested').order_by(AgentEvent.sequence))).all()
                if len(requests)==2:
                    second=requests[1].payload;break
            await asyncio.sleep(.05)
        assert second and second['action_id']!=first['action_id'] and second['context_revision']==2
        async with AsyncSessionLocal() as db:
            s=await service(db,principal)
            await s.receipt_async(run_id,UUID(second['action_id']),ActionReceipt(page_instance_id=second['page_instance_id'],context_revision=2,lesson_id=principal.lesson_id,status='completed',verified=True,result={'is_playing':False}))
        await asyncio.wait_for(task,5)
        async with AsyncSessionLocal() as db:
            assert (await db.get(AgentRun,run_id)).state=='completed'
    finally:
        task.cancel();await asyncio.gather(task,return_exceptions=True)


@pytest_asyncio.fixture
async def authenticated_client(principal,isolated_engine):
    import httpx
    from app.main import app
    from app.core.security import SecurityService
    from app.db.sesson import get_session
    # ASGITransport does not start lifespan: no financial scheduler or background services.
    async def session_override():
        async with AsyncSessionLocal() as db:
            yield db
    app.dependency_overrides[get_session]=session_override
    token=await SecurityService().create_access_token(str(principal.user_id),str(principal.sid))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app),base_url='http://api-fixture',headers={'Authorization':'Bearer '+token}) as client:
        yield client
    app.dependency_overrides.pop(get_session,None)


async def test_http_real_auth_request_correlation_and_exact_cors(authenticated_client,principal,monkeypatch):
    from app.core.settings import settings
    monkeypatch.setattr(settings,'AGENT_ENABLED',True)
    request_id=str(uuid4())
    payload={'page_instance_id':'http-page-'+uuid4().hex,'route':'/learning/test','course_id':str(principal.course_id),'lesson_id':str(principal.lesson_id),'capabilities':['video.pause']}
    response=await authenticated_client.post('/api/v1/agent/sessions',json=payload,headers={'Origin':'http://localhost:3000','X-Request-ID':request_id})
    assert response.status_code==201
    assert response.headers['x-request-id']==request_id
    assert response.headers['access-control-allow-origin']=='http://localhost:3000'
    assert response.headers['access-control-allow-credentials']=='true'
    # A foreign browser may not read responses or use credentialed CORS.
    foreign=await authenticated_client.options('/api/v1/agent/sessions',headers={'Origin':'http://localhost:3000.attacker.invalid','Access-Control-Request-Method':'POST'})
    assert foreign.status_code==400
    assert 'access-control-allow-origin' not in foreign.headers
    anonymous=await authenticated_client.post('/api/v1/agent/sessions',json=payload,headers={'Authorization':''})
    assert anonymous.status_code==401
    invalid_id=await authenticated_client.get('/health',headers={'X-Request-ID':'not-a-request-id'})
    assert UUID(invalid_id.headers['x-request-id'])


async def test_http_agent_memory_disabled_fails_closed_and_advisor_guest_is_public(authenticated_client,principal,monkeypatch):
    from app.core.settings import settings
    monkeypatch.setattr(settings,'AGENT_ENABLED',False)
    for path in ['/api/v1/agent/memory','/api/v1/agent/memory/consent']:
        response=await authenticated_client.get(path)
        assert response.status_code==503
    response=await authenticated_client.post('/api/v1/agent/sessions',json={'page_instance_id':'disabled-test','route':'/learning/test'})
    assert response.status_code==503
    from app.services.catalog import public_course
    async with AsyncSessionLocal() as db:
        public_id=await db.scalar(select(Courses.id).where(public_course()).limit(1))
        private_id=await db.scalar(select(Courses.id).where(Courses.is_published.is_(False)).limit(1))
    assert public_id,'Clone must contain real public catalog data'
    response=await authenticated_client.get(f'/api/v1/agent/advisor/{public_id}/context',headers={'Authorization':''})
    assert response.status_code==200
    assert str(response.json()['id'])==str(public_id)
    # Advisor is public even when personal agent/memory is disabled, but no draft leak.
    if private_id:
        response=await authenticated_client.get(f'/api/v1/agent/advisor/{private_id}/context',headers={'Authorization':''})
        assert response.status_code==404


@pytest.mark.parametrize('same_key,cross_session', [(False, False), (True, False), (False, True)])
@pytest.mark.parametrize('account_scope', [False, True])
async def test_concurrent_admission(principal, same_key, cross_session, account_scope):
    sessions = []
    for _ in range(2 if cross_session else 1):
        if account_scope:
            async with AsyncSessionLocal() as db:
                s = await service(db, principal)
                sessions.append(await s.create_session_async(CreateSession(
                    page_instance_id=f'account-storm-{uuid4()}', route='/',
                )))
        else:
            sessions.append(await create(principal))
    shared_key = f'storm-{uuid4()}'

    async def request(index):
        async with AsyncSessionLocal() as db:
            s = await service(db, principal)
            try:
                return await s.create_run_async(CreateRun(
                    session_id=UUID(sessions[index % len(sessions)]['id']),
                    message='Xin chào', idempotency_key=shared_key if same_key else f'storm-{uuid4()}',
                ), launch=False)
            except HTTPException as exc:
                return exc.status_code

    results = await asyncio.gather(*(request(i) for i in range(10)), return_exceptions=True)
    assert not [type(r).__name__ for r in results if isinstance(r, BaseException)], results
    accepted = [r for r in results if isinstance(r, dict)]
    assert len(accepted) == (10 if same_key else 1), results
    assert len({r['id'] for r in accepted}) == 1
    assert all(isinstance(r, dict) or r == 409 for r in results)
    async with AsyncSessionLocal() as db:
        runs = (await db.scalars(select(AgentRun).where(AgentRun.user_id == principal.user_id))).all()
        messages = (await db.scalars(select(TutorChatMessages).where(TutorChatMessages.user_id == principal.user_id))).all()
        events = (await db.scalars(select(AgentEvent).where(AgentEvent.run_id == runs[0].id))).all()
        assert len(runs) == len(messages) == len(events) == 1


async def test_http_concurrent_run_storm(authenticated_client, principal, monkeypatch):
    import app.agent.runtime as runtime
    from app.core.settings import settings
    monkeypatch.setattr(settings, 'AGENT_ENABLED', True)
    monkeypatch.setattr(runtime, 'start_run', lambda *args: None)
    session = await create(principal)
    responses = await asyncio.gather(*(authenticated_client.post('/api/v1/agent/runs', json={
        'session_id': session['id'], 'message': 'Xin chào', 'idempotency_key': f'http-storm-{uuid4()}',
    }) for _ in range(10)))
    codes = [r.status_code for r in responses]
    assert codes.count(201) == 1 and codes.count(409) == 9, codes
