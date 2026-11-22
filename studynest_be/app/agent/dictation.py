"""Authenticated transient PCM -> live input transcription, with no chat/tool execution."""
import asyncio
import hashlib
import json
import secrets
import time
from contextlib import suppress
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from app.agent.runtime import AgentService
from app.agent.multimodal import rate_limit
from app.core.redis import get_redis
from app.core.settings import settings
from app.core.xai_voice import open_audio, send_event, wait_for_event
from app.db.sesson import AsyncSessionLocal
from app.services.user.tutor_voice import AudioBudget, origin_allowed

PROTOCOL = 'studynest-dictation'
MAX_TEXT = 12000
RELEASE = 'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end'


async def principal(user_id, sid):
    async with AsyncSessionLocal() as db:
        service=AgentService(db,SimpleNamespace(id=UUID(str(user_id))),sid)
        await service.principal_async()


def enabled():
    if not settings.AGENT_ENABLED or not settings.TUTOR_DICTATION_ENABLED:
        raise HTTPException(503,'Nhập giọng nói realtime chưa được bật.')
    if not settings.XAI_API_KEY:
        raise HTTPException(503,'Chưa cấu hình nhận dạng giọng nói realtime.')
    if settings.AGENT_MAX_RUN_COST_USD is not None:
        raise HTTPException(503,'Chưa cấu hình ngân sách âm thanh realtime.')


async def ticket(service):
    enabled()
    await service.principal_async()
    await rate_limit(service.user.id,'dictation-live-ticket',8)
    value=secrets.token_urlsafe(32)
    await get_redis().set('dictation:ticket:'+hashlib.sha256(value.encode()).hexdigest(),
        json.dumps({'user_id':str(service.user.id),'sid':service.auth_sid}),ex=30,nx=True)
    return {'ticket':value,'expires_in':30}


async def relay(ws, live, check_auth, *, max_seconds=120, finalize_seconds=3):
    transcript = ''
    segments = {}
    seq = 0

    async def audio():
        budget = AudioBudget()
        total = 0
        checked = time.monotonic()
        while True:
            event = await asyncio.wait_for(ws.receive(), timeout=15)
            if event['type'] == 'websocket.disconnect':
                raise WebSocketDisconnect(event.get('code', 1000))
            if time.monotonic() - checked >= 15:
                await check_auth()
                checked = time.monotonic()
            data = event.get('bytes')
            if data is not None:
                budget.consume(len(data))
                total += len(data)
                if total > max_seconds * 32000 + 64000:
                    raise ValueError('Audio duration limit')
                await live.send(data)
                continue
            text = event.get('text') or ''
            if len(text) > 256:
                raise ValueError('Control frame limit')
            command = json.loads(text).get('type')
            if command == 'stop':
                await send_event(live, 'audio.done')
                return
            if command != 'ping':
                raise ValueError('Unsupported control')
            await ws.send_json({'type': 'pong'})

    async def transcription():
        nonlocal transcript, seq
        async for raw in live:
            event = json.loads(raw)
            kind = event['type']
            if kind == 'error':
                raise ConnectionError('xAI transcription failed')
            if kind == 'transcript.done':
                text = (event.get('text') or '').strip()
                if len(text) > MAX_TEXT:
                    raise ValueError('Transcript limit')
                if text and text != transcript:
                    transcript = text
                    seq += 1
                return
            if kind != 'transcript.partial':
                continue
            text = (event.get('text') or '').strip()
            if not text:
                continue
            start = event['start']
            final = bool(event.get('is_final'))
            if segments.get(start) == text:
                continue
            chunks = {**segments, start: text}
            transcript = ' '.join(chunks[offset] for offset in sorted(chunks))
            if len(transcript) > MAX_TEXT:
                raise ValueError('Transcript limit')
            if final:
                segments[start] = text
            seq += 1
            await ws.send_json({'type': 'transcript', 'seq': seq, 'text': transcript, 'final': final})
        raise ConnectionError('xAI ended transcription before final text')

    audio_task = asyncio.create_task(audio())
    transcript_task = asyncio.create_task(transcription())
    tasks = [audio_task, transcript_task]
    try:
        async with asyncio.timeout(max_seconds + finalize_seconds + 1):
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
            if transcript_task not in done:
                with suppress(TimeoutError):
                    await asyncio.wait_for(transcript_task, timeout=finalize_seconds)
            await ws.send_json({'type': 'complete', 'seq': seq, 'text': transcript, 'final': True})
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def run(ws: WebSocket):
    lease_key=None;lease=None;accepted=False
    try:
        enabled()
        if ws.query_params or not origin_allowed(ws.headers.get('origin')):
            raise HTTPException(403,'Origin or credentials invalid')
        protocols=ws.scope.get('subprotocols',[])
        credential=next((p[7:] for p in protocols if p.startswith('ticket.')),None)
        if PROTOCOL not in protocols or not credential or not 30<=len(credential)<=100:
            raise HTTPException(401,'One-use ticket required')
        value=await get_redis().getdel('dictation:ticket:'+hashlib.sha256(credential.encode()).hexdigest())
        if not value:raise HTTPException(401,'Ticket expired')
        binding=json.loads(value)
        user_id,sid=binding['user_id'],binding['sid']
        await principal(user_id,sid)
        lease_key='dictation:live:'+user_id
        lease=secrets.token_urlsafe(24)
        seconds=max(10,min(settings.TUTOR_DICTATION_MAX_SECONDS,300))
        if not await get_redis().set(lease_key,lease,ex=seconds+30,nx=True):
            lease_key=None
            raise HTTPException(409,'Một phiên nhập giọng nói khác đang chạy.')
        await ws.accept(subprotocol=PROTOCOL);accepted=True
        async with open_audio(
            'stt', sample_rate=16000, encoding='pcm', language='vi',
            interim_results='true', model=settings.TUTOR_DICTATION_MODEL or 'grok-voice-transcribe-2.0',
        ) as live:
            await wait_for_event(live, 'transcript.created')
            await ws.send_json({'type':'ready','sample_rate':16000,'max_seconds':seconds})
            await relay(ws,live,lambda:principal(user_id,sid),max_seconds=seconds)
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        if accepted:
            message=exc.detail if isinstance(exc,HTTPException) else 'Kết nối nhận dạng đã dừng. Phần chữ nhận được vẫn được giữ; bạn có thể bật mic lại.'
            with suppress(Exception):await ws.send_json({'type':'error','message':message})
    finally:
        if lease_key and lease:
            with suppress(Exception):
                async with asyncio.timeout(3):await get_redis().eval(RELEASE,1,lease_key,lease)
        with suppress(Exception):await ws.close(code=1000 if accepted else 1008)
