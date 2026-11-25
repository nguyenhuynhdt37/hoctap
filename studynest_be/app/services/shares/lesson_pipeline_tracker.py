"""Realtime tracker cho pipeline xử lý video & tài liệu PDF (WebSocket đa phòng + HTTP fallback)."""
from __future__ import annotations

import asyncio
import time
from typing import Any

from app.core.ws_manager import ws_manager

PIPELINE_ROOM_PREFIX = "lesson_pipeline:"
LECTURER_QUEUE_ROOM_PREFIX = "lecturer_queue:"
ADMIN_QUEUE_ROOM = "admin_queue:all"

# Giới hạn số job xử lý video/embedding nặng chạy song song để bảo vệ RAM & rate-limit API
EMBEDDING_JOB_SEMAPHORE = asyncio.Semaphore(4)

STAGE_LABELS: dict[str, str] = {
    "queued": "Đang xếp hàng xử lý",
    "uploading": "Đang tải video lên YouTube",
    "extracting_audio": "Đang tách âm thanh bài giảng",
    "transcribing": "Đang trích xuất nội dung & phụ đề AI",
    "embedding": "Đang tạo vector chỉ mục AI",
    "retrying": "Đang tự động thử lại",
    "completed": "Hoàn tất xử lý & chỉ mục AI",
    "failed": "Xử lý gặp lỗi — bạn có thể bấm Chạy lại",
}

SOURCE_KIND_LABELS: dict[str, str] = {
    "youtube_transcript": "Phụ đề YouTube chuẩn",
    "audio_ai_transcript": "Phân tích âm thanh AI (ffmpeg + Gemini)",
    "gemini_video_summary": "Phân tích video AI (Gemini)",
    "lesson_metadata": "Ngữ cảnh tiêu đề & mô tả bài học",
    "resource_pdf_ocr": "Tài liệu PDF / OCR AI",
}

_TTL_SECONDS = 7200  # Tự dọn state cũ sau 2 giờ


