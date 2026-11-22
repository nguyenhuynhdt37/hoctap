import os
from sqlalchemy import select
import pytest
from tests.integration.test_learning_agent_security import domain
from app.agent.automatic_memory import capture
from app.agent.memory import MemoryService, MemoryConsentInput
from app.db.models.database import TutorChatMessages
from app.db.models.learning_memory import LearningMemoryItem
from app.services.user.tutor_chat import TutorChatService
from uuid import UUID

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Scratch DB required')]


async def test_durable_auto_memory_update_forget_and_opt_out(domain):
    d=domain
    thread=(await TutorChatService(d.db).get_or_create_account_thread(d.learner.id))['thread']
    async def say(text):
        message=TutorChatMessages(thread_id=UUID(thread['id']),user_id=d.learner.id,role='user',content=text,sources=[])
        d.db.add(message);await d.db.flush()
        result=await capture(d.db,d.learner.id,message);await d.db.commit();return result
    ids=await say('Tôi tên là An')
    assert len(ids)==1
    service=MemoryService(d.db,d.learner.id)
    item=await d.db.get(LearningMemoryItem,UUID(ids[0]))
    assert item.status=='confirmed' and item.expires_at is None
    assert any(row['content']=='Tôi tên là An' for row in await service.context_async())
    assert await say('Tôi tên là An')==[]
    changed=await say('Tôi tên là Bình')
    await d.db.refresh(item)
    assert item.status=='superseded' and len(changed)==1
    await service.delete_async(UUID(changed[0]))
    assert await say('Tôi tên là Bình')==[]
    assert await MemoryService(d.db,d.outsider.id).context_async()==[]
    await service.set_consent_async(MemoryConsentInput(enabled=False))
    assert await say('Mình thích mèo')==[]
