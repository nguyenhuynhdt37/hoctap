# app/services/lecturer/lesson_service.py
import asyncio
import hashlib
import io
import os
import tempfile
import uuid
from asyncio.log import logger
from datetime import datetime
from typing import Any, List, Optional, Tuple

from fastapi import BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy import delete, desc, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.datastructures import Headers
from starlette.datastructures import UploadFile as UploadFile_starlette

from app.core.embedding import EmbeddingService, get_embedding_service
from app.db.models.database import (
    Courses,
    CourseSections,
    LessonChunks,
    LessonCodeFiles,
    LessonCodes,
    LessonCodeTestcases,
    LessonFlashcards,
    LessonFillBlanks,
    LessonListening,
    LessonNotes,
    LessonQuizOptions,
    LessonQuizzes,
    LessonResources,
    Lessons,
    LessonSpeaking,
    LessonVideos,
    ResourceChunks,
    SupportedLanguages,
    User,
)
from app.db.sesson import AsyncSessionLocal, get_session
from app.libs.formats.datetime import now as get_now, to_utc_naive
from app.schemas.lecturer.lesson import (
    CreateLesson,
    FillBlankRenderAudioSchema,
    FlashcardTTSPreviewSchema,
    LessonCodeCreate,
    LessonCodeUpdateBatch,
    LessonCodeVerify,
    LessonFillBlankSaveSchema,
    LessonFlashcardBulkCreate,
    LessonListeningSaveSchema,
    LessonQuizBulkCreate,
    LessonSpeakingSaveSchema,
    ListeningRenderAudioSchema,
    MoveLessonSchema,
    UpdateLessonResourcesLinkSchema,
    UpdateLessonSchema,
    UpdateLessonTitleSchema,
    UpdateLessonVideoSchema,
)
from app.services.shares.code_runner import PistonService
from app.services.shares.file_storage import (
    FileStorageService,
    get_file_storage_service,
)
from app.services.shares.lesson_pipeline_tracker import (
    EMBEDDING_JOB_SEMAPHORE,
    lesson_pipeline_tracker,
)
from app.services.shares.OCR_service import OCRService, get_ocr_service
from app.services.shares.transcript_service import YoutubeTranscriptService
from app.services.shares.youtube_uploader import (
    UPLOAD_LOCK,
    UPLOAD_PROGRESS,
    UPLOAD_STATS,
    YouTubeAsyncService,
    get_youtube_service,
)


