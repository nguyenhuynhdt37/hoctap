import asyncio
import json
import os
from datetime import datetime,timezone,timedelta
from types import SimpleNamespace
from uuid import UUID,uuid4
from unittest.mock import AsyncMock
import pytest
import pytest_asyncio
from sqlalchemy import select,func
from tests.integration.test_agent_runtime import isolated_engine,principal
from app.agent import runtime,semantic_compaction as compaction
from app.agent.memory import MemoryService,MemoryConsentInput
from app.db.models.database import TutorChatMessages,TutorChatThreads
from app.db.models.learning_memory import AgentThreadSummary

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Explicit scratch DB required')]

@pytest_asyncio.fixture(autouse=True)
async def compaction_factory(isolated_engine,monkeypatch):
    monkeypatch.setattr(compaction,'AsyncSessionLocal',runtime.AsyncSessionLocal)

async def history(p,count=110):
    from app.services.user.tutor_chat import TutorChatService
    async with runtime.AsyncSessionLocal() as db:
        thread=(await TutorChatService(db).get_or_create_account_thread(p.user_id))['thread']
        tid=UUID(thread['id']);ids=[];base=datetime.now(timezone.utc)-timedelta(hours=1)
        for n in range(count):
            content=f'Chuyện phụ số {n}. '+('Thông tin không quan trọng. '*9)
            if n==0:content='Mục tiêu: ôn văn bằng cách hiểu ý, không học vẹt. '+content
            if n==35:content='DEADLINE_FRIDAY: hạn nộp là thứ Sáu. '+content
            if n==75:content='DEADLINE_MONDAY: đổi hạn nộp sang thứ Hai, thay cho thứ Sáu. '+content
            message=TutorChatMessages(thread_id=tid,user_id=p.user_id,role='user' if n%2==0 else 'assistant',content=content,sources=[],created_at=base+timedelta(seconds=n))
            db.add(message);await db.flush();ids.append(message.id)
        await db.commit();return tid,ids

async def queue(p,tid):
    async with runtime.AsyncSessionLocal() as db:
        await compaction.request_compaction(db,p.user_id,tid,{'should_compact':True,'used_tokens':9000,'context_window_tokens':10000,'percent':90})
        value=await MemoryService(db,p.user_id).conversation_context_async(tid)
        await db.commit();return value

async def drain(p,tid):
    for _ in range(30):
        if not await compaction.compact_thread_once(p.user_id,tid):return
    raise AssertionError('Checkpoint cursor did not converge')

async def fake_semantics(previous,delta):
    notes=[dict(note) for note in previous['notes']]
    for unit in delta:
        if 'Mục tiêu:' in unit['text'] and not any(n['kind']=='goal' for n in notes):
            notes.append({'kind':'goal','text':'Học văn bằng hiểu ý, tránh học vẹt','evidence':[unit['id']]})
        if 'DEADLINE_FRIDAY' in unit['text']:
            notes=[n for n in notes if n['kind']!='decision']+[{'kind':'decision','text':'Hạn nộp: thứ Sáu','evidence':[unit['id']]}]
        if 'DEADLINE_MONDAY' in unit['text']:
            notes=[n for n in notes if n['kind']!='decision']+[{'kind':'decision','text':'Hạn nộp hiện tại: thứ Hai; đã thay thế thứ Sáu','evidence':[unit['id']]}]
    return {'notes':notes}

