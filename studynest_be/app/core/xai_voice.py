"""Backward-compatible re-exports pointing to Qwen 3.8 Omni Flash Realtime."""
from app.core.qwen_voice import (
    SUPPORTED_VOICES,
    VoiceName,
    normalize_voice,
    open_asr_realtime,
    open_qwen_ws as open_audio,
    open_realtime,
    realtime_api_key,
    send_event,
    wait_for_event,
)

__all__ = [
    "SUPPORTED_VOICES",
    "VoiceName",
    "normalize_voice",
    "open_asr_realtime",
    "open_audio",
    "open_realtime",
    "realtime_api_key",
    "send_event",
    "wait_for_event",
]