class LessonService:

    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        storage: FileStorageService = Depends(get_file_storage_service),
        embedding: EmbeddingService = Depends(get_embedding_service),
        youtube: YouTubeAsyncService = Depends(get_youtube_service),
        piston: PistonService = Depends(PistonService),
    ):
        self.db: AsyncSession = db
        self.storage: FileStorageService = storage
        self.embedding: EmbeddingService = embedding
        self.youtube: YouTubeAsyncService = youtube
        self.piston: PistonService = piston

    # 🧩 Tạo bài học (lesson)
    async def create_lesson_async(self, schema: CreateLesson, lecturer: User):
        try:
            section = await self.db.scalar(
                select(CourseSections).where(CourseSections.id == schema.section_id)
            )
            if not section:
                raise HTTPException(
                    404, f"Không tìm thấy chương học {schema.section_id}"
                )

            course = await self.db.scalar(
                select(Courses).where(
                    Courses.id == section.course_id,
                    Courses.instructor_id == lecturer.id,
                )
            )
            if not course:
                raise HTTPException(
                    403, "Bạn không có quyền tạo bài học trong khóa học này"
                )

            last_lesson = await self.db.scalar(
                select(Lessons)
                .where(Lessons.section_id == section.id)
                .order_by(desc(Lessons.position))
            )

            new_lesson = Lessons(**schema.model_dump(), course_id=course.id)
            new_lesson.position = (last_lesson.position + 1) if last_lesson else 0
            self.db.add(new_lesson)
            await self.db.commit()
            await self.db.refresh(new_lesson)
            return {"message": "Tạo bài học thành công", "id": new_lesson.id}
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi tạo bài học: {e}")

    async def delete_lesson_async(self, lesson_id: uuid.UUID, lecturer_id: uuid.UUID):
        """
        🗑️ Xóa 1 bài học (toàn bộ dữ liệu con tự động bị xóa do ON DELETE CASCADE).
        """
        try:
            # 1️⃣ Kiểm tra bài học tồn tại
            lesson = await self.db.scalar(
                select(Lessons).where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "Không tìm thấy bài học để xóa")

            # 2️⃣ Kiểm tra quyền giảng viên
            course = await self.db.scalar(
                select(Courses).where(Courses.id == lesson.course_id)
            )
            if not course or course.instructor_id != lecturer_id:
                raise HTTPException(403, "Bạn không có quyền xóa bài học này")

            # 3️⃣ Xóa chính bài học (DB tự xóa các bảng liên quan)
            await self.db.execute(delete(Lessons).where(Lessons.id == lesson_id))
            await self.db.commit()

            return {"message": "✅ Đã xóa bài học thành công."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"❌ Lỗi khi xóa bài học: {e}")

    async def upload_video_youtube_url_async(
        self,
        lesson_id: uuid.UUID,
        lecturer_id: uuid.UUID,
        schema: UpdateLessonVideoSchema,
        background_tasks: BackgroundTasks,
    ):
        try:
            video_id = await self.youtube.extract_youtube_id(schema.video_url)
            # 1️⃣ Kiểm tra video đã tồn tại
            existing = await self.db.scalar(
                select(LessonVideos).where(LessonVideos.lesson_id == lesson_id)
            )
            if existing:
                raise HTTPException(409, "Video đã tồn tại cho bài học này")

            # 2️⃣ Kiểm tra bài học và quyền giảng viên
            lesson = await self.db.scalar(
                select(Lessons)
                .options(selectinload(Lessons.section))
                .where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "Không tồn tại bài học")

            section = lesson.section
            course = await self.db.scalar(
                select(Courses).where(Courses.id == section.course_id)
            )
            if not course or course.instructor_id != lecturer_id:
                raise HTTPException(403, "Bạn không có quyền truy cập khóa học này")
            video_id = await self.youtube.extract_youtube_id(schema.video_url)
            try:
                duration_seconds = await self.youtube.get_duration(video_id, False)
            except Exception as dur_err:
                logger.warning(
                    f"⚠️ Không lấy được thời lượng YouTube ({dur_err}), fallback duration=0 để vẫn gắn video và chạy AI."
                )
                duration_seconds = 0.0
            lesson_video = LessonVideos(
                lesson_id=lesson.id,
                file_id=video_id,
                video_url=schema.video_url,
                duration=duration_seconds,
                transcript="",
                source_type="youtube_url",
            )
            self.db.add(lesson_video)
            await self.db.commit()
            await self.db.refresh(lesson_video)

            await lesson_pipeline_tracker.update(
                str(lesson_id),
                job_type="video",
                lesson_id=str(lesson_id),
                instructor_id=str(course.instructor_id),
                title=lesson.title or "Bài học Video",
                course_title=course.title or "",
                stage="queued",
                percent=5.0,
                upload_percent=100.0,
                video_id=video_id,
                video_url=schema.video_url,
                message="Đã gắn link YouTube — đang khởi động trích xuất nội dung & chỉ mục AI...",
                clear_error=True,
                is_completed=False,
            )

            background_tasks.add_task(
                LessonService.process_video_description_async,
                lesson_id,
                video_id,
                video_url=schema.video_url,
            )
            return {
                "message": "✅ Video đã tải lên YouTube và đang xử lý AI.",
                "provider": "youtube",
                "video_url": schema.video_url,
                "duration_seconds": f"{duration_seconds:.2f}",  # ép sang string
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"❌ Lỗi khi lưu URL video: {e}")

    async def upload_video_async(
        self,
        video: UploadFile,
        lesson_id: uuid.UUID,
        lecturer_id: uuid.UUID,
        background_tasks: BackgroundTasks,
    ):
        """
        Upload video lên YouTube (theo dõi bằng lesson_id làm task_id) — chạy nền, không ghi ra disk.
        """
        try:
            # 1️⃣ Kiểm tra trùng video
            existing = await self.db.scalar(
                select(LessonVideos).where(LessonVideos.lesson_id == lesson_id)
            )
            if existing:
                raise HTTPException(
                    status_code=409, detail="Video đã tồn tại cho bài học này"
                )

            # 2️⃣ Kiểm tra bài học và quyền giảng viên
            lesson = await self.db.scalar(
                select(Lessons)
                .options(selectinload(Lessons.section))
                .where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "Không tồn tại bài học")

            section = lesson.section
            course = await self.db.scalar(
                select(Courses).where(Courses.id == section.course_id)
            )
            if not course or course.instructor_id != lecturer_id:
                raise HTTPException(403, "Bạn không có quyền truy cập khóa học này")

            # 3️⃣ Stream tệp upload ra file tạm trên đĩa (chunk 1MB — không nhét 2GB vào RAM)
            file_name = video.filename or "video.mp4"
            content_type = video.content_type
            _, ext = os.path.splitext(file_name)
            tmp_fd, tmp_path = tempfile.mkstemp(
                suffix=ext or ".mp4", prefix="sn_video_"
            )
            total_bytes = 0
            try:
                with os.fdopen(tmp_fd, "wb") as tmp_file:
                    while True:
                        chunk = await video.read(1024 * 1024)
                        if not chunk:
                            break
                        tmp_file.write(chunk)
                        total_bytes += len(chunk)
            except Exception:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                raise

            task_id = str(lesson_id)
            total_mb = round(total_bytes / 1_048_576, 2)
            await lesson_pipeline_tracker.update(
                task_id,
                job_type="video",
                lesson_id=task_id,
                instructor_id=str(course.instructor_id),
                title=lesson.title or file_name,
                course_title=course.title or "",
                stage="uploading",
                percent=2.0,
                upload_percent=0.0,
                total_mb=total_mb,
                uploaded_mb=0.0,
                speed_mb_s=0.0,
                message=f"Bắt đầu tải {file_name} ({total_mb:.1f} MB) và tách âm thanh song song...",
                clear_error=True,
                is_completed=False,
            )

            # 4️⃣ Tạo background task chạy song song: Upload YouTube (fallback R2) + Tách audio AI
            asyncio.create_task(
                LessonService.upload_video_background_from_file(
                    lesson_id,
                    course.id,
                    tmp_path,
                    file_name,
                    content_type,
                    task_id,
                    f"{course.title} - {lesson.title}",
                    f"Khóa học {course.title} | Bài học: {lesson.title} | mô tả {lesson.description}",
                )
            )

            return {
                "message": "🚀 Video đang được tải nền lên YouTube và xử lý chỉ mục AI.",
                "lesson_id": task_id,
                "provider": "youtube",
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"❌ Lỗi upload video: {e}")

    @staticmethod
    async def _pump_youtube_upload_progress(task_id: str, stop_event: asyncio.Event):
        """Đọc tiến độ upload YouTube mỗi 1s và phát realtime qua WebSocket tracker."""
        last_pct = -1.0
        while not stop_event.is_set():
            async with UPLOAD_LOCK:
                up_pct = float(UPLOAD_PROGRESS.get(task_id, 0.0))
                stat = dict(UPLOAD_STATS.get(task_id, {}))
            if up_pct != last_pct:
                last_pct = up_pct
                # Upload chiếm 0% -> 55% của toàn bộ pipeline
                overall_pct = min(55.0, round(up_pct * 0.55, 1))
                await lesson_pipeline_tracker.update(
                    task_id,
                    stage="uploading",
                    percent=overall_pct,
                    upload_percent=up_pct,
                    speed_mb_s=float(stat.get("speed", 0.0)),
                    uploaded_mb=float(stat.get("uploaded_bytes", 0)) / 1_048_576,
                    total_mb=float(stat.get("total_size", 0)) / 1_048_576,
                    message=f"Đang tải video lên YouTube ({up_pct:.0f}%)...",
                )
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=1.0)
            except asyncio.TimeoutError:
                pass

    @staticmethod
    async def _probe_video_duration(file_path: str) -> float:
        """Đọc thời lượng video (giây) từ tệp gốc bằng ffprobe nếu có."""
        import shutil

        ffprobe_bin = shutil.which("ffprobe")
        if not ffprobe_bin or not os.path.exists(file_path):
            return 0.0
        try:
            proc = await asyncio.create_subprocess_exec(
                ffprobe_bin,
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
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=20)
            val = float((stdout or b"").decode("utf-8", errors="ignore").strip() or 0)
            return round(val, 2) if val > 0 else 0.0
        except Exception:
            return 0.0

    @staticmethod
    async def upload_video_background_from_file(
        lesson_id: uuid.UUID,
        course_id: uuid.UUID,
        tmp_path: str,
        filename: str,
        content_type: str | None,
        task_id: str,
        title: str,
        description: str = "",
    ):
        youtube = YouTubeAsyncService()
        headers = Headers({"content-type": content_type or "video/mp4"})
        stop_pump = asyncio.Event()
        pump_task = asyncio.create_task(
            LessonService._pump_youtube_upload_progress(task_id, stop_pump)
        )
        audio_task: asyncio.Task[str] | None = None
        file_obj = None

        try:
            file_size_mb = os.path.getsize(tmp_path) / 1_048_576
            logger.info(
                f"🚀 Bắt đầu upload nền video: {filename} ({file_size_mb:.2f} MB)"
            )

            # Chạy song song nhánh tách âm thanh AI bằng ffmpeg + Gemini ngay từ file gốc
            embedding_svc = await get_embedding_service()
            audio_task = asyncio.create_task(
                embedding_svc.extract_audio_context_from_file(tmp_path)
            )

            video_id = ""
            video_url = ""
            duration = 0.0
            source_type = "youtube_upload"

            # Ưu tiên upload lên YouTube; nếu chưa cấu hình YouTube OAuth -> tự động fallback R2 Storage!
            try:
                file_obj = open(tmp_path, "rb")
                disk_upload_file = UploadFile_starlette(
                    file=file_obj,
                    filename=filename,
                    headers=headers,
                )
                result: dict[str, Any] = await youtube.upload_video_with_progress(
                    file=disk_upload_file,
                    task_id=task_id,
                    title=title,
                    description=description,
                )
                video_id = str(result.get("video_id") or "")
                video_url = str(result.get("video_url") or "")
                if not video_id:
                    raise RuntimeError(
                        f"Upload YouTube không trả về video_id ({result})"
                    )
                duration = await youtube.get_duration(video_id, wait_first=True)
            except Exception as yt_err:
                logger.warning(
                    f"⚠️ Upload YouTube không khả dụng ({yt_err}) -> chuyển tự động sang lưu trữ R2 nội bộ!"
                )
                await lesson_pipeline_tracker.update(
                    task_id,
                    stage="uploading",
                    percent=30.0,
                    upload_percent=50.0,
                    message="YouTube chưa cấu hình — đang tự động lưu video lên kho R2 an toàn...",
                )
                storage = get_file_storage_service()
                with open(tmp_path, "rb") as f_r2:
                    raw_bytes = f_r2.read()
                r2_res = await storage.upload_file(
                    ["courses", str(course_id), "lessons", str(lesson_id), "videos"],
                    filename,
                    raw_bytes,
                    content_type or "video/mp4",
                )
                r2_key = str(r2_res.get("key") or "")
                video_id = f"r2:{r2_key}" if r2_key else f"r2:{lesson_id}"
                video_url = str(r2_res.get("url") or "")
                duration = await LessonService._probe_video_duration(tmp_path)
                source_type = "r2_upload"
                size_mb = round(len(raw_bytes) / (1024 * 1024), 2)
                await lesson_pipeline_tracker.update(
                    task_id,
                    stage="uploading",
                    percent=45.0,
                    upload_percent=100.0,
                    uploaded_mb=size_mb,
                    total_mb=size_mb,
                    message="Đã lưu video lên kho R2 an toàn — đang phân tích âm thanh & chỉ mục AI...",
                )

            stop_pump.set()
            await pump_task

            logger.info(
                f"✅ Lưu video hoàn tất ({source_type}): {video_url} ({duration}s)"
            )

            # Chỉ mở DB session đúng lúc lưu bản ghi LessonVideos
            async with AsyncSessionLocal() as db:
                lesson_video = LessonVideos(
                    lesson_id=lesson_id,
                    video_url=video_url,
                    file_id=video_id,
                    duration=duration,
                    source_type=source_type,
                    transcript="",
                )
                db.add(lesson_video)
                await db.commit()
                logger.info(f"💾 Đã lưu LessonVideos ({source_type}) cho bài học {lesson_id}")

            await lesson_pipeline_tracker.update(
                task_id,
                stage="extracting_audio",
                percent=60.0,
                upload_percent=100.0,
                video_id=video_id,
                video_url=video_url,
                message="Đã lưu video xong — đang hoàn tất trích xuất âm thanh & chỉ mục AI...",
            )

            precomputed_audio_transcript = ""
            if audio_task is not None:
                try:
                    precomputed_audio_transcript = await audio_task
                except Exception as audio_err:
                    logger.warning(f"⚠️ Nhánh tách audio AI lỗi: {audio_err}")

            # Chạy ngay pipeline embedding (bỏ hẳn asyncio.sleep(300)!)
            await LessonService.process_video_description_async(
                lesson_id,
                video_id,
                video_url=video_url,
                precomputed_audio_transcript=precomputed_audio_transcript,
            )

        except Exception as e:
            stop_pump.set()
            if not pump_task.done():
                pump_task.cancel()
            if audio_task is not None and not audio_task.done():
                audio_task.cancel()
            logger.error(f"❌ Lỗi upload nền: {e}", exc_info=True)
            await lesson_pipeline_tracker.update(
                task_id,
                stage="failed",
                error=f"Lỗi tải video lên YouTube: {e}",
                message="Tải video gặp sự cố. Bạn có thể thử lại.",
                is_completed=False,
            )
        finally:
            if file_obj is not None:
                try:
                    file_obj.close()
                except Exception:
                    pass
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass

    @staticmethod
    async def process_video_description_async(
        lesson_id: uuid.UUID,
        video_id: str,
        embedding: EmbeddingService | None = None,
        transcript_service: YoutubeTranscriptService | None = None,
        *,
        video_url: str | None = None,
        precomputed_audio_transcript: str = "",
        max_attempts: int = 3,
    ):
        """
        Pipeline trích xuất nội dung & Batch Embedding đa tầng (Waterfall 4 tầng)
        có Auto-Retry Exponential Backoff (5s -> 15s -> 30s) và phát tiến độ WebSocket realtime.
        """
        task_id = str(lesson_id)
        retry_delays = (5, 15, 30)

        async with EMBEDDING_JOB_SEMAPHORE:
            for attempt in range(1, max_attempts + 1):
                try:
                    if embedding is None:
                        embedding = await get_embedding_service()
                    if transcript_service is None:
                        transcript_service = YoutubeTranscriptService()

                    await lesson_pipeline_tracker.update(
                        task_id,
                        stage="transcribing",
                        percent=65.0,
                        attempt=attempt,
                        max_attempts=max_attempts,
                        next_retry_in=0,
                        clear_error=True,
                        message="Đang trích xuất nội dung bài giảng để lập chỉ mục AI...",
                    )

                    # ===== WATERFALL 4 TẦNG TRÍCH XUẤT NỘI DUNG =====
                    description = ""
                    source_kind = ""
                    source_reference = f"youtube:{video_id}"
                    timestamps_verified = False
                    chunk_pairs: list[tuple[str, list[int]]] = []

                    # Tầng 1: Transcript từ nhánh tách audio file gốc (upload trực tiếp)
                    if precomputed_audio_transcript and precomputed_audio_transcript.strip():
                        description = precomputed_audio_transcript.strip()
                        source_kind = "audio_ai_transcript"
                        timestamps_verified = False
                        raw_chunks = embedding.split_text_by_tokens(
                            description, chunk_size=1000, overlap=100
                        )
                        chunk_pairs = [(c, []) for c in raw_chunks if c.strip()]

                    is_youtube_id = bool(
                        video_id
                        and len(video_id) == 11
                        and "/" not in video_id
                        and not video_id.startswith("r2:")
                    )

                    # Tầng 2: Phụ đề YouTube chuẩn (YouTubeTranscriptApi)
                    if not description and is_youtube_id:
                        try:
                            evidence = await transcript_service.extract_video_evidence(
                                video_id
                            )
                            if evidence and evidence.content.strip():
                                description = evidence.content.strip()
                                source_kind = "youtube_transcript"
                                source_reference = evidence.source_reference
                                timestamps_verified = True
                                chunk_pairs = [
                                    (txt, list(anchors))
                                    for txt, anchors in evidence.chunks(
                                        embedding, chunk_tokens=1000
                                    )
                                    if txt.strip()
                                ]
                        except Exception as yt_err:
                            logger.info(
                                f"ℹ️ [{lesson_id}] Không lấy được phụ đề YouTube ({yt_err}), chuyển sang fallback Gemini..."
                            )

                    # Tầng 3: Video YouTube không có phụ đề -> Gemini 2.5 Flash đọc trực tiếp URL công khai
                    if not description and is_youtube_id:
                        target_url = (
                            video_url or f"https://www.youtube.com/watch?v={video_id}"
                        )
                        try:
                            ai_summary = await embedding.extract_video_context_from_url(
                                target_url
                            )
                            cleaned = (ai_summary or "").strip()
                            if cleaned and not cleaned.startswith("⚠️"):
                                description = cleaned
                                source_kind = "gemini_video_summary"
                                timestamps_verified = False
                                raw_chunks = embedding.split_text_by_tokens(
                                    description, chunk_size=1000, overlap=100
                                )
                                chunk_pairs = [(c, []) for c in raw_chunks if c.strip()]
                        except Exception as gem_err:
                            logger.info(
                                f"ℹ️ [{lesson_id}] Gemini URL video fallback bỏ qua ({gem_err}), chuyển sang fallback metadata..."
                            )

                    # Tầng 4: Fallback cuối cùng — Metadata (Tiêu đề + Mô tả + Chương + Khóa học)
                    if not description:
                        async with AsyncSessionLocal() as meta_db:
                            lesson_row = await meta_db.scalar(
                                select(Lessons)
                                .options(selectinload(Lessons.section))
                                .where(Lessons.id == lesson_id)
                            )
                            course_title = ""
                            section_title = ""
                            if lesson_row and lesson_row.section:
                                section_title = lesson_row.section.title or ""
                                c_row = await meta_db.get(
                                    Courses, lesson_row.section.course_id
                                )
                                if c_row:
                                    course_title = c_row.title or ""
                            parts = [
                                f"Khóa học: {course_title}" if course_title else "",
                                f"Chương: {section_title}" if section_title else "",
                                f"Bài học: {lesson_row.title}" if lesson_row and lesson_row.title else "",
                                f"Mô tả: {lesson_row.description}" if lesson_row and lesson_row.description else "",
                            ]
                            description = "\n".join(p for p in parts if p).strip()
                            if not description:
                                description = f"Bài học video ({video_id})"
                            source_kind = "lesson_metadata"
                            timestamps_verified = False
                            raw_chunks = embedding.split_text_by_tokens(
                                description, chunk_size=1000, overlap=100
                            )
                            chunk_pairs = [(c, []) for c in raw_chunks if c.strip()]

                    content_hash = hashlib.sha256(
                        description.encode("utf-8")
                    ).hexdigest()

                    # Kiểm tra idempotency theo content_hash (bỏ qua nếu đã embed đúng nội dung này)
                    async with AsyncSessionLocal() as check_db:
                        existing_hash = await check_db.scalar(
                            select(LessonChunks.source_content_hash)
                            .where(LessonChunks.lesson_id == lesson_id)
                            .limit(1)
                        )
                        existing_video = await check_db.scalar(
                            select(LessonVideos).where(
                                LessonVideos.lesson_id == lesson_id
                            )
                        )
                        if (
                            existing_hash == content_hash
                            and existing_video
                            and existing_video.file_id == video_id
                        ):
                            await lesson_pipeline_tracker.update(
                                task_id,
                                stage="completed",
                                percent=100.0,
                                source_kind=source_kind,
                                chunks_total=len(chunk_pairs),
                                chunks_done=len(chunk_pairs),
                                message="Nội dung không thay đổi — giữ nguyên chỉ mục AI hiện tại.",
                                is_completed=True,
                            )
                            return

                    # ===== BATCH EMBEDDING + MEAN POOLING (NHANH HƠN 10x-25x) =====
                    chunk_texts = [c[0] for c in chunk_pairs]
                    total_tokens = embedding.estimate_tokens(description)

                    await lesson_pipeline_tracker.update(
                        task_id,
                        stage="embedding",
                        percent=80.0,
                        source_kind=source_kind,
                        chunks_total=len(chunk_texts),
                        chunks_done=0,
                        message=f"Đang tạo vector AI theo lô ({len(chunk_texts)} đoạn)...",
                    )

                    chunk_vectors = await embedding.embed_texts(chunk_texts)
                    token_counts = [
                        max(1, embedding.estimate_tokens(t)) for t in chunk_texts
                    ]
                    lesson_embedding = embedding.mean_pool_normalized(
                        chunk_vectors, weights=[float(tc) for tc in token_counts]
                    )

                    lesson_chunks_payload = [
                        LessonChunks(
                            lesson_id=lesson_id,
                            chunk_index=idx,
                            text_=chunk_text,
                            embedding=chunk_vectors[idx],
                            token_count=token_counts[idx],
                            source_kind=source_kind,
                            source_reference=source_reference,
                            source_content_hash=content_hash,
                            timestamps_verified=timestamps_verified,
                            timestamp_anchors=anchors,
                        )
                        for idx, (chunk_text, anchors) in enumerate(chunk_pairs)
                    ]

                    # Lưu kết quả vào DB trong transaction ngắn gọn
                    async with AsyncSessionLocal() as db:
                        current_video = await db.scalar(
                            select(LessonVideos)
                            .where(LessonVideos.lesson_id == lesson_id)
                            .with_for_update()
                        )
                        if not current_video or current_video.file_id != video_id:
                            await db.rollback()
                            return
                        await db.execute(
                            update(Lessons)
                            .where(Lessons.id == lesson_id)
                            .values(
                                embedding=lesson_embedding,
                                content_tokens=total_tokens,
                            )
                        )
                        current_video.transcript = description
                        await db.execute(
                            delete(LessonChunks).where(
                                LessonChunks.lesson_id == lesson_id
                            )
                        )
                        db.add_all(lesson_chunks_payload)
                        await db.commit()

                    await lesson_pipeline_tracker.update(
                        task_id,
                        stage="completed",
                        percent=100.0,
                        source_kind=source_kind,
                        chunks_total=len(chunk_texts),
                        chunks_done=len(chunk_texts),
                        message=f"Hoàn tất lập chỉ mục AI ({len(chunk_texts)} đoạn, {total_tokens} tokens).",
                        clear_error=True,
                        is_completed=True,
                    )
                    logger.info(
                        f"✅ [{lesson_id}] xử lý xong ({len(chunk_texts)} chunks, {total_tokens} tokens, source={source_kind})"
                    )
                    return

                except Exception as e:
                    err_msg = str(e) or type(e).__name__
                    logger.warning(
                        f"⚠️ Lesson embedding attempt {attempt}/{max_attempts} failed lesson={lesson_id}: {err_msg}"
                    )
                    if attempt < max_attempts:
                        delay = retry_delays[min(attempt - 1, len(retry_delays) - 1)]
                        await lesson_pipeline_tracker.update(
                            task_id,
                            stage="retrying",
                            attempt=attempt,
                            max_attempts=max_attempts,
                            next_retry_in=delay,
                            error=err_msg,
                            message=f"Gặp lỗi tạm thời — tự động thử lại lần {attempt + 1}/{max_attempts} sau {delay} giây...",
                            is_completed=False,
                        )
                        await asyncio.sleep(delay)
                    else:
                        await lesson_pipeline_tracker.update(
                            task_id,
                            stage="failed",
                            attempt=attempt,
                            max_attempts=max_attempts,
                            next_retry_in=0,
                            error=err_msg,
                            message="Xử lý chỉ mục AI thất bại sau 3 lần thử. Bạn có thể bấm Chạy lại ngay.",
                            is_completed=False,
                        )

    async def reindex_lesson_async(
        self,
        lesson_id: uuid.UUID,
        actor_id: uuid.UUID,
        background_tasks: BackgroundTasks,
        *,
        is_admin: bool = False,
    ):
        """Cho phép giảng viên (hoặc Admin) kích hoạt chạy lại pipeline embedding cho bài học video."""
        lesson = await self.db.scalar(
            select(Lessons)
            .options(selectinload(Lessons.section))
            .where(Lessons.id == lesson_id)
        )
        if not lesson or not lesson.section:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = await self.db.get(Courses, lesson.section.course_id)
        if not course or (not is_admin and course.instructor_id != actor_id):
            raise HTTPException(403, "Bạn không có quyền truy cập bài học này")

        lesson_video = await self.db.scalar(
            select(LessonVideos).where(LessonVideos.lesson_id == lesson_id)
        )
        if not lesson_video or not lesson_video.file_id:
            raise HTTPException(400, "Bài học chưa có video để lập chỉ mục")

        await lesson_pipeline_tracker.update(
            str(lesson_id),
            job_type="video",
            lesson_id=str(lesson_id),
            instructor_id=str(course.instructor_id),
            title=lesson.title or "Bài học Video",
            course_title=course.title or "",
            stage="queued",
            percent=10.0,
            upload_percent=100.0,
            video_id=lesson_video.file_id,
            video_url=lesson_video.video_url,
            attempt=1,
            max_attempts=3,
            next_retry_in=0,
            clear_error=True,
            is_completed=False,
            message="Đã nhận yêu cầu chạy lại chỉ mục AI...",
        )

        background_tasks.add_task(
            LessonService.process_video_description_async,
            lesson_id,
            lesson_video.file_id,
            video_url=lesson_video.video_url,
        )
        return {
            "message": "Đã kích hoạt chạy lại tiến trình tạo chỉ mục AI.",
            "lesson_id": str(lesson_id),
        }

    async def reindex_resource_async(
        self,
        resource_id: uuid.UUID,
        actor_id: uuid.UUID,
        background_tasks: BackgroundTasks,
        *,
        is_admin: bool = False,
    ):
        """Chạy lại OCR & Batch Embedding cho tài liệu PDF/ảnh bị lỗi hoặc chưa lập chỉ mục."""
        import httpx

        resource = await self.db.scalar(
            select(LessonResources).where(LessonResources.id == resource_id)
        )
        if not resource:
            raise HTTPException(404, "Không tìm thấy tài liệu")
        lesson = await self.db.scalar(
            select(Lessons)
            .options(selectinload(Lessons.section))
            .where(Lessons.id == resource.lesson_id)
        )
        if not lesson or not lesson.section:
            raise HTTPException(404, "Không tìm thấy bài học chứa tài liệu")
        course = await self.db.get(Courses, lesson.section.course_id)
        if not course or (not is_admin and course.instructor_id != actor_id):
            raise HTTPException(403, "Bạn không có quyền truy cập tài liệu này")

        if resource.resource_type == "link" or not resource.url:
            raise HTTPException(
                400, "Chỉ hỗ trợ lập chỉ mục AI cho tệp tài liệu PDF/Hình ảnh."
            )

        filename = resource.title or "document.pdf"
        if not filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
            if ".pdf" in (resource.url or "").lower():
                filename = f"{filename}.pdf"

        content_bytes: bytes | None = None
        if resource.url.startswith(("http://", "https://")):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.get(resource.url)
                    resp.raise_for_status()
                    content_bytes = resp.content
            except Exception as dl_err:
                raise HTTPException(
                    502, f"Không tải lại được tệp tài liệu từ lưu trữ: {dl_err}"
                ) from None

        if not content_bytes:
            raise HTTPException(
                400, "Không tìm thấy dữ liệu tệp gốc để chạy lại chỉ mục AI."
            )

        resource.embed_status = "processing"
        resource.updated_at = get_now()
        await self.db.commit()

        await lesson_pipeline_tracker.update(
            f"resource:{resource_id}",
            job_type="resource",
            lesson_id=str(lesson.id),
            resource_id=str(resource_id),
            instructor_id=str(course.instructor_id),
            title=resource.title or filename,
            course_title=course.title or "",
            stage="queued",
            percent=10.0,
            attempt=1,
            max_attempts=3,
            next_retry_in=0,
            clear_error=True,
            is_completed=False,
            message="Đã xếp hàng chạy lại chỉ mục AI cho tài liệu...",
        )

        background_tasks.add_task(
            LessonService._process_embedding_for_resource_task,
            str(resource_id),
            content_bytes,
            filename,
        )
        return {
            "message": "Đã kích hoạt chạy lại chỉ mục AI cho tài liệu.",
            "resource_id": str(resource_id),
        }

    async def move_lesson_async(
        self, lesson_id: uuid.UUID, schema: MoveLessonSchema, lecturer_id: uuid.UUID
    ):
        """
        ✅ Di chuyển bài học sang chương khác hoặc đổi vị trí trong cùng chương.
        - Cập nhật lại position cho cả chương cũ và chương mới.
        """
        # kieerm tra quyen cua ngoi dung

        # 1️⃣ Lấy thông tin bài học hiện tại
        lesson: Lessons | None = await self.db.scalar(
            select(Lessons)
            .options(selectinload(Lessons.course))
            .where(Lessons.id == lesson_id)
        )
        if not lesson:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học")
        if lesson.course and lesson.course.instructor_id != lecturer_id:
            raise HTTPException(
                status_code=403, detail="Bạn không có quyền truy cập bài học này"
            )

        old_section_id = lesson.section_id
        new_section_id = schema.section_id

        # 2️⃣ Kiểm tra chương đích tồn tại
        target_section = await self.db.scalar(
            select(CourseSections).where(CourseSections.id == new_section_id)
        )
        if not target_section:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương đích")

        # 3️⃣ Lấy danh sách bài học trong chương đích
        result = await self.db.scalars(
            select(Lessons.id)
            .where(Lessons.section_id == new_section_id)
            .order_by(Lessons.position)
        )
        lessons_target = list(result)

        # 4️⃣ Nếu đang di chuyển trong cùng chương → bỏ id cũ trước khi chèn
        if old_section_id == new_section_id and lesson_id in lessons_target:
            lessons_target.remove(lesson_id)
        else:
            # 4b️⃣ Nếu di chuyển sang chương mới → xóa khỏi chương cũ
            old_result = await self.db.scalars(
                select(Lessons.id)
                .where(Lessons.section_id == old_section_id)
                .order_by(Lessons.position)
            )
            lessons_old = list(old_result)
            if lesson_id in lessons_old:
                lessons_old.remove(lesson_id)
            # Reindex lại chương cũ
            for idx, lid in enumerate(lessons_old):
                await self.db.execute(
                    update(Lessons).where(Lessons.id == lid).values(position=idx)
                )

        # 5️⃣ Chèn lesson vào vị trí mới trong chương đích
        insert_pos = max(0, min(schema.position, len(lessons_target)))
        lessons_target.insert(insert_pos, lesson_id)

        # 6️⃣ Reindex toàn bộ chương đích
        for idx, lid in enumerate(lessons_target):
            await self.db.execute(
                update(Lessons)
                .where(Lessons.id == lid)
                .values(section_id=new_section_id, position=idx)
            )

        await self.db.commit()
        return {"detail": "Di chuyển bài học thành công"}

    async def rename_lesson_async(
        self,
        lesson_id: uuid.UUID,
        schema: UpdateLessonTitleSchema,
        lecturer_id: uuid.UUID,
    ):
        """
        ✅ Cập nhật tên bài học và tự động viết lại slug theo title mới.
        - Giữ nguyên section_id, order_index, các trường khác.
        """
        # 1️⃣ Kiểm tra bài học tồn tại
        lesson = await self.db.scalar(select(Lessons).where(Lessons.id == lesson_id))
        if not lesson:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học")

        # 2️⃣ Kiểm tra quyền giảng viên
        course: Courses | None = await self.db.scalar(
            select(Courses).where(Courses.id == lesson.course_id)
        )
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy khóa học")
        if course.instructor_id != lecturer_id:
            raise HTTPException(
                status_code=403, detail="Bạn không có quyền truy cập bài học này"
            )
        # 4️⃣ Cập nhật title + slug
        await self.db.execute(
            update(Lessons)
            .where(Lessons.id == lesson_id)
            .values(
                title=schema.title, updated_at=await to_utc_naive(get_now())
            )
        )
        await self.db.commit()

        return {"detail": "Cập nhật tên bài học thành công"}

    async def get_lesson_resources_async(self, lesson_id: uuid.UUID):
        """Lấy toàn bộ tài nguyên (lesson_resources) của 1 bài học."""
        # 1️⃣ Kiểm tra bài học tồn tại
        lesson = await self.db.scalar(select(Lessons).where(Lessons.id == lesson_id))
        if not lesson:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học")

        # 2️⃣ Lấy toàn bộ tài nguyên thuộc bài học
        resources = await self.db.scalars(
            select(LessonResources)
            .where(LessonResources.lesson_id == lesson_id)
            .order_by(LessonResources.created_at.desc())
        )
        resources = resources.all()

        return [
            {
                "id": str(r.id),
                "lesson_id": str(r.lesson_id),
                "title": r.title,
                "url": r.url,
                "resource_type": r.resource_type,
                "mime_type": r.mime_type,
                "file_size": r.file_size,
                "embed_status": r.embed_status,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r in resources
        ]

    async def add_resources_file_async(
        self,
        lesson_id: uuid.UUID,
        background_tasks: BackgroundTasks,
        lecturer_id: uuid.UUID,
        files: Optional[List[UploadFile]],
        ocr_pdf_service: OCRService,
    ):
        """Upload file hoặc thêm link -> lưu DB -> giao background xử lý embedding."""

        lesson = await self.db.scalar(select(Lessons).where(Lessons.id == lesson_id))
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = await self.db.scalar(
            select(Courses).where(Courses.id == lesson.course_id)
        )
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền truy cập khóa học này")
        created_resources: List[
            Tuple[LessonResources, Optional[bytes], Optional[str]]
        ] = []

        if files:
            for file in files:
                content = await file.read()
                filename = file.filename or "resource"
                content_type = file.content_type or "application/octet-stream"

                uploaded = await self.storage.upload_file(
                    path_parts=[
                        "courses",
                        str(lesson.course_id),
                        "lessons",
                        str(lesson_id),
                        "resources",
                    ],
                    content=content,
                    file_name=filename,
                    mime_type=content_type,
                )

                web_link = uploaded["url"]

                resource = LessonResources(
                    id=uuid.uuid4(),
                    lesson_id=lesson_id,
                    resource_type=await ocr_pdf_service._detect_type(content_type),
                    title=file.filename,
                    url=web_link,
                    mime_type=content_type,
                    file_size=len(content),
                    embed_status="processing",
                    created_at=await to_utc_naive(get_now()),
                    updated_at=await to_utc_naive(get_now()),
                )
                self.db.add(resource)
                created_resources.append((resource, content, file.filename))
        await self.db.commit()

        # =====================================
        # ⚙️ Giao background xử lý embedding
        # =====================================
        for resource, content, filename in created_resources:
            background_tasks.add_task(
                LessonService._process_embedding_for_resource_task,
                str(resource.id),
                content,
                filename,
            )

        return {
            "message": f"✅ Đã thêm {len(created_resources)} tài nguyên, embedding sẽ xử lý nền",
            "resources": [
                {
                    "id": str(r.id),
                    "title": r.title,
                    "url": r.url,
                    "resource_type": r.resource_type,
                    "mime_type": r.mime_type,
                    "embed_status": r.embed_status,
                }
                for r, _, _ in created_resources
            ],
        }

    @staticmethod
    async def _process_embedding_for_resource_task(
        resource_id: str,
        content: Optional[bytes],
        filename: Optional[str],
        max_attempts: int = 3,
    ):
        from app.db.models.database import LessonResources

        res_uuid = uuid.UUID(resource_id)
        job_key = f"resource:{resource_id}"
        retry_delays = (5, 15, 30)

        async with EMBEDDING_JOB_SEMAPHORE:
            # 1️⃣ Đọc metadata ngắn gọn (lesson, course, instructor) để phân quyền WS queue
            lesson_id: uuid.UUID | None = None
            instructor_id_str = ""
            course_title = ""
            res_title = filename or "Tài liệu bài học"

            async with AsyncSessionLocal() as db:
                resource = await db.scalar(
                    select(LessonResources).where(LessonResources.id == res_uuid)
                )
                if not resource:
                    print(f"⚠️ Không tìm thấy resource {resource_id}")
                    return
                lesson_id = resource.lesson_id
                res_title = resource.title or res_title
                lesson_row = await db.scalar(
                    select(Lessons)
                    .options(selectinload(Lessons.section))
                    .where(Lessons.id == lesson_id)
                )
                if lesson_row and lesson_row.section:
                    course_row = await db.get(Courses, lesson_row.section.course_id)
                    if course_row:
                        instructor_id_str = str(course_row.instructor_id)
                        course_title = course_row.title or ""

                if not (content and filename):
                    resource.embed_status = "skipped"
                    await db.commit()
                    return

            for attempt in range(1, max_attempts + 1):
                try:
                    await lesson_pipeline_tracker.update(
                        job_key,
                        job_type="resource",
                        lesson_id=str(lesson_id) if lesson_id else None,
                        resource_id=resource_id,
                        instructor_id=instructor_id_str or None,
                        title=res_title,
                        course_title=course_title,
                        stage="transcribing",
                        percent=35.0,
                        attempt=attempt,
                        max_attempts=max_attempts,
                        next_retry_in=0,
                        clear_error=True,
                        is_completed=False,
                        message="Đang đọc nội dung PDF/OCR tài liệu...",
                    )

                    # 2️⃣ OCR chạy trong worker thread (không chặn event loop, không giữ DB session)
                    text_content = ""
                    if filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
                        ocr = get_ocr_service()
                        text_content = await asyncio.to_thread(
                            ocr.extract_text_from_pdf, content
                        )

                    if not text_content.strip():
                        async with AsyncSessionLocal() as db:
                            await db.execute(
                                update(LessonResources)
                                .where(LessonResources.id == res_uuid)
                                .values(embed_status="empty", updated_at=get_now())
                            )
                            await db.commit()
                        await lesson_pipeline_tracker.update(
                            job_key,
                            stage="completed",
                            percent=100.0,
                            source_kind="resource_pdf_ocr",
                            message="Tài liệu không có chữ để trích xuất (đã đánh dấu trống).",
                            is_completed=True,
                        )
                        return

                    # 3️⃣ Tách chunk & gọi Batch Embedding (1 request cho tới 64 chunks)
                    embedding = await get_embedding_service()
                    chunks = [
                        c
                        for c in embedding.split_text_by_tokens(
                            text_content, chunk_size=1500, overlap=150
                        )
                        if c.strip()
                    ]

                    await lesson_pipeline_tracker.update(
                        job_key,
                        stage="embedding",
                        percent=75.0,
                        source_kind="resource_pdf_ocr",
                        chunks_total=len(chunks),
                        chunks_done=0,
                        message=f"Đang tạo vector AI cho tài liệu ({len(chunks)} đoạn)...",
                    )

                    vectors = await embedding.embed_texts(chunks)

                    # 4️⃣ Mở DB session ngắn để ghi toàn bộ chunks + trạng thái done
                    now_dt = get_now()
                    chunk_rows = [
                        ResourceChunks(
                            id=uuid.uuid4(),
                            resource_id=res_uuid,
                            lesson_id=lesson_id,
                            chunk_index=idx,
                            chunk_type="text",
                            content=chunk_text,
                            token_count=embedding.estimate_tokens(chunk_text),
                            embedding=vectors[idx],
                            created_at=now_dt,
                        )
                        for idx, chunk_text in enumerate(chunks)
                    ]
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            delete(ResourceChunks).where(
                                ResourceChunks.resource_id == res_uuid
                            )
                        )
                        db.add_all(chunk_rows)
                        await db.execute(
                            update(LessonResources)
                            .where(LessonResources.id == res_uuid)
                            .values(embed_status="done", updated_at=now_dt)
                        )
                        await db.commit()

                    await lesson_pipeline_tracker.update(
                        job_key,
                        stage="completed",
                        percent=100.0,
                        source_kind="resource_pdf_ocr",
                        chunks_total=len(chunks),
                        chunks_done=len(chunks),
                        message=f"Đã lập chỉ mục AI tài liệu ({len(chunks)} đoạn).",
                        clear_error=True,
                        is_completed=True,
                    )
                    print(
                        f"✅ [{resource_id}] Đã nhúng batch embedding thành công ({len(chunks)} chunks)"
                    )
                    return

                except Exception as e:
                    err_msg = str(e) or type(e).__name__
                    print(
                        f"❌ Lỗi embedding resource {resource_id} (lần {attempt}/{max_attempts}): {err_msg}"
                    )
                    if attempt < max_attempts:
                        delay = retry_delays[min(attempt - 1, len(retry_delays) - 1)]
                        await lesson_pipeline_tracker.update(
                            job_key,
                            stage="retrying",
                            attempt=attempt,
                            max_attempts=max_attempts,
                            next_retry_in=delay,
                            error=err_msg,
                            message=f"Lỗi tạm thời — tự động thử lại lần {attempt + 1}/{max_attempts} sau {delay}s...",
                            is_completed=False,
                        )
                        await asyncio.sleep(delay)
                    else:
                        try:
                            async with AsyncSessionLocal() as db:
                                await db.execute(
                                    update(LessonResources)
                                    .where(LessonResources.id == res_uuid)
                                    .values(embed_status="error", updated_at=get_now())
                                )
                                await db.commit()
                        except Exception:
                            pass
                        await lesson_pipeline_tracker.update(
                            job_key,
                            stage="failed",
                            attempt=attempt,
                            max_attempts=max_attempts,
                            next_retry_in=0,
                            error=err_msg,
                            message="Lập chỉ mục AI tài liệu thất bại sau 3 lần thử. Bạn có thể bấm Chạy lại.",
                            is_completed=False,
                        )

    async def add_resources_link_async(
        self,
        lesson_id: uuid.UUID,
        lecturer_id: uuid.UUID,
        links: List[UpdateLessonResourcesLinkSchema],
    ):
        """Thêm link tài nguyên -> lưu DB (không cần embedding)."""

        lesson = await self.db.scalar(select(Lessons).where(Lessons.id == lesson_id))
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = await self.db.scalar(
            select(Courses).where(Courses.id == lesson.course_id)
        )
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền truy cập khóa học này")

        created_resources: List[LessonResources] = []

        for link in links:
            resource = LessonResources(
                id=uuid.uuid4(),
                lesson_id=lesson_id,
                resource_type="link",
                title=link.title,
                url=link.url,
                mime_type="text/link",
                file_size=0,
                embed_status="skipped",
                created_at=await to_utc_naive(get_now()),
                updated_at=await to_utc_naive(get_now()),
            )
            self.db.add(resource)
            created_resources.append(resource)

        await self.db.commit()

        return {
            "message": f"✅ Đã thêm {len(created_resources)} tài nguyên dạng link.",
            "resources": [
                {
                    "id": str(r.id),
                    "title": r.title,
                    "url": r.url,
                    "resource_type": r.resource_type,
                    "mime_type": r.mime_type,
                    "embed_status": r.embed_status,
                }
                for r in created_resources
            ],
        }

    async def add_resources_file_zip_rar_async(
        self,
        lesson_id: uuid.UUID,
        lecturer_id: uuid.UUID,
        files: List[UploadFile],
    ):
        """Thêm file tài nguyên dạng ZIP/RAR -> lưu DB (không cần embedding)."""

        # 1️⃣ Kiểm tra bài học và quyền giảng viên
        lesson = await self.db.scalar(select(Lessons).where(Lessons.id == lesson_id))
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")

        course = await self.db.scalar(
            select(Courses).where(Courses.id == lesson.course_id)
        )
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền truy cập khóa học này")

        created_resources: List[LessonResources] = []
        now = await to_utc_naive(get_now())

        for file in files:
            try:
                content = await file.read()
                filename = file.filename or "resource"
                content_type = file.content_type or "application/octet-stream"

                # Nhận diện loại file (zip/rar/7z)
                filename_lower = file.filename.lower()
                if filename_lower.endswith((".zip", ".rar", ".7z")):
                    resource_type = "archive"
                else:
                    resource_type = "file"

                uploaded = await self.storage.upload_file(
                    path_parts=[
                        "courses",
                        str(lesson.course_id),
                        "lessons",
                        str(lesson_id),
                        "resources",
                    ],
                    content=content,
                    file_name=filename,
                    mime_type=content_type,
                )

                web_link = uploaded["url"]

                resource = LessonResources(
                    id=uuid.uuid4(),
                    lesson_id=lesson_id,
                    resource_type=resource_type,
                    title=file.filename,
                    url=web_link,
                    mime_type=content_type,
                    file_size=len(content),
                    embed_status="skipped",
                    created_at=now,
                    updated_at=now,
                )
                self.db.add(resource)
                created_resources.append(resource)

            except Exception as e:
                await self.db.rollback()
                raise HTTPException(500, f"❌ Lỗi upload {file.filename}: {e}")

        await self.db.commit()

        return {
            "message": f"✅ Đã thêm {len(created_resources)} tài nguyên dạng nén.",
            "resources": [
                {
                    "id": str(r.id),
                    "title": r.title,
                    "url": r.url,
                    "resource_type": r.resource_type,
                    "mime_type": r.mime_type,
                    "embed_status": r.embed_status,
                }
                for r in created_resources
            ],
        }

    async def delete_resource_async(
        self, resource_id: uuid.UUID, lecture_id: uuid.UUID
    ):
        """Xóa 1 resource theo id (async)."""
        try:
            # 1️⃣ Kiểm tra tồn tại
            existing = await self.db.scalar(
                select(LessonResources).where(LessonResources.id == resource_id)
            )

            if not existing:
                raise HTTPException(404, "❌ Không tìm thấy tài nguyên để xóa.")

            isAuth = await self.db.scalar(
                select(Courses)
                .join(Lessons, Lessons.course_id == Courses.id)
                .where(Lessons.id == existing.lesson_id)
            )
            if not isAuth:
                raise HTTPException(404, "❌ Bài học không tồn tại.")
            if isAuth.instructor_id != lecture_id:
                raise HTTPException(403, "❌ Bạn không có quyền xóa tài nguyên này.")
            # 2️⃣ Xóa
            await self.db.execute(
                delete(LessonResources).where(LessonResources.id == resource_id)
            )
            await self.db.commit()

            logger.info(f"🗑️ Đã xóa resource: {resource_id}")
            return {"status": "success", "message": "✅ Đã xóa tài nguyên thành công."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Lỗi khi xóa resource {resource_id}: {e}")
            raise HTTPException(500, f"Lỗi khi xóa tài nguyên: {e}")

    async def get_quizzes_by_lesson_async(
        self,
        lesson_id: uuid.UUID,
        lecturer_id: uuid.UUID,
    ):
        """Lấy tất cả quiz của 1 bài học kèm options"""
        course = await self.db.scalar(
            select(Courses)
            .join(Lessons, Lessons.course_id == Courses.id)
            .where(Lessons.id == lesson_id, Courses.instructor_id == lecturer_id)
        )
        if not course:
            raise HTTPException(403, "Bạn không có quyền truy cập khóa học này")

        quizzes = await self.db.scalars(
            select(LessonQuizzes)
            .options(selectinload(LessonQuizzes.lesson_quiz_options))
            .where(LessonQuizzes.lesson_id == lesson_id)
        )

        quizzes = quizzes.all()
        if not quizzes:
            return []

        return [
            {
                "id": str(q.id),
                "question": q.question,
                "explanation": q.explanation,
                "difficulty_level": q.difficulty_level,
                "options": [
                    {
                        "id": str(o.id),
                        "text": o.text_,
                        "is_correct": o.is_correct,
                        "feedback": o.feedback,
                        "position": o.position,
                    }
                    for o in q.lesson_quiz_options
                ],
            }
            for q in quizzes
        ]

    async def create_quizzes_bulk_async(
        self, lecturer_id: uuid.UUID, schema: LessonQuizBulkCreate
    ):
        """🧠 Tạo nhiều quiz cùng lúc cho 1 bài học"""
        lesson = await self.db.scalar(
            select(Lessons).where(Lessons.id == schema.lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")

        course = await self.db.scalar(
            select(Courses).where(Courses.id == lesson.course_id)
        )
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền thêm quiz cho khóa học này")

        created_quizzes = []
        now = await to_utc_naive(get_now())

        for quiz_data in schema.quizzes:
            quiz = LessonQuizzes(
                id=uuid.uuid4(),
                lesson_id=schema.lesson_id,
                course_id=lesson.course_id,
                question=quiz_data.question.strip(),
                explanation=quiz_data.explanation or "",
                difficulty_level=quiz_data.difficulty_level or 1,
                created_by=schema.created_by,
                created_at=now,
            )
            self.db.add(quiz)

            for i, opt in enumerate(quiz_data.options, start=1):
                option = LessonQuizOptions(
                    id=uuid.uuid4(),
                    quiz_id=quiz.id,
                    text_=opt.text.strip(),
                    is_correct=opt.is_correct,
                    feedback=opt.feedback,
                    position=opt.position or i,
                    created_at=now,
                )
                self.db.add(option)

            created_quizzes.append(quiz)

        await self.db.commit()

        return {
            "message": f"✅ Đã tạo {len(created_quizzes)} quiz mới cho bài học.",
            "total": len(created_quizzes),
            "lesson_id": str(schema.lesson_id),
        }

    async def delete_quiz_video_async(self, quiz_id: uuid.UUID, lecturer_id: uuid.UUID):
        """Xóa 1 quiz theo ID."""
        try:
            # 1️⃣ Kiểm tra tồn tại
            existing = await self.db.scalar(
                select(LessonQuizzes).where(LessonQuizzes.id == quiz_id)
            )
            if not existing:
                raise HTTPException(404, "❌ Không tìm thấy quiz để xóa.")

            course = await self.db.get(Courses, existing.course_id)
            if not course or course.instructor_id != lecturer_id:
                raise HTTPException(403, "❌ Bạn không có quyền xóa quiz này.")
            # 2️⃣ Xóa
            await self.db.execute(
                delete(LessonQuizzes).where(LessonQuizzes.id == quiz_id)
            )
            await self.db.commit()

            logger.info(f"🗑️ Đã xóa quiz: {quiz_id}")
            return {"status": "success", "message": "✅ Đã xóa quiz thành công."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Lỗi khi xóa quiz {quiz_id}: {e}")
            raise HTTPException(500, f"Lỗi khi xóa quiz: {e}")

    async def get_lesson_by_section_id(
        self, section_id: uuid.UUID, lecturer_id: uuid.UUID
    ):
        try:
            course = await self.db.scalar(
                select(Courses)
                .join(CourseSections, CourseSections.course_id == Courses.id)
                .where(CourseSections.id == section_id)
            )
            if not course:
                raise HTTPException(404, "❌ Không tìm thấy khóa học cho chương này")
            if course.instructor_id != lecturer_id:
                raise HTTPException(403, "🚫 Bạn không có quyền truy cập chương này")

            stmt = (
                select(Lessons)
                .options(selectinload(Lessons.lesson_chunks))
                .where(Lessons.section_id == section_id, Lessons.lesson_type == "video")
                .order_by(Lessons.position.asc())
            )
            lessons = (await self.db.scalars(stmt)).all()

            if not lessons:
                raise HTTPException(
                    404, "❌ Không có bài học dạng video trong chương này"
                )

            return [
                {
                    "id": str(lesson.id),
                    "title": lesson.title,
                    "lesson_type": lesson.lesson_type,
                    "chunk_count": len(lesson.lesson_chunks or []),
                    "has_embedding": (lesson.embedding is not None)
                    or any(
                        c.embedding is not None
                        for c in (lesson.lesson_chunks or [])
                    ),
                }
                for lesson in lessons
            ]

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                500, f"⚠️ Có lỗi khi lấy danh sách bài học theo chương: {e}"
            )

    async def get_code_languages_async(self):
        try:
            languages = await self.db.scalars(select(SupportedLanguages))
            return languages.all()
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"⚠️ Có lỗi khi lấy danh sách ngôn ngữ: {e}")

    async def verify_code_sample_async(self, payload: LessonCodeVerify):
        """
        Kiểm tra code mẫu có pass toàn bộ testcases không (theo order_index từ 0).
        """
        # 1️⃣ Kiểm tra ngôn ngữ hợp lệ
        lang = await self.db.scalar(
            select(SupportedLanguages).where(
                SupportedLanguages.id == payload.language_id
            )
        )
        if not lang:
            raise HTTPException(400, "🚫 Ngôn ngữ không hợp lệ")

        # 2️⃣ Chuẩn bị danh sách file
        files = [{"name": f.filename, "content": f.content} for f in payload.files]
        results = []

        # 3️⃣ Sắp xếp testcases theo order_index (0 → n)
        sorted_testcases = sorted(payload.testcases, key=lambda t: t.order_index or 0)

        # 4️⃣ Duyệt từng testcase
        for tc in sorted_testcases:
            result = await self.piston.run_code(
                language=lang.name,
                version=lang.version,
                files=files,
                stdin=tc.input,
            )
            run = result.get("run") or result.get("compile") or {}

            stdout = (run.get("stdout") or "").strip()
            stderr = (run.get("stderr") or "").strip()
            exit_code = run.get("code")
            cpu_time = run.get("cpu_time", 0)
            memory = run.get("memory", 0)

            # ✅ Kiểm tra pass
            is_passed = (
                stdout == tc.expected_output.strip() and exit_code == 0 and stderr == ""
            )

            results.append(
                {
                    "index": tc.order_index or 0,  # ✅ giữ nguyên index 0-based
                    "input": tc.input,
                    "expected": tc.expected_output.strip(),
                    "output": stdout,
                    "stderr": stderr,
                    "exit_code": exit_code,
                    "cpu_time": cpu_time,
                    "memory": memory,
                    "language": lang.name,
                    "version": lang.version,
                    "result": "passed" if is_passed else "failed",
                }
            )

        # 5️⃣ Tổng hợp kết quả
        passed = sum(1 for r in results if r["result"] == "passed")
        failed_cases = [r for r in results if r["result"] == "failed"]
        status = "passed" if passed == len(results) else "failed"

        return {
            "status": status,
            "passed": passed,
            "failed": len(failed_cases),
            "total": len(results),
            "language": lang.name,
            "version": lang.version,
            "details": results,
        }

    async def create_full_lesson_code_async(
        self, data: LessonCodeCreate, lecturer_id: uuid.UUID, lesson_id: uuid.UUID
    ):
        """Tạo 1 bài code duy nhất cho 1 lesson"""
        try:
            # ✅ 1️⃣ Kiểm tra quyền giảng viên
            stmt = (
                select(Courses.id)
                .join(Lessons, Lessons.course_id == Courses.id)
                .where(Lessons.id == lesson_id)
                .where(Courses.instructor_id == lecturer_id)
            )
            course = await self.db.scalar(stmt)
            if not course:
                raise HTTPException(
                    403, "Bạn không có quyền thêm bài code cho khóa học này."
                )

            # ✅ 2️⃣ Tạo lesson_code
            lesson_code_id = uuid.uuid4()
            await self.db.execute(
                insert(LessonCodes).values(
                    id=lesson_code_id,
                    lesson_id=lesson_id,
                    title=data.title,
                    description=data.description,
                    language_id=data.language_id,
                    difficulty=data.difficulty,
                    time_limit=data.time_limit,
                    memory_limit=data.memory_limit,
                )
            )

            # ✅ 3️⃣ Thêm starter files
            if data.starter_files:
                for f in data.starter_files:
                    await self.db.execute(
                        insert(LessonCodeFiles).values(
                            id=uuid.uuid4(),
                            lesson_code_id=lesson_code_id,
                            filename=f.filename,
                            content=f.content,
                            is_main=f.is_main,
                            role="starter",
                            is_pass=False,
                        )
                    )

            # ✅ 4️⃣ Thêm solution files
            if data.solution_files:
                for f in data.solution_files:
                    await self.db.execute(
                        insert(LessonCodeFiles).values(
                            id=uuid.uuid4(),
                            lesson_code_id=lesson_code_id,
                            filename=f.filename,
                            content=f.content,
                            is_main=f.is_main,
                            role="solution",
                            is_pass=True,
                        )
                    )

            # ✅ 5️⃣ Thêm testcases
            if data.testcases:
                for t in data.testcases:
                    await self.db.execute(
                        insert(LessonCodeTestcases).values(
                            id=uuid.uuid4(),
                            lesson_code_id=lesson_code_id,
                            input=t.input,
                            expected_output=t.expected_output,
                            is_sample=t.is_sample,
                            order_index=t.order_index,
                        )
                    )

            # ✅ 6️⃣ Commit toàn bộ transaction
            await self.db.commit()
            logger.info(f"✅ Created lesson_code '{data.title}' for lesson {lesson_id}")
            return lesson_code_id

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Lỗi tạo lesson_code: {e}")
            raise HTTPException(500, f"Lỗi khi tạo bài code: {e}")

    async def create_multiple_lesson_codes_async(
        self, data: List[LessonCodeCreate], lecturer_id: uuid.UUID, lesson_id: uuid.UUID
    ):
        """Tạo nhiều bài code cho 1 lesson"""
        created_ids = []

        for code_data in data:
            code_id = await self.create_full_lesson_code_async(
                data=code_data,
                lecturer_id=lecturer_id,
                lesson_id=lesson_id,
            )
            created_ids.append(str(code_id))

        return {"status": "success", "created_codes": created_ids}

    async def get_lesson_by_id_async(
        self, lesson_id: uuid.UUID, lecturer_id: uuid.UUID
    ):
        """
        ✅ Lấy thông tin cơ bản của bài học (dùng cho editor).
        Không xử lý theo lesson_type — tách phần đó ra các hàm riêng.
        """
        try:
            # 1️⃣ Kiểm tra quyền giảng viên qua join Courses
            course = await self.db.scalar(
                select(Courses)
                .join(Lessons, Lessons.course_id == Courses.id)
                .where(Lessons.id == lesson_id)
            )

            if not course:
                raise HTTPException(404, "Không tìm thấy khóa học chứa bài học này")
            if course.instructor_id != lecturer_id:
                raise HTTPException(403, "Bạn không có quyền truy cập bài học này")

            # 2️⃣ Lấy thông tin bài học + preload section để hiển thị
            lesson: Lessons | None = await self.db.scalar(
                select(Lessons)
                .options(selectinload(Lessons.section))
                .where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "Không tìm thấy bài học")

            # 3️⃣ Trả về dữ liệu cơ bản (đủ để frontend editor xác định loại)
            return {
                "id": str(lesson.id),
                "title": lesson.title,
                "description": lesson.description,
                "lesson_type": lesson.lesson_type,
                "section_id": str(lesson.section_id),
                "course_id": str(lesson.course_id),
                "position": lesson.position,
                "is_preview": lesson.is_preview,
                "created_at": lesson.created_at,
                "updated_at": lesson.updated_at,
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"❌ Lỗi khi lấy thông tin bài học: {e}")

    async def update_quizzes_bulk_async(
        self, lecturer_id: uuid.UUID, schema: LessonQuizBulkCreate
    ):
        """✏️ Cập nhật (ghi đè) toàn bộ quiz của một bài học."""
        try:
            # 1️⃣ Kiểm tra bài học tồn tại
            lesson = await self.db.scalar(
                select(Lessons).where(Lessons.id == schema.lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "Không tìm thấy bài học")

            # 2️⃣ Kiểm tra quyền giảng viên
            course = await self.db.scalar(
                select(Courses).where(Courses.id == lesson.course_id)
            )
            if not course or course.instructor_id != lecturer_id:
                raise HTTPException(
                    403, "Bạn không có quyền cập nhật quiz cho khóa học này"
                )

            # 3️⃣ Xóa toàn bộ quiz và options cũ
            old_quiz_ids = await self.db.scalars(
                select(LessonQuizzes.id).where(
                    LessonQuizzes.lesson_id == schema.lesson_id
                )
            )
            old_quiz_ids = list(old_quiz_ids)
            if old_quiz_ids:
                await self.db.execute(
                    delete(LessonQuizOptions).where(
                        LessonQuizOptions.quiz_id.in_(old_quiz_ids)
                    )
                )
                await self.db.execute(
                    delete(LessonQuizzes).where(LessonQuizzes.id.in_(old_quiz_ids))
                )
                await self.db.commit()

            # 4️⃣ Tạo mới toàn bộ quiz
            now = await to_utc_naive(get_now())
            created_quizzes = []

            for quiz_data in schema.quizzes:
                quiz = LessonQuizzes(
                    id=uuid.uuid4(),
                    lesson_id=schema.lesson_id,
                    course_id=lesson.course_id,
                    question=quiz_data.question.strip(),
                    explanation=quiz_data.explanation or "",
                    difficulty_level=quiz_data.difficulty_level or 1,
                    created_by=schema.created_by,
                    created_at=now,
                )
                self.db.add(quiz)

                for i, opt in enumerate(quiz_data.options, start=1):
                    option = LessonQuizOptions(
                        id=uuid.uuid4(),
                        quiz_id=quiz.id,
                        text_=opt.text.strip(),
                        is_correct=opt.is_correct,
                        feedback=opt.feedback,
                        position=opt.position or i,
                        created_at=now,
                    )
                    self.db.add(option)

                created_quizzes.append(quiz)

            await self.db.commit()

            return {
                "message": f"✅ Đã cập nhật {len(created_quizzes)} quiz mới cho bài học.",
                "total": len(created_quizzes),
                "lesson_id": str(schema.lesson_id),
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"❌ Lỗi khi cập nhật quiz: {e}")

    async def get_lesson_video_async(
        self,
        lesson_id: uuid.UUID,
        requester_id: uuid.UUID | None = None,
        check_permission: bool = False,
    ):
        """
        ✅ Lấy thông tin video của bài học:
        - Nếu check_permission=True → chỉ giảng viên khóa học được truy cập
        - Nếu check_permission=False → trả public (dành cho học viên)
        - Trả: lesson info + video info (url, file_id, source, duration, transcript_length)
        """

        try:
            # 1️⃣ Lấy lesson + course
            lesson = await self.db.scalar(
                select(Lessons)
                .options(
                    selectinload(Lessons.section).selectinload(CourseSections.course),
                )
                .where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "❌ Không tồn tại bài học")

            course = lesson.section.course if lesson.section else None
            if not course:
                raise HTTPException(404, "❌ Không tìm thấy khóa học của bài học này")

            # 2️⃣ Nếu yêu cầu kiểm tra quyền chỉnh sửa
            if check_permission:
                if not requester_id or course.instructor_id != requester_id:
                    raise HTTPException(
                        403, "🚫 Bạn không có quyền chỉnh sửa bài học này"
                    )

            # 3️⃣ Lấy video
            video = await self.db.scalar(
                select(LessonVideos).where(LessonVideos.lesson_id == lesson_id)
            )
            if not video:
                raise HTTPException(404, "Bài học chưa có video")

            # 4️⃣ Chuẩn hóa dữ liệu trả về
            return {
                "video_url": video.video_url,
                "file_id": video.file_id,
                "source_type": video.source_type,
                "duration_seconds": float(video.duration or 0),
                "duration_hms": video.duration,
                "transcript_length": len(video.transcript or ""),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"🔥 Lỗi khi lấy thông tin video: {e}")
            raise HTTPException(500, f"Lỗi server khi lấy thông tin video: {e}")

    # =====================================
    async def update_lesson_async(
        self,
        lesson_id: uuid.UUID,
        schema: UpdateLessonSchema,
        lecturer: User,
    ):
        """
        ✅ Cập nhật bài học:
        - Chỉ sửa các trường: title, description, duration, lesson_type
        - Kiểm tra quyền sở hữu của giảng viên
        """

        try:
            # 1️⃣ Lấy bài học và kiểm tra quyền
            lesson = await self.db.scalar(
                select(Lessons)
                .options(
                    selectinload(Lessons.section).selectinload(CourseSections.course)
                )
                .where(Lessons.id == lesson_id)
            )

            if not lesson:
                raise HTTPException(404, "❌ Không tìm thấy bài học")

            course = lesson.section.course if lesson.section else None
            if not course or course.instructor_id != lecturer.id:
                raise HTTPException(403, "🚫 Bạn không có quyền sửa bài học này")

            # 2️⃣ Lấy dữ liệu cần update
            update_data = schema.model_dump(exclude_unset=True)
            if not update_data:
                raise HTTPException(400, "Không có dữ liệu để cập nhật")

            # 3️⃣ Thực hiện cập nhật
            await self.db.execute(
                update(Lessons).where(Lessons.id == lesson_id).values(**update_data)
            )
            await self.db.commit()

            logger.info(f"✅ Giảng viên {lecturer.id} đã cập nhật bài học {lesson_id}")
            return {"message": "Cập nhật bài học thành công", "id": str(lesson_id)}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.exception(f"🔥 Lỗi khi cập nhật bài học: {e}")
            raise HTTPException(500, f"Lỗi khi cập nhật bài học: {e}")

    async def replace_lesson_video_async(
        self,
        lesson_id: uuid.UUID,
        lecturer_id: uuid.UUID,
        background_tasks: BackgroundTasks,
        *,
        video: UploadFile | None = None,
        schema: UpdateLessonVideoSchema | None = None,
    ):
        """
        ✅ Thay thế video bài học (an toàn, không conflict transaction):
        - Xóa video cũ
        - Gọi lại upload hàm gốc (YouTube hoặc upload file)
        - Nếu upload lỗi → rollback
        """
        try:
            # 1️⃣ Kiểm tra quyền
            lesson = await self.db.scalar(
                select(Lessons)
                .options(
                    selectinload(Lessons.section).selectinload(CourseSections.course)
                )
                .where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "Không tìm thấy bài học")

            course = lesson.section.course if lesson.section else None
            if not course or course.instructor_id != lecturer_id:
                raise HTTPException(403, "Bạn không có quyền thay đổi video này")

            # 2️⃣ Xóa video cũ (bên ngoài transaction)
            old_video = await self.db.scalar(
                select(LessonVideos).where(LessonVideos.lesson_id == lesson_id)
            )
            if old_video:
                await self.db.execute(
                    delete(LessonVideos).where(LessonVideos.lesson_id == lesson_id)
                )
                await self.db.commit()

            # 3️⃣ Gọi lại hàm upload phù hợp
            if video:
                result = await self.upload_video_async(
                    video=video,
                    lesson_id=lesson_id,
                    lecturer_id=lecturer_id,
                    background_tasks=background_tasks,
                )
            elif schema and schema.video_url:
                result = await self.upload_video_youtube_url_async(
                    lesson_id=lesson_id,
                    lecturer_id=lecturer_id,
                    schema=schema,
                    background_tasks=background_tasks,
                )
            else:
                raise HTTPException(400, "Thiếu dữ liệu video để thay thế")

            return {
                "message": "✅ Video đã được thay thế thành công",
                "lesson_id": str(lesson_id),
                "result": result,
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()  # rollback nếu bước giữa fail
            raise HTTPException(500, f"❌ Lỗi khi thay thế video bài học: {e}")

    async def test(self, video_id: str):
        try:
            transcript_service = YoutubeTranscriptService()
            description = await transcript_service.extract_video_context(video_id)
            print("🧠 Gemini mô tả:", description[:200], "...")
            return {"description": description}
        except Exception as e:
            raise e

    async def get_all_lesson_codes_async(
        self, lesson_id: uuid.UUID, lecturer_id: uuid.UUID
    ):
        """
        Lấy danh sách toàn bộ bài code thuộc 1 bài học (lesson),
        kèm kiểm tra quyền giảng viên.
        Bao gồm:
          - Thông tin cơ bản của mỗi bài code
          - Starter files
          - Solution files
          - Testcases
        """
        try:
            # ✅ 1️⃣ Kiểm tra quyền giảng viên
            check_stmt = (
                select(Courses.id)
                .join(Lessons, Lessons.course_id == Courses.id)
                .where(Lessons.id == lesson_id)
                .where(Courses.instructor_id == lecturer_id)
            )
            owned_course = await self.db.scalar(check_stmt)
            if not owned_course:
                raise HTTPException(
                    403, "❌ Bạn không có quyền xem bài code của khóa học này."
                )

            # ✅ 2️⃣ Truy vấn tất cả lesson_code thuộc lesson_id đó
            stmt = (
                select(LessonCodes)
                .options(
                    selectinload(LessonCodes.lesson_code_files),
                    selectinload(LessonCodes.lesson_code_testcases),
                    selectinload(LessonCodes.language),
                )
                .where(LessonCodes.lesson_id == lesson_id)
                .order_by(LessonCodes.created_at.desc())
            )

            results = await self.db.scalars(stmt)
            lesson_codes: List[LessonCodes] = results.all()

            if not lesson_codes:
                raise HTTPException(404, "Bài học này chưa có bài code nào.")

            # ✅ 3️⃣ Trả về danh sách chi tiết từng bài code
            data_list = []
            for lc in lesson_codes:
                data_list.append(
                    {
                        "id": str(lc.id),
                        "lesson_id": str(lc.lesson_id),
                        "title": lc.title,
                        "description": lc.description,
                        "difficulty": lc.difficulty,
                        "language": lc.language.name if lc.language else None,
                        "time_limit": lc.time_limit,
                        "memory_limit": lc.memory_limit,
                        "starter_files": [
                            {
                                "id": str(f.id),
                                "filename": f.filename,
                                "content": f.content,
                                "is_main": f.is_main,
                                "role": f.role,
                                "is_pass": f.is_pass,
                            }
                            for f in lc.lesson_code_files
                            if f.role == "starter"
                        ],
                        "solution_files": [
                            {
                                "id": str(f.id),
                                "filename": f.filename,
                                "content": f.content,
                                "is_main": f.is_main,
                                "role": f.role,
                                "is_pass": f.is_pass,
                            }
                            for f in lc.lesson_code_files
                            if f.role == "solution"
                        ],
                        "testcases": [
                            {
                                "id": str(t.id),
                                "input": t.input,
                                "expected_output": t.expected_output,
                                "is_sample": t.is_sample,
                                "order_index": t.order_index,
                            }
                            for t in sorted(
                                lc.lesson_code_testcases,
                                key=lambda x: x.order_index or 0,
                            )
                        ],
                    }
                )

            logger.info(
                f"📚 Giảng viên {lecturer_id} lấy {len(data_list)} bài code thuộc lesson {lesson_id}"
            )
            return data_list

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Lỗi khi lấy danh sách bài code: {e}")
            raise HTTPException(500, f"Lỗi khi lấy danh sách bài code: {e}")

    async def update_lesson_codes_by_lesson_id_async(
        self,
        lesson_id: uuid.UUID,
        updates: list[LessonCodeUpdateBatch],
        lecturer_id: uuid.UUID,
    ):
        """
        Cập nhật đồng loạt LessonCodes thuộc 1 bài học.
        - Có id + type=delete  -> xóa
        - Có id + type=update  -> sửa
        - Không id hoặc type=create -> tạo mới
        """

        try:
            # 1️⃣ Kiểm tra quyền giảng viên
            q_check = (
                select(Courses.id)
                .join(Lessons, Lessons.course_id == Courses.id)
                .where(Lessons.id == lesson_id)
                .where(Courses.instructor_id == lecturer_id)
            )
            owned = await self.db.scalar(q_check)
            if not owned:
                raise HTTPException(403, "❌ Bạn không có quyền sửa bài học này.")

            # 2️⃣ Lấy toàn bộ code hiện có
            q_codes = select(LessonCodes).where(LessonCodes.lesson_id == lesson_id)
            result = await self.db.scalars(q_codes)
            existing_codes = {lc.id: lc for lc in result.all()}

            # 3️⃣ Duyệt danh sách cập nhật
            for u in updates:
                lc = existing_codes.get(u.lesson_code_id) if u.lesson_code_id else None

                # --- ❌ XÓA: con trước, cha sau (tránh lỗi NULL constraint)
                if u.type == "delete" and lc:
                    await self.db.execute(
                        delete(LessonCodeFiles).where(
                            LessonCodeFiles.lesson_code_id == lc.id
                        )
                    )
                    await self.db.execute(
                        delete(LessonCodeTestcases).where(
                            LessonCodeTestcases.lesson_code_id == lc.id
                        )
                    )
                    await self.db.delete(lc)
                    logger.info(f"🗑️ Đã xóa bài code {lc.id}")
                    continue

                # --- 🆕 TẠO MỚI
                if not lc:
                    lc = LessonCodes(
                        id=uuid.uuid4(),
                        lesson_id=lesson_id,
                        title=u.title,
                        description=u.description,
                        difficulty=u.difficulty,
                        language_id=u.language_id,
                        time_limit=u.time_limit,
                        memory_limit=u.memory_limit,
                        created_at=get_now(),
                        updated_at=get_now(),
                    )
                    self.db.add(lc)
                    await self.db.flush()
                    logger.info(f"🆕 Tạo bài code mới {lc.id}")

                # --- ✏️ CẬP NHẬT
                else:
                    lc.title = u.title or lc.title
                    lc.description = u.description or lc.description
                    lc.difficulty = u.difficulty or lc.difficulty
                    lc.language_id = u.language_id or lc.language_id
                    lc.time_limit = u.time_limit or lc.time_limit
                    lc.memory_limit = u.memory_limit or lc.memory_limit
                    lc.updated_at = get_now()
                    await self.db.flush()

                # 4️⃣ FILES
                q_files = await self.db.scalars(
                    select(LessonCodeFiles).where(
                        LessonCodeFiles.lesson_code_id == lc.id
                    )
                )
                files_map = {str(f.id): f for f in q_files.all()}

                for f in u.files or []:
                    fid = str(f.id) if f.id else None

                    # ❌ Xóa file
                    if f.type == "delete" and fid and fid in files_map:
                        await self.db.delete(files_map[fid])
                        continue

                    # ✏️ Cập nhật file
                    if f.type == "update" and fid and fid in files_map:
                        file_obj = files_map[fid]
                        file_obj.filename = f.filename or file_obj.filename
                        file_obj.content = f.content or file_obj.content
                        file_obj.role = f.role or file_obj.role
                        file_obj.is_main = (
                            f.is_main if f.is_main is not None else file_obj.is_main
                        )
                        file_obj.updated_at = get_now()
                        continue

                    # 🆕 Thêm file mới
                    if not fid or f.type == "create":
                        new_file = LessonCodeFiles(
                            id=uuid.uuid4(),
                            lesson_code_id=lc.id,
                            filename=f.filename,
                            content=f.content,
                            role=f.role,
                            is_main=f.is_main or False,
                            is_pass=(f.role == "starter"),
                            created_at=get_now(),
                            updated_at=get_now(),
                        )
                        self.db.add(new_file)

                await self.db.flush()

                # 5️⃣ TESTCASES
                q_tests = await self.db.scalars(
                    select(LessonCodeTestcases).where(
                        LessonCodeTestcases.lesson_code_id == lc.id
                    )
                )
                tests_map = {str(t.id): t for t in q_tests.all()}

                for t in u.testcases or []:
                    tid = str(t.id) if t.id else None

                    # ❌ Xóa test
                    if t.type == "delete" and tid and tid in tests_map:
                        await self.db.delete(tests_map[tid])
                        continue

                    # ✏️ Cập nhật test
                    if t.type == "update" and tid and tid in tests_map:
                        test_obj = tests_map[tid]
                        test_obj.input = t.input or test_obj.input
                        test_obj.expected_output = (
                            t.expected_output or test_obj.expected_output
                        )
                        test_obj.is_sample = (
                            t.is_sample
                            if t.is_sample is not None
                            else test_obj.is_sample
                        )
                        test_obj.order_index = t.order_index or test_obj.order_index
                        continue

                    # 🆕 Thêm test mới
                    if not tid or t.type == "create":
                        new_test = LessonCodeTestcases(
                            id=uuid.uuid4(),
                            lesson_code_id=lc.id,
                            input=t.input,
                            expected_output=t.expected_output,
                            is_sample=t.is_sample or False,
                            order_index=t.order_index or 0,
                            created_at=get_now(),
                        )
                        self.db.add(new_test)

                await self.db.flush()

            # ✅ 6️⃣ Commit toàn bộ
            await self.db.commit()
            logger.info(
                f"✅ Đã xử lý {len(updates)} bài code trong bài học {lesson_id}"
            )
            return {"message": f"✅ Đã xử lý {len(updates)} bài code trong bài học."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Lỗi khi cập nhật bài code: {e}")
            raise HTTPException(500, f"Lỗi khi cập nhật bài code: {e}")

    @staticmethod
    async def _process_embedding_background(note_id: uuid.UUID):

        async with AsyncSessionLocal() as db:
            try:
                note = await db.scalar(
                    select(LessonNotes).where(LessonNotes.id == note_id)
                )
                if not note or not note.content.strip():
                    return

                embedding_service = await get_embedding_service()
                vector = await embedding_service.embed_google_normalized(note.content)

                note.embedding = vector
                note.created_at = get_now()
                await db.commit()

                print(f"✅ Đã nhúng embedding cho note {note_id}")
            except Exception as e:
                await db.rollback()
                print(f"❌ Lỗi khi nhúng embedding note {note_id}: {e}")

    async def create_note_async(
        self,
        lesson_id: uuid.UUID,
        user_id: uuid.UUID,
        time_seconds: int,
        content: str,
        background_tasks: BackgroundTasks,
    ):
        try:
            lesson = await self.db.scalar(
                select(Lessons).where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, f"Không tìm thấy bài học {lesson_id}")

            # 2️⃣ Tạo ghi chú
            new_note = LessonNotes(
                id=uuid.uuid4(),
                lesson_id=lesson_id,
                user_id=user_id,
                time_seconds=time_seconds,
                content=content.strip(),
                created_at=get_now(),
            )

            self.db.add(new_note)
            await self.db.commit()
            await self.db.refresh(new_note)

            # 3️⃣ Gọi nền nhúng embedding (async)
            background_tasks.add_task(
                LessonService._process_embedding_background, new_note.id
            )

            return {
                "message": "Tạo ghi chú thành công",
                "id": new_note.id,
                "status": "embedding_processing",
            }

        except HTTPException:
            raise
        except Exception:
            await self.db.rollback()


    # ==========================================================
    # 🔊 FLASHCARD & TTS (9ROUTER + R2 CACHE)
    # ==========================================================
    async def preview_flashcard_tts_async(self, schema: FlashcardTTSPreviewSchema):
        from app.services.shares.tts_service import get_tts_service

        tts = get_tts_service()
        return await tts.synthesize_to_r2(
            schema.text,
            lang_code=schema.lang_code,
            voice_id=schema.voice_id,
        )

    async def get_flashcards_by_lesson_async(
        self, lesson_id: uuid.UUID, lecturer_id: uuid.UUID
    ):
        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section).selectinload(CourseSections.course),
                selectinload(Lessons.lesson_flashcards),
            )
            .where(Lessons.id == lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền truy cập bài học này")

        cards = sorted(
            lesson.lesson_flashcards or [],
            key=lambda item: (item.position or 0),
        )
        return [
            {
                "id": str(c.id),
                "front_text": c.front_text,
                "back_text": c.back_text,
                "phonetic": c.phonetic or "",
                "part_of_speech": c.part_of_speech or "",
                "example_sentence": c.example_sentence or "",
                "example_translation": c.example_translation or "",
                "hint": c.hint or "",
                "lang_code": c.lang_code or "en-US",
                "voice_id": c.voice_id or "",
                "audio_url": c.audio_url or "",
                "example_audio_url": c.example_audio_url or "",
                "difficulty_level": c.difficulty_level or 1,
                "position": c.position or 0,
            }
            for c in cards
        ]

    async def create_flashcards_bulk_async(
        self, lecturer_id: uuid.UUID, schema: LessonFlashcardBulkCreate
    ):
        from app.services.shares.tts_service import (
            get_tts_service,
            resolve_tts_voice,
        )

        lesson = await self.db.scalar(
            select(Lessons)
            .options(selectinload(Lessons.section).selectinload(CourseSections.course))
            .where(Lessons.id == schema.lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền chỉnh sửa bài học này")

        tts = get_tts_service()
        sem = asyncio.Semaphore(4)

        async def _prepare_card(idx: int, item):
            resolved_lang, resolved_voice = resolve_tts_voice(
                item.lang_code, item.voice_id
            )
            audio_url = (item.audio_url or "").strip() or None
            example_audio_url = (item.example_audio_url or "").strip() or None

            if schema.auto_generate_audio:
                if not audio_url and item.front_text.strip():
                    async with sem:
                        try:
                            res = await tts.synthesize_to_r2(
                                item.front_text.strip(),
                                lang_code=resolved_lang,
                                voice_id=resolved_voice,
                            )
                            audio_url = res.get("audio_url") or None
                        except Exception as exc:
                            logger.warning(
                                "Bỏ qua sinh audio mặt trước thẻ #{}: {}", idx, exc
                            )
                if (
                    not example_audio_url
                    and item.example_sentence
                    and item.example_sentence.strip()
                ):
                    async with sem:
                        try:
                            res = await tts.synthesize_to_r2(
                                item.example_sentence.strip(),
                                lang_code=resolved_lang,
                                voice_id=resolved_voice,
                            )
                            example_audio_url = res.get("audio_url") or None
                        except Exception as exc:
                            logger.warning(
                                "Bỏ qua sinh audio ví dụ thẻ #{}: {}", idx, exc
                            )

            return {
                "lesson_id": lesson.id,
                "section_id": schema.section_id or lesson.section_id,
                "course_id": schema.course_id or (course.id if course else None),
                "front_text": item.front_text.strip(),
                "back_text": item.back_text.strip(),
                "phonetic": (item.phonetic or "").strip() or None,
                "part_of_speech": (item.part_of_speech or "").strip() or None,
                "example_sentence": (item.example_sentence or "").strip() or None,
                "example_translation": (item.example_translation or "").strip() or None,
                "hint": (item.hint or "").strip() or None,
                "lang_code": resolved_lang,
                "voice_id": resolved_voice,
                "audio_url": audio_url,
                "example_audio_url": example_audio_url,
                "difficulty_level": item.difficulty_level or 1,
                "position": idx,
                "created_by": schema.created_by or "lecturer",
            }

        prepared = await asyncio.gather(
            *[_prepare_card(idx, item) for idx, item in enumerate(schema.flashcards)]
        )

        # Xóa bộ thẻ cũ của bài học rồi ghi bộ mới
        await self.db.execute(
            delete(LessonFlashcards).where(LessonFlashcards.lesson_id == lesson.id)
        )
        now_dt = await to_utc_naive(get_now())
        created_rows = []
        for row_data in prepared:
            row = LessonFlashcards(**row_data, created_at=now_dt, updated_at=now_dt)
            self.db.add(row)
            created_rows.append(row)

        await self.db.commit()
        return {
            "message": f"Đã lưu {len(created_rows)} thẻ Flashcard kèm âm thanh chuẩn.",
            "total": len(created_rows),
            "lesson_id": str(lesson.id),
        }


    # ==========================================================
    # 🎧 LISTENING DIALOGUE STUDIO (9ROUTER TTS + FFMPEG + R2)
    # ==========================================================
    async def render_listening_audio_async(self, schema: ListeningRenderAudioSchema):
        from app.services.shares.tts_service import get_tts_service

        tts = get_tts_service()
        return await tts.synthesize_dialogue_to_r2(
            speakers=[s.model_dump() for s in schema.speakers],
            script_lines=[l.model_dump() for l in schema.script_lines],
            lang_code=schema.lang_code,
            pause_ms=schema.pause_ms,
        )

    async def get_listening_by_lesson_async(
        self, lesson_id: uuid.UUID, lecturer_id: uuid.UUID
    ):
        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section).selectinload(CourseSections.course),
                selectinload(Lessons.lesson_listening),
                selectinload(Lessons.lesson_quizzes).selectinload(
                    LessonQuizzes.lesson_quiz_options
                ),
            )
            .where(Lessons.id == lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền truy cập bài học này")

        row = lesson.lesson_listening
        quizzes = [
            {
                "id": str(q.id),
                "question": q.question,
                "explanation": q.explanation or "",
                "difficulty_level": q.difficulty_level or 1,
                "options": [
                    {
                        "id": str(opt.id),
                        "text": opt.text_,
                        "is_correct": bool(opt.is_correct),
                        "feedback": opt.feedback or "",
                        "position": opt.position or 0,
                    }
                    for opt in sorted(
                        q.lesson_quiz_options or [],
                        key=lambda o: (o.position or 0),
                    )
                ],
            }
            for q in (lesson.lesson_quizzes or [])
        ]

        return {
            "lesson_id": str(lesson.id),
            "lang_code": row.lang_code if row else "en-GB",
            "scenario": (row.scenario or "") if row else "",
            "speakers": (row.speakers or []) if row else [],
            "script_lines": (row.script_lines or []) if row else [],
            "audio_url": (row.audio_url or "") if row else "",
            "duration_seconds": (row.duration_seconds or 0) if row else 0,
            "max_plays": (row.max_plays or 0) if row else 0,
            "show_transcript_before_submit": bool(
                row.show_transcript_before_submit
            )
            if row
            else False,
            "pass_percent": (row.pass_percent or 70) if row else 70,
            "quizzes": quizzes,
        }

    async def save_lesson_listening_async(
        self, lecturer_id: uuid.UUID, schema: LessonListeningSaveSchema
    ):
        from app.services.shares.tts_service import get_tts_service

        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section).selectinload(CourseSections.course),
                selectinload(Lessons.lesson_listening),
            )
            .where(Lessons.id == schema.lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền chỉnh sửa bài học này")

        speakers_data = [s.model_dump() for s in schema.speakers]
        script_data = [l.model_dump() for l in schema.script_lines]
        audio_url = (schema.audio_url or "").strip() or None
        duration_seconds = float(schema.duration_seconds or 0)

        if schema.auto_render_audio and not audio_url:
            tts = get_tts_service()
            rendered = await tts.synthesize_dialogue_to_r2(
                speakers=speakers_data,
                script_lines=script_data,
                lang_code=schema.lang_code,
            )
            audio_url = rendered.get("audio_url") or None
            duration_seconds = float(rendered.get("duration_seconds") or 0)
            script_data = rendered.get("script_lines") or script_data

        now_dt = await to_utc_naive(get_now())
        row = lesson.lesson_listening
        if row is None:
            row = LessonListening(
                lesson_id=lesson.id,
                section_id=schema.section_id or lesson.section_id,
                course_id=schema.course_id or (course.id if course else None),
                lang_code=schema.lang_code,
                scenario=(schema.scenario or "").strip() or None,
                speakers=speakers_data,
                script_lines=script_data,
                audio_url=audio_url,
                duration_seconds=duration_seconds,
                max_plays=schema.max_plays,
                show_transcript_before_submit=schema.show_transcript_before_submit,
                pass_percent=schema.pass_percent,
                created_at=now_dt,
                updated_at=now_dt,
            )
            self.db.add(row)
        else:
            row.lang_code = schema.lang_code
            row.scenario = (schema.scenario or "").strip() or None
            row.speakers = speakers_data
            row.script_lines = script_data
            row.audio_url = audio_url
            row.duration_seconds = duration_seconds
            row.max_plays = schema.max_plays
            row.show_transcript_before_submit = schema.show_transcript_before_submit
            row.pass_percent = schema.pass_percent
            row.updated_at = now_dt

        # Lưu bộ câu hỏi nghe-hiểu vào lesson_quizzes
        await self.db.execute(
            delete(LessonQuizzes).where(LessonQuizzes.lesson_id == lesson.id)
        )
        for q_item in schema.quizzes or []:
            quiz_row = LessonQuizzes(
                lesson_id=lesson.id,
                section_id=schema.section_id or lesson.section_id,
                course_id=schema.course_id or (course.id if course else None),
                question=q_item.question.strip(),
                explanation=(q_item.explanation or "").strip(),
                difficulty_level=q_item.difficulty_level or 1,
                created_by="lecturer",
                created_at=now_dt,
            )
            self.db.add(quiz_row)
            await self.db.flush()
            for opt_idx, opt in enumerate(q_item.options or []):
                self.db.add(
                    LessonQuizOptions(
                        quiz_id=quiz_row.id,
                        text_=opt.text.strip(),
                        is_correct=bool(opt.is_correct),
                        feedback=(opt.feedback or "").strip(),
                        position=opt_idx,
                        created_at=now_dt,
                    )
                )

        await self.db.commit()
        return {
            "message": "Đã lưu bài học Luyện Nghe hội thoại thành công.",
            "lesson_id": str(lesson.id),
            "audio_url": audio_url or "",
            "duration_seconds": duration_seconds,
            "script_lines": script_data,
            "total_questions": len(schema.quizzes or []),
        }

    @staticmethod
    def _resolve_fill_blank_full_text(prompt_text: str, blanks: list[dict]) -> str:
        import re

        blank_map: dict[int, str] = {}
        for item in blanks or []:
            idx = int(item.get("index") or 0)
            answers = item.get("answers") or []
            if idx > 0 and answers:
                blank_map[idx] = str(answers[0]).strip()

        def _replace(match: re.Match) -> str:
            idx = int(match.group(1))
            return blank_map.get(idx, match.group(0))

        return re.sub(r"\{\{\s*(\d+)\s*\}\}", _replace, prompt_text or "").strip()

    async def render_fill_blank_audio_async(self, schema: FillBlankRenderAudioSchema):
        from app.services.shares.tts_service import get_tts_service

        blanks_data = [b.model_dump() for b in (schema.blanks or [])]
        full_text = self._resolve_fill_blank_full_text(schema.prompt_text, blanks_data)
        if not full_text:
            raise HTTPException(400, "Đoạn văn trống, không thể tạo giọng đọc.")
        tts = get_tts_service()
        res = await tts.synthesize_to_r2(
            text=full_text[:3000],
            lang_code=schema.lang_code,
            voice_id=schema.voice_id,
        )
        return {
            "audio_url": res.get("audio_url") or "",
            "voice_id": res.get("voice_id") or schema.voice_id or "",
            "lang_code": res.get("lang_code") or schema.lang_code,
        }

    async def get_fill_blank_by_lesson_async(
        self, lesson_id: uuid.UUID, lecturer_id: uuid.UUID
    ):
        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section).selectinload(CourseSections.course),
                selectinload(Lessons.lesson_fill_blank),
            )
            .where(Lessons.id == lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền truy cập bài học này")

        row = lesson.lesson_fill_blank
        return {
            "lesson_id": str(lesson.id),
            "lang_code": row.lang_code if row else "en-GB",
            "mode": row.mode if row else "typing",
            "prompt_text": (row.prompt_text or "") if row else "",
            "translation": (row.translation or "") if row else "",
            "blanks": (row.blanks or []) if row else [],
            "distractors": (row.distractors or []) if row else [],
            "voice_id": (row.voice_id or "") if row else "",
            "audio_url": (row.audio_url or "") if row else "",
            "duration_seconds": float(row.duration_seconds or 0) if row else 0,
            "case_sensitive": bool(row.case_sensitive) if row else False,
            "allow_hint": bool(row.allow_hint) if row else True,
            "pass_percent": int(row.pass_percent or 70) if row else 70,
        }

    async def save_lesson_fill_blank_async(
        self, lecturer_id: uuid.UUID, schema: LessonFillBlankSaveSchema
    ):
        from app.services.shares.tts_service import get_tts_service

        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section).selectinload(CourseSections.course),
                selectinload(Lessons.lesson_fill_blank),
            )
            .where(Lessons.id == schema.lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền chỉnh sửa bài học này")

        blanks_data = []
        for b in sorted(schema.blanks, key=lambda x: x.index):
            cleaned_answers = [a.strip() for a in b.answers if a and a.strip()]
            if not cleaned_answers:
                continue
            blanks_data.append(
                {
                    "id": b.id,
                    "index": b.index,
                    "answers": cleaned_answers,
                    "hint": (b.hint or "").strip(),
                    "explanation": (b.explanation or "").strip(),
                    "part_of_speech": (b.part_of_speech or "").strip(),
                }
            )
        if not blanks_data:
            raise HTTPException(400, "Cần ít nhất 1 chỗ trống có đáp án hợp lệ.")

        distractors = [d.strip() for d in (schema.distractors or []) if d and d.strip()]
        audio_url = (schema.audio_url or "").strip() or None
        voice_id = (schema.voice_id or "").strip() or None
        duration_seconds = float(schema.duration_seconds or 0)

        if (schema.auto_render_audio or schema.mode == "dictation") and not audio_url:
            full_text = self._resolve_fill_blank_full_text(
                schema.prompt_text, blanks_data
            )
            if full_text:
                tts = get_tts_service()
                rendered = await tts.synthesize_to_r2(
                    text=full_text[:3000],
                    lang_code=schema.lang_code,
                    voice_id=voice_id,
                )
                audio_url = rendered.get("audio_url") or None
                voice_id = rendered.get("voice_id") or voice_id

        now_dt = await to_utc_naive(get_now())
        row = lesson.lesson_fill_blank
        if row is None:
            row = LessonFillBlanks(
                lesson_id=lesson.id,
                section_id=schema.section_id or lesson.section_id,
                course_id=schema.course_id or (course.id if course else None),
                lang_code=schema.lang_code,
                mode=schema.mode,
                prompt_text=schema.prompt_text.strip(),
                translation=(schema.translation or "").strip() or None,
                blanks=blanks_data,
                distractors=distractors,
                voice_id=voice_id,
                audio_url=audio_url,
                duration_seconds=duration_seconds,
                case_sensitive=schema.case_sensitive,
                allow_hint=schema.allow_hint,
                pass_percent=schema.pass_percent,
                created_at=now_dt,
                updated_at=now_dt,
            )
            self.db.add(row)
        else:
            row.lang_code = schema.lang_code
            row.mode = schema.mode
            row.prompt_text = schema.prompt_text.strip()
            row.translation = (schema.translation or "").strip() or None
            row.blanks = blanks_data
            row.distractors = distractors
            row.voice_id = voice_id
            row.audio_url = audio_url
            row.duration_seconds = duration_seconds
            row.case_sensitive = schema.case_sensitive
            row.allow_hint = schema.allow_hint
            row.pass_percent = schema.pass_percent
            row.updated_at = now_dt

        await self.db.commit()
        return {
            "message": "Đã lưu bài học Điền từ vào chỗ trống thành công.",
            "lesson_id": str(lesson.id),
            "audio_url": audio_url or "",
            "voice_id": voice_id or "",
            "total_blanks": len(blanks_data),
        }

    async def get_speaking_by_lesson_async(
        self, lesson_id: uuid.UUID, lecturer_id: uuid.UUID
    ):
        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section).selectinload(CourseSections.course),
                selectinload(Lessons.lesson_speaking),
            )
            .where(Lessons.id == lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền truy cập bài học này")

        row = lesson.lesson_speaking
        return {
            "lesson_id": str(lesson.id),
            "lang_code": row.lang_code if row else "en-GB",
            "level": row.level if row else "B1",
            "scenario": (row.scenario or "") if row else "",
            "student_role": (row.student_role or "") if row else "",
            "ai_persona": (row.ai_persona or {}) if row else {},
            "missions": (row.missions or []) if row else [],
            "sample_phrases": (row.sample_phrases or []) if row else [],
            "max_turns": int(row.max_turns or 8) if row else 8,
            "pass_percent": int(row.pass_percent or 70) if row else 70,
            "allow_translation": bool(row.allow_translation) if row else True,
            "allow_suggestion": bool(row.allow_suggestion) if row else True,
        }

    async def save_lesson_speaking_async(
        self, lecturer_id: uuid.UUID, schema: LessonSpeakingSaveSchema
    ):
        from app.services.shares.tts_service import get_tts_service

        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section).selectinload(CourseSections.course),
                selectinload(Lessons.lesson_speaking),
            )
            .where(Lessons.id == schema.lesson_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học")
        course = lesson.section.course if lesson.section else None
        if not course or course.instructor_id != lecturer_id:
            raise HTTPException(403, "Bạn không có quyền chỉnh sửa bài học này")

        persona_data = schema.ai_persona.model_dump()
        opening_line = (persona_data.get("opening_line") or "").strip()
        opening_audio_url = (persona_data.get("opening_audio_url") or "").strip() or None
        voice_id = (persona_data.get("voice_id") or "").strip() or None

        if schema.auto_render_opening_audio and opening_line and not opening_audio_url:
            try:
                tts = get_tts_service()
                rendered = await tts.synthesize_to_r2(
                    text=opening_line[:1000],
                    lang_code=schema.lang_code,
                    voice_id=voice_id,
                )
                opening_audio_url = rendered.get("audio_url") or None
                voice_id = rendered.get("voice_id") or voice_id
            except Exception as exc:
                logger.warning(f"Không thể tạo audio câu mở màn speaking: {exc}")

        persona_data["opening_audio_url"] = opening_audio_url or ""
        persona_data["voice_id"] = voice_id or ""

        missions_data = [
            {
                "id": m.id,
                "title": m.title.strip(),
                "hint": (m.hint or "").strip(),
            }
            for m in schema.missions
            if m.title.strip()
        ]
        if not missions_data:
            raise HTTPException(400, "Cần ít nhất 1 nhiệm vụ giao tiếp để qua bài.")

        phrases_data = [
            {
                "phrase": p.phrase.strip(),
                "translation": (p.translation or "").strip(),
            }
            for p in (schema.sample_phrases or [])
            if p.phrase.strip()
        ]

        now_dt = await to_utc_naive(get_now())
        row = lesson.lesson_speaking
        if row is None:
            row = LessonSpeaking(
                lesson_id=lesson.id,
                section_id=schema.section_id or lesson.section_id,
                course_id=schema.course_id or (course.id if course else None),
                lang_code=schema.lang_code,
                level=schema.level,
                scenario=schema.scenario.strip(),
                student_role=schema.student_role.strip(),
                ai_persona=persona_data,
                missions=missions_data,
                sample_phrases=phrases_data,
                max_turns=schema.max_turns,
                pass_percent=schema.pass_percent,
                allow_translation=schema.allow_translation,
                allow_suggestion=schema.allow_suggestion,
                created_at=now_dt,
                updated_at=now_dt,
            )
            self.db.add(row)
        else:
            row.lang_code = schema.lang_code
            row.level = schema.level
            row.scenario = schema.scenario.strip()
            row.student_role = schema.student_role.strip()
            row.ai_persona = persona_data
            row.missions = missions_data
            row.sample_phrases = phrases_data
            row.max_turns = schema.max_turns
            row.pass_percent = schema.pass_percent
            row.allow_translation = schema.allow_translation
            row.allow_suggestion = schema.allow_suggestion
            row.updated_at = now_dt

        await self.db.commit()
        return {
            "message": "Đã lưu bài học Giao tiếp & Đóng vai AI thành công.",
            "lesson_id": str(lesson.id),
            "opening_audio_url": opening_audio_url or "",
            "total_missions": len(missions_data),
        }
