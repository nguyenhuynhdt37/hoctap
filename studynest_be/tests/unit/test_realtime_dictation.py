import asyncio
import hashlib
import json
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock
from uuid import uuid4
import pytest
from fastapi import HTTPException, WebSocketDisconnect
from app.agent import dictation

class Socket:
    def __init__(self, ticket='t'*43, origin='http://localhost:3000'):
        self.headers={'origin':origin};self.query_params={}
        self.scope={'subprotocols':[dictation.PROTOCOL,'ticket.'+ticket]}
        self.input=asyncio.Queue();self.events=[];self.accepted=False;self.close_code=None
    async def receive(self):return await self.input.get()
    async def send_json(self,event):self.events.append(event)
    async def accept(self,subprotocol):self.accepted=True
    async def close(self,code):self.close_code=code


@pytest.fixture
def legacy_ticket_socket(monkeypatch):
    monkeypatch.setattr(dictation.settings, 'AUTH_ALLOW_COOKIE_COMPAT', True)
    monkeypatch.setattr(dictation.settings, 'AUTH_ALLOW_UNBOUND_BEARER', False)
    monkeypatch.setattr(dictation.settings, 'TUTOR_VOICE_ORIGINS', 'http://localhost:3000')
    return Socket()


class Live:
    def __init__(self):
        self.events = asyncio.Queue()
        self.sent = []

    async def send(self, data):
        self.sent.append(data)
        if data == '{"type": "audio.done"}':
            await self.events.put(json.dumps({'type': 'transcript.partial', 'text': 'Xin chào bạn.', 'is_final': True, 'start': 0}))
            await self.events.put(json.dumps({'type': 'transcript.partial', 'text': 'Xin chào bạn.',
                                              'is_final': True, 'speech_final': True, 'start': 0}))
            await self.events.put(json.dumps({'type': 'transcript.done', 'text': ''}))
        else:
            await self.events.put(json.dumps({'type': 'transcript.partial', 'text': 'Xin chào', 'is_final': False, 'start': 0}))

    async def __aiter__(self):
        while True:
            yield await self.events.get()

@pytest.mark.asyncio
async def test_partial_text_precedes_stop_and_final_tail_is_drained():
    ws=Socket();live=Live();auth=AsyncMock()
    task=asyncio.create_task(dictation.relay(ws,live,auth,max_seconds=2,finalize_seconds=.6))
    await ws.input.put({'type':'websocket.receive','bytes':b'\0'*3200})
    for _ in range(30):
        if ws.events:break
        await asyncio.sleep(.01)
    assert ws.events[0]=={'type':'transcript','seq':1,'text':'Xin chào','final':False}
    assert not task.done()
    await ws.input.put({'type':'websocket.receive','text':'{"type":"stop"}'})
    await asyncio.wait_for(task,2)
    assert ws.events[-1]=={'type':'complete','seq':2,'text':'Xin chào bạn.','final':True}
    assert live.sent.count('{"type": "audio.done"}') == 1

@pytest.mark.asyncio
@pytest.mark.parametrize('audio',[b'x',b'x'*16386,b''])
async def test_invalid_pcm_is_rejected_before_forwarding(audio):
    ws=Socket();live=Live()
    await ws.input.put({'type':'websocket.receive','bytes':audio})
    with pytest.raises(ValueError):await dictation.relay(ws,live,AsyncMock(),max_seconds=1)
    assert not live.sent

@pytest.mark.asyncio
async def test_disconnect_cancels_provider_reader():
    ws=Socket();live=Live()
    await ws.input.put({'type':'websocket.disconnect','code':1000})
    with pytest.raises(WebSocketDisconnect):await dictation.relay(ws,live,AsyncMock(),max_seconds=1)
    assert not ws.events

@pytest.mark.asyncio
async def test_generated_model_output_is_never_forwarded():
    ws=Socket();live=Live()
    await live.events.put(json.dumps({'type':'response.output_text.delta','delta':'NOT_INPUT_SPEECH'}))
    await ws.input.put({'type':'websocket.receive','text':'{"type":"stop"}'})
    await dictation.relay(ws,live,AsyncMock(),max_seconds=1,finalize_seconds=.4)
    assert 'NOT_INPUT_SPEECH' not in json.dumps(ws.events)

