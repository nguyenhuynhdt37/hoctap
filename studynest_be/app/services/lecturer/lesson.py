# app/services/lecturer/lesson_service.py
import asyncio
import io
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
    LessonNotes,
    LessonQuizOptions,
    LessonQuizzes,
    LessonResources,
    Lessons,
    LessonVideos,
    ResourceChunks,
    SupportedLanguages,
    User,
)
from app.db.sesson import AsyncSessionLocal, get_session
from app.libs.formats.datetime import now as get_now, to_utc_naive
from app.schemas.lecturer.lesson import (
    CreateLesson,
    LessonCodeCreate,
    LessonCodeUpdateBatch,
    LessonCodeVerify,
    LessonQuizBulkCreate,
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
from app.services.shares.OCR_service import OCRService, get_ocr_service
from app.services.shares.transcript_service import YoutubeTranscriptService
from app.services.shares.youtube_uploader import (
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
            duration_seconds = await self.youtube.get_duration(video_id, False)
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

            background_tasks.add_task(
                LessonService.process_video_description_async,
                lesson_id,
                video_id,
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

            # 3️⃣ Copy file vào RAM (giữ lại sau khi response kết thúc)
            file_name = video.filename or "Không đọc được file name"
            content_type = video.content_type
            file_bytes = await video.read()
            task_id = str(lesson_id)

            # 4️⃣ Tạo background task thật bằng asyncio
            asyncio.create_task(
                LessonService.upload_video_background_in_memory(
                    lesson_id,
                    file_bytes,
                    file_name,
                    content_type,
                    task_id,
                    f"{course.title} - {lesson.title}",
                    f"Khóa học {course.title} | Bài học: {lesson.title} | mô tả {lesson.description}",
                )
            )

            return {
                "message": "🚀 Video đang được tải nền lên YouTube.",
                "lesson_id": task_id,
                "provider": "youtube",
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"❌ Lỗi upload video: {e}")

    @staticmethod
    async def upload_video_background_in_memory(
        lesson_id: uuid.UUID,
        file_bytes: bytes,
        filename: str,
        content_type: str | None,
        task_id: str,
        title: str,
        description: str = "",
    ):
        youtube = YouTubeAsyncService()
        headers = Headers({"content-type": content_type or "video/mp4"})

        mem_file = UploadFile_starlette(
            file=io.BytesIO(file_bytes),
            filename=filename,
            headers=headers,
        )

        async with AsyncSessionLocal() as db:
            try:
                logger.info(
                    f"🚀 Bắt đầu upload nền video: {filename} ({len(file_bytes)/1e6:.2f} MB)"
                )

                # 1️⃣ Upload lên YouTube (ẩn - unlisted)
                result: dict[str, Any] = await youtube.upload_video_with_progress(
                    file=mem_file,
                    task_id=task_id,
                    title=title,
                    description=description,
                )

                video_id = str(result.get("video_id") or "")
                video_url = str(result.get("video_url") or "")
                if not video_id:
                    raise RuntimeError(
                        f"❌ Upload thất bại, không nhận được video_id ({result})"
                    )

                logger.info(f"✅ Upload hoàn tất: {video_url}")

                # 2️⃣ Lấy độ dài video (chờ sẵn sàng)
                duration = await youtube.get_duration(video_id, wait_first=True)
                logger.info(f"⏱️ Độ dài video: {duration}s")

                # 3️⃣ Lưu LessonVideos vào DB
                lesson_video = LessonVideos(
                    lesson_id=lesson_id,
                    video_url=video_url,
                    file_id=video_id,
                    duration=duration,
                    source_type="youtube_upload",
                    transcript="",
                )
                db.add(lesson_video)
                await db.commit()
                logger.info(f"💾 Đã lưu LessonVideos cho bài học {lesson_id}")

                # 4️⃣ Chờ YouTube xử lý ổn định trước khi gọi AI
                delay_seconds = 300  # 👈 300 giây
                logger.info(f"⏳ Chờ {delay_seconds}s để YouTube hoàn tất xử lý...")
                await asyncio.sleep(delay_seconds)

                # 5️⃣ Gọi xử lý phụ đề/mô tả (AI)
                try:
                    await LessonService.process_video_description_async(
                        lesson_id, video_id
                    )
                    logger.info(f"🧠 Đã xử lý transcript/mô tả cho video {video_id}")
                except Exception as sub_e:
                    logger.warning(f"⚠️ Không thể xử lý transcript tự động: {sub_e}")

            except Exception as e:
                await db.rollback()
                logger.error(f"❌ Lỗi upload nền: {e}", exc_info=True)
            finally:
                mem_file.file.close()

    @staticmethod
    async def process_video_description_async(
        lesson_id: uuid.UUID,
        video_id: str,
        embedding: EmbeddingService | None = None,
        transcript_service: YoutubeTranscriptService | None = None,
    ):
        async with AsyncSessionLocal() as db:
            try:
                # Lấy embedding service nếu chưa có
                if embedding is None:
                    embedding = await get_embedding_service()
                
                # Lấy transcript service nếu chưa có
                if transcript_service is None:
                    transcript_service = YoutubeTranscriptService()

                # 🧠 1. Trích ngữ cảnh từ video
                description = await transcript_service.extract_video_context(video_id)
                print("🧠 Gemini mô tả:", description[:200], "...")

                total_tokens = embedding.estimate_tokens(description)
                lesson_embedding = await embedding.embed_google_normalized(description)
                chunks = embedding.split_text_by_tokens(
                    description, chunk_size=1000, overlap=100
                )

                await db.execute(
                    update(Lessons)
                    .where(Lessons.id == lesson_id)
                    .values(
                        embedding=lesson_embedding,
                        content_tokens=total_tokens,
                    )
                )
                await db.execute(
                    update(LessonVideos)
                    .where(LessonVideos.lesson_id == lesson_id)
                    .values(transcript=description)
                )

                lesson_chunks_payload = []

                lesson_chunks_payload = []
                for idx, chunk_text in enumerate(chunks):
                    chunk_embed = await embedding.embed_google_normalized(chunk_text)
                    lesson_chunks_payload.append(
                        LessonChunks(
                            lesson_id=lesson_id,
                            chunk_index=idx,
                            text_=chunk_text,
                            embedding=chunk_embed,
                            token_count=embedding.estimate_tokens(chunk_text),
                        )
                    )

                db.add_all(lesson_chunks_payload)
                await db.commit()
                print(
                    f"✅ [{lesson_id}] xử lý xong ({len(chunks)} chunks, {total_tokens} tokens)"
                )

            except Exception as e:
                await db.rollback()
                import traceback

                traceback.print_exc()
                print(f"❌ Lỗi khi xử lý bài học {lesson_id}: {e}")

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
        resource_id: str, content: Optional[bytes], filename: Optional[str]
    ):
        from app.db.models.database import LessonResources

        async with AsyncSessionLocal() as db:
            try:
                resource = await db.scalar(
                    select(LessonResources).where(
                        LessonResources.id == uuid.UUID(resource_id)
                    )
                )
                if not resource:
                    print(f"⚠️ Không tìm thấy resource {resource_id}")
                    return

                # =====================================
                # 📄 Đọc nội dung file hoặc OCR
                # =====================================
                text_content = ""
                if content and filename:
                    ocr = get_ocr_service()
                    if filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
                        text_content = ocr.extract_text_from_pdf(content)
                else:
                    resource.embed_status = "skipped"
                    await db.commit()
                    return

                if not text_content.strip():
                    resource.embed_status = "empty"
                    await db.commit()
                    return

                # =====================================
                # ✂️ Tách chunk + nhúng embedding
                # =====================================
                embedding = await get_embedding_service()
                chunks = embedding.split_text_by_tokens(
                    text_content, chunk_size=1500, overlap=150
                )

                for idx, chunk_text in enumerate(chunks):
                    vector = await embedding.embed_google_normalized(chunk_text)
                    chunk = ResourceChunks(
                        id=uuid.uuid4(),
                        resource_id=resource.id,
                        lesson_id=resource.lesson_id,
                        chunk_index=idx,
                        chunk_type="text",
                        content=chunk_text,
                        token_count=len(chunk_text.split()),
                        embedding=vector,
                        created_at=get_now(),
                    )
                    db.add(chunk)

                resource.embed_status = "done"
                resource.updated_at = get_now()
                await db.commit()

                print(f"✅ [{resource_id}] Đã nhúng embedding thành công")

            except Exception as e:
                await db.rollback()
                print(f"❌ Lỗi embedding resource {resource_id}: {e}")
                # Gắn cờ lỗi cho DB
                try:
                    await db.execute(
                        update(LessonResources)
                        .where(LessonResources.id == uuid.UUID(resource_id))
                        .values(embed_status="error")
                    )
                    await db.commit()
                except Exception:
                    pass

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
            run = result.get("run", {}) or {}

            stdout = (run.get("stdout") or "").strip()
            stderr = (run.get("stderr") or "").strip()
            exit_code = run.get("code", 0)
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
