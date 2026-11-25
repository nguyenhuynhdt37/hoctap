from uuid import UUID

from fastapi import APIRouter, Body, Depends

from app.core.deps import AuthorizationService  # class chứa require_role
from app.db.models.database import User
from app.schemas.chat.lecturer.lesson import (
    CreateDescriptionSchema,
    CreateRewriteTheTitleSchema,
    LessonListSchema,
)
from app.services.chat.lecturer.lessson import LessonService

router = APIRouter(prefix="/lecturers/chat/lesson", tags=["CHAT LECTURER LESSON"])


@router.post("/rewrite_the_title", status_code=201)
async def rewrite_the_title(
    schema: CreateRewriteTheTitleSchema = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    await authorization.require_role(["LECTURER"])
    return await service.rewrite_the_title_async(schema)


@router.post("/create_description", status_code=201)
async def create_description(
    schema: CreateDescriptionSchema = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    await authorization.require_role(["LECTURER"])
    return await service.create_description_async(schema)


@router.post("/{lesson_id}/video/quizzes", status_code=201)
async def create_quizzes_video(
    lesson_id: UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.create_quizzes_video_async(lesson_id, lecturer.id)


@router.post("/quizzes", status_code=201)
async def create_quizzes_section(
    schema: LessonListSchema = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.create_quizzes_from_lessons_async(
        schema.lesson_ids, lecturer.id
    )


@router.post("/code", status_code=201)
async def create_coding_tasks_from_lessons(
    schema: LessonListSchema = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.create_coding_tasks_from_lessons_async(
        schema.lesson_ids, lecturer.id
    )


@router.post("/flashcards", status_code=201)
async def create_flashcards_from_lessons(
    schema: LessonListSchema = Body(...),
    lang_code: str = "en-US",
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.create_flashcards_from_lessons_async(
        schema.lesson_ids, lecturer.id, lang_code=lang_code
    )


@router.post("/listening", status_code=201)
async def create_listening_from_ai(
    payload: dict = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.create_listening_dialogue_async(
        lecturer_id=lecturer.id,
        topic=str(payload.get("topic") or "").strip(),
        lesson_ids=payload.get("lesson_ids") or [],
        lang_code=str(payload.get("lang_code") or "en-GB"),
        turns=int(payload.get("turns") or 10),
        question_count=int(payload.get("question_count") or 5),
    )


@router.post("/fill-blank", status_code=201)
async def create_fill_blank_from_ai(
    payload: dict = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.create_fill_blank_async(
        lecturer_id=lecturer.id,
        topic=str(payload.get("topic") or "").strip(),
        lesson_ids=payload.get("lesson_ids") or [],
        lang_code=str(payload.get("lang_code") or "en-GB"),
        blank_count=int(payload.get("blank_count") or 6),
        mode=str(payload.get("mode") or "typing"),
    )


@router.post("/speaking", status_code=201)
async def create_speaking_scenario_from_ai(
    payload: dict = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: LessonService = Depends(LessonService),
):
    lecturer: User = await authorization.require_role(["LECTURER"])
    return await service.create_speaking_scenario_async(
        lecturer_id=lecturer.id,
        topic=str(payload.get("topic") or "").strip(),
        lesson_ids=payload.get("lesson_ids") or [],
        lang_code=str(payload.get("lang_code") or "en-GB"),
        level=str(payload.get("level") or "B1"),
        mission_count=int(payload.get("mission_count") or 4),
    )