@pytest.mark.asyncio
@pytest.mark.parametrize('kind',['origin','query_token','empty_ticket','replay','revoked'])
async def test_socket_rejects_invalid_auth_before_upstream(monkeypatch, kind, legacy_ticket_socket):
    ws = legacy_ticket_socket
    if kind=='origin':ws.headers['origin']='https://attacker.invalid'
    if kind=='query_token':ws.query_params={'token':'private'}
    if kind=='empty_ticket':ws.scope['subprotocols']=[dictation.PROTOCOL, 'ticket.']
    binding=json.dumps({'user_id':str(uuid4()),'sid':str(uuid4())})
    redis=NS(getdel=AsyncMock(return_value=None if kind=='replay' else binding),set=AsyncMock(return_value=True),eval=AsyncMock())
    monkeypatch.setattr(dictation,'enabled',lambda:None)
    monkeypatch.setattr(dictation,'get_redis',lambda:redis)
    monkeypatch.setattr(dictation,'principal',AsyncMock(side_effect=HTTPException(401,'Revoked') if kind=='revoked' else None))
    upstream=AsyncMock();monkeypatch.setattr(dictation,'open_audio',upstream)
    await dictation.run(ws)
    assert not ws.accepted and ws.close_code==1008
    assert redis.getdel.await_count == (1 if kind in {'replay', 'revoked'} else 0)
    assert dictation.principal.await_count == (1 if kind == 'revoked' else 0)
    redis.set.assert_not_awaited()
    upstream.assert_not_called()

@pytest.mark.asyncio
async def test_account_lease_rejection_never_releases_another_session(monkeypatch, legacy_ticket_socket):
    ws = legacy_ticket_socket
    redis=NS(getdel=AsyncMock(return_value=json.dumps({'user_id':str(uuid4()),'sid':str(uuid4())})),set=AsyncMock(return_value=False),eval=AsyncMock())
    monkeypatch.setattr(dictation,'enabled',lambda:None)
    monkeypatch.setattr(dictation,'get_redis',lambda:redis)
    monkeypatch.setattr(dictation,'principal',AsyncMock())
    await dictation.run(ws)
    assert not ws.accepted
    redis.set.assert_awaited_once()
    redis.eval.assert_not_awaited()

@pytest.mark.asyncio
async def test_provider_failure_releases_own_lease_and_hides_upstream_secrets(monkeypatch, legacy_ticket_socket):
    ws = legacy_ticket_socket
    user_id, sid = str(uuid4()), str(uuid4())
    redis=NS(getdel=AsyncMock(return_value=json.dumps({'user_id':user_id,'sid':sid})),set=AsyncMock(return_value=True),eval=AsyncMock())
    monkeypatch.setattr(dictation,'enabled',lambda:None)
    monkeypatch.setattr(dictation,'get_redis',lambda:redis)
    monkeypatch.setattr(dictation,'principal',AsyncMock())
    class Connection:
        async def __aenter__(self):raise RuntimeError('UPSTREAM_API_SECRET')
        async def __aexit__(self, *exc):pass
    provider = Mock(return_value=Connection())
    monkeypatch.setattr(dictation, 'open_audio', provider)
    await dictation.run(ws)
    provider.assert_called_once()
    assert ws.accepted and ws.events[0]['type']=='error'
    assert 'UPSTREAM_API_SECRET' not in json.dumps(ws.events)
    lease_key, lease_value = redis.set.await_args.args
    assert lease_key == f'dictation:live:{user_id}'
    redis.eval.assert_awaited_once_with(dictation.RELEASE, 1, lease_key, lease_value)

@pytest.mark.asyncio
async def test_ticket_is_short_lived_owned_and_uses_separate_namespace(monkeypatch):
    service=NS(user=NS(id=uuid4()),auth_sid=str(uuid4()),principal_async=AsyncMock())
    redis=NS(set=AsyncMock(return_value=True))
    monkeypatch.setattr(dictation,'enabled',lambda:None)
    monkeypatch.setattr(dictation,'get_redis',lambda:redis)
    monkeypatch.setattr(dictation,'rate_limit',AsyncMock())
    response=await dictation.ticket(service)
    args=redis.set.call_args
    assert args.args[0]=='dictation:ticket:'+hashlib.sha256(response['ticket'].encode()).hexdigest()
    assert json.loads(args.args[1])=={'user_id':str(service.user.id),'sid':service.auth_sid}
    assert args.kwargs=={'ex':30,'nx':True}
