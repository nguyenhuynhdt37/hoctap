"""Opt-in real model + persisted semantic checkpoint, synthetic history only."""
import os
from uuid import UUID
from datetime import datetime,timezone,timedelta
import pytest
from tests.integration.test_agent_runtime import isolated_engine,principal
from app.agent import runtime,semantic_compaction as compaction
from app.agent.memory import MemoryService
from app.db.models.database import TutorChatMessages
from app.db.models.learning_memory import AgentThreadSummary
from app.services.user.tutor_chat import TutorChatService
from app.core.settings import settings

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL') or os.getenv('RUN_LIVE_MODEL_EVAL')!='1',reason='Explicit scratch DB and real model opt-in required')]

async def test_real_model_checkpoint_survives_reload_and_keeps_middle_correction(principal,monkeypatch):
    p=principal
    monkeypatch.setattr(compaction,'AsyncSessionLocal',runtime.AsyncSessionLocal)
    monkeypatch.setattr(settings,'AGENT_CONTEXT_THRESHOLD_CHARS',1000)
    async with runtime.AsyncSessionLocal() as db:
        thread=(await TutorChatService(db).get_or_create_account_thread(p.user_id))['thread'];tid=UUID(thread['id'])
        base=datetime.now(timezone.utc)-timedelta(hours=1)
        for n in range(26):
            content='Bàn thêm ví dụ minh họa, không có quyết định hoặc ràng buộc mới.'
            if n==0:content='Mục tiêu của tôi là học Văn bằng cách hiểu ý và ví dụ, không học vẹt.'
            if n==5:content='Chốt hạn nộp dàn ý là thứ Sáu.'
            if n==13:content='Đổi hạn nộp sang thứ Hai, thay cho thứ Sáu. Giữ nguyên mục tiêu ban đầu.'
            if n==17:content='Việc tạo dàn ý chưa hoàn tất, tôi muốn làm tiếp phần lập luận bằng ví dụ.'
            db.add(TutorChatMessages(thread_id=tid,user_id=p.user_id,role='user',content=content,sources=[],created_at=base+timedelta(seconds=n)))
        await db.commit()
        context=await MemoryService(db,p.user_id).conversation_context_async(tid);await db.commit()
        assert context['compaction_needed']
    for _ in range(6):
        if not await compaction.compact_thread_once(p.user_id,tid):break
    async with runtime.AsyncSessionLocal() as db:
        projection=await db.get(AgentThreadSummary,tid)
        state=compaction.decode(projection)
        assert state['checkpoint']['notes'] and state['through']
        context=await MemoryService(db,p.user_id).conversation_context_async(tid)
        notes=context['checkpoint']['notes']
        assert any(note['kind']=='goal' for note in notes)
        assert any('thứ hai' in note['text'].casefold() for note in notes)
        assert any(note['kind'] in {'pending','current_task'} and ('dàn ý' in note['text'].casefold() or 'lập luận' in note['text'].casefold()) for note in notes), notes
        assert not context['coverage']['pending']
