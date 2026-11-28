"""Server-side transport, voice normalization, and helpers for Qwen 3.8 Omni Flash Realtime."""
import asyncio
import json
import re
from contextlib import asynccontextmanager
from typing import Any, Literal
from urllib.parse import urlencode

import httpx
from loguru import logger
from websockets.asyncio.client import connect

from app.core.settings import settings

VoiceName = Literal["Tina", "Serena", "Mia", "Chloe", "Ryan", "Aiden"]

SUPPORTED_VOICES: tuple[VoiceName, ...] = (
    "Tina",
    "Serena",
    "Mia",
    "Chloe",
    "Ryan",
    "Aiden",
)

CANONICAL_VOICE_MAP: dict[str, VoiceName] = {
    "tina": "Tina",
    "serena": "Serena",
    "mia": "Mia",
    "chloe": "Chloe",
    "ryan": "Ryan",
    "aiden": "Aiden",
    # Legacy xAI / Gemini / DashScope voice aliases -> Qwen 3.8 Omni voices
    "eve": "Tina",
    "ara": "Serena",
    "sal": "Mia",
    "rex": "Ryan",
    "leo": "Aiden",
    "aoede": "Tina",
    "kore": "Serena",
    "leda": "Chloe",
    "puck": "Mia",
    "charon": "Ryan",
    "fenrir": "Aiden",
    "cherry": "Tina",
    "chelsie": "Mia",
    "ethan": "Ryan",
}

MALE_VOICE_HINTS = (
    "ryan",
    "guy",
    "andrew",
    "brian",
    "christopher",
    "eric",
    "namminh",
    "yunxi",
    "yunjian",
    "keita",
    "injoon",
    "henri",
    "conrad",
    "alvaro",
    "dmitry",
    "male",
    "man",
    "mr",
)


def normalize_voice(value: str | None, fallback: VoiceName = "Tina") -> VoiceName:
    """Map any user-saved, legacy, or TTS voice identifier into a verified Qwen Omni voice."""
    if not value or not isinstance(value, str):
        return fallback
    cleaned = value.strip()
    if not cleaned:
        return fallback
    lower = cleaned.lower()
    if lower in CANONICAL_VOICE_MAP:
        return CANONICAL_VOICE_MAP[lower]
    for hint in MALE_VOICE_HINTS:
        if hint in lower:
            return "Ryan"
    if "jenny" in lower or "aria" in lower:
        return "Mia"
    if "sonia" in lower or "libby" in lower or "xiaoxiao" in lower:
        return "Serena"
    return fallback


def pick_persona_voice(persona: dict[str, Any] | None) -> VoiceName:
    """Resolve an appropriate Qwen 3.8 Omni voice for an AI roleplay persona."""
    if not persona or not isinstance(persona, dict):
        return "Tina"
    voice_id = str(persona.get("voice_id") or "").strip()
    if voice_id:
        return normalize_voice(voice_id, fallback="Tina")
    combined = f"{persona.get('name') or ''} {persona.get('role') or ''}".lower()
    male_names = (
        "alex",
        "david",
        "john",
        "james",
        "michael",
        "daniel",
        "tom",
        "jack",
        "leo",
        "ryan",
        "aiden",
        "minh",
        "nam",
        "hung",
        "tuan",
        "mr.",
        "waiter",
    )
    if any(token in combined for token in male_names):
        return "Ryan"
    return "Tina"


def realtime_api_key() -> str:
    return (settings.DASHSCOPE_API_KEY or "").strip()


def open_qwen_ws(model: str):
    key = realtime_api_key()
    if not key:
        raise ConnectionError("DashScope API key is not configured")
    base_url = (
        settings.DASHSCOPE_WS_URL
        or "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime"
    ).rstrip("/")
    query = urlencode({"model": model})
    return connect(
        f"{base_url}?{query}",
        additional_headers={"Authorization": f"Bearer {key}"},
        open_timeout=10,
        close_timeout=3,
        max_size=4 * 1024 * 1024,
    )


async def send_event(socket, kind: str, **payload):
    await socket.send(json.dumps({"type": kind, **payload}, ensure_ascii=False))


async def wait_for_event(socket, kind: str, timeout_seconds: float = 10.0) -> dict[str, Any]:
    async with asyncio.timeout(timeout_seconds):
        async for raw in socket:
            event = json.loads(raw)
            ev_type = event.get("type")
            if ev_type == "error":
                err_obj = event.get("error") if isinstance(event.get("error"), dict) else {}
                logger.warning(
                    "Qwen Realtime setup rejected: code={} type={} message={}",
                    err_obj.get("code") or event.get("code"),
                    err_obj.get("type"),
                    str(err_obj.get("message") or event.get("message") or "")[:200],
                )
                raise ConnectionError("Qwen Realtime rejected session setup")
            if ev_type == kind:
                return event
    raise ConnectionError("Qwen Realtime closed before setup completed")


