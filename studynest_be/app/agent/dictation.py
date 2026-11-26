"""Authenticated transient PCM -> live input transcription via Qwen3 ASR Flash Realtime."""
import asyncio
import base64
import hashlib
import json
import secrets
import time
from contextlib import suppress
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException, WebSocket, WebSocketDisconnect

from app.agent.multimodal import rate_limit
from app.agent.runtime import AgentService
from app.core.deps import AuthorizationService
from app.core.qwen_voice import open_asr_realtime, realtime_api_key, send_event
from app.core.redis import get_redis
from app.core.settings import settings
from app.db.sesson import AsyncSessionLocal
from app.services.user.tutor_voice import AudioBudget, origin_allowed

PROTOCOL = 'studynest-dictation'
MAX_TEXT = 12000
RELEASE = 'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end'


async def principal(user_id, sid):
    async with AsyncSessionLocal() as db:
        service = AgentService(db, SimpleNamespace(id=UUID(str(user_id))), sid)
        await service.principal_async()


def enabled():
    if not settings.AGENT_ENABLED or not settings.TUTOR_DICTATION_ENABLED:
        raise HTTPException(503, 'Nhập giọng nói realtime chưa được bật.')
    if not realtime_api_key():
        raise HTTPException(503, 'Chưa cấu hình nhận dạng giọng nói Qwen Realtime.')
    if settings.AGENT_MAX_RUN_COST_USD is not None:
        raise HTTPException(503, 'Chưa cấu hình ngân sách âm thanh realtime.')


async def ticket(service):
    enabled()
    await service.principal_async()
    await rate_limit(service.user.id, 'dictation-live-ticket', 8)
    value = secrets.token_urlsafe(32)
    await get_redis().set(
        'dictation:ticket:' + hashlib.sha256(value.encode()).hexdigest(),
        json.dumps({'user_id': str(service.user.id), 'sid': service.auth_sid}),
        ex=30,
        nx=True,
    )
    return {'ticket': value, 'expires_in': 30}


