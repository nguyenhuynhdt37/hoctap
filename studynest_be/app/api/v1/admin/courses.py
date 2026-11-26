"""Admin Courses Management, Full Lesson Preview & Approval API."""

import uuid
from typing import Literal

from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel, Field

from app.core.deps import AuthorizationService
from app.services.admin.courses import AdminCourseService

router = APIRouter(prefix="/admin/courses", tags=["ADMIN COURSES"])


class AdminCourseReviewInput(BaseModel):
    action: Literal["approve", "reject", "unpublish", "publish", "reopen_pending"]
    note: str | None = Field(None, max_length=2000)
    publish_on_approve: bool = True


class AdminBulkCourseReviewInput(BaseModel):
    course_ids: list[uuid.UUID] = Field(min_length=1, max_length=50)
    action: Literal["approve", "reject", "unpublish"]
    note: str | None = Field(None, max_length=2000)
    publish_on_approve: bool = True


@router.get("/stats")
async def get_admin_courses_stats(
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: AdminCourseService = Depends(AdminCourseService),
):
    await authorization.require_role(["ADMIN"])
    return await service.get_stats_async()


@router.get("")
async def list_admin_courses(
    status: str | None = Query(
        None,
        description="pending | approved | approved_live | approved_hidden | rejected",
    ),
    instructor_id: uuid.UUID | None = Query(None),
    level: str | None = Query(None),
    price_type: str | None = Query(None, description="free | paid"),
    search: str | None = Query(None),
    sort_by: str = Query("pending_first"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: AdminCourseService = Depends(AdminCourseService),
):
    await authorization.require_role(["ADMIN"])
    return await service.list_courses_async(
        status_filter=status,
        instructor_id=instructor_id,
        level=level,
        price_type=price_type,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        size=size,
    )


@router.post("/bulk-review")
async def bulk_review_admin_courses(
    payload: AdminBulkCourseReviewInput = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: AdminCourseService = Depends(AdminCourseService),
):
    admin = await authorization.require_role(["ADMIN"])
    return await service.bulk_review_async(
        payload.course_ids,
        admin,
        action=payload.action,
        note=payload.note,
        publish_on_approve=payload.publish_on_approve,
    )


@router.get("/{course_id}")
async def get_admin_course_review_detail(
    course_id: uuid.UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: AdminCourseService = Depends(AdminCourseService),
):
    await authorization.require_role(["ADMIN"])
    return await service.get_course_review_detail_async(course_id)


@router.get("/{course_id}/lessons/{lesson_id}/preview")
async def get_admin_course_lesson_preview(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: AdminCourseService = Depends(AdminCourseService),
):
    await authorization.require_role(["ADMIN"])
    return await service.get_lesson_preview_async(course_id, lesson_id)


@router.post("/{course_id}/review")
async def review_admin_course(
    course_id: uuid.UUID,
    payload: AdminCourseReviewInput = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: AdminCourseService = Depends(AdminCourseService),
):
    admin = await authorization.require_role(["ADMIN"])
    return await service.review_course_async(
        course_id,
        admin,
        action=payload.action,
        note=payload.note,
        publish_on_approve=payload.publish_on_approve,
    )
