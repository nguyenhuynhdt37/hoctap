import base64
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4
import httpx
import pytest
from fastapi import HTTPException
from app.agent import multimodal
from app.core.llm import LLMService


@pytest.mark.asyncio
@pytest.mark.parametrize('mime,format',[('audio/wav','wav'),('audio/webm','webm'),('audio/mp4','mp4')])
async def test_audio_routes_to_configured_chat_model(monkeypatch,mime,format):
    monkeypatch.setattr(multimodal.settings,'TUTOR_TRANSCRIBE_MODEL','ag/gemini-3.8-flash-low')
    monkeypatch.setattr(multimodal.settings,'NINEROUTER_API_KEY','fixture-key')
    monkeypatch.setattr(multimodal.settings,'NINEROUTER_BASE_URL','https://fixture.invalid/v1')
    def handle(request):
        assert str(request.url)=='https://fixture.invalid/v1/chat/completions'
        assert request.headers['authorization']=='Bearer fixture-key'
        data=json.loads(request.content)
        assert data['model']=='ag/gemini-3.8-flash-low' and data['stream'] is False
        block=data['messages'][0]['content'][1]['input_audio']
        assert block['format']==format and base64.b64decode(block['data'])==b'fixture-audio'
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':'Xin chào'}}]})
    client=httpx.AsyncClient(transport=httpx.MockTransport(handle))
    monkeypatch.setattr(multimodal.httpx,'AsyncClient',lambda **kwargs:client)
    assert await multimodal.transcribe_router(b'fixture-audio',mime)=='Xin chào'


@pytest.mark.asyncio
async def test_router_error_is_friendly_without_google_fallback_or_secret(monkeypatch):
    monkeypatch.setattr(multimodal,'rate_limit',AsyncMock())
    monkeypatch.setattr(multimodal.settings,'AGENT_MAX_RUN_COST_USD',None)
    monkeypatch.setattr(multimodal.settings,'TUTOR_TRANSCRIBE_PROVIDER','9router')
    monkeypatch.setattr(multimodal,'transcribe_router',AsyncMock(side_effect=RuntimeError('provider-secret')))
    monkeypatch.setattr(multimodal.genai,'Client',lambda **kwargs:pytest.fail('Must not silently fall back to Google'))
    file=SimpleNamespace(content_type='audio/webm;codecs=opus',read=AsyncMock(return_value=b'fixture-audio'))
    with pytest.raises(HTTPException) as exc:
        await multimodal.transcribe(uuid4(),file)
    assert exc.value.status_code==502 and 'provider-secret' not in exc.value.detail


@pytest.mark.asyncio
async def test_vision_uses_verified_nonstreaming_route_even_when_text_streams(monkeypatch):
    monkeypatch.setattr(multimodal.settings,'NINEROUTER_STREAM',True)
    monkeypatch.setattr(multimodal.settings,'NINEROUTER_API_KEY','fixture-key')
    def handle(request):
        data=json.loads(request.content)
        assert data['stream'] is False and data['model']=='ag/gemini-3.8-flash-low'
        assert data['messages'][-1]['content'][1]['image_url']['url'].startswith('data:image/jpeg;base64,')
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':'Mèo'}}]})
    client=httpx.AsyncClient(transport=httpx.MockTransport(handle))
    monkeypatch.setattr(multimodal.httpx,'AsyncClient',lambda **kwargs:client)
    service=LLMService(provider_override='9router',model_override='ag/gemini-3.8-flash-low')
    assert await service.call_model('Ảnh gì?',retries=1,mime_type='text/plain',images=[{'data':b'fixture','mime_type':'image/jpeg'}])=='Mèo'