async def test_semantic_checkpoint_consumes_middle_history_and_survives_reload(principal,monkeypatch):
    p=principal;tid,ids=await history(p)
    seen=[]
    async def model(previous,delta):
        seen.extend(unit['id'] for unit in delta)
        return await fake_semantics(previous,delta)
    monkeypatch.setattr(compaction,'summarize',model)
    first=await queue(p,tid);assert first['compaction_needed'] and first['coverage']['pending']
    assert await compaction.compact_thread_once(p.user_id,tid)
    async with runtime.AsyncSessionLocal() as db:
        saved=compaction.decode(await db.get(AgentThreadSummary,tid))
        assert saved['through'] and saved['checkpoint']['notes']
    # New session/worker resumes the persisted cursor rather than restarting at the first message.
    already=len(seen);await drain(p,tid)
    assert f'message:{ids[0]}' not in seen[already:]
    context=await queue(p,tid)
    text=json.dumps(context['checkpoint'],ensure_ascii=False)
    assert 'thứ Hai' in text and 'Học văn' in text
    assert f'message:{ids[35]}' in seen and f'message:{ids[75]}' in seen
    assert not context['coverage']['pending']
    async with runtime.AsyncSessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(TutorChatMessages).where(TutorChatMessages.thread_id==tid))==110
    # Every kept semantic claim has an address into the owned original history.
    assert compaction.refs(context['checkpoint']) <= {f'message:{ident}' for ident in ids}

async def test_only_new_delta_is_compacted_and_prior_goal_is_preserved(principal,monkeypatch):
    p=principal;tid,ids=await history(p)
    model=AsyncMock(side_effect=fake_semantics);monkeypatch.setattr(compaction,'summarize',model)
    await queue(p,tid);await drain(p,tid);model.reset_mock()
    async with runtime.AsyncSessionLocal() as db:
        for n in range(30):db.add(TutorChatMessages(thread_id=tid,user_id=p.user_id,role='user',content='Thảo luận mới. '*100,sources=[]))
        await db.commit()
    await queue(p,tid);await drain(p,tid)
    assert model.await_count>0
    assert all(unit['id']!=f'message:{ids[0]}' for call in model.call_args_list for unit in call.args[1])
    assert any(note['kind']=='goal' for note in (await queue(p,tid))['checkpoint']['notes'])

async def test_concurrent_compactors_use_one_lease_and_revoke_cannot_restore_summary(principal,monkeypatch):
    p=principal;tid,_=await history(p);await queue(p,tid)
    entered=asyncio.Event();release=asyncio.Event();calls=0
    async def model(previous,delta):
        nonlocal calls;calls+=1;entered.set();await release.wait();return await fake_semantics(previous,delta)
    monkeypatch.setattr(compaction,'summarize',model)
    task=asyncio.create_task(compaction.compact_thread_once(p.user_id,tid))
    try:
        await asyncio.wait_for(entered.wait(),5)
        assert not await compaction.compact_thread_once(p.user_id,tid)
        async with runtime.AsyncSessionLocal() as db:await MemoryService(db,p.user_id).set_consent_async(MemoryConsentInput(enabled=False))
        release.set();assert not await asyncio.wait_for(task,5)
        async with runtime.AsyncSessionLocal() as db:assert await db.get(AgentThreadSummary,tid) is None
        assert calls==1
    finally:
        release.set()
        if not task.done():task.cancel()
        await asyncio.gather(task,return_exceptions=True)

async def test_model_failure_keeps_cursor_pending_and_original_history(principal,monkeypatch):
    p=principal;tid,_=await history(p);await queue(p,tid)
    monkeypatch.setattr(compaction,'summarize',AsyncMock(side_effect=TimeoutError()))
    assert not await compaction.compact_thread_once(p.user_id,tid)
    async with runtime.AsyncSessionLocal() as db:
        state=compaction.decode(await db.get(AgentThreadSummary,tid))
        assert state['pending'] and state.get('through') is None
        assert state['checkpoint']['notes']==[] and state['last_error']=='TimeoutError'
        assert await db.scalar(select(func.count()).select_from(TutorChatMessages).where(TutorChatMessages.thread_id==tid))==110

