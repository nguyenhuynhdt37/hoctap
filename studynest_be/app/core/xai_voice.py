"""Server-side transport and voice IDs for xAI audio."""
import asyncio
import json
from contextlib import asynccontextmanager
from typing import Literal
from urllib.parse import urlencode

from websockets.asyncio.client import connect

from app.core.settings import settings

VoiceName = Literal['eve', 'ara', 'rex', 'sal', 'leo']
LEGACY_VOICES = {
    'aoede': 'eve', 'kore': 'ara', 'puck': 'sal',
    'charon': 'rex', 'fenrir': 'leo', 'leda': 'ara',
}


def normalize_voice(value: str) -> str:
    name = value.strip().lower()
    return LEGACY_VOICES.get(name, name)


def open_audio(endpoint, **params):
    return connect(
        f'wss://api.x.ai/v1/{endpoint}?{urlencode(params)}',
        additional_headers={'Authorization': f'Bearer {settings.XAI_API_KEY}'},
        open_timeout=8,
        close_timeout=3,
    )


async def send_event(socket, kind, **payload):
    await socket.send(json.dumps({'type': kind, **payload}, ensure_ascii=False))


async def wait_for_event(socket, kind):
    async with asyncio.timeout(8):
        async for raw in socket:
            event = json.loads(raw)
            if event['type'] == 'error':
                raise ConnectionError('xAI rejected audio setup')
            if event['type'] == kind:
                return
    raise ConnectionError('xAI closed before audio setup')


@asynccontextmanager
async def open_realtime(instructions, voice, speed, tools):
    async with open_audio('realtime', model=settings.TUTOR_VOICE_MODEL) as socket:
        await send_event(socket, 'session.update', session={
            'instructions': instructions,
            'voice': voice,
            'tools': tools,
            'turn_detection': {'type': 'server_vad', 'silence_duration_ms': 700},
            'audio': {
                'input': {
                    'format': {'type': 'audio/pcm', 'rate': 16000},
                    'transcription': {'model': 'grok-transcribe', 'language_hint': 'vi'},
                },
                'output': {'format': {'type': 'audio/pcm', 'rate': 24000}, 'speed': speed},
            },
        })
        await wait_for_event(socket, 'session.updated')
        yield socket
