import asyncio
import json
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID,uuid4
import pytest
from sqlalchemy import select,func
from tests.integration.test_agent_runtime import isolated_engine,principal,create,poll
from app.agent import runtime
from app.agent.contracts import CreateRun,ActionReceipt
from app.core.llm import LLMService
from app.db.models.agent import AgentRun,AgentToolCall

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Explicit scratch DB required')]

async def test_full_mcp_browser_request_awaits_owned_client_receipt(principal,monkeypatch):
    p=principal;session=await create(p,['mcp.browser_snapshot'])
    model=AsyncMock(side_effect=[json.dumps({'tool_calls':[{'name':'mcp.browser_snapshot','arguments':{}}]}),json.dumps({'message':'Màn hình đang hiển thị nội dung bài học.','done':True})])
    monkeypatch.setattr(LLMService,'call_model',model)
    async with runtime.AsyncSessionLocal() as db:
        data=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message='Đọc màn hình hiện tại',idempotency_key=uuid4().hex),launch=False)
    rid=UUID(data['id']);task=asyncio.create_task(runtime._worker(rid,p.user_id,str(p.sid)))
    try:
        action=await poll(rid,'ui.action_requested')
        assert action['name']=='mcp.browser_snapshot'
        async with runtime.AsyncSessionLocal() as db:
            run=await db.get(AgentRun,rid);assert run.state=='executing'
            receipt=ActionReceipt(page_instance_id=action['page_instance_id'],context_revision=action['context_revision'],lesson_id=action['lesson_id'],status='completed',verified=True,result={'snapshot_id':'fixture-screen','text':'Visible lesson fixture','controls':[],'route':'/learning/test'})
            service=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
            await service.receipt_async(rid,UUID(action['action_id']),receipt)
        await asyncio.wait_for(task,10)
        async with runtime.AsyncSessionLocal() as db:
            run=await db.get(AgentRun,rid);assert run.state=='completed'
            calls=(await db.scalars(select(AgentToolCall).where(AgentToolCall.run_id==rid))).all()
            assert len(calls)==1 and calls[0].name=='mcp.browser_snapshot' and calls[0].status=='completed'
            assert calls[0].result['snapshot_id']=='fixture-screen'
    finally:
        if not task.done():task.cancel();await asyncio.gather(task,return_exceptions=True)
