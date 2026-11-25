import uuid
from typing import List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    File,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from app.core.deps import AuthorizationService
from app.core.ws_manager import ws_manager
from app.db.models.database import User
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
from app.services.lecturer.lesson import LessonService
from app.services.shares.lesson_pipeline_tracker import lesson_pipeline_tracker
from app.services.shares.OCR_service import OCRService, get_ocr_service
from app.services.shares.youtube_uploader import (
    UPLOAD_LOCK,
    UPLOAD_PROGRESS,
    UPLOAD_RESULT,
    UPLOAD_STATS,
)

router = APIRouter(prefix="/lecturer/lessons", tags=["LECTURER Lessons"])


@router.post("/create", status_code=status.HTTP_200_OK)
async def createLesson(
    lesson_service: LessonService = Depends(LessonService),
    schema: CreateLesson = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.create_lesson_async(schema, lecturer)


@router.put("/{lesson_id}", status_code=status.HTTP_200_OK)
async def update_lesson(
    lesson_id: uuid.UUID,
    schema: UpdateLessonSchema = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.update_lesson_async(lesson_id, schema, lecturer)


@router.delete("/{lesson_id}", status_code=status.HTTP_200_OK)
async def delete_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.delete_lesson_async(lesson_id, lecturer.id)


@router.post("/{lesson_id}/create/video", status_code=status.HTTP_200_OK)
async def createLessonVideo(
    lesson_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    lesson_service: LessonService = Depends(LessonService),
    video: UploadFile = File(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
) -> dict[str, str]:
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.upload_video_async(
        video, lesson_id, lecturer.id, background_tasks
    )


@router.post("/{lesson_id}/create/video/url", status_code=status.HTTP_200_OK)
async def createLessonVideoByURL(
    lesson_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    lesson_service: LessonService = Depends(LessonService),
    schema: UpdateLessonVideoSchema = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
) -> dict[str, str]:
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.upload_video_youtube_url_async(
        lesson_id, lecturer.id, schema, background_tasks
    )


@router.get("/{lesson_id}/quizzes", status_code=201)
async def get_lesson_by_quizzes_id(
    lesson_id: uuid.UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.get_quizzes_by_lesson_async(lesson_id, lecturer.id)


@router.put("/{lesson_id}/video/file", status_code=status.HTTP_200_OK)
async def upload_lesson_video_file(
    lesson_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """
    🎬 Upload video mới cho bài học.
    - Nhận video dạng file (.mp4, .mov,...)
    - Chạy upload nền lên YouTube (nếu có cấu hình)
    """
    lecturer = await authorization.require_role(["LECTURER"])

    return await lesson_service.replace_lesson_video_async(
        lesson_id=lesson_id,
        lecturer_id=lecturer.id,
        background_tasks=background_tasks,
        video=video,
        schema=None,
    )


# ============================================================
# 🔗 2️⃣ Cập nhật link YouTube (application/json)
# ============================================================
@router.put("/{lesson_id}/video/link", status_code=status.HTTP_200_OK)
async def update_lesson_video_link(
    lesson_id: uuid.UUID,
    payload: UpdateLessonVideoSchema,
    background_tasks: BackgroundTasks,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """
    🔗 Cập nhật link video YouTube cho bài học.
    - Nhận JSON body: {"video_url": "..."}
    """
    lecturer = await authorization.require_role(["LECTURER"])

    return await lesson_service.replace_lesson_video_async(
        lesson_id=lesson_id,
        lecturer_id=lecturer.id,
        background_tasks=background_tasks,
        video=None,
        schema=payload,
    )


@router.put("/{lesson_id}/move", status_code=status.HTTP_200_OK)
async def move_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    schema: MoveLessonSchema = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.move_lesson_async(
        lesson_id, schema, lecturer_id=lecturer.id
    )


@router.put("/{lesson_id}/rename", status_code=status.HTTP_200_OK)
async def rename_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    schema: UpdateLessonTitleSchema = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.rename_lesson_async(
        lesson_id, schema, lecturer_id=lecturer.id
    )


@router.get("/{lesson_id}/resources", status_code=status.HTTP_200_OK)
async def get_lesson_resources(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["LECTURER"])
    return await lesson_service.get_lesson_resources_async(lesson_id)


@router.post("/{lesson_id}/resources", status_code=status.HTTP_201_CREATED)
async def create_lesson_resource(
    lesson_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: Optional[List[UploadFile]] = File(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
    ocr_pdf_service: OCRService = Depends(get_ocr_service),
):
    lecturer = await authorization.require_role(["LECTURER"])

    return await lesson_service.add_resources_file_async(
        lesson_id, background_tasks, lecturer.id, files, ocr_pdf_service
    )


@router.post("/{lesson_id}/resources/links", status_code=status.HTTP_201_CREATED)
async def add_resources_link(
    lesson_id: uuid.UUID,
    links: List[UpdateLessonResourcesLinkSchema] = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])

    return await lesson_service.add_resources_link_async(lesson_id, lecturer.id, links)


@router.post("/{lesson_id}/resources/zip_rar", status_code=status.HTTP_201_CREATED)
async def add_resources_file_zip_rar(
    lesson_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])

    return await lesson_service.add_resources_file_zip_rar_async(
        lesson_id, lecturer.id, files
    )


@router.post("/video/quizzes/bulk", status_code=status.HTTP_201_CREATED)
async def create_quizzes_video_bulk(
    schema: LessonQuizBulkCreate = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])

    return await lesson_service.create_quizzes_bulk_async(lecturer.id, schema)


@router.get("/{lesson_id}/video/quizzes", status_code=status.HTTP_200_OK)
async def get_quizzes_video_by_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_quizzes_by_lesson_async(lesson_id, lecturer.id)


@router.get("/{lesson_id}/upload_progress")
async def get_upload_progress(lesson_id: uuid.UUID) -> dict:
    """Lấy phần trăm, tốc độ upload, trạng thái pipeline embedding và kết quả."""
    task_id = str(lesson_id)
    pipeline_state = await lesson_pipeline_tracker.get(task_id)
    async with UPLOAD_LOCK:
        percent = UPLOAD_PROGRESS.get(task_id, 0)
        stat = UPLOAD_STATS.get(task_id, {})

        result = {}
        if percent >= 100:
            result = UPLOAD_RESULT.get(task_id, {})

        is_done = (
            bool(pipeline_state.get("is_completed"))
            if pipeline_state is not None
            else (percent >= 100 or not UPLOAD_PROGRESS.get(task_id))
        )

        return {
            "task_id": task_id,
            "percent": pipeline_state.get("percent", percent)
            if pipeline_state
            else percent,
            "speed_mb_s": pipeline_state.get(
                "speed_mb_s", round(stat.get("speed", 0.0), 2)
            )
            if pipeline_state
            else round(stat.get("speed", 0.0), 2),
            "uploaded_mb": pipeline_state.get(
                "uploaded_mb", round(stat.get("uploaded_bytes", 0) / 1_048_576, 2)
            )
            if pipeline_state
            else round(stat.get("uploaded_bytes", 0) / 1_048_576, 2),
            "total_mb": pipeline_state.get(
                "total_mb", round(stat.get("total_size", 0) / 1_048_576, 2)
            )
            if pipeline_state
            else round(stat.get("total_size", 0) / 1_048_576, 2),
            "video_url": (pipeline_state or {}).get("video_url")
            or result.get("video_url"),
            "video_id": (pipeline_state or {}).get("video_id")
            or result.get("video_id"),
            "is_completed": is_done,
            "pipeline": pipeline_state,
        }


@router.get("/ai-queue", status_code=status.HTTP_200_OK)
async def get_ai_pipeline_queue(
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """Lấy danh sách hàng đợi xử lý Video & Tài liệu AI theo phân quyền (Giảng viên chỉ thấy của mình, Admin thấy toàn hệ thống)."""
    user = await authorization.require_role(["LECTURER", "ADMIN"])
    roles = await authorization.get_list_role_in_user(user)
    is_admin = "ADMIN" in roles
    items = await lesson_pipeline_tracker.list_jobs(
        instructor_id=None if is_admin else str(user.id)
    )
    return {
        "scope": "all" if is_admin else "mine",
        "items": items,
    }


@router.post("/{lesson_id}/reindex", status_code=status.HTTP_200_OK)
async def reindex_lesson_ai(
    lesson_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """Kích hoạt chạy lại pipeline trích xuất nội dung & tạo vector embedding cho bài học."""
    actor = await authorization.require_role(["LECTURER", "ADMIN"])
    roles = await authorization.get_list_role_in_user(actor)
    return await lesson_service.reindex_lesson_async(
        lesson_id,
        actor.id,
        background_tasks,
        is_admin="ADMIN" in roles,
    )


@router.post("/resources/{resource_id}/reindex", status_code=status.HTTP_200_OK)
async def reindex_resource_ai(
    resource_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """Kích hoạt chạy lại OCR & Batch Embedding cho tài liệu PDF/ảnh."""
    actor = await authorization.require_role(["LECTURER", "ADMIN"])
    roles = await authorization.get_list_role_in_user(actor)
    return await lesson_service.reindex_resource_async(
        resource_id,
        actor.id,
        background_tasks,
        is_admin="ADMIN" in roles,
    )


@router.websocket("/ws/queue")
async def ws_ai_pipeline_queue(websocket: WebSocket):
    """WebSocket realtime cho Trung tâm Hàng đợi AI (Giảng viên xem của mình, Admin xem toàn hệ thống)."""
    await websocket.accept()
    user = await AuthorizationService.get_require_role_ws(
        websocket, ["LECTURER", "ADMIN"]
    )
    if not user:
        await websocket.close(code=4401)
        return

    role_param = (websocket.query_params.get("role_name") or "").upper()
    is_admin_scope = role_param == "ADMIN"
    if is_admin_scope:
        admin_ok = await AuthorizationService.get_require_role_ws(
            websocket, ["ADMIN"]
        )
        is_admin_scope = bool(admin_ok)

    room_id = (
        lesson_pipeline_tracker.admin_room_id()
        if is_admin_scope
        else lesson_pipeline_tracker.lecturer_room_id(str(user.id))
    )
    await ws_manager.connect(websocket, room_id)
    try:
        items = await lesson_pipeline_tracker.list_jobs(
            instructor_id=None if is_admin_scope else str(user.id)
        )
        await websocket.send_json(
            {
                "type": "queue_snapshot",
                "scope": "all" if is_admin_scope else "mine",
                "items": items,
            }
        )
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket, room_id)


@router.websocket("/ws/pipeline/{lesson_id}")
async def ws_lesson_pipeline(websocket: WebSocket, lesson_id: uuid.UUID):
    """WebSocket realtime theo dõi tiến độ tải video, trích xuất nội dung, retry và embedding."""
    await websocket.accept()
    user = await AuthorizationService.get_require_role_ws(
        websocket, ["LECTURER", "ADMIN"]
    )
    if not user:
        await websocket.close(code=4401)
        return

    task_id = str(lesson_id)
    room_id = lesson_pipeline_tracker.room_id(task_id)
    await ws_manager.connect(websocket, room_id)
    try:
        # Gửi ngay snapshot hiện tại nếu pipeline đã khởi chạy
        snapshot = await lesson_pipeline_tracker.get(task_id)
        if snapshot:
            await websocket.send_json(snapshot)

        # Giữ kết nối mở và phản hồi ping/pong
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket, room_id)


@router.delete("/resources/{resource_id}")
async def delete_resource(
    resource_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.delete_resource_async(resource_id, lecturer.id)


@router.delete("/quizzes/video/{quiz_id}")
async def delete_quiz_video(
    quiz_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.delete_quiz_video_async(quiz_id, lecturer.id)


@router.get("/{lesson_id}/quizzes", status_code=status.HTTP_200_OK)
async def get_quizzes_by_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_quizzes_by_lesson_async(lesson_id, lecturer.id)


@router.post("/quizzes/bulk", status_code=status.HTTP_201_CREATED)
async def create_quizzes_bulk(
    schema: LessonQuizBulkCreate = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])

    return await lesson_service.create_quizzes_bulk_async(lecturer.id, schema)


@router.get("/flashcards/voices", status_code=status.HTTP_200_OK)
async def get_flashcard_tts_voices(
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["LECTURER", "ADMIN", "USER"])
    from app.services.shares.tts_service import TTSService
    return {"voices": TTSService.list_voices()}


@router.post("/flashcards/tts/preview", status_code=status.HTTP_200_OK)
async def preview_flashcard_tts(
    schema: FlashcardTTSPreviewSchema = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["LECTURER", "ADMIN"])
    return await lesson_service.preview_flashcard_tts_async(schema)


@router.post("/flashcards/bulk", status_code=status.HTTP_201_CREATED)
async def create_flashcards_bulk(
    schema: LessonFlashcardBulkCreate = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.create_flashcards_bulk_async(lecturer.id, schema)


@router.get("/{lesson_id}/flashcards", status_code=status.HTTP_200_OK)
async def get_flashcards_by_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_flashcards_by_lesson_async(lesson_id, lecturer.id)


@router.post("/listening/render-audio", status_code=status.HTTP_200_OK)
async def render_listening_dialogue_audio(
    schema: ListeningRenderAudioSchema = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["LECTURER", "ADMIN"])
    return await lesson_service.render_listening_audio_async(schema)


@router.post("/listening/save", status_code=status.HTTP_200_OK)
async def save_lesson_listening(
    schema: LessonListeningSaveSchema = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.save_lesson_listening_async(lecturer.id, schema)


@router.get("/{lesson_id}/listening", status_code=status.HTTP_200_OK)
async def get_listening_by_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_listening_by_lesson_async(lesson_id, lecturer.id)


@router.post("/fill-blank/render-audio", status_code=status.HTTP_200_OK)
async def render_fill_blank_audio(
    schema: FillBlankRenderAudioSchema = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["LECTURER", "ADMIN"])
    return await lesson_service.render_fill_blank_audio_async(schema)


@router.post("/fill-blank/save", status_code=status.HTTP_200_OK)
async def save_lesson_fill_blank(
    schema: LessonFillBlankSaveSchema = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.save_lesson_fill_blank_async(lecturer.id, schema)


@router.get("/{lesson_id}/fill-blank", status_code=status.HTTP_200_OK)
async def get_fill_blank_by_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_fill_blank_by_lesson_async(lesson_id, lecturer.id)


@router.post("/speaking/save", status_code=status.HTTP_200_OK)
async def save_lesson_speaking(
    schema: LessonSpeakingSaveSchema = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.save_lesson_speaking_async(lecturer.id, schema)


@router.get("/{lesson_id}/speaking", status_code=status.HTTP_200_OK)
async def get_speaking_by_lesson(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_speaking_by_lesson_async(lesson_id, lecturer.id)


@router.get("/code_languages", status_code=status.HTTP_200_OK)
async def get_code_languages(
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["LECTURER"])
    return await lesson_service.get_code_languages_async()


@router.get("/{section_id}", status_code=status.HTTP_200_OK)
async def get_lesson_by_section_id(
    section_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_lesson_by_section_id(section_id, lecturer.id)


@router.post("/code/run_test", status_code=status.HTTP_200_OK)
async def run_code_test(
    schema: LessonCodeVerify = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["LECTURER"])
    return await lesson_service.verify_code_sample_async(schema)


@router.post("/{lesson_id}/code/create", status_code=status.HTTP_201_CREATED)
async def create_full_lesson_code(
    lesson_id: uuid.UUID,
    schema: List[LessonCodeCreate] = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.create_multiple_lesson_codes_async(
        schema, lecturer.id, lesson_id
    )


@router.get("/{lesson_id}/detail", status_code=status.HTTP_200_OK)
async def get_lesson_by_id(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_lesson_by_id_async(lesson_id, lecturer.id)


@router.get("/{lesson_id}/code", status_code=status.HTTP_200_OK)
async def get_all_lesson_codes(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_all_lesson_codes_async(lesson_id, lecturer.id)


@router.put("/{lesson_id}/code", status_code=status.HTTP_200_OK)
async def update_lesson_code(
    lesson_id: uuid.UUID,
    schema: List[LessonCodeUpdateBatch] = Body(...),
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.update_lesson_codes_by_lesson_id_async(
        lesson_id, schema, lecturer.id
    )


@router.get("/{lesson_id}/video", status_code=status.HTTP_200_OK)
async def get_lesson_video(
    lesson_id: uuid.UUID,
    lesson_service: LessonService = Depends(LessonService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    lecturer = await authorization.require_role(["LECTURER"])
    return await lesson_service.get_lesson_video_async(lesson_id, lecturer.id)


@router.get("/ok/{video_id}/test", status_code=status.HTTP_200_OK)
async def test(
    video_id: str = "dQw4w9WgXcQ",
    lesson_service: LessonService = Depends(LessonService),
):
    try:
        return await lesson_service.test(video_id)
    except Exception as e:
        raise e