@asynccontextmanager
async def open_realtime(
    instructions: str,
    voice: str,
    speed: float = 1.0,
    tools: list[dict[str, Any]] | None = None,
    *,
    language_hint: str | None = None,
    silence_duration_ms: int = 700,
):
    """Open a bidirectional speech-to-speech Qwen 3.8 Omni Flash Realtime session."""
    resolved_voice = normalize_voice(voice)
    model_name = settings.TUTOR_VOICE_MODEL or "qwen3.8-omni-flash-realtime"
    pace_note = ""
    if speed <= 0.88:
        pace_note = "\nHãy nói chậm rãi, rõ ràng từng cụm từ để người học dễ nghe."
    elif speed >= 1.12:
        pace_note = "\nHãy nói với nhịp độ linh hoạt, nhanh gọn tự nhiên."

    transcription_cfg: dict[str, Any] = {"model": "qwen3-asr-flash-realtime"}
    if language_hint:
        short_lang = language_hint.split("-")[0].strip().lower()
        if short_lang:
            transcription_cfg["language"] = short_lang

    session_payload: dict[str, Any] = {
        "modalities": ["text", "audio"],
        "instructions": instructions + pace_note,
        "voice": resolved_voice,
        "input_audio_format": "pcm",
        "output_audio_format": "pcm",
        "input_audio_transcription": transcription_cfg,
        "turn_detection": {
            "type": "server_vad",
            "threshold": 0.45,
            "prefix_padding_ms": 300,
            "silence_duration_ms": silence_duration_ms,
            "create_response": True,
            "interrupt_response": True,
        },
    }
    if tools:
        session_payload["tools"] = tools

    async with open_qwen_ws(model_name) as socket:
        await wait_for_event(socket, "session.created")
        await send_event(socket, "session.update", session=session_payload)
        await wait_for_event(socket, "session.updated")
        yield socket


@asynccontextmanager
async def open_asr_realtime(
    *,
    language: str = "vi",
    silence_duration_ms: int = 600,
):
    """Open a live speech-to-text dictation stream on Qwen3 ASR Flash Realtime."""
    model_name = settings.TUTOR_DICTATION_MODEL or "qwen3-asr-flash-realtime"
    short_lang = (language or "vi").split("-")[0].strip().lower() or "vi"
    async with open_qwen_ws(model_name) as socket:
        await wait_for_event(socket, "session.created")
        await send_event(
            socket,
            "session.update",
            session={
                "input_audio_format": "pcm",
                "sample_rate": 16000,
                "input_audio_transcription": {"language": short_lang},
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.25,
                    "silence_duration_ms": silence_duration_ms,
                },
            },
        )
        await wait_for_event(socket, "session.updated")
        yield socket


def _extract_json_dict(raw_text: str) -> dict[str, Any]:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text).strip()
    candidates = [text]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1])
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue
    raise ValueError("Invalid JSON object returned from Qwen")


async def call_qwen_json_async(
    prompt: str,
    *,
    max_tokens: int = 900,
    temperature: float = 0.3,
    timeout_seconds: float = 25.0,
) -> dict[str, Any]:
    """Call DashScope Qwen 3.8 Omni Flash compatible endpoint for structured JSON tasks."""
    key = realtime_api_key()
    if key:
        base_http = (
            settings.DASHSCOPE_COMPATIBLE_BASE_URL
            or "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
        ).rstrip("/")
        model = settings.DASHSCOPE_CHAT_MODEL or "qwen3.8-omni-flash"
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                resp = await client.post(
                    f"{base_http}/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"},
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "enable_thinking": False,
                    },
                )
                resp.raise_for_status()
                body = resp.json()
                content = body["choices"][0]["message"]["content"]
                if isinstance(content, list):
                    content = "".join(
                        part.get("text", "")
                        for part in content
                        if isinstance(part, dict)
                    )
                return _extract_json_dict(str(content or ""))
        except Exception:
            pass

    from app.core.llm import get_llm_service

    raw = await get_llm_service().call_model(
        prompt,
        mime_type="application/json",
        temperature=temperature,
        max_output_tokens=max_tokens,
    )
    return _extract_json_dict(raw)
