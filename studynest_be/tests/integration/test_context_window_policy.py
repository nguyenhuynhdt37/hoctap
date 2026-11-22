import json
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4
import pytest
from sqlalchemy import select
from app.agent import runtime
from app.agent.contracts import CreateRun
from app.core.llm import LLMService
from app.db.models.agent import AgentEvent, AgentRun
from tests.integration.test_agent_runtime import isolated_engine, principal, create

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Scratch database required')]


@pytest.mark.parametrize('length,window,compress',[(1000,100000,False),(400000,100000,True),(400000,None,False)])
async def test_only_over_eighty_percent_triggers_semantic_compression(principal,monkeypatch,length,window,compress):
    p=principal
    session=await create(p)
    context={'tools':[],'conversation':{'checkpoint':{'notes':[]},'recent':[{'id':str(uuid4()),'role':'user','content':'x'*length}]}}
    small={'tools':[],'conversation':{'checkpoint':{'notes':[{'kind':'fact','text':'Checkpoint fixture','evidence':[]}]},'recent':[],'recent_semantically_compacted':True}}
    monkeypatch.setattr(runtime.AgentService,'_context_async',AsyncMock(return_value=context))
    monkeypatch.setattr('app.agent.context_window.model_window',AsyncMock(return_value=(window,'fixture')))
    recent=AsyncMock(return_value=small)
    working=AsyncMock(side_effect=lambda ctx,c,outputs:(c,outputs))
    monkeypatch.setattr('app.agent.semantic_compaction.compact_recent',recent)
    monkeypatch.setattr('app.agent.semantic_compaction.compact_working',working)
    queue=AsyncMock(return_value=False)
    monkeypatch.setattr('app.agent.semantic_compaction.request_compaction',queue)
    model=AsyncMock(return_value=json.dumps({'message':'Fixture response','done':True}))
    monkeypatch.setattr(LLMService,'call_model',model)
    async with runtime.AsyncSessionLocal() as db:
        data=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message='Kiểm tra ngữ cảnh',idempotency_key=uuid4().hex),launch=False)
    rid=UUID(data['id'])
    await runtime._worker(rid,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run=await db.get(AgentRun,rid)
        assert run.state=='completed',run.last_error
        events=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==rid).order_by(AgentEvent.sequence))).all()
        usage=[e.payload for e in events if e.type=='context.usage']
        assert usage and usage[0]['should_compact']==compress
        assert any(e.type=='context.compacted' for e in events)==compress
        if compress:assert usage[-1]['percent']<80
    assert recent.await_count==working.await_count==queue.await_count==int(compress)
    payload=json.loads(model.call_args.args[0][model.call_args.args[0].index('{"user_request":'):])
    if not compress:assert payload['context']['conversation']['recent'][0]['content']=='x'*length


async def test_more_than_sixty_four_old_messages_remain_raw_without_queuing(principal):
    from tests.integration.test_semantic_compaction import history
    from app.agent.memory import MemoryService
    from app.db.models.learning_memory import AgentThreadSummary
    p=principal
    tid,ids=await history(p,count=110)
    async with runtime.AsyncSessionLocal() as db:
        context=await MemoryService(db,p.user_id).conversation_context_async(tid)
        messages=context['uncompacted']+context['recent']
        assert {m['id'] for m in messages}=={str(ident) for ident in ids}
        assert len(messages)==110
        assert not context['compaction_needed'] and not context['coverage']['pending']
        assert await db.get(AgentThreadSummary,tid) is None
