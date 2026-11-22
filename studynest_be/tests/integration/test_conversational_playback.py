import os
import asyncio
from uuid import UUID, uuid4
from types import SimpleNamespace
import pytest
from sqlalchemy import select
from tests.integration.test_agent_runtime import isolated_engine, principal, create, poll
from app.agent import runtime
from app.agent.contracts import CreateRun, ActionReceipt
from app.db.models.agent import AgentRun, AgentToolCall

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Scratch DB required')]


@pytest.mark.parametrize('message', ['Anh có thể phát bài này lên được không?', 'Hello, phát video nha'])
async def test_polite_play_runs_only_player_and_waits_for_receipt(principal, message):
    p=principal;session=await create(p,capabilities=['video.play'])
    async with runtime.AsyncSessionLocal() as db:
        s=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
        value=await s.create_run_async(CreateRun(session_id=UUID(session['id']),message=message,idempotency_key=uuid4().hex),launch=False)
    run_id=UUID(value['id']);task=asyncio.create_task(runtime._worker(run_id,p.user_id,str(p.sid)))
    try:
        request=await poll(run_id,'ui.action_requested')
        assert request['name']=='video.play'
        async with runtime.AsyncSessionLocal() as db:
            s=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
            assert (await db.get(AgentRun,run_id)).state=='executing'
            await s.receipt_async(run_id,UUID(request['action_id']),ActionReceipt(page_instance_id=request['page_instance_id'],context_revision=request['context_revision'],lesson_id=p.lesson_id,status='completed',verified=True,result={'is_playing':True}))
        await asyncio.wait_for(task,5)
        async with runtime.AsyncSessionLocal() as db:
            run=await db.get(AgentRun,run_id)
            assert run.state=='completed' and 'Đã phát video' in run.response
            assert list(await db.scalars(select(AgentToolCall.name).where(AgentToolCall.run_id==run_id)))==['video.play']
    finally:
        task.cancel();await asyncio.gather(task,return_exceptions=True)
