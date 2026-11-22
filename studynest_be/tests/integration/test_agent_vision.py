import os
from uuid import UUID,uuid4
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from tests.integration.test_agent_runtime import isolated_engine, principal
from app.agent import runtime, vision
from app.agent.contracts import CreateSession, CreateRun
from app.db.models.database import TutorChatImages
from app.db.models.agent import AgentRun
from types import SimpleNamespace

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Scratch DB required')]


async def test_image_message_persists_and_followup_is_thread_scoped(principal, monkeypatch):
    p=principal
    read=AsyncMock(return_value={'data':b'actual-pixels','mime_type':'image/jpeg','width':100,'height':80})
    monkeypatch.setattr(vision,'read_owned',read)
    url=f'/api/storage/files/private/users/{p.user_id}/tutor-chat/2026/11/images/test.jpg'
    async with runtime.AsyncSessionLocal() as db:
        service=runtime.AgentService(db,SimpleNamespace(id=p.user_id),p.sid)
        session=await service.create_session_async(CreateSession(page_instance_id='vision-'+uuid4().hex,route='/chat-sql'))
        result=await service.create_run_async(CreateRun(session_id=UUID(session['id']),message='Nhìn ảnh',idempotency_key=uuid4().hex,images=[{'url':url}]),launch=False)
        run=await db.get(AgentRun,UUID(result['id']))
        image=await db.scalar(select(TutorChatImages).where(TutorChatImages.message_id==run.input_message_id))
        assert image.user_id==p.user_id and image.url==url and image.ocr_text==''
        assert (await vision.thread_images(db,p.user_id,run.thread_id))[0]['data']==b'actual-pixels'
        assert await vision.thread_images(db,p.user_id,uuid4())==[]
        assert await vision.thread_images(db,uuid4(),run.thread_id)==[]


async def test_old_images_require_explicit_model_request(principal, monkeypatch):
    from app.agent.tools import view_images, Empty
    p = principal
    read = AsyncMock(return_value={'data':b'pixels', 'mime_type':'image/jpeg', 'width':100, 'height':80})
    monkeypatch.setattr(vision, 'read_owned', read)
    url = f'/api/storage/files/private/users/{p.user_id}/tutor-chat/2026/11/images/test.jpg'
    async with runtime.AsyncSessionLocal() as db:
        svc = runtime.AgentService(db, SimpleNamespace(id=p.user_id), p.sid)
        session = await svc.create_session_async(CreateSession(page_instance_id=uuid4().hex, route='/'))
        image_run = await svc.create_run_async(CreateRun(session_id=UUID(session['id']), message='Con gì đây?', idempotency_key=uuid4().hex, images=[{'url':url}]), launch=False)
        await svc.cancel_async(UUID(image_run['id']))
        followup = await svc.create_run_async(CreateRun(session_id=UUID(session['id']), message='Tin NVIDIA trên mạng hôm nay', idempotency_key=uuid4().hex), launch=False)
        await svc._assert_running_async(UUID(followup['id']))
        read.reset_mock()
        ctx = await svc._context_async()
        assert svc.vision_images == [] and ctx['images'] == []
        assert ctx['image_history']
        read.assert_not_awaited()
        assert ctx['account']['display_name'] == 'Agent isolated test'
        await view_images(svc, Empty())
        assert svc.vision_images[0]['data'] == b'pixels'
        # Context refresh after a tool must preserve the explicitly selected pixels.
        await svc._context_async()
        assert svc.vision_images[0]['data'] == b'pixels'
