import asyncio
import json
import os
from datetime import timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4
from unittest.mock import AsyncMock
import pytest
from sqlalchemy import select, func
from tests.integration.test_agent_runtime import isolated_engine, principal, create
from app.agent import runtime
from app.agent.contracts import CreateRun
from app.agent.memory import MemoryService, MemoryConsentInput
from app.agent.semantic_memory import capture_selected
from app.db.models.agent import AgentRun, AgentToolCall, AgentEvent
from app.db.models.database import TutorChatMessages, TutorChatThreads
from app.db.models.learning_memory import LearningMemoryItem

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Explicit scratch DB required')]


def suggestion(quote,key='work.occupation',kind='personal_fact'):
    return dict(quote=quote,key=key,kind=kind)

async def say(db,p,text,role='user'):
    from app.services.user.tutor_chat import TutorChatService
    thread=(await TutorChatService(db).get_or_create_account_thread(p.user_id))['thread']
    msg=TutorChatMessages(thread_id=UUID(thread['id']),user_id=p.user_id,role=role,content=text,sources=[])
    db.add(msg);await db.flush();return msg


async def test_semantic_update_dedupe_forget_ownership_and_optout(principal):
    p=principal
    async with runtime.AsyncSessionLocal() as db:
        msg=await say(db,p,'Sau giờ làm, tôi làm kế toán và thích ví dụ thực tế')
        ids=await capture_selected(db,p.user_id,msg.id,[suggestion('tôi làm kế toán')]);await db.commit()
        assert len(ids)==1
        stored=await db.get(LearningMemoryItem,UUID(ids[0]))
        assert stored.status=='confirmed' and stored.expires_at is None
        assert stored.evidence[0]['message_id']==str(msg.id)
        assert await capture_selected(db,p.user_id,msg.id,[suggestion('tôi làm kế toán')])==[]
        assert await capture_selected(db,uuid4(),msg.id,[suggestion('tôi làm kế toán')])==[]
        assistant=await say(db,p,'Tôi là bác sĩ',role='assistant')
        assert await capture_selected(db,p.user_id,assistant.id,[suggestion('Tôi là bác sĩ')])==[]
        changed=await say(db,p,'Mình làm kỹ sư phần mềm')
        next_ids=await capture_selected(db,p.user_id,changed.id,[suggestion(changed.content)]);await db.commit()
        await db.refresh(stored)
        assert stored.status=='superseded' and len(next_ids)==1
        await MemoryService(db,p.user_id).delete_async(UUID(next_ids[0]))
        paraphrase=await say(db,p,'Công việc của mình là kỹ sư phần mềm')
        assert await capture_selected(db,p.user_id,paraphrase.id,[suggestion(paraphrase.content)])==[]
        await MemoryService(db,p.user_id).set_consent_async(MemoryConsentInput(enabled=False))
        disabled=await say(db,p,'Mình nuôi một chú mèo tên Mít')
        assert await capture_selected(db,p.user_id,disabled.id,[suggestion(disabled.content,key='pet.mit')])==[]


async def test_semantic_retention_and_concurrent_duplicate(principal):
    p=principal
    async with runtime.AsyncSessionLocal() as db:
        await MemoryService(db,p.user_id).set_consent_async(MemoryConsentInput(enabled=True,retention_days=30))
        msg=await say(db,p,'Mình làm nghề kế toán');mid=msg.id;await db.commit()
    async def save():
        async with runtime.AsyncSessionLocal() as db:
            ids=await capture_selected(db,p.user_id,mid,[suggestion('Mình làm nghề kế toán')]);await db.commit();return ids
    results=await asyncio.gather(save(),save())
    assert sorted(map(len,results))==[0,1]
    async with runtime.AsyncSessionLocal() as db:
        item=await db.scalar(select(LearningMemoryItem).where(LearningMemoryItem.user_id==p.user_id,LearningMemoryItem.status=='confirmed'))
        assert runtime.now()+timedelta(days=29) < item.expires_at < runtime.now()+timedelta(days=31)


