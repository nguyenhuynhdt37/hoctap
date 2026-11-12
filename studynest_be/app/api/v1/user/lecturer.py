from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.deps import AuthorizationService
from app.schemas.catalog import BrowseFiltersResponse
from app.schemas.user.instructors import (
    InstructorCourseFilters,
    InstructorCoursePage,
    InstructorFilters,
    InstructorPage,
    InstructorProfile,
    PublicInstructor,
    SavedInstructorIds,
    SavedInstructorState,
)
from app.services.shares.notification import NotificationService
from app.services.user.instructor_discovery import InstructorDiscoveryService
from app.services.user.lecturer import LecturerService

SERVICE = Depends(InstructorDiscoveryService)
AUTH = Depends(AuthorizationService)
LEGACY = Depends(LecturerService)
NOTIFICATIONS = Depends(NotificationService)

router = APIRouter(prefix="/users/instructors", tags=["User • instructors"])


@router.get("", response_model=InstructorPage)
async def directory(
    filters: Annotated[InstructorFilters, Query()],
    service: InstructorDiscoveryService = SERVICE,
):
    return await service.listing(filters)


@router.get("/filter-options", response_model=BrowseFiltersResponse)
async def filter_options(service: InstructorDiscoveryService = SERVICE):
    return await service.options()


@router.get("/top", response_model=list[PublicInstructor])
async def get_top_instructors(service: LecturerService = LEGACY):
    return await service.get_top4_instructors_async()


@router.get("/saved", response_model=InstructorPage)
async def saved_instructors(
    filters: Annotated[InstructorFilters, Query()],
    service: InstructorDiscoveryService = SERVICE,
    auth: AuthorizationService = AUTH,
):
    user = await auth.get_current_user()
    service.require_viewer(user)
    return await service.listing(filters, saved_by=user.id)


@router.get("/saved/ids", response_model=SavedInstructorIds)
async def saved_ids(
    ids: Annotated[list[UUID] | None, Query(max_length=30)] = None,
    service: InstructorDiscoveryService = SERVICE,
    auth: AuthorizationService = AUTH,
):
    return await service.saved_ids(await auth.get_current_user(), ids or [])


@router.get("/{lecturer_id}", response_model=InstructorProfile)
async def get_instructor_detail(
    lecturer_id: UUID, service: InstructorDiscoveryService = SERVICE
):
    return await service.detail(lecturer_id)


@router.get("/{lecturer_id}/courses", response_model=InstructorCoursePage)
async def get_instructor_courses(
    lecturer_id: UUID,
    filters: Annotated[InstructorCourseFilters, Query()],
    service: InstructorDiscoveryService = SERVICE,
    auth: AuthorizationService = AUTH,
):
    user = await auth.get_current_user_if_any()
    return await service.courses(lecturer_id, filters, user.id if user else None)


@router.put("/{lecturer_id}/saved", response_model=SavedInstructorState)
async def save_instructor(
    lecturer_id: UUID,
    service: InstructorDiscoveryService = SERVICE,
    auth: AuthorizationService = AUTH,
):
    return await service.save(await auth.get_current_user(), lecturer_id, True)


@router.delete("/{lecturer_id}/saved", response_model=SavedInstructorState)
async def unsave_instructor(
    lecturer_id: UUID,
    service: InstructorDiscoveryService = SERVICE,
    auth: AuthorizationService = AUTH,
):
    return await service.save(await auth.get_current_user(), lecturer_id, False)


@router.post("/become")
async def become_instructor(
    authorization_service: AuthorizationService = AUTH,
    notification_service: NotificationService = NOTIFICATIONS,
    service: LecturerService = LEGACY,
):
    """
    Đăng ký làm giảng viên:
    - Trừ 1.000.000 VNĐ trong ví user
    - Tạo role LECTURER nếu chưa có
    - Gán role cho user
    - Log giao dịch vào bảng Transactions
    """
    user = await authorization_service.get_current_user()
    return await service.become_instructor_async(user, notification_service)
