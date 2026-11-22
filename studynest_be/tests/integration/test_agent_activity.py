import os
from datetime import timedelta
from uuid import uuid4
import pytest
from tests.integration.test_learning_agent_security import domain
from app.agent.activity import for_messages
from app.agent.runtime import now
from app.db.models.agent import AgentSession, AgentRun, AgentEvent
from app.db.models.database import TutorChatMessages
from app.services.user.tutor_chat import TutorChatService

pytestmark = [pytest.mark.asyncio, pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'), reason='Scratch database required')]


async def test_historical_activity_is_bound_to_owner_and_message(domain):
    d = domain
    thread = (await TutorChatService(d.db).get_or_create_account_thread(d.learner.id))['thread']
    from uuid import UUID
    message = TutorChatMessages(thread_id=UUID(thread['id']), user_id=d.learner.id, role='assistant', content='Done', sources=[])
    session = AgentSession(user_id=d.learner.id, auth_session_id=str(uuid4()), page_instance_id=str(uuid4()), route='/', capabilities=[], snapshot={}, expires_at=now()+timedelta(hours=1))
    d.db.add_all([message, session]); await d.db.flush()
    run = AgentRun(user_id=d.learner.id, session_id=session.id, thread_id=message.thread_id, state='completed', message='list github', response='Done',
        idempotency_key=str(uuid4()), request_hash='fixture', deadline=now()+timedelta(hours=1))
    d.db.add(run); await d.db.flush()
    d.db.add_all([
        AgentEvent(run_id=run.id, sequence=1, type='tool.started', payload={'name':'mcp.github_list_repositories','tool_call_id':'fixture','arguments':{'page':1}}),
        AgentEvent(run_id=run.id, sequence=2, type='tool.completed', payload={'name':'mcp.github_list_repositories','tool_call_id':'fixture','result':{'items':[{}]}}),
        AgentEvent(run_id=run.id, sequence=3, type='run.completed', payload={'message':{'id':str(message.id)}}),
    ]); await d.db.flush()
    result = await for_messages(d.db, d.learner.id, [message.id])
    assert len(result[str(message.id)]) == 3
    assert result[str(message.id)][1]['payload']['result']['item_count'] == 1
    assert await for_messages(d.db, d.outsider.id, [message.id]) == {}
    assert await for_messages(d.db, d.learner.id, [uuid4()]) == {}