async def test_memory_cap_applies_within_batch_and_replacements(principal):
    p=principal
    async with runtime.AsyncSessionLocal() as db:
        for n in range(99):
            db.add(LearningMemoryItem(user_id=p.user_id,scope='profile',kind='personal_fact',content=f'Fixture fact {n}',fingerprint=uuid4().hex,status='confirmed'))
        msg=await say(db,p,'Mình làm kế toán. Mình nuôi mèo tên Mít. Mình thích học tiếng Nhật')
        ids=await capture_selected(db,p.user_id,msg.id,[suggestion('Mình làm kế toán'),suggestion('Mình nuôi mèo tên Mít','pet.mit'),suggestion('Mình thích học tiếng Nhật','interest.japanese')]);await db.commit()
        assert len(ids)==1
        count=await db.scalar(select(func.count()).select_from(LearningMemoryItem).where(LearningMemoryItem.user_id==p.user_id,LearningMemoryItem.status=='confirmed'))
        assert count==100
        changed=await say(db,p,'Mình làm kỹ sư phần mềm')
        assert len(await capture_selected(db,p.user_id,changed.id,[suggestion(changed.content)]))==1
        await db.commit()
        assert await db.scalar(select(func.count()).select_from(LearningMemoryItem).where(LearningMemoryItem.user_id==p.user_id,LearningMemoryItem.status=='confirmed'))==100


@pytest.mark.parametrize('mode',['selected','invalid','failure'])
async def test_main_model_saves_memory_without_lesson_retrieval_or_extra_model_call(principal,monkeypatch,mode):
    from app.core.llm import LLMService
    p=principal;session=await create(p)
    message='Mỗi khi học, mình tiếp thu tốt hơn bằng sơ đồ và ví dụ thực tế'
    payload={'message':'Mình sẽ ưu tiên giải thích bằng sơ đồ và ví dụ thực tế.','done':True,
             'memories':[suggestion('mình tiếp thu tốt hơn bằng sơ đồ và ví dụ thực tế','learning.explanation_style','explanation_preference')]}
    if mode=='invalid':payload['memories']=[suggestion('Tôi làm bác sĩ')]
    if mode=='failure':monkeypatch.setattr('app.agent.semantic_memory.capture_selected',AsyncMock(side_effect=RuntimeError('fixture write failure')))
    model=AsyncMock(return_value=json.dumps(payload,ensure_ascii=False));monkeypatch.setattr(LLMService,'call_model',model)
    context=AsyncMock(return_value={'routing':{'domain':'personal','lesson_search_allowed':False},'account':{},'memory':[],'tools':[]})
    monkeypatch.setattr(runtime.AgentService,'_context_async',context)
    async with runtime.AsyncSessionLocal() as db:
        svc=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
        result=await svc.create_run_async(CreateRun(session_id=UUID(session['id']),message=message,idempotency_key=uuid4().hex),launch=False)
    rid=UUID(result['id']);await runtime._worker(rid,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run=await db.get(AgentRun,rid)
        assert run.state=='completed' and 'sơ đồ' in run.response
        assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==rid))==0
        rows=(await db.scalars(select(LearningMemoryItem).where(LearningMemoryItem.user_id==p.user_id,LearningMemoryItem.status=='confirmed'))).all()
        assert len(rows)==(1 if mode=='selected' else 0)
        events=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==rid,AgentEvent.type=='memory.saved'))).all()
        if mode=='selected':
            assert len(events)==1 and events[0].payload['count']==1
            assert 'content' not in events[0].payload and 'quote' not in events[0].payload
    assert model.await_count==1


async def test_voice_background_rechecks_consent_after_provider_response(principal,monkeypatch):
    from app.agent import semantic_memory
    from app.core.llm import LLMService
    p=principal
    monkeypatch.setattr(semantic_memory,'AsyncSessionLocal',runtime.AsyncSessionLocal)
    async with runtime.AsyncSessionLocal() as db:
        msg=await say(db,p,'Mình làm nghề kế toán');mid=msg.id;await db.commit()
    waiting=asyncio.Event();release=asyncio.Event()
    async def model(*args,**kwargs):
        waiting.set();await release.wait()
        return json.dumps({'memories':[suggestion('Mình làm nghề kế toán')]})
    monkeypatch.setattr(LLMService,'call_model',model)
    task=asyncio.create_task(semantic_memory.extract_for_message(p.user_id,mid))
    await asyncio.wait_for(waiting.wait(),5)
    async with runtime.AsyncSessionLocal() as db:
        await MemoryService(db,p.user_id).set_consent_async(MemoryConsentInput(enabled=False))
    release.set();await asyncio.wait_for(task,5)
    async with runtime.AsyncSessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(LearningMemoryItem).where(LearningMemoryItem.user_id==p.user_id,LearningMemoryItem.status=='confirmed'))==0


