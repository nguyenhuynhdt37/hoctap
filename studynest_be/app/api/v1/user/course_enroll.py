import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.deps import AuthorizationService
from app.db.models.database import User
from app.services.user.course_enroll import CourseEnrolls

router = APIRouter(prefix="/purchases", tags=["User Course Enrollments"])


class CreateLearningListBody(BaseModel):
    name: str
    description: str | None = None
    color_tone: str = "sky"


@router.get("/cockpit")
async def get_learning_cockpit(
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    purchase_service: CourseEnrolls = Depends(CourseEnrolls),
):
    user: User = await authorization_service.get_current_user()
    return await purchase_service.get_learning_cockpit_async(user)


@router.get("/courses")
async def get_my_courses(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    keyword: str | None = None,
    category_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    level: str | None = None,
    language: str | None = None,
    sort_by: str = Query(
        "created_at", description="created_at, rating_avg, views, progress"
    ),
    order: str = Query("desc", description="asc hoặc desc"),
    archived: bool = Query(False, description="Lọc khóa học đã lưu trữ"),
    list_id: uuid.UUID | None = Query(None, description="Lọc theo tủ sách cá nhân"),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    purchase_service: CourseEnrolls = Depends(CourseEnrolls),
):
    user: User = await authorization_service.get_current_user()
    return await purchase_service.get_user_courses_async(
        user.id,
        page,
        size,
        keyword,
        category_id,
        level,
        language,
        sort_by,
        order,
        archived,
        list_id,
        subject_id,
        grade_id,
    )


@router.post("/courses/{course_id}/pin")
async def toggle_pin_course(
    course_id: uuid.UUID,
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    purchase_service: CourseEnrolls = Depends(CourseEnrolls),
):
    user: User = await authorization_service.get_current_user()
    return await purchase_service.toggle_pin_course_async(user.id, course_id)


@router.post("/lists")
async def create_learning_list(
    body: CreateLearningListBody,
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    purchase_service: CourseEnrolls = Depends(CourseEnrolls),
):
    user: User = await authorization_service.get_current_user()
    return await purchase_service.create_learning_list_async(
        user.id, body.name, body.description, body.color_tone
    )


@router.delete("/lists/{list_id}")
async def delete_learning_list(
    list_id: uuid.UUID,
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    purchase_service: CourseEnrolls = Depends(CourseEnrolls),
):
    user: User = await authorization_service.get_current_user()
    return await purchase_service.delete_learning_list_async(user.id, list_id)


@router.post("/lists/{list_id}/courses/{course_id}")
async def toggle_course_in_list(
    list_id: uuid.UUID,
    course_id: uuid.UUID,
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    purchase_service: CourseEnrolls = Depends(CourseEnrolls),
):
    user: User = await authorization_service.get_current_user()
    return await purchase_service.toggle_course_in_list_async(
        user.id, list_id, course_id
    )


@router.get("/courses/user/{user_id}")
async def get_user_courses(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    keyword: str | None = None,
    category_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    level: str | None = None,
    language: str | None = None,
    sort_by: str = Query(
        "created_at", description="created_at, rating_avg, views, progress"
    ),
    order: str = Query("desc", description="asc hoặc desc"),
    authorization_service: AuthorizationService = Depends(AuthorizationService),
    purchase_service: CourseEnrolls = Depends(CourseEnrolls),
):
    current = await authorization_service.get_current_user()
    if current.id != user_id and "ADMIN" not in await authorization_service.get_list_role_in_user(current):
        raise HTTPException(403, "Không có quyền xem khóa học của tài khoản khác")
    return await purchase_service.get_user_courses_async(
        user_id,
        page,
        size,
        keyword,
        category_id,
        level,
        language,
        sort_by,
        order,
        False,
        None,
        subject_id,
        grade_id,
    )