class LessonPipelineTracker:
    """Quản lý tiến độ realtime cho từng job video/tài liệu và broadcast theo phân quyền."""

    def __init__(self) -> None:
        self._states: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def room_id(lesson_id: str) -> str:
        return f"{PIPELINE_ROOM_PREFIX}{lesson_id}"

    @staticmethod
    def lecturer_room_id(instructor_id: str) -> str:
        return f"{LECTURER_QUEUE_ROOM_PREFIX}{instructor_id}"

    @staticmethod
    def admin_room_id() -> str:
        return ADMIN_QUEUE_ROOM

    def _prune_stale(self, now_ts: float) -> None:
        stale_keys = [
            k
            for k, v in self._states.items()
            if now_ts - float(v.get("_ts", now_ts)) > _TTL_SECONDS
        ]
        for k in stale_keys:
            self._states.pop(k, None)

    def _public_snapshot(self, state: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in state.items() if not k.startswith("_")}

    async def get(self, job_key: str) -> dict[str, Any] | None:
        async with self._lock:
            state = self._states.get(str(job_key))
            return self._public_snapshot(state) if state else None

    async def list_jobs(
        self, *, instructor_id: str | None = None
    ) -> list[dict[str, Any]]:
        """Trả danh sách hàng đợi mới nhất trước; lọc theo instructor_id nếu là giảng viên."""
        now_ts = time.time()
        async with self._lock:
            self._prune_stale(now_ts)
            items = []
            for state in self._states.values():
                if instructor_id is not None:
                    if str(state.get("instructor_id") or "") != str(instructor_id):
                        continue
                items.append(self._public_snapshot(state))
        items.sort(key=lambda x: float(x.get("updated_at") or 0), reverse=True)
        return items

    async def update(
        self,
        job_key: str,
        *,
        job_type: str | None = None,
        lesson_id: str | None = None,
        resource_id: str | None = None,
        instructor_id: str | None = None,
        title: str | None = None,
        course_title: str | None = None,
        stage: str | None = None,
        percent: float | None = None,
        upload_percent: float | None = None,
        speed_mb_s: float | None = None,
        uploaded_mb: float | None = None,
        total_mb: float | None = None,
        chunks_total: int | None = None,
        chunks_done: int | None = None,
        source_kind: str | None = None,
        attempt: int | None = None,
        max_attempts: int | None = None,
        next_retry_in: int | None = None,
        message: str | None = None,
        error: str | None = None,
        is_completed: bool | None = None,
        video_url: str | None = None,
        video_id: str | None = None,
        clear_error: bool = False,
    ) -> dict[str, Any]:
        key = str(job_key)
        now_ts = time.time()

        async with self._lock:
            self._prune_stale(now_ts)
            current = self._states.get(key) or {
                "type": "lesson_pipeline_progress",
                "job_id": key,
                "job_type": job_type or "video",
                "lesson_id": lesson_id or key,
                "resource_id": resource_id,
                "instructor_id": instructor_id,
                "title": title or "Bài học Video",
                "course_title": course_title or "",
                "stage": "queued",
                "stage_label": STAGE_LABELS["queued"],
                "percent": 0.0,
                "upload_percent": 0.0,
                "speed_mb_s": 0.0,
                "uploaded_mb": 0.0,
                "total_mb": 0.0,
                "chunks_total": 0,
                "chunks_done": 0,
                "source_kind": None,
                "source_label": None,
                "attempt": 1,
                "max_attempts": 3,
                "next_retry_in": 0,
                "message": STAGE_LABELS["queued"],
                "error": None,
                "is_completed": False,
                "video_url": None,
                "video_id": None,
                "updated_at": now_ts,
                "_ts": now_ts,
            }

            if job_type is not None:
                current["job_type"] = job_type
            if lesson_id is not None:
                current["lesson_id"] = str(lesson_id)
            if resource_id is not None:
                current["resource_id"] = str(resource_id)
            if instructor_id is not None:
                current["instructor_id"] = str(instructor_id)
            if title is not None:
                current["title"] = title
            if course_title is not None:
                current["course_title"] = course_title
            if stage is not None:
                current["stage"] = stage
                current["stage_label"] = STAGE_LABELS.get(stage, stage)
            if percent is not None:
                current["percent"] = round(min(100.0, max(0.0, float(percent))), 1)
            if upload_percent is not None:
                current["upload_percent"] = round(
                    min(100.0, max(0.0, float(upload_percent))), 1
                )
            if speed_mb_s is not None:
                current["speed_mb_s"] = round(max(0.0, float(speed_mb_s)), 2)
            if uploaded_mb is not None:
                current["uploaded_mb"] = round(max(0.0, float(uploaded_mb)), 2)
            if total_mb is not None:
                current["total_mb"] = round(max(0.0, float(total_mb)), 2)
            if chunks_total is not None:
                current["chunks_total"] = max(0, int(chunks_total))
            if chunks_done is not None:
                current["chunks_done"] = max(0, int(chunks_done))
            if source_kind is not None:
                current["source_kind"] = source_kind
                current["source_label"] = SOURCE_KIND_LABELS.get(
                    source_kind, source_kind
                )
            if attempt is not None:
                current["attempt"] = int(attempt)
            if max_attempts is not None:
                current["max_attempts"] = int(max_attempts)
            if next_retry_in is not None:
                current["next_retry_in"] = max(0, int(next_retry_in))
            if message is not None:
                current["message"] = message
            elif stage is not None:
                current["message"] = STAGE_LABELS.get(stage, stage)
            if clear_error:
                current["error"] = None
            elif error is not None:
                current["error"] = error
            if is_completed is not None:
                current["is_completed"] = bool(is_completed)
            if video_url is not None:
                current["video_url"] = video_url
            if video_id is not None:
                current["video_id"] = video_id

            current["updated_at"] = now_ts
            current["_ts"] = now_ts
            self._states[key] = current
            snapshot = self._public_snapshot(current)

        # Broadcast song song tới phòng bài học, phòng riêng giảng viên và phòng tổng Admin
        target_rooms = set()
        if snapshot.get("lesson_id"):
            target_rooms.add(self.room_id(str(snapshot["lesson_id"])))
        if snapshot.get("instructor_id"):
            target_rooms.add(self.lecturer_room_id(str(snapshot["instructor_id"])))
        target_rooms.add(self.admin_room_id())

        for room in target_rooms:
            await ws_manager.broadcast(room, snapshot)

        return snapshot


lesson_pipeline_tracker = LessonPipelineTracker()
