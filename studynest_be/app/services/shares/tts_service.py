"""Dịch vụ Text-to-Speech (TTS) đa ngôn ngữ qua 9Router + lưu cache MP3 trên R2."""

import asyncio
import hashlib
import os
import re
import shutil
import tempfile
from functools import lru_cache
from typing import Any

import httpx
from fastapi import HTTPException
from loguru import logger

from app.core.settings import settings
from app.services.shares.file_storage import get_file_storage_service

TTS_VOICE_CATALOG: list[dict[str, str]] = [
    {
        "voice_id": "edge-tts/en-US-AriaNeural",
        "lang_code": "en-US",
        "language": "Tiếng Anh (Mỹ)",
        "label": "Aria — Nữ (Anh-Mỹ tự nhiên)",
        "gender": "female",
        "badge": "US",
    },
    {
        "voice_id": "edge-tts/en-US-GuyNeural",
        "lang_code": "en-US",
        "language": "Tiếng Anh (Mỹ)",
        "label": "Guy — Nam (Anh-Mỹ chuẩn)",
        "gender": "male",
        "badge": "US",
    },
    {
        "voice_id": "edge-tts/en-GB-SoniaNeural",
        "lang_code": "en-GB",
        "language": "Tiếng Anh (Anh — IELTS)",
        "label": "Sonia — Nữ (Anh-Anh chuẩn IELTS)",
        "gender": "female",
        "badge": "UK",
    },
    {
        "voice_id": "edge-tts/en-GB-RyanNeural",
        "lang_code": "en-GB",
        "language": "Tiếng Anh (Anh — IELTS)",
        "label": "Ryan — Nam (Anh-Anh chuẩn IELTS)",
        "gender": "male",
        "badge": "UK",
    },
    {
        "voice_id": "edge-tts/zh-CN-XiaoxiaoNeural",
        "lang_code": "zh-CN",
        "language": "Tiếng Trung (Phổ thông — HSK)",
        "label": "Xiaoxiao — Nữ (Phổ thông chuẩn HSK)",
        "gender": "female",
        "badge": "CN",
    },
    {
        "voice_id": "edge-tts/zh-CN-YunxiNeural",
        "lang_code": "zh-CN",
        "language": "Tiếng Trung (Phổ thông — HSK)",
        "label": "Yunxi — Nam (Phổ thông Bắc Kinh)",
        "gender": "male",
        "badge": "CN",
    },
    {
        "voice_id": "edge-tts/vi-VN-HoaiMyNeural",
        "lang_code": "vi-VN",
        "language": "Tiếng Việt",
        "label": "Hoài My — Nữ (Tiếng Việt chuẩn)",
        "gender": "female",
        "badge": "VN",
    },
    {
        "voice_id": "edge-tts/vi-VN-NamMinhNeural",
        "lang_code": "vi-VN",
        "language": "Tiếng Việt",
        "label": "Nam Minh — Nam (Tiếng Việt chuẩn)",
        "gender": "male",
        "badge": "VN",
    },
    {
        "voice_id": "edge-tts/ja-JP-NanamiNeural",
        "lang_code": "ja-JP",
        "language": "Tiếng Nhật (JLPT)",
        "label": "Nanami — Nữ (Chuẩn Tokyo)",
        "gender": "female",
        "badge": "JP",
    },
    {
        "voice_id": "edge-tts/ja-JP-KeitaNeural",
        "lang_code": "ja-JP",
        "language": "Tiếng Nhật (JLPT)",
        "label": "Keita — Nam (Chuẩn Tokyo)",
        "gender": "male",
        "badge": "JP",
    },
    {
        "voice_id": "edge-tts/ko-KR-SunHiNeural",
        "lang_code": "ko-KR",
        "language": "Tiếng Hàn (TOPIK)",
        "label": "SunHi — Nữ (Chuẩn Seoul)",
        "gender": "female",
        "badge": "KR",
    },
    {
        "voice_id": "edge-tts/ko-KR-InJoonNeural",
        "lang_code": "ko-KR",
        "language": "Tiếng Hàn (TOPIK)",
        "label": "InJoon — Nam (Chuẩn Seoul)",
        "gender": "male",
        "badge": "KR",
    },
]

