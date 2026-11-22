"""Explicit opt-in real provider + PostgreSQL lifecycle, only synthetic fixture data."""
import os
from types import SimpleNamespace
from uuid import UUID, uuid4
import pytest
from sqlalchemy import select,func
from tests.integration.test_agent_runtime import isolated_engine,principal,create
from app.agent import runtime
from app.agent.contracts import CreateRun
from app.db.models.agent import AgentRun,AgentToolCall
from app.db.models.learning_memory import LearningMemoryItem

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL') or os.getenv('RUN_LIVE_MODEL_EVAL')!='1',reason='Explicit scratch DB and live provider opt-in required')]

async def test_real_model_selects_durable_memory_and_reuses_next_turn(principal):
    p=principal;session=await create(p)
    async def ask(message):
        async with runtime.AsyncSessionLocal() as db:
            result=await runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid).create_run_async(CreateRun(session_id=UUID(session['id']),message=message,idempotency_key=uuid4().hex),launch=False)
        rid=UUID(result['id']);await runtime._worker(rid,p.user_id,str(p.sid))
        async with runtime.AsyncSessionLocal() as db:
            run=await db.get(AgentRun,rid)
            assert run.state=='completed',f'run state={run.state}, code={run.last_error}'
            assert await db.scalar(select(func.count()).select_from(AgentToolCall).where(AgentToolCall.run_id==rid,AgentToolCall.name=='knowledge.search_lesson'))==0
            return run.response
    await ask('Mỗi khi học, mình tiếp thu tốt hơn bằng sơ đồ và ví dụ thực tế')
    async with runtime.AsyncSessionLocal() as db:
        rows=(await db.scalars(select(LearningMemoryItem).where(LearningMemoryItem.user_id==p.user_id,LearningMemoryItem.status=='confirmed'))).all()
        assert rows and any('sơ đồ' in row.content for row in rows)
        assert all(row.expires_at is None for row in rows)
    answer=await ask('Bạn nhớ cách học mà mình thích không?')
    assert 'sơ đồ' in answer.casefold() and 'ví dụ' in answer.casefold()
