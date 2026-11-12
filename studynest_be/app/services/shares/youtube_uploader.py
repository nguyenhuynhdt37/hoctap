from __future__ import annotations

import asyncio
import json
import os
import re
import time
from typing import Any

import aiofiles
import httpx
import isodate
from fastapi import HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from loguru import logger
from starlette.datastructures import UploadFile

# ======================================================
# ⚙️ CONFIG
# ======================================================
SCOPES: list[str] = [
    "https://www.googleapis.com/auth/youtube.upload",
]

TOKEN_PATH = "app/core/secret/token.json"

UPLOAD_PROGRESS: dict[str, int] = {}
UPLOAD_RESULT: dict[str, dict[str, str]] = {}
UPLOAD_LOCK = asyncio.Lock()
UPLOAD_STATS: dict[str, dict[str, float | int]] = {}


# ======================================================
# 📦 SERVICE
# ======================================================
class YouTubeAsyncService:
    def __init__(self) -> None:
        self._access_token: str | None = None
        self._creds: Credentials | None = None

    # ======================================================
    # 🔑 AUTH
    # ======================================================
    async def _load_token(self) -> dict[str, Any]:
        # Shared lesson dependencies also serve code/article lessons. Authenticate
        # only for YouTube operations, never launch an interactive flow in a request.
        if not os.path.exists(TOKEN_PATH):
            raise HTTPException(
                503, "Chưa cấu hình xác thực YouTube. Vui lòng liên hệ quản trị viên."
            )
        async with aiofiles.open(TOKEN_PATH, "r") as f:
            return json.loads(await f.read())

    async def _get_access_token(self) -> str:
        """Trả về access_token hợp lệ, refresh nếu cần."""
        if self._access_token:
            return self._access_token

        data = await self._load_token()
        creds = Credentials.from_authorized_user_info(data, SCOPES)

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            async with aiofiles.open(TOKEN_PATH, "w") as f:
                await f.write(creds.to_json())

        if not creds.valid:
            raise RuntimeError(
                "❌ Token không hợp lệ, cần xác thực lại (xóa token.json rồi upload lại)."
            )

        self._access_token = creds.token
        self._creds = creds
        return self._access_token

    async def upload_video_with_progress(
        self, file: UploadFile, task_id: str, title: str, description: str = ""
    ) -> dict[str, Any]:
        access_token = await self._get_access_token()
        upload_url = (
            "https://www.googleapis.com/upload/youtube/v3/videos"
            "?uploadType=resumable&part=snippet,status"
        )

        # === 1️⃣ Tính kích thước file ===
        try:
            if hasattr(file.file, "getbuffer"):
                total_size = len(file.file.getbuffer())
            elif hasattr(file.file, "seek") and hasattr(file.file, "tell"):
                pos = file.file.tell()
                file.file.seek(0, os.SEEK_END)
                total_size = file.file.tell()
                file.file.seek(pos)
            else:
                total_size = getattr(file, "size", 1)
        except Exception:
            total_size = getattr(file, "size", 1)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "X-Upload-Content-Type": file.headers.get("content-type", "video/mp4"),
            "X-Upload-Content-Length": str(total_size),
        }

        # === 2️⃣ Gửi metadata khi khởi tạo session ===
        metadata = {
            "snippet": {
                "title": title or "Video bài học",
                "description": description or "",
                "categoryId": "27",  # Education
            },
            "status": {"privacyStatus": "unlisted"},  # 👈 Chế độ không công khai
        }

        async with httpx.AsyncClient(timeout=None) as client:
            init_res = await client.post(upload_url, headers=headers, json=metadata)
            if init_res.status_code not in (200, 201):
                raise RuntimeError(f"❌ Lỗi khởi tạo upload: {init_res.text}")

            upload_location = init_res.headers.get("Location")
            if not upload_location:
                raise RuntimeError("❌ Không nhận được upload URL từ YouTube.")

        # === 3️⃣ Upload từng chunk ===
        chunk_size = 4 * 1024 * 1024  # 4 MB
        uploaded_bytes = 0
        file.file.seek(0)

        async with UPLOAD_LOCK:
            start_time = time.time()
            UPLOAD_PROGRESS[task_id] = 0
            UPLOAD_STATS[task_id] = {
                "start_time": start_time,
                "uploaded_bytes": 0,
                "total_size": float(total_size),
                "speed": 0.0,
            }

        logger.info(
            f"🚀 Upload {file.filename} ({total_size/1e6:.2f} MB) → task {task_id}"
        )

        async with httpx.AsyncClient(timeout=None) as upload_client:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break

                content_range = f"bytes {uploaded_bytes}-{uploaded_bytes + len(chunk) - 1}/{total_size}"
                upload_headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Length": str(len(chunk)),
                    "Content-Type": file.headers.get("content-type", "video/mp4"),
                    "Content-Range": content_range,
                }

                res = await upload_client.put(
                    upload_location, headers=upload_headers, content=chunk
                )
                if res.status_code not in (200, 201, 308):
                    raise RuntimeError(f"❌ Upload lỗi: {res.text}")

                uploaded_bytes += len(chunk)
                percent = min(int(uploaded_bytes / total_size * 100), 100)

                async with UPLOAD_LOCK:
                    elapsed = max(time.time() - start_time, 0.001)
                    speed = (uploaded_bytes / 1_048_576) / elapsed
                    UPLOAD_PROGRESS[task_id] = percent
                    UPLOAD_STATS[task_id].update(
                        {"uploaded_bytes": uploaded_bytes, "speed": speed}
                    )

                logger.info(
                    f"📦 {file.filename}: {percent}% ({uploaded_bytes}/{total_size})"
                )

        body = res.json()
        video_id = body.get("id")
        if not video_id:
            raise RuntimeError(f"❌ Upload hoàn tất nhưng không có video_id: {body}")

        video_url = f"https://www.youtube.com/watch?v={video_id}"

        async with UPLOAD_LOCK:
            UPLOAD_PROGRESS[task_id] = 100
            UPLOAD_RESULT[task_id] = {"video_id": video_id, "video_url": video_url}

        logger.success(f"✅ Upload hoàn tất: {video_url}")
        return {"video_id": video_id, "video_url": video_url, "task_id": task_id}

    async def get_duration(self, video_id: str, wait_first: bool = True) -> float:
        """
        Lấy thời lượng video (giây) qua YouTube Data API v3 (chuẩn async).
        - Gọi videos().list(part="contentDetails") qua HTTP.
        - Parse ISO8601 thành số giây (float).
        - Retry 5 lần cách nhau 3s (đề phòng YouTube chưa xử lý xong).
        """
        if wait_first:
            logger.info("⏳ Đợi 30s cho YouTube xử lý video…")
            await asyncio.sleep(30)

        access_token = await self._get_access_token()
        url = (
            "https://www.googleapis.com/youtube/v3/videos"
            f"?part=contentDetails&id={video_id}"
        )
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        for attempt in range(5):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    res = await client.get(url, headers=headers)
                if res.status_code != 200:
                    logger.warning(f"⚠️ Lần {attempt+1}/5 lỗi API: {res.text}")
                else:
                    data = res.json()
                    items = data.get("items", [])
                    if items and "contentDetails" in items[0]:
                        duration_iso = items[0]["contentDetails"]["duration"]
                        duration = isodate.parse_duration(duration_iso)
                        seconds = duration.total_seconds()
                        logger.success(
                            f"✅ Lấy được duration: {seconds:.0f}s (lần {attempt+1})"
                        )
                        return seconds
                    else:
                        logger.warning(
                            f"⚠️ Lần {attempt+1}/5: chưa có contentDetails, thử lại sau 3s..."
                        )
            except Exception as e:
                logger.warning(f"⚠️ Lần {attempt+1}/5 lỗi không xác định: {e}")
            await asyncio.sleep(3)

        logger.error("❌ Không lấy được duration sau 5 lần thử.")
        return 0.0

    # ======================================================
    # 🔍 UTILITIES
    # ======================================================
    @staticmethod
    async def extract_youtube_id(url_or_id: str) -> str:
        """
        ✅ Nhận URL hoặc ID, trả về ID YouTube hợp lệ.
        Hỗ trợ mọi dạng:
        - https://www.youtube.com/watch?v=abc123XYZ89
        - https://youtu.be/abc123XYZ89
        - https://youtube.com/shorts/abc123XYZ89
        - abc123XYZ89 (truyền sẵn ID)
        """
        pattern = re.compile(r"(?:v=|\/|be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})")
        match = pattern.search(url_or_id)
        if match:
            return match.group(1)
        return url_or_id.strip()

    @staticmethod
    def get_video_url(video_id: str) -> str:
        return f"https://www.youtube.com/watch?v={video_id}"