DEFAULT_VOICE_BY_LANG: dict[str, str] = {
    "en-US": "edge-tts/en-US-AriaNeural",
    "en-GB": "edge-tts/en-GB-SoniaNeural",
    "zh-CN": "edge-tts/zh-CN-XiaoxiaoNeural",
    "vi-VN": "edge-tts/vi-VN-HoaiMyNeural",
    "ja-JP": "edge-tts/ja-JP-NanamiNeural",
    "ko-KR": "edge-tts/ko-KR-SunHiNeural",
}

ALLOWED_VOICE_IDS: set[str] = {item["voice_id"] for item in TTS_VOICE_CATALOG}


def resolve_tts_voice(lang_code: str | None, voice_id: str | None = None) -> tuple[str, str]:
    """Chuẩn hóa (lang_code, voice_id) hợp lệ từ danh mục."""
    if voice_id and voice_id in ALLOWED_VOICE_IDS:
        matched = next(v for v in TTS_VOICE_CATALOG if v["voice_id"] == voice_id)
        return matched["lang_code"], matched["voice_id"]

    safe_lang = (lang_code or "en-US").strip()
    if safe_lang in DEFAULT_VOICE_BY_LANG:
        return safe_lang, DEFAULT_VOICE_BY_LANG[safe_lang]

    # Fallback theo tiền tố ngôn ngữ (vd "en" -> "en-US", "zh" -> "zh-CN")
    lower = safe_lang.lower()
    if lower.startswith("en-gb") or lower.startswith("uk"):
        return "en-GB", DEFAULT_VOICE_BY_LANG["en-GB"]
    if lower.startswith("en"):
        return "en-US", DEFAULT_VOICE_BY_LANG["en-US"]
    if lower.startswith("zh") or lower.startswith("cn"):
        return "zh-CN", DEFAULT_VOICE_BY_LANG["zh-CN"]
    if lower.startswith("vi"):
        return "vi-VN", DEFAULT_VOICE_BY_LANG["vi-VN"]
    if lower.startswith("ja") or lower.startswith("jp"):
        return "ja-JP", DEFAULT_VOICE_BY_LANG["ja-JP"]
    if lower.startswith("ko") or lower.startswith("kr"):
        return "ko-KR", DEFAULT_VOICE_BY_LANG["ko-KR"]

    return "en-US", DEFAULT_VOICE_BY_LANG["en-US"]


