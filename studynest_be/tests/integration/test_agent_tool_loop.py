"""Model-directed tool batches remain bounded by configured budgets and grants."""
import json
import os
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from app.agent import runtime
from app.agent.contracts import CreateRun
from app.core.llm import LLMService
from app.core.settings import settings
from app.db.models.agent import AgentRun, AgentToolCall
from tests.integration.test_agent_runtime import isolated_engine, principal, create

pytestmark = [pytest.mark.asyncio, pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'), reason='Scratch database required')]


async def test_model_discovers_and_runs_six_tool_batches(principal, monkeypatch):
    monkeypatch.setattr(settings, 'AGENT_MCP_ENABLED', True)
    monkeypatch.setattr(settings, 'AGENT_MAX_ITERATIONS', 8)
    monkeypatch.setattr(settings, 'AGENT_MAX_INPUT_TOKENS', 160000)
    monkeypatch.setattr(settings, 'AGENT_MAX_OUTPUT_TOKENS_TOTAL', 20000)
    async def recent(ctx, value):
        return value
    async def working(ctx, value, outputs):
        return value, outputs
    monkeypatch.setattr('app.agent.semantic_compaction.compact_recent', recent)
    monkeypatch.setattr('app.agent.semantic_compaction.compact_working', working)
    for name in ['mcp.web_search', 'knowledge.search_lesson']:
        original = runtime.REGISTRY[name]
        monkeypatch.setitem(runtime.REGISTRY, name, replace(original, handler=AsyncMock(return_value={'items':[], 'sources':[]})))
    decisions = [{'tool_calls':[{'name':'tools.discover','arguments':{'names':['mcp.web_search','knowledge.search_lesson']}}]}]
    decisions += [{'tool_calls':[{'name':'mcp.web_search','arguments':{'query':f'NVIDIA nguồn đối chiếu {i}'}}]} for i in range(4)]
    decisions += [{'tool_calls':[{'name':'knowledge.search_lesson','arguments':{'query':'Đối chiếu bài đang học'}}]}]
    decisions += [{'message':'Đã đối chiếu các nguồn; hiện chưa đủ chứng cứ để kết luận tin đồn.', 'done':True}]
    model = AsyncMock(side_effect=[json.dumps(d) for d in decisions])
    monkeypatch.setattr(LLMService, 'call_model', model)
    p = principal
    session = await create(p)
    async with runtime.AsyncSessionLocal() as db:
        svc = runtime.AgentService(db, SimpleNamespace(id=p.user_id), p.sid)
        data = await svc.create_run_async(CreateRun(session_id=UUID(session['id']), message='Trên mạng người ta đồn kia kìa', idempotency_key=uuid4().hex), launch=False)
    rid = UUID(data['id'])
    await runtime._worker(rid, p.user_id, str(p.sid))
    async with runtime.AsyncSessionLocal() as db:
        run = await db.get(AgentRun, rid)
        assert run.state == 'completed' and 'tin đồn' in run.response
        calls = (await db.scalars(select(AgentToolCall).where(AgentToolCall.run_id == rid))).all()
        assert len(calls) == 6 and all(call.status == 'completed' for call in calls)
    assert model.await_count == 7
    for call in model.call_args_list:
        payload = json.loads(call.args[0][call.args[0].index('{"user_request":'):])
        assert not payload['context'].get('answer_now', False)
