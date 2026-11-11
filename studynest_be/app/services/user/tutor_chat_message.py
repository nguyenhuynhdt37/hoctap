# app/services/user/tutor_chat_message.py
"""
TutorChatMessageService - Xử lý chat messages.

Đầu vào:
- lesson_id: ID bài học
- message: Nội dung tin nhắn

Truy xuất tài liệu theo phạm vi bài học và giữ lịch sử hội thoại.
"""

import uuid
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, UploadFile
from loguru import logger
from sqlalchemy import and_, desc, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.embedding import (
    EmbeddingService,
    get_embedding_service,
)
from app.db.models.database import (
    TutorChatImages,
    TutorChatMessages,
)
from app.db.sesson import get_session
from app.schemas.chat.user.tutor_chat import ChatImageSchema
from app.services.shares.file_storage import (
    FileStorageService,
    get_file_storage_service,
)
from app.services.shares.OCR_service import OCRService, get_ocr_service
from app.services.user.message_classifier import (
    MessageClassifierService,
    get_message_classifier_service,
    is_casual_message,
)
from app.services.user.tutor_chat import TutorChatService, get_tutor_chat_service


class TutorChatMessageService:
    """Service xử lý chat messages."""

    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        thread_service: TutorChatService = Depends(get_tutor_chat_service),
        classifier_service: MessageClassifierService = Depends(
            get_message_classifier_service
        ),
        storage_service: Optional[FileStorageService] = None,
        ocr_service: Optional[OCRService] = None,
        embedding_service: EmbeddingService = Depends(get_embedding_service),
    ):
        self.db = db
        self.thread_service = thread_service
        self.classifier_service = classifier_service
        self.storage_service = storage_service
        self.ocr_service = ocr_service
        self.embedding_service = embedding_service

    async def upload_and_ocr_images(
        self,
        user_id: uuid.UUID,
        files: List[UploadFile],
    ) -> List[Dict[str, Any]]:
        """
        Upload danh sách ảnh và OCR.
        Trả về list metadata để client gửi kèm message.
        """
        results = []
        # Plain text chat and message history do not require upload or OCR services.
        # Resolve these services only for an actual image upload.
        if self.storage_service is None:
            self.storage_service = get_file_storage_service()
        if self.ocr_service is None:
            self.ocr_service = get_ocr_service()
        for file in files:
            # Validate
            if not file.content_type.startswith("image/"):
                continue

            content = await file.read()
            file_size = len(content)
            filename = file.filename or "chat-image.png"

            # 1. Upload to R2
            upload_res = await self.storage_service.upload_file(
                path_parts=["tutor_chat", str(user_id)],
                file_name=filename,
                content=content,
                mime_type=file.content_type,
            )

            url = upload_res["url"]

            # 2. OCR
            try:
                ocr_text = self.ocr_service.extract_text_from_image(content)
            except Exception:
                ocr_text = ""

            results.append(
                {
                    "url": url,
                    "file_size": file_size,
                    "mime_type": file.content_type,
                    "ocr_text": ocr_text,
                    "storage_id": upload_res["id"],
                }
            )
        return results

    async def send_message(
        self,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
        message: str,
        thread_id: Optional[uuid.UUID] = None,
        images: Optional[List[ChatImageSchema]] = None,
        on_delta=None,
    ) -> Dict[str, Any]:
        """
        Gửi tin nhắn chat.

        Args:
            user_id: ID người dùng
            lesson_id: ID bài học
            message: Nội dung tin nhắn
            thread_id: ID thread (optional, nếu không có sẽ dùng active thread)
            images: List[ChatImageDTO] (Optional)

        Returns:
            {
                "user_message": {...},
                "assistant_message": {...},
                "thread": {...},
            }
        """
        # 1. Lấy hoặc tạo active thread
        if thread_id:
            # Verify thread belongs to user
            thread_data = await self.thread_service.get_thread_by_id(user_id, thread_id)
            if not thread_data:
                raise HTTPException(status_code=404, detail="Thread not found")
            if thread_data["lesson_id"] != str(lesson_id):
                raise HTTPException(status_code=400, detail="Thread does not belong to this lesson")
        else:
            # Lấy hoặc tạo active thread cho lesson
            result = await self.thread_service.get_or_create_active_thread(
                user_id=user_id,
                lesson_id=lesson_id,
            )
            thread_data = result["thread"]
            thread_id = uuid.UUID(thread_data["id"])

        lesson_info = await self.thread_service.validate_lesson_access(user_id, lesson_id)
        lesson, course = lesson_info["lesson"], lesson_info["course"]
        lesson_context = {
            "lesson_title": lesson.title,
            "course_title": course.title,
            "description": lesson.description or "",
            "outcomes": lesson.outcomes or [],
            "scope": thread_data.get("scope", "lesson"),
        }

        # Retain six turns, including OCR, without mixing different lesson threads.
        history_result = await self.db.execute(
            select(TutorChatMessages)
            .options(selectinload(TutorChatMessages.tutor_chat_images))
            .where(TutorChatMessages.thread_id == thread_id)
            .order_by(
                desc(TutorChatMessages.created_at),
                TutorChatMessages.role.asc(),  # Both messages can share a transaction timestamp.
                desc(TutorChatMessages.id),
            )
            .limit(12)
        )
        history_messages = history_result.scalars().all()
        # Reverse to chronological order for context
        history_messages = list(reversed(history_messages))

        # Process context for LLM/Preprocessing
        context = []
        msg_count = len(history_messages)
        for i, msg in enumerate(history_messages):
            # Combine content with OCR from images
            combined_content = msg.content
            if msg.tutor_chat_images:
                img_texts = [
                    f"[IMG {idx+1}] {img.ocr_text}"
                    for idx, img in enumerate(msg.tutor_chat_images)
                    if img.ocr_text
                ]
                if img_texts:
                    combined_content += "\n\n" + "\n Câu hỏi thêm từ ảnh: ".join(
                        img_texts
                    )

            # Mark last 2 messages as latest
            is_latest = i >= msg_count - 2
            context.append(
                {
                    "role": msg.role,
                    "content": combined_content,
                    "sources": msg.sources,  # Keep sources separate
                    "is_latest": is_latest,
                }
            )

        # 2. Save User Message to DB immediately
        user_msg = TutorChatMessages(
            thread_id=thread_id,
            user_id=user_id,
            role="user",
            content=message,
            sources=[],  # User messages typically have no sources
            # images=images  # TODO: Handle images properly if your model has this field
        )
        self.db.add(user_msg)
        await self.db.flush()  # Flush to get user_msg.id
        await self.db.refresh(user_msg)

        # 3. Save Images (if any)
        image_context = ""
        if images:
            image_context_parts = []
            for idx, img in enumerate(images, 1):
                # Save to DB
                chat_image = TutorChatImages(
                    message_id=user_msg.id,
                    user_id=user_id,
                    url=img.url,
                    file_size=img.file_size or 0,
                    mime_type=img.mime_type,
                    ocr_text=img.ocr_text or "",
                )
                self.db.add(chat_image)

                # Append to context
                if img.ocr_text:
                    image_context_parts.append(f"Hình ảnh {idx}: {img.ocr_text}")

            await self.db.flush()  # Save images

            if image_context_parts:
                image_context = "\nDanh sách câu hỏi từ hình ảnh:\n" + "\n".join(
                    image_context_parts
                )

        # 4. Combine with main message for AI processing
        full_message = message
        if image_context:
            full_message += f"\n\n{image_context}"

        # 5. Classify intent
        has_prev_context = bool(history_messages)

        # Format history for classifier (List[Dict])
        chat_history_dicts = [
            {"role": msg.role, "content": msg.content} for msg in history_messages
        ]

        classify_result = await self.classifier_service.classify_message(
            message=full_message,
            chat_history=chat_history_dicts,
            has_prev_context=has_prev_context,
        )
        mode = classify_result["mode"]

        # 6. Execute based on Mode
        sources = []

        if is_casual_message(full_message):
            mode = "NO_SEARCH"
        else:
            # Stored citations contain summaries, not the original lesson text.
            # Retrieve real passages again for follow-ups instead of reusing them.
            search_query = self._build_search_query(full_message, context, lesson.title, mode)
            mode = "SEARCH"
            sources = await self._rag_search(
                query=search_query,
                lesson_id=lesson_id,
                scope=lesson_context["scope"],
                user_id=user_id,
            )
        logger.info("Tutor retrieval lesson={} mode={} scope={} sources={}", lesson_id, mode, lesson_context["scope"], len(sources))

        # Build prompt và gọi LLM
        prompt = self._build_prompt(
            user_message=full_message,
            context=context,
            sources=sources,
            mode=mode,
            lesson_context=lesson_context,
        )

        # Gọi LLM
        if on_delta is None:
            llm_response = await self._call_llm(prompt)
        else:
            from app.core.chat_stream import partial_json_content
            from app.core.llm import LLMService

            llm_response = ""
            visible = ""
            async for chunk in LLMService().stream_model(
                prompt, mime_type="application/json", temperature=0.7, max_output_tokens=4000
            ):
                llm_response += chunk
                content = partial_json_content(llm_response)
                if content.startswith(visible) and len(content) > len(visible):
                    await on_delta(content[len(visible):])
                    visible = content

        # Parse JSON response
        import json

        llm_response = llm_response.strip()
        if llm_response.startswith("```") and llm_response.endswith("```"):
            llm_response = llm_response.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        try:
            result = json.loads(llm_response)
        except json.JSONDecodeError:
            if on_delta is not None:
                raise ValueError("Tutor returned incomplete JSON") from None
            # Fallback nếu LLM không trả đúng JSON
            result = {
                "title": "Câu hỏi mới",
                "content": llm_response,
                "sources_used": [],
            }

        if on_delta is not None and (
            not isinstance(result, dict) or not isinstance(result.get("content"), str)
            or not isinstance(result.get("sources_used", []), list)
        ):
            raise ValueError("Tutor returned an invalid response structure")

        # Chuẩn hóa kết quả
        bot_title = result.get("title", "Câu hỏi mới")
        bot_content = result.get("content", "")
        sources_used = self._ground_sources(result.get("sources_used", []), sources)

        # 5. Lưu tin nhắn của bot vào DB
        assistant_msg = TutorChatMessages(
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=bot_content,
            sources=sources_used,  # Lưu sources đã dùng
        )
        self.db.add(assistant_msg)
        await self.db.flush()
        await self.db.refresh(assistant_msg)

        # 6. Cập nhật title của thread (nếu chưa có hoặc là tin đầu tiên)
        if thread_data.get("title") in [None, "", "Cuộc trò chuyện mới"]:
            await self.thread_service.update_thread(
                user_id=user_id,
                thread_id=thread_id,
                title=bot_title[:100],  # Giới hạn 100 ký tự
            )

        # Commit transaction
        await self.db.commit()

        # Return câu trả lời theo format chuẩn của bảng TutorChatMessages
        return {
            "id": str(assistant_msg.id),
            "thread_id": str(assistant_msg.thread_id),
            "user_id": str(assistant_msg.user_id),
            "role": assistant_msg.role,
            "content": assistant_msg.content,
            "sources": assistant_msg.sources,
            "created_at": (
                assistant_msg.created_at.isoformat()
                if assistant_msg.created_at
                else None
            ),
            "images": [],  # Bot không có images
        }

    async def get_messages(
        self,
        user_id: uuid.UUID,
        thread_id: uuid.UUID,
        limit: int = 20,
        cursor_next: str = None,
    ) -> Dict[str, Any]:
        """
        Lấy danh sách tin nhắn của thread.
        Pagination: cursor-based (created_at).
        """
        from app.db.models.database import TutorChatMessages

        # 1. Base query
        stmt = (
            select(TutorChatMessages)
            .where(
                TutorChatMessages.thread_id == thread_id,
                TutorChatMessages.user_id == user_id,
            )
            .options(selectinload(TutorChatMessages.tutor_chat_images))
            .order_by(
                TutorChatMessages.created_at.desc(),
                TutorChatMessages.role.asc(),  # Assistant ('a') before User ('u') in DESC list
            )
        )

        # 2. Apply cursor
        if cursor_next:
            try:
                # cursor_next là ID của message cuối cùng lần trước
                # Ta cần tìm created_at của message đó để filter
                cursor_msg = await self.db.get(
                    TutorChatMessages, uuid.UUID(cursor_next)
                )
                if cursor_msg:
                    # Cursor condition for: created_at DESC, role ASC
                    # We want rows "after" the cursor in the sort order.
                    # Since created_at is DESC, "after" means smaller time.
                    # If times are equal, we check role (ASC).
                    # "After" in ASC means larger role.
                    stmt = stmt.where(
                        or_(
                            TutorChatMessages.created_at < cursor_msg.created_at,
                            and_(
                                TutorChatMessages.created_at == cursor_msg.created_at,
                                TutorChatMessages.role > cursor_msg.role,
                            ),
                        )
                    )
            except Exception:
                pass  # Invalid cursor, ignore

        # 3. Limit (lấy thừa 1 để check has_more)
        stmt = stmt.limit(limit + 1)

        # 4. Execute
        result = await self.db.execute(stmt)
        # Sử dụng unique() để tránh duplicates khi join (dù selectinload handle rồi nhưng unique() cho an toàn với scalars)
        messages = result.scalars().unique().all()

        # 5. Process pagination
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]
            next_cursor = str(messages[-1].id)
        else:
            if messages:
                next_cursor = str(messages[-1].id)
            else:
                next_cursor = None

        # 6. Format response
        results = []
        for msg in reversed(messages):
            results.append(
                {
                    "id": str(msg.id),
                    "thread_id": str(msg.thread_id),
                    "user_id": str(msg.user_id),
                    "role": msg.role,
                    "content": msg.content,
                    "sources": msg.sources,
                    "created_at": (
                        msg.created_at.isoformat() if msg.created_at else None
                    ),
                    "images": [
                        {
                            "id": str(img.id),
                            "url": img.url,
                            "file_size": img.file_size,
                            "mime_type": img.mime_type,
                            "ocr_text": img.ocr_text,
                            "created_at": (
                                img.created_at.isoformat() if img.created_at else None
                            ),
                        }
                        for img in msg.tutor_chat_images
                    ],
                }
            )

        return {
            "messages": results,
            "cursor_next": next_cursor if has_more else None,
            "has_more": has_more,
        }

    async def _rag_search(
        self,
        query: str,
        lesson_id: uuid.UUID,
        scope: str = "lesson",  # 'lesson' | 'section' | 'course'
        user_id: uuid.UUID = None,  # Để lấy code hiện tại của học viên
    ) -> List[Dict[str, Any]]:
        """
        Tìm kiếm tài liệu liên quan câu hỏi.
        - Video: Dùng embedding search
        - Quiz/Code: Lấy toàn bộ nội dung
        """
        if not query:
            return []

        results = []

        # 1. Check lesson type
        from app.db.models.database import LessonCodes, LessonQuizzes, Lessons

        lesson = await self.db.get(Lessons, lesson_id)
        if not lesson:
            return []

        lesson_type = lesson.lesson_type

        # 2. Xử lý theo loại lesson
        if lesson_type == "quiz":
            # Lấy toàn bộ quiz questions của lesson
            quizzes = await self.db.execute(
                select(LessonQuizzes)
                .options(selectinload(LessonQuizzes.lesson_quiz_options))
                .where(LessonQuizzes.lesson_id == lesson_id)
            )
            for q_idx, quiz in enumerate(quizzes.scalars().all(), 1):
                options_text = "\n".join(
                    [
                        f"  - {opt.text_} {'(Đáp án đúng)' if opt.is_correct else ''}"
                        for opt in quiz.lesson_quiz_options
                    ]
                )
                content = f"Câu {q_idx}: {quiz.question}\nĐáp án:\n{options_text}"
                if quiz.explanation:
                    content += f"\nGiải thích: {quiz.explanation}"

                results.append(
                    {
                        "source_type": "quiz",
                        "similarity": 1.0,  # Direct match
                        "chunk_id": str(quiz.id),
                        "lesson_id": str(lesson_id),
                        "lesson_title": lesson.title,
                        "chunk_index": q_idx,  # Dùng số câu làm chunk_index
                        "content": content,
                    }
                )

        elif lesson_type == "code":
            # Lấy toàn bộ code exercises của lesson

            codes = await self.db.execute(
                select(LessonCodes)
                .options(
                    selectinload(LessonCodes.lesson_code_files),
                    selectinload(LessonCodes.lesson_code_testcases),
                )
                .where(LessonCodes.lesson_id == lesson_id)
            )
            for code in codes.scalars().all():
                content = f"""=== BÀI TẬP LẬP TRÌNH ===
                Tiêu đề: {code.title}
                Mô tả: {code.description or 'Không có mô tả'}
                Độ khó: {code.difficulty}
                Giới hạn: {code.time_limit}s | Memory: {code.memory_limit // 1000000}MB

                """
                # Phân loại files theo role
                starter_files = [
                    f for f in code.lesson_code_files if f.role == "starter"
                ]
                solution_files = [
                    f for f in code.lesson_code_files if f.role == "solution"
                ]

                # Thêm starter code (code khung cho học viên)
                if starter_files:
                    content += "--- CODE KHỞI ĐẦU (Starter) ---\n"
                    content += "(Code mẫu học viên cần hoàn thiện)\n"
                    for f in starter_files:
                        main_mark = " [MAIN]" if f.is_main else ""
                        content += f"\n📄 File: {f.filename}{main_mark}\n```\n{f.content}\n```\n"

                # Thêm solution code (lời giải chuẩn)
                if solution_files:
                    content += "\n--- CODE MẪU (Solution) ---\n"
                    content += "(Đây là lời giải chuẩn của giảng viên)\n"
                    for f in solution_files:
                        main_mark = " [MAIN]" if f.is_main else ""
                        content += f"\n📄 File: {f.filename}{main_mark}\n```\n{f.content}\n```\n"

                # Thêm code hiện tại của học viên (nếu có)
                if user_id:
                    user_files = [
                        f
                        for f in code.lesson_code_files
                        if f.role == "user" and f.user_id == user_id
                    ]
                    if user_files:
                        content += "\n--- CODE HIỆN TẠI CỦA HỌC VIÊN ---\n"
                        content += "(Code học viên đang viết, có thể cần hỗ trợ)\n"
                        for f in user_files:
                            main_mark = " [MAIN]" if f.is_main else ""
                            status = "✅ PASS" if f.is_pass else "❌ CHƯA PASS"
                            content += f"\n📄 File: {f.filename}{main_mark} - {status}\n```\n{f.content}\n```\n"

                # Thêm testcases (chỉ sample cases)
                sample_cases = [tc for tc in code.lesson_code_testcases if tc.is_sample]
                hidden_cases = [
                    tc for tc in code.lesson_code_testcases if not tc.is_sample
                ]

                if sample_cases:
                    content += "\n--- TEST CASES MẪU ---\n"
                    for i, tc in enumerate(sample_cases, 1):
                        content += f"Test {i}:\n  Input: {tc.input}\n  Expected: {tc.expected_output}\n"

                if hidden_cases:
                    content += f"\n(+ {len(hidden_cases)} hidden test cases)\n"

                results.append(
                    {
                        "source_type": "code",
                        "similarity": 1.0,
                        "chunk_id": str(code.id),
                        "lesson_id": str(lesson_id),
                        "lesson_title": lesson.title,
                        "chunk_index": 0,
                        "content": content,
                    }
                )

        else:
            # Video/Article: Dùng embedding search như cũ
            embedding = await self.embedding_service.embed_query(query)
            embedding_str = str(embedding)

            stmt = text(
                """
                SELECT * FROM public.rag_search_scope(:lesson_id, :scope, :embedding)
            """
            )

            result = await self.db.execute(
                stmt,
                {"lesson_id": lesson_id, "scope": scope, "embedding": embedding_str},
            )

            for row in result.fetchall():
                item = {
                    "source_type": row.source_type,
                    "similarity": row.similarity,
                    "chunk_id": str(row.chunk_id) if row.chunk_id else None,
                    "lesson_id": str(row.lesson_id) if row.lesson_id else None,
                    "lesson_title": row.lesson_title,
                    "chunk_index": row.chunk_index,
                    "content": row.content,
                }

                if row.source_type == "resource":
                    item["resource_id"] = (
                        str(row.resource_id) if row.resource_id else None
                    )
                    item["resource_title"] = row.resource_title
                    item["resource_url"] = row.resource_url

                results.append(item)

        # 3. Bổ sung resource chunks nếu có (cho quiz/code lessons)
        # Video/article đã được xử lý trong rag_search_scope
        if lesson_type in ["quiz", "code"]:
            # Kiểm tra xem lesson có resources không
            from app.db.models.database import LessonResources

            has_resources = await self.db.execute(
                select(LessonResources.id)
                .where(LessonResources.lesson_id == lesson_id)
                .limit(1)
            )

            if has_resources.scalar_one_or_none():
                # Tìm resource chunks bằng embedding
                embedding = await self.embedding_service.embed_query(query)
                embedding_str = str(embedding)

                resource_stmt = text(
                    """
                    SELECT 
                        rc.id as chunk_id,
                        rc.lesson_id,
                        l.title as lesson_title,
                        rc.chunk_index,
                        rc.content,
                        r.id as resource_id,
                        r.title as resource_title,
                        r.url as resource_url,
                        1 - (rc.embedding <=> CAST(:embedding AS vector)) as similarity
                    FROM public.resource_chunks rc
                    JOIN public.lesson_resources r ON rc.resource_id = r.id
                    JOIN public.lessons l ON rc.lesson_id = l.id
                    WHERE rc.lesson_id = :lesson_id
                    AND 1 - (rc.embedding <=> CAST(:embedding AS vector)) >= 0.7
                    ORDER BY similarity DESC
                    LIMIT 2
                """
                )

                resource_result = await self.db.execute(
                    resource_stmt, {"lesson_id": lesson_id, "embedding": embedding_str}
                )

                for row in resource_result.fetchall():
                    results.append(
                        {
                            "source_type": "resource",
                            "similarity": row.similarity,
                            "chunk_id": str(row.chunk_id),
                            "lesson_id": str(row.lesson_id),
                            "lesson_title": row.lesson_title,
                            "chunk_index": row.chunk_index,
                            "content": row.content,
                            "resource_id": str(row.resource_id),
                            "resource_title": row.resource_title,
                            "resource_url": row.resource_url,
                        }
                    )

        return results

    @staticmethod
    def _build_search_query(message, context, lesson_title, mode):
        parts = [f"Bài học: {lesson_title}"]
        if mode == "REUSE":
            previous = [msg["content"] for msg in context
                        if msg["role"] == "user" and not is_casual_message(msg["content"])]
            parts.extend(previous[-2:])
        parts.append(message)
        return "\n".join(part[:1500] for part in parts)

    @staticmethod
    def _ground_sources(citations, sources):
        """Only return citations that match actual retrieved passages."""
        if not isinstance(citations, list):
            return []
        available = {str(src["chunk_id"]): src for src in sources if src.get("chunk_id")}
        grounded = []
        seen = set()
        for citation in citations:
            if not isinstance(citation, dict):
                continue
            key = str(citation.get("chunk_id") or citation.get("code_id") or citation.get("quiz_id") or "")
            if key not in available or key in seen:
                continue
            seen.add(key)
            src = available[key]
            item = {k: v for k, v in src.items() if k != "content"}
            item["source_type"] = "video" if src["source_type"] == "lesson" else src["source_type"]
            item["index"] = len(grounded) + 1
            item["summary"] = str(citation.get("summary", ""))[:600]
            if item["source_type"] in {"code", "quiz"}:
                item[item["source_type"] + "_id"] = key
            timestamp = citation.get("timestamp_seconds")
            if isinstance(timestamp, (int, float)) and timestamp >= 0:
                item["timestamp_seconds"] = timestamp
            grounded.append(item)
        return grounded

    def _build_prompt(
        self,
        user_message: str,
        context: List[Dict[str, Any]],
        sources: List[Dict[str, Any]],
        mode: str,
        lesson_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Xây dựng prompt cho LLM dựa trên context, sources và mode.
        """
        prompt = """# VAI TRÒ
            Bạn là **Mây Mây AI** ☁️ - trợ giảng học tập thông minh của nền tảng Mây Mây. 
            Nhiệm vụ của bạn là hỗ trợ học viên hiểu bài học, giải đáp thắc mắc và hướng dẫn thực hành.

            # NGUYÊN TẮC TRẢ LỜI
            1. **Chính xác**: Chỉ trả lời dựa trên tài liệu được cung cấp. Nếu không có thông tin, nói rõ.
            2. **Dễ hiểu**: Giải thích từng bước, sử dụng ví dụ cụ thể và minh họa khi cần.
            3. **Đúng chủ đề**: Bám sát bài học và khóa học hiện tại; không mặc định mọi môn đều là lập trình.
            4. **Khuyến khích**: Động viên học viên, gợi ý hướng đi tiếp theo.
            5. **Ngôn ngữ**: Trả lời bằng tiếng Việt, thân thiện nhưng chuyên nghiệp.

            # ĐỊNH DẠNG OUTPUT
            - Sử dụng Markdown để format câu trả lời.
            - Code block với syntax highlighting khi cần.
            - Bullet points cho danh sách.
            - Bold/italic để nhấn mạnh điểm quan trọng.
            """

        if lesson_context:
            import json

            prompt += "\n# NGỮ CẢNH BÀI HỌC HIỆN TẠI\n"
            prompt += json.dumps(lesson_context, ensure_ascii=False)
            prompt += """
Đây là bài học học viên đang mở, kể cả khi họ chỉ nói 'hi'. Không hỏi lại họ đang học chủ đề gì.
Chào hỏi: trả lời ngắn 1–2 câu, nhắc đúng bài học, không liệt kê tính năng hay tự giới thiệu dài dòng.
Nếu đã chào trong lịch sử, chỉ đáp ngắn và tiếp nối, không bắt đầu lại buổi học.
Tên/mô tả bài học chỉ là thông tin định hướng, không phải bằng chứng cho nội dung chi tiết của video.
Khi người học hỏi 'ý đó', 'phần đó', hãy hiểu theo cuộc hội thoại, không đổi chủ đề.
Nếu không có đoạn tài liệu phù hợp, nói rõ chưa tìm được; không bịa nội dung hay nguồn tham khảo.
"""

        # Add context từ lịch sử chat
        if context:
            prompt += "\n---\n# LỊCH SỬ HỘI THOẠI\n"
            for msg in context[-12:]:
                role = "👤 Học viên" if msg["role"] == "user" else "🤖 Tutor AI"
                content = msg["content"][:2000]
                prompt += f"\n{role}:\n{content}\n"

        # Add sources từ RAG
        if sources and mode in ["SEARCH", "REUSE"]:
            prompt += """
            ---
            # TÀI LIỆU THAM KHẢO
            Dưới đây là nội dung liên quan từ bài học. Hãy sử dụng để trả lời:

            """
            for i, src in enumerate(sources, 1):
                # Giữ nguyên source_type gốc, chỉ đổi "lesson" → "video"
                raw_source_type = src.get("source_type", "video")
                source_type = (
                    "video" if raw_source_type == "lesson" else raw_source_type
                )
                chunk_id = src.get("chunk_id", "")
                lesson_id = src.get("lesson_id", "")
                lesson_title = src.get("lesson_title", "")
                chunk_index = src.get("chunk_index", 0)
                similarity = src.get("similarity", 0)
                content = src.get("content", "")

                if source_type == "resource":
                    resource_id = src.get("resource_id", "")
                    resource_title = src.get("resource_title", "Tài liệu")
                    resource_url = src.get("resource_url", "")
                    prompt += f"""### [{i}] 📄 Tài liệu: {resource_title}
            - chunk_id: {chunk_id}
            - resource_id: {resource_id}
            - resource_title: {resource_title}
            - resource_url: {resource_url}
            - Bài học: {lesson_title}
            - Độ liên quan: {similarity:.0%}
            ```
            {content}
            ```

            """
                else:
                    prompt += f"""### [{i}] 🎬 Bài học: {lesson_title}
            - chunk_id: {chunk_id}
            - lesson_id: {lesson_id}
            - lesson_title: {lesson_title}
            - chunk_index: {chunk_index}
            - Độ liên quan: {similarity:.0%}
            ```
            {content}
            ```

            """

        # Hướng dẫn đặc biệt theo mode
        if mode == "NO_SEARCH":
            prompt += """
            ---
            # CHÚ Ý
            Đây là lời xã giao. Vẫn bám vào ngữ cảnh bài học hiện tại và lịch sử chat.
            Không cần truy xuất embedding cho riêng lời chào. Trả sources_used là [].
            """

        # Add user message
        prompt += f"""
            ---
            # CÂU HỎI HIỆN TẠI
            👤 **Học viên hỏi:**
            {user_message}

            ---
            # YÊU CẦU OUTPUT
            Trả lời dưới dạng JSON với format sau:
            ```json
            {{
                "title": "Tiêu đề ngắn gọn tóm tắt câu hỏi (tối đa 50 ký tự)",
                "content": "Nội dung trả lời chi tiết, sử dụng Markdown formatting",
                "sources_used": [
                    {{
                        "index": 1,
                        "source_type": "video" ,
                        "chunk_id": "uuid của chunk",
                        "lesson_id": "uuid của lesson",
                        "lesson_title": "Tên bài học",
                        "summary": "Tóm tắt ngắn gọn nội dung đoạn này (20-30 từ)",
                        "similarity": 1,
                        "chunk_index": 0,
                        "timestamp_seconds": 0
                    }},
                    {{
                        "index": 2,
                        "source_type": "resource",
                        "chunk_id": "uuid của chunk",
                        "resource_id": "uuid của resource",
                        "resource_title": "Tên tài liệu",
                        "summary": "Tóm tắt ngắn gọn nội dung đoạn này (20-30 từ)",
                        "resource_url": "URL tài liệu",
                        "similarity": 0.75
                    }},
                    {{
                        "index": 3,
                        "source_type": "code",
                        "lesson_id": "uuid của lesson",
                        "code_id": "uuid của code",
                        "lesson_title": "Tên bài học",
                        "summary": "Tóm tắt ngắn gọn nội dung đoạn này (20-30 từ)",
                        "code_content": "Nội dung code",
                        "similarity": 0.75
                    }},
                    {{
                        "index": 4,
                        "source_type": "quiz",
                        "lesson_id": "uuid của lesson",
                        "quiz_id": "uuid của quiz",
                        "quizz_option_id": "uuid của option",
                        "lesson_title": "Tên bài học",
                        "summary": "Tóm tắt ngắn gọn nội dung đoạn này (20-30 từ)",
                        "similarity": 0.73,
                        "quizz_option_title": "Tên option",
                        "quizz_option_content": "Nội dung option"
                    }}
                ]
            }}
            ```
            
            Lưu ý quan trọng:
            - "title": Tiêu đề ngắn gọn, súc tích mô tả nội dung câu hỏi
            - "content": Trả lời đầy đủ, dễ hiểu, có ví dụ minh họa
            - "sources_used": Chỉ liệt kê các tài liệu THỰC SỰ được dùng để trả lời. Khi giải thích dựa trên tài liệu, phải dẫn nguồn đã dùng; không chép các ví dụ nguồn bên trên. Nếu không dùng tài liệu thì trả [].
              + "summary": Tóm tắt nội dung chính của đoạn này (ví dụ: "Giới thiệu JavaScript và lịch sử ra đời")
              + Với source_type="video": Lấy timestamp_seconds từ nội dung (ví dụ: `00:15` = 15, `01:20` = 80)
              + Với source_type="code": Không cần timestamp_seconds
              + Với source_type="quiz": Không cần timestamp_seconds
              + Copy chính xác các giá trị chunk_id, lesson_id, resource_id từ tài liệu tham khảo
              + Sắp xếp theo index giảm dần
            """

        return prompt

    async def _call_llm(
        self,
        prompt: str,
    ) -> str:
        """
        Gọi LLM service để sinh câu trả lời JSON.
        """
        from app.core.llm import LLMService

        llm = LLMService()
        response = await llm.call_model(
            prompt=prompt,
            mime_type="application/json",
            temperature=0.7,
            max_output_tokens=4000,
        )
        return response


def get_tutor_chat_message_service(
    db: AsyncSession = Depends(get_session),
    thread_service: TutorChatService = Depends(get_tutor_chat_service),
    classifier_service: MessageClassifierService = Depends(
        get_message_classifier_service
    ),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> TutorChatMessageService:
    return TutorChatMessageService(
        db=db,
        thread_service=thread_service,
        classifier_service=classifier_service,
        embedding_service=embedding_service,
    )