def _clean_tts_text(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = re.sub(r"[*_`#~>|]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:1000]


class TTSService:
    """Sinh âm thanh MP3 qua 9Router `/v1/audio/speech` và lưu cache R2."""

    def __init__(self) -> None:
        self.base_url = (settings.NINEROUTER_BASE_URL or "").rstrip("/")
        self.api_key = settings.NINEROUTER_API_KEY or ""
        self._memory_cache: dict[str, str] = {}

    @staticmethod
    def list_voices() -> list[dict[str, str]]:
        return TTS_VOICE_CATALOG

    async def synthesize_to_r2(
        self,
        text: str,
        *,
        lang_code: str | None = "en-US",
        voice_id: str | None = None,
    ) -> dict[str, Any]:
        clean_text = _clean_tts_text(text)
        if not clean_text:
            raise HTTPException(400, "Nội dung cần đọc không được để trống.")

        resolved_lang, resolved_voice = resolve_tts_voice(lang_code, voice_id)
        cache_key = hashlib.sha256(
            f"{resolved_voice}|{clean_text}".encode("utf-8")
        ).hexdigest()[:32]

        if cache_key in self._memory_cache:
            return {
                "audio_url": self._memory_cache[cache_key],
                "lang_code": resolved_lang,
                "voice_id": resolved_voice,
                "cached": True,
            }

        if not self.base_url:
            raise HTTPException(503, "Chưa cấu hình NINEROUTER_BASE_URL cho TTS.")

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            async with httpx.AsyncClient(timeout=30, headers=headers) as client:
                resp = await client.post(
                    f"{self.base_url}/audio/speech",
                    json={"model": resolved_voice, "input": clean_text},
                )
            if resp.status_code != 200 or not resp.content:
                logger.warning(
                    "9Router TTS failed ({}): {}", resp.status_code, resp.text[:200]
                )
                raise HTTPException(
                    502,
                    f"Không thể tạo âm thanh từ dịch vụ giọng đọc (HTTP {resp.status_code}).",
                )
            audio_bytes = resp.content
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("9Router TTS exception: {}", exc)
            raise HTTPException(502, "Kết nối tới dịch vụ giọng đọc bị gián đoạn.") from None

        safe_lang_dir = resolved_lang.lower().replace("_", "-")
        storage = get_file_storage_service()
        uploaded = await storage.upload_file(
            ["tts", safe_lang_dir],
            f"tts-{cache_key[:12]}.mp3",
            audio_bytes,
            "audio/mpeg",
        )
        audio_url = str(uploaded.get("url") or "")
        if audio_url:
            self._memory_cache[cache_key] = audio_url

        return {
            "audio_url": audio_url,
            "lang_code": resolved_lang,
            "voice_id": resolved_voice,
            "bytes": len(audio_bytes),
            "cached": False,
        }

    async def _fetch_tts_bytes(self, text: str, voice_id: str) -> bytes:
        clean_text = _clean_tts_text(text)
        if not clean_text:
            raise HTTPException(400, "Lời thoại không được để trống.")
        if not self.base_url:
            raise HTTPException(503, "Chưa cấu hình NINEROUTER_BASE_URL cho TTS.")
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        async with httpx.AsyncClient(timeout=35, headers=headers) as client:
            resp = await client.post(
                f"{self.base_url}/audio/speech",
                json={"model": voice_id, "input": clean_text},
            )
        if resp.status_code != 200 or not resp.content:
            raise HTTPException(
                502,
                f"Không thể tạo giọng đọc cho lời thoại (HTTP {resp.status_code}).",
            )
        return resp.content

    @staticmethod
    async def _probe_audio_duration_ms(file_path: str) -> int:
        ffprobe = shutil.which("ffprobe")
        if not ffprobe:
            return 0
        proc = await asyncio.create_subprocess_exec(
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            file_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        try:
            sec = float((out or b"0").decode().strip() or "0")
            return max(0, int(round(sec * 1000)))
        except ValueError:
            return 0

    async def synthesize_dialogue_to_r2(
        self,
        speakers: list[dict[str, Any]],
        script_lines: list[dict[str, Any]],
        *,
        lang_code: str = "en-GB",
        pause_ms: int = 420,
    ) -> dict[str, Any]:
        """
        Sinh audio cho từng lời thoại theo giọng nhân vật, dùng ffmpeg ghép thành
        1 file MP3 hoàn chỉnh kèm mốc thời gian start_ms/end_ms cho Karaoke Transcript,
        rồi tải lên R2 Storage.
        """
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise HTTPException(503, "Máy chủ chưa cài đặt ffmpeg để ghép audio hội thoại.")

        valid_lines = [
            line for line in script_lines if _clean_tts_text(str(line.get("text") or ""))
        ]
        if not valid_lines:
            raise HTTPException(400, "Kịch bản hội thoại chưa có lời thoại nào.")

        speaker_voice_map: dict[str, str] = {}
        _, default_voice = resolve_tts_voice(lang_code)
        for sp in speakers or []:
            sp_id = str(sp.get("id") or "")
            _, sp_voice = resolve_tts_voice(lang_code, sp.get("voice_id"))
            if sp_id:
                speaker_voice_map[sp_id] = sp_voice

        sem = asyncio.Semaphore(4)
        tmp_dir = tempfile.mkdtemp(prefix="sn_dialogue_")
        try:
            async def _gen_line(idx: int, line: dict[str, Any]) -> tuple[int, str, int]:
                sp_id = str(line.get("speaker_id") or "")
                voice_id = speaker_voice_map.get(sp_id, default_voice)
                raw_path = os.path.join(tmp_dir, f"raw_{idx:03d}.mp3")
                norm_path = os.path.join(tmp_dir, f"line_{idx:03d}.mp3")
                async with sem:
                    audio_bytes = await self._fetch_tts_bytes(
                        str(line.get("text") or ""), voice_id
                    )
                with open(raw_path, "wb") as f:
                    f.write(audio_bytes)

                # Chuẩn hóa tần số mẫu 24kHz mono 64kbps để concat không lệch nhịp
                proc = await asyncio.create_subprocess_exec(
                    ffmpeg,
                    "-y",
                    "-i",
                    raw_path,
                    "-ar",
                    "24000",
                    "-ac",
                    "1",
                    "-b:a",
                    "64k",
                    norm_path,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                await proc.wait()
                target_path = norm_path if os.path.exists(norm_path) else raw_path
                dur_ms = await self._probe_audio_duration_ms(target_path)
                return idx, target_path, dur_ms

            generated = await asyncio.gather(
                *[_gen_line(i, line) for i, line in enumerate(valid_lines)]
            )
            generated.sort(key=lambda item: item[0])

            # Tạo file khoảng lặng tự nhiên giữa các lời thoại
            pause_path = os.path.join(tmp_dir, "pause.mp3")
            pause_sec = max(0.15, min(pause_ms / 1000.0, 2.0))
            pause_proc = await asyncio.create_subprocess_exec(
                ffmpeg,
                "-y",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=24000:cl=mono",
                "-t",
                f"{pause_sec:.2f}",
                "-b:a",
                "64k",
                pause_path,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await pause_proc.wait()
            actual_pause_ms = await self._probe_audio_duration_ms(pause_path)

            # Lập danh sách concat & tính mốc thời gian karaoke start_ms / end_ms
            concat_list_path = os.path.join(tmp_dir, "concat.txt")
            cursor_ms = 0
            timed_lines: list[dict[str, Any]] = []
            concat_entries: list[str] = []

            for i, (idx, path, dur_ms) in enumerate(generated):
                orig = valid_lines[idx]
                start_ms = cursor_ms
                end_ms = cursor_ms + dur_ms
                timed_lines.append(
                    {
                        "id": str(orig.get("id") or f"line_{i + 1}"),
                        "speaker_id": str(orig.get("speaker_id") or ""),
                        "text": str(orig.get("text") or "").strip(),
                        "translation": str(orig.get("translation") or "").strip(),
                        "start_ms": start_ms,
                        "end_ms": end_ms,
                    }
                )
                concat_entries.append(f"file '{path}'")
                cursor_ms = end_ms
                if i < len(generated) - 1 and os.path.exists(pause_path):
                    concat_entries.append(f"file '{pause_path}'")
                    cursor_ms += actual_pause_ms

            with open(concat_list_path, "w", encoding="utf-8") as cf:
                cf.write("\n".join(concat_entries))

            merged_path = os.path.join(tmp_dir, "dialogue.mp3")
            merge_proc = await asyncio.create_subprocess_exec(
                ffmpeg,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_list_path,
                "-c",
                "copy",
                merged_path,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await merge_proc.wait()
            if merge_proc.returncode != 0 or not os.path.exists(merged_path):
                raise HTTPException(500, "Không thể ghép tệp âm thanh hội thoại bằng ffmpeg.")

            total_ms = await self._probe_audio_duration_ms(merged_path)
            with open(merged_path, "rb") as mf:
                merged_bytes = mf.read()

            digest = hashlib.sha256(merged_bytes).hexdigest()[:12]
            storage = get_file_storage_service()
            uploaded = await storage.upload_file(
                ["tts", "dialogues"],
                f"dialogue-{digest}.mp3",
                merged_bytes,
                "audio/mpeg",
            )
            return {
                "audio_url": str(uploaded.get("url") or ""),
                "duration_seconds": round((total_ms or cursor_ms) / 1000.0, 2),
                "script_lines": timed_lines,
                "bytes": len(merged_bytes),
            }
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)


@lru_cache(maxsize=1)
def get_tts_service() -> TTSService:
    return TTSService()