async def test_checkpoint_and_raw_evidence_are_thread_owner_bound(principal,monkeypatch):
    from app.agent.conversation_evidence import search,read,SearchConversation,ReadContextEvidence
    from fastapi import HTTPException
    p=principal;tid,ids=await history(p)
    async with runtime.AsyncSessionLocal() as db:
        ctx=SimpleNamespace(db=db,user=SimpleNamespace(id=p.user_id),run=SimpleNamespace(thread_id=tid))
        result=await search(ctx,SearchConversation(query='DEADLINE_MONDAY'))
        assert any('DEADLINE_MONDAY' in item['content'] for item in result['items'])
        original=await read(ctx,ReadContextEvidence(evidence_id='message:'+str(ids[75])))
        assert 'DEADLINE_MONDAY' in original['content']
        foreign=SimpleNamespace(db=db,user=SimpleNamespace(id=uuid4()),run=ctx.run)
        with pytest.raises(HTTPException):await read(foreign,ReadContextEvidence(evidence_id='message:'+str(ids[75])))
        other=TutorChatThreads(user_id=p.user_id,scope='lesson',course_id=p.course_id,lesson_id=p.lesson_id)
        db.add(other);await db.flush()
        other_ctx=SimpleNamespace(db=db,user=ctx.user,run=SimpleNamespace(thread_id=other.id))
        with pytest.raises(HTTPException):await read(other_ctx,ReadContextEvidence(evidence_id='message:'+str(ids[75])))


async def test_long_tool_record_is_compacted_completely_and_retained_as_checkpoint_after_expiry(principal,monkeypatch):
    from app.agent.contracts import CreateRun,CreateSession
    from app.db.models.agent import AgentRun,AgentToolCall
    from app.agent.conversation_evidence import read,ReadContextEvidence
    from sqlalchemy import delete
    p=principal;tid,ids=await history(p)
    async with runtime.AsyncSessionLocal() as db:
        service=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
        session=await service.create_session_async(CreateSession(page_instance_id='checkpoint-'+uuid4().hex,route='/chat-sql'))
        data=await service.create_run_async(CreateRun(session_id=UUID(session['id']),message='Fixture completed source read',thread_id=tid,idempotency_key=uuid4().hex),launch=False)
        run=await db.get(AgentRun,UUID(data['id']));run.input_message_id=ids[34]
        call=AgentToolCall(run_id=run.id,name='learning.fetch_video_transcript',arguments={},arguments_hash='f'*64,status='completed',risk='read',
            result={'verified':True,'passed':False,'content':'prefix '*2200+'TOOL_FAILURE_CRITICAL_MIDDLE'+' suffix'*2200})
        db.add(call);await db.flush();ref='tool:'+str(call.id);original=json.dumps({'name':call.name,'status':call.status,'result':call.result},ensure_ascii=False,default=str)
        await db.commit()
    parts=[]
    async def model(previous,delta):
        state=await fake_semantics(previous,delta)
        for unit in delta:
            if unit['id']==ref:parts.append((unit['offset'],unit['text']))
            if 'TOOL_FAILURE_CRITICAL_MIDDLE' in unit['text'] and not any(note['kind']=='tool_result' for note in state['notes']):
                state['notes'].append({'kind':'tool_result','text':'Đọc nguồn bị lỗi, công việc còn dang dở','evidence':[ref]})
        return state
    monkeypatch.setattr(compaction,'summarize',model)
    await queue(p,tid);await drain(p,tid)
    assert json.loads(''.join(text for offset,text in sorted(parts)))==json.loads(original)
    async with runtime.AsyncSessionLocal() as db:
        envelope=compaction.decode(await db.get(AgentThreadSummary,tid))
        assert ref in envelope['validated_tool_refs']
        await db.execute(delete(AgentToolCall).where(AgentToolCall.id==UUID(ref.split(':')[1])));await db.commit()
        context=await MemoryService(db,p.user_id).conversation_context_async(tid)
        assert any(note['kind']=='tool_result' for note in context['checkpoint']['notes'])
        ctx=SimpleNamespace(db=db,user=SimpleNamespace(id=p.user_id),run=SimpleNamespace(thread_id=tid))
        archived=await read(ctx,ReadContextEvidence(evidence_id=ref))
        assert archived['role']=='archived_tool_checkpoint' and 'raw_tool_record_available' in archived['content']
