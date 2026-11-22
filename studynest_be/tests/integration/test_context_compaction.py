import json
import os
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID,uuid4
import pytest
from tests.integration.test_agent_runtime import isolated_engine,principal,create
from app.agent import runtime
from app.agent.contracts import CreateRun
from app.core.llm import LLMService
from app.db.models.agent import AgentRun

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Explicit scratch DB required')]

async def test_long_source_turn_stays_verbatim_below_model_window_threshold(principal,monkeypatch):
    p=principal;session=await create(p)
    async def compress(previous,delta):
        return {'notes':[{'kind':'tool_result','text':'Các phần đã đọc giải thích cách ôn tập','evidence':[delta[-1]['id']]}]}
    monkeypatch.setattr('app.agent.semantic_compaction.summarize',compress)
    original=runtime.REGISTRY['learning.fetch_video_transcript']
    handler=AsyncMock(return_value={'content':'Bằng chứng giải thích phương pháp ôn tập. '*300,'index':1,'next_offset':12000,'total_characters':150000})
    monkeypatch.setitem(runtime.REGISTRY,original.name,replace(original,handler=handler))
    context={'routing':{'domain':'followup','lesson_search_allowed':True},'tools':[{'name':original.name,'input_schema':original.input_model.model_json_schema()}],
        'conversation':{'summary':'old '*5000,'recent':[{'role':'user','content':'previous '*2000} for _ in range(40)]},
        'lesson_content':{'transcript':{'content':'long source '*10000}}}
    monkeypatch.setattr(runtime.AgentService,'_context_async',AsyncMock(return_value=context))
    responses=[json.dumps({'tool_calls':[{'name':original.name,'arguments':{'offset':offset}}]}) for offset in [0,12000,24000]]
    responses.append(json.dumps({'message':'Mình chia nhỏ thành ba ý. Trước hết, hãy nắm ý chính thay vì học thuộc nguyên văn.','done':True}))
    model=AsyncMock(side_effect=responses);monkeypatch.setattr(LLMService,'call_model',model)
    async with runtime.AsyncSessionLocal() as db:
        result=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message='tiếp nha',idempotency_key=uuid4().hex),launch=False)
    rid=UUID(result['id']);await runtime._worker(rid,p.user_id,str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run=await db.get(AgentRun,rid)
        assert run.state=='completed' and 'ba ý' in run.response
        assert run.usage['estimated_input_tokens']>40000
    assert model.await_count==4 and handler.await_count==3
    assert all(len(call.args[0])>24000 for call in model.call_args_list)
    prompt=model.call_args_list[-1].args[0]
    last=json.loads(prompt[prompt.index('{"user_request":'):])
    assert not last['context'].get('answer_now', False)
    assert last['context']['tools']  # Three results no longer force an early final answer.