@pytest.mark.parametrize('message',[
    'Mình thích con vật gì nhỉ?', 'GitHub MCP là gì?', 'Vòng lặp for trong Python là gì?',
    'Bạn đang nhớ những gì về tôi?', 'Dịch câu "Trong bài này cô nói gì" sang tiếng Anh',
])
async def test_real_context_keeps_unrelated_queries_out_of_lesson_rag(principal,monkeypatch,message):
    from app.core.llm import LLMService
    from app.agent import learning_context
    p=principal;session=await create(p)
    full_lesson=AsyncMock(side_effect=AssertionError('Do not load unrelated lesson sections'))
    monkeypatch.setattr(learning_context,'content',full_lesson)
    model=AsyncMock(return_value=json.dumps({'message':'Fixture answer','done':True}))
    monkeypatch.setattr(LLMService,'call_model',model)
    async with runtime.AsyncSessionLocal() as db:
        result=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message=message,idempotency_key=uuid4().hex),launch=False)
    rid=UUID(result['id']);await runtime._worker(rid,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run=await db.get(AgentRun,rid)
        assert run.state=='completed'
        assert 'Chưa có nguồn bài học' not in run.response
        assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==rid))==0
    full_lesson.assert_not_awaited()
    if runtime.memory_inspection_requested(message):
        model.assert_not_awaited()
        return
    prompt=model.call_args.args[0]
    # Only inspect advertised tool definitions, not instruction examples.
    context=json.loads(prompt[prompt.index('{"user_request":'):])['context']
    assert 'routing' not in context  # Regex hints do not dictate the model's interpretation.
    assert 'knowledge.search_lesson' in [tool['name'] for tool in context['tool_catalog']]
    assert 'lesson_content' not in context


async def test_repeated_search_reuses_same_run_evidence(principal,monkeypatch):
    from app.core.llm import LLMService
    from dataclasses import replace
    p=principal;session=await create(p)
    context=AsyncMock(return_value={'routing':{'domain':'lesson','lesson_search_allowed':True},'tools':[]})
    monkeypatch.setattr(runtime.AgentService,'_context_async',context)
    handler=AsyncMock(return_value={'sources':[],'notice':'Fixture no source'})
    original=runtime.REGISTRY['knowledge.search_lesson']
    monkeypatch.setitem(runtime.REGISTRY,'knowledge.search_lesson',replace(original,handler=handler))
    message='Tóm tắt bài học này'
    model=AsyncMock(side_effect=[json.dumps({'tool_calls':[{'name':'knowledge.search_lesson','arguments':{'query':message}}]}),json.dumps({'message':'Chưa có nguồn để tóm tắt bài.','done':True})])
    monkeypatch.setattr(LLMService,'call_model',model)
    async with runtime.AsyncSessionLocal() as db:
        result=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message=message,idempotency_key=uuid4().hex),launch=False)
    rid=UUID(result['id']);await runtime._worker(rid,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        assert (await db.get(AgentRun,rid)).state=='completed'
        assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==rid,AgentToolCall.name=='knowledge.search_lesson'))==1
    assert handler.await_count==1


@pytest.mark.parametrize('anchor,allowed', [
    ('Mình làm kế toán',False), ('Tóm tắt bài học này',True),
    ('Closure là gì?',False), ('list github',False),
])
async def test_followup_reads_owned_thread_anchor_and_not_current_lesson(principal,anchor,allowed):
    p=principal
    async with runtime.AsyncSessionLocal() as db:
        first=await say(db,p,anchor)
        previous=await say(db,p,'Tại sao?')
        await db.commit()
        svc=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
        run=SimpleNamespace(message='Giải thích kỹ hơn',thread_id=first.thread_id,created_at=runtime.now(),input_message_id=None)
        assert (await svc.request_route_async(run)).search_lesson==allowed
        # The exact same thread ID must not lend a foreign account its context.
        foreign=runtime.AgentService(db,SimpleNamespace(id=uuid4()),p.sid)
        assert not (await foreign.request_route_async(run)).search_lesson
        thread=await db.get(TutorChatThreads,first.thread_id)
        thread.is_deleted=True;await db.commit()
        assert not (await svc.request_route_async(run)).search_lesson


async def test_unanchored_followup_can_ask_model_for_clarification_without_search(principal,monkeypatch):
    from app.core.llm import LLMService
    p=principal;session=await create(p)
    model=AsyncMock(return_value=json.dumps({'message':'Bạn muốn giải thích phần nào?', 'done':True}))
    monkeypatch.setattr(LLMService,'call_model',model)
    async with runtime.AsyncSessionLocal() as db:
        result=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message='Giải thích kỹ hơn',idempotency_key=uuid4().hex),launch=False)
    rid=UUID(result['id']);await runtime._worker(rid,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run=await db.get(AgentRun,rid)
        assert run.state=='completed' and 'phần nào' in run.response
        assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==rid))==0
    model.assert_awaited_once()