async def relay(ws, live, check_auth, *, max_seconds=120, finalize_seconds=2.5):
    transcript = ''
    segment_order: list[str] = []
    segments: dict[str, str] = {}
    pending_items: set[str] = set()
    stop_requested = asyncio.Event()
    all_finalized = asyncio.Event()
    all_finalized.set()
    seq = 0

    def rebuild_transcript() -> str:
        return ' '.join(
            segments[item_id].strip()
            for item_id in segment_order
            if segments.get(item_id, '').strip()
        ).strip()

    async def audio():
        budget = AudioBudget()
        total = 0
        checked = time.monotonic()
        sent_audio = False
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
                await send_event(
                    live,
                    'input_audio_buffer.append',
                    audio=base64.b64encode(data).decode(),
                )
                sent_audio = True
                continue
            text = event.get('text') or ''
            if len(text) > 256:
                raise ValueError('Control frame limit')
            command = json.loads(text).get('type')
            if command == 'stop':
                stop_requested.set()
                if sent_audio:
                    # Feed trailing silence so server_vad cleanly commits the active utterance.
                    await send_event(
                        live,
                        'input_audio_buffer.append',
                        audio=base64.b64encode(bytes(25600)).decode(),
                    )
                return
            if command != 'ping':
                raise ValueError('Unsupported control')
            await ws.send_json({'type': 'pong'})

    async def transcription():
        nonlocal transcript, seq
        async for raw in live:
            event = json.loads(raw)
            kind = event.get('type') or ''
            if kind == 'error':
                err_msg = (event.get('error') or {}).get('message') or ''
                if stop_requested.is_set() and 'commit' in err_msg.lower():
                    return
                raise ConnectionError('Qwen ASR transcription failed')

            if kind == 'input_audio_buffer.speech_started':
                item_id = str(event.get('item_id') or f'seg-{len(segment_order)}')
                if item_id not in segments:
                    segment_order.append(item_id)
                    segments[item_id] = ''
                pending_items.add(item_id)
                all_finalized.clear()
                continue

            if kind in {
                'conversation.item.input_audio_transcription.text',
                'conversation.item.input_audio_transcription.updated',
                'conversation.item.input_audio_transcription.completed',
            }:
                item_id = str(event.get('item_id') or (segment_order[-1] if segment_order else 'seg-0'))
                if item_id not in segments:
                    segment_order.append(item_id)
                    segments[item_id] = ''

                if kind.endswith('.text'):
                    piece = f"{event.get('text') or ''}{event.get('stash') or ''}".strip()
                    is_final = False
                else:
                    piece = str(event.get('transcript') or '').strip()
                    is_final = kind.endswith('.completed')

                if piece:
                    segments[item_id] = piece
                    merged = rebuild_transcript()
                    if len(merged) > MAX_TEXT:
                        raise ValueError('Transcript limit')
                    if merged != transcript or is_final:
                        transcript = merged
                        seq += 1
                        await ws.send_json({
                            'type': 'transcript',
                            'seq': seq,
                            'text': transcript,
                            'final': is_final,
                        })

                if is_final:
                    pending_items.discard(item_id)
                    if not pending_items:
                        all_finalized.set()
                        if stop_requested.is_set():
                            return

    audio_task = asyncio.create_task(audio())
    transcript_task = asyncio.create_task(transcription())
    tasks = [audio_task, transcript_task]
    try:
        async with asyncio.timeout(max_seconds + finalize_seconds + 2):
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
            if stop_requested.is_set() and not transcript_task.done():
                with suppress(TimeoutError):
                    await asyncio.sleep(0.35)
                    if pending_items:
                        await asyncio.wait_for(all_finalized.wait(), timeout=finalize_seconds)
            seq += 1
            await ws.send_json({'type': 'complete', 'seq': seq, 'text': transcript, 'final': True})
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def run(ws: WebSocket):
    lease_key = lease = None
    accepted = closed = False
    try:
        enabled()
        if ws.query_params or not origin_allowed(ws.headers.get('origin')):
            raise HTTPException(403, 'Origin or credentials invalid')
        protocols = ws.scope.get('subprotocols', [])
        credential = next((p[7:] for p in protocols if p.startswith('ticket.')), None)
        if credential is not None:
            if (
                not (settings.AUTH_ALLOW_COOKIE_COMPAT or settings.AUTH_ALLOW_UNBOUND_BEARER)
                or PROTOCOL not in protocols or not 30 <= len(credential) <= 100
            ):
                raise HTTPException(401, 'Invalid one-use ticket')
            key = 'dictation:ticket:' + hashlib.sha256(credential.encode()).hexdigest()
            value = await get_redis().getdel(key)
            if not value:
                raise HTTPException(401, 'Ticket expired')
            binding = json.loads(value)
            user_id, sid = binding['user_id'], binding['sid']
        else:
            await ws.accept(subprotocol=PROTOCOL if PROTOCOL in protocols else None)
            accepted = True
            if not await AuthorizationService.get_require_role_ws(ws, require_frame=True, defer_auth_ack=True):
                closed = True
                return
            identity = ws.state.access_identity
            user_id, sid = str(identity.user_id), str(identity.sid)

        async def check_auth():
            nonlocal closed
            if credential is None and not await AuthorizationService.get_require_role_ws(ws, require_frame=True):
                closed = True
                raise WebSocketDisconnect(4401)
            await principal(user_id, sid)

        await principal(user_id, sid)
        if credential is None:
            await AuthorizationService.acknowledge_ws_auth_async(ws)
        lease_key = 'dictation:live:' + user_id
        lease = secrets.token_urlsafe(24)
        seconds = max(10, min(settings.TUTOR_DICTATION_MAX_SECONDS, 300))
        if not await get_redis().set(lease_key, lease, ex=seconds + 30, nx=True):
            lease_key = None
            raise HTTPException(409, 'Một phiên nhập giọng nói khác đang chạy.')
        if not accepted:
            await ws.accept(subprotocol=PROTOCOL)
            accepted = True
        async with open_asr_realtime(language='vi', silence_duration_ms=600) as live:
            await ws.send_json({'type': 'ready', 'sample_rate': 16000, 'max_seconds': seconds})
            await relay(ws, live, check_auth, max_seconds=seconds)
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        if accepted:
            message = (
                exc.detail
                if isinstance(exc, HTTPException)
                else 'Kết nối nhận dạng đã dừng. Phần chữ nhận được vẫn được giữ; bạn có thể bật mic lại.'
            )
            with suppress(Exception):
                await ws.send_json({'type': 'error', 'message': message})
    finally:
        if lease_key and lease:
            with suppress(Exception):
                async with asyncio.timeout(3):
                    await get_redis().eval(RELEASE, 1, lease_key, lease)
        if not closed:
            with suppress(Exception):
                await ws.close(code=1000 if accepted else 1008)
