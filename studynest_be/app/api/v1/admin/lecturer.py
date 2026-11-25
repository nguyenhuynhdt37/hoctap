import uuid

from fastapi import APIRouter, Body, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.deps import AuthorizationService
from app.schemas.auth.user import BlockUser
from app.services.admin.lecturer import LecturerService

router = APIRouter(prefix="/admin/lecturers", tags=["ADMIN LECTURERS"])


class AdminCreateLecturerInput(BaseModel):
    fullname: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=6, max_length=128)
    bio: str | None = Field(None, max_length=1000)
    instructor_description: str | None = Field(None, max_length=5000)
    conscious: str | None = Field(None, max_length=120)
    district: str | None = Field(None, max_length=120)
    is_verified_email: bool = True


class AdminUpdateLecturerInput(BaseModel):
    fullname: str | None = Field(None, min_length=2, max_length=160)
    email: str | None = Field(None, min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    bio: str | None = Field(None, max_length=1000)
    instructor_description: str | None = Field(None, max_length=5000)
    conscious: str | None = Field(None, max_length=120)
    district: str | None = Field(None, max_length=120)
    is_verified_email: bool | None = None


@router.get("")
async def get_lecturers(
    is_verified_email: bool | None = Query(
        None, description="Lọc theo email đã xác minh"
    ),
    is_banned: bool | None = Query(None, description="Lọc theo trạng thái bị cấm"),
    search: str | None = Query(None, description="Tìm kiếm theo tên hoặc email"),
    sort_by: str = Query("create_at", description="Cột sắp xếp"),
    order: str = Query("desc", description="Hướng sắp xếp asc|desc"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    await authorization.require_role(["ADMIN"])
    return await lecturer_service.get_lecturers_async(
        is_verified_email,
        is_banned,
        search,
        sort_by,
        order,
        page,
        size,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_lecturer(
    payload: AdminCreateLecturerInput = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    admin = await authorization.require_role(["ADMIN"])
    return await lecturer_service.create_lecturer_async(admin, payload)


@router.get("/candidates")
async def search_lecturer_candidates(
    search: str | None = Query(None),
    limit: int = Query(15, ge=1, le=50),
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    await authorization.require_role(["ADMIN"])
    return await lecturer_service.search_candidate_users_async(search=search, limit=limit)


@router.get("/export")
async def export_lecturers(
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    await authorization.require_role(["ADMIN"])
    return await lecturer_service.export_lecturers_async()


@router.put("/{lecturer_id}")
async def update_lecturer(
    lecturer_id: uuid.UUID,
    payload: AdminUpdateLecturerInput = Body(...),
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    admin = await authorization.require_role(["ADMIN"])
    return await lecturer_service.update_lecturer_async(admin, lecturer_id, payload)


@router.delete("/{lecture_id}")
async def delete_lecture(
    lecture_id: uuid.UUID,
    reason: str = Query(..., description="Lý do xoá giảng viên"),
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    admin = await authorization.require_role(["ADMIN"])
    return await lecturer_service.delete_lecture_async(admin, lecture_id, reason)


@router.get("/{lecturer_id}")
async def get_lecturer_detail(
    lecturer_id: str,
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
    page: int = Query(1, ge=1),
    size: int = Query(5, le=20),
):
    await authorization.require_role(["ADMIN"])
    return await lecturer_service.get_lecturer_detail_async(lecturer_id, page, size)


@router.get("/{lecturer_id}/courses")
async def get_lecturer_courses(
    lecturer_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(5, le=50),
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    await authorization.require_role(["ADMIN"])
    return await lecturer_service.get_lecturer_courses_async(
        lecturer_id, page, size, sort_by, order
    )


@router.post("/{lecturer_id}/ban", status_code=status.HTTP_200_OK)
async def ban_lecturer(
    lecturer_id: uuid.UUID,
    schema: BlockUser,
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    """
    🔒 Admin chặn giảng viên.
    """
    admin = await authorization.require_role(["ADMIN"])
    result = await lecturer_service.ban_lecturer_async(admin, lecturer_id, schema)
    return result


@router.post("/{lecturer_id}/unban", status_code=status.HTTP_200_OK)
async def unban_lecturer(
    lecturer_id: uuid.UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    """
    🔓 Admin mở chặn giảng viên.
    """
    admin = await authorization.require_role(["ADMIN"])
    result = await lecturer_service.unlock_ban_lecturer_async(admin, lecturer_id)
    return result


@router.delete("/{lecturer_id}/remove_role_lecturer", status_code=status.HTTP_200_OK)
async def delete_role_lecturer(
    lecturer_id: uuid.UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    """
    ❌ Admin xoá vai trò giảng viên của user.
    """
    admin = await authorization.require_role(["ADMIN"])
    result = await lecturer_service.remove_instructor_rights_async(admin, lecturer_id)
    return result


@router.post("/{user_id}/add_role_lecturer", status_code=status.HTTP_200_OK)
async def add_role_lecturer(
    user_id: uuid.UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    lecturer_service: LecturerService = Depends(LecturerService),
):
    admin = await authorization.require_role(["ADMIN"])
    result = await lecturer_service.add_instructor_rights_async(admin, user_id)
    return result