# ======================================================
# 🔍 API tiện ích
# ======================================================
async def get_upload_progress(task_id: str) -> dict[str, Any]:
    async with UPLOAD_LOCK:
        percent = UPLOAD_PROGRESS.get(task_id, 0)
        stat = UPLOAD_STATS.get(task_id, {})
        result = UPLOAD_RESULT.get(task_id, {}) if percent >= 100 else {}
        return {
            "task_id": task_id,
            "percent": percent,
            "speed_mb_s": round(float(stat.get("speed", 0.0)), 2),
            "uploaded_mb": round(float(stat.get("uploaded_bytes", 0)) / 1_048_576, 2),
            "total_mb": round(float(stat.get("total_size", 0)) / 1_048_576, 2),
            "video_id": result.get("video_id"),
            "video_url": result.get("video_url"),
            "is_completed": bool(result),
        }


async def get_upload_result(task_id: str) -> dict[str, Any]:
    async with UPLOAD_LOCK:
        return UPLOAD_RESULT.get(task_id, {})


# ============================================================
# ⚡ Singleton Provider cho FastAPI (dùng @Depends)
# ============================================================


# Singleton instance for YouTubeAsyncService
_youtube_service: YouTubeAsyncService | None = None


async def get_youtube_service() -> YouTubeAsyncService:
    global _youtube_service
    if _youtube_service is None:
        logger.info("🚀 Khởi tạo YouTubeAsyncService lần đầu.")
        _youtube_service = YouTubeAsyncService()
    return _youtube_service
