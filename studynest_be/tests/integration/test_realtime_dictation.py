"""Real auth/database + HTTP ticket + WebSocket transport; scripted speech provider."""
import asyncio
import json
import os
from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from app.agent import dictation, runtime
from app.core.settings import settings
from tests.integration.test_agent_runtime import isolated_engine, principal, authenticated_client

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Scratch database required')]

class Redis:
    def __init__(self):self.values={}
    async def set(self,key,value,**kw):
        if kw.get('nx') and key in self.values:return False
        self.values[key]=value;return True
    async def getdel(self,key):return self.values.pop(key,None)
    async def eval(self,script,keys,key,value):
        if self.values.get(key)==value:return int(self.values.pop(key,None) is not None)
        return 0

class Connection:
    async def __aenter__(self):
        self.events = asyncio.Queue()
        await self.events.put(json.dumps({'type': 'transcript.created'}))
        return self

    async def __aexit__(self, *args):
        pass

    async def send(self, data):
        stop = isinstance(data, str) and json.loads(data)['type'] == 'audio.done'
        await self.events.put(json.dumps({
            'type': 'transcript.partial', 'text': 'Xin chào bạn.' if stop else 'Xin chào',
            'start': 0, 'is_final': stop,
        }))
        if stop:
            await self.events.put(json.dumps({'type': 'transcript.done', 'text': ''}))

    async def __aiter__(self):
        while True:
            yield await self.events.get()

async def test_one_use_ticket_authenticates_and_streams_partial_before_stop(authenticated_client,principal,monkeypatch):
    from app.main import app
    monkeypatch.setattr(settings,'AGENT_ENABLED',True)
    monkeypatch.setattr(settings,'TUTOR_DICTATION_ENABLED',True)
    monkeypatch.setattr(settings,'AGENT_MAX_RUN_COST_USD',None)
    monkeypatch.setattr(settings,'XAI_API_KEY','fixture-key')
    monkeypatch.setattr(dictation,'AsyncSessionLocal',runtime.AsyncSessionLocal)
    redis=Redis();monkeypatch.setattr(dictation,'get_redis',lambda:redis)
    monkeypatch.setattr(dictation,'rate_limit',AsyncMock())
    configs=[]
    def connect(endpoint, **kw):
        configs.append((endpoint, kw))
        return Connection()
    monkeypatch.setattr(dictation, 'open_audio', connect)
    response=await authenticated_client.post('/api/v1/agent/dictation-ticket')
    assert response.status_code==200
    token=response.json()['ticket']
    async def revoked_ticket():
        return await authenticated_client.post('/api/v1/agent/dictation-ticket',headers={'Authorization':''})
    assert (await revoked_ticket()).status_code==401
    def browser():
        client=TestClient(app)
        with client.websocket_connect('/api/v1/agent/dictation',headers={'Origin':'http://localhost:3000'},subprotocols=[dictation.PROTOCOL,'ticket.'+token]) as ws:
            assert ws.receive_json()['type']=='ready'
            ws.send_bytes(b'\0'*3200)
            partial=ws.receive_json();assert partial['type']=='transcript' and partial['text']=='Xin chào'
            ws.send_json({'type':'stop'})
            assert ws.receive_json()['text']=='Xin chào bạn.'
            final=ws.receive_json();assert final['type']=='complete' and final['text']=='Xin chào bạn.'
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect('/api/v1/agent/dictation',headers={'Origin':'http://localhost:3000'},subprotocols=[dictation.PROTOCOL,'ticket.'+token]):pass
        client.close()
    await asyncio.to_thread(browser)
    assert configs == [('stt', {
        'sample_rate': 16000, 'encoding': 'pcm', 'language': 'vi',
        'interim_results': 'true', 'model': settings.TUTOR_DICTATION_MODEL,
    })]
    assert not redis.values
