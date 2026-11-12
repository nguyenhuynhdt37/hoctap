from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, UploadFile
from sqlalchemy import select

from app.core.deps import AuthorizationService
from app.db.models.database import Courses
from app.schemas.catalog import (
    BrowseFiltersResponse,
    CatalogCoursesResponse,
    CatalogFilters,
    CourseTaxonomy,
    MemberInput,
    ProviderAdminInput,
    ProviderCreationRequestInput,
    ProviderDirectoryFilters,
    ProviderInput,
    ProviderRequestDecision,
    TaxonomyInput,
)
from app.services.catalog import CatalogService, public_course
from app.services.provider_joins import JoinDecision, JoinInput, ProviderJoinService
from app.services.providers import ProviderService

router = APIRouter(tags=["Education Catalog V2"])
CATALOG_DEP = Depends(CatalogService)
PROVIDER_DEP = Depends(ProviderService)
AUTH_DEP = Depends(AuthorizationService)
JOIN_DEP = Depends(ProviderJoinService)


@router.get("/catalog/filters")
async def filters(service: CatalogService = CATALOG_DEP):
    return await service.filters()


@router.get("/catalog/courses", response_model=CatalogCoursesResponse)
async def courses(
    filters: Annotated[CatalogFilters, Query()], service: CatalogService = CATALOG_DEP
):
    return await service.courses(filters)


@router.get("/catalog/browse-filters", response_model=BrowseFiltersResponse)
async def browse_filters(service: CatalogService = CATALOG_DEP):
    return await service.browse_filters()


@router.get("/catalog/courses/{course_id}/taxonomy")
async def course_taxonomy(
    course_id: UUID,
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    visible = await service.db.scalar(
        select(Courses.id).where(Courses.id == course_id, public_course())
    )
    if not visible:
        user = await auth.get_current_user_if_any()
        course = await service.db.get(Courses, course_id)
        if (
            not user
            or not course
            or (
                course.instructor_id != user.id
                and "ADMIN" not in await auth.get_list_role_in_user(user)
            )
        ):
            raise HTTPException(404, "Không tìm thấy khóa học")
    return await service.course_taxonomy(course_id)


@router.put("/lecturer/courses/{course_id}/taxonomy")
async def assign_course(
    course_id: UUID,
    data: CourseTaxonomy,
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    course = await service.db.scalar(
        select(Courses)
        .where(Courses.id == course_id, Courses.instructor_id == user.id)
        .with_for_update()
    )
    if not course:
        raise HTTPException(404, "Không tìm thấy khóa học")
    return await service.assign(course, data, user.id)


@router.put("/admin/catalog/courses/{course_id}/taxonomy")
async def admin_assign_course(
    course_id: UUID,
    data: CourseTaxonomy,
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["ADMIN"])
    course = await service.db.scalar(
        select(Courses).where(Courses.id == course_id).with_for_update()
    )
    if not course:
        raise HTTPException(404, "Không tìm thấy khóa học")
    return await service.assign(course, data, user.id, admin=True)


@router.get("/catalog/{kind}")
async def taxonomy(
    kind: str,
    grade: int | None = Query(None, ge=1, le=12),
    service: CatalogService = CATALOG_DEP,
):
    rows = await service.list_taxonomy(kind)
    if kind == "subjects" and grade:
        from app.db.models.catalog import Grade, grade_subjects

        ids = set(
            (
                await service.db.scalars(
                    select(grade_subjects.c.subject_id)
                    .join(Grade, Grade.id == grade_subjects.c.grade_id)
                    .where(Grade.grade_number == grade)
                )
            ).all()
        )
        rows = [r for r in rows if r["id"] in ids]
    return rows


@router.get("/admin/catalog/{kind}")
async def admin_taxonomy(
    kind: str,
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.list_taxonomy(kind, include_inactive=True)


@router.post("/admin/catalog/{kind}")
async def create_taxonomy(
    kind: str,
    data: TaxonomyInput,
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.taxonomy_mutation(kind, data)


@router.put("/admin/catalog/grades/{grade_id}/subjects")
async def map_subjects(
    grade_id: UUID,
    subject_ids: Annotated[list[UUID], Body(max_length=100)],
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.set_grade_subjects(grade_id, subject_ids)


@router.put("/admin/catalog/{kind}/{item_id}")
async def update_taxonomy(
    kind: str,
    item_id: UUID,
    data: TaxonomyInput,
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.taxonomy_mutation(kind, data, item_id)


@router.delete("/admin/catalog/{kind}/{item_id}")
async def delete_taxonomy(
    kind: str,
    item_id: UUID,
    service: CatalogService = CATALOG_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.delete_taxonomy(kind, item_id)


@router.get("/providers")
async def providers(
    filters: Annotated[ProviderDirectoryFilters, Query()],
    service: ProviderService = PROVIDER_DEP,
):
    return await service.listing(**filters.model_dump())


@router.get("/providers/{slug}")
async def provider_detail(slug: str, service: ProviderService = PROVIDER_DEP):
    return await service.detail(slug)


@router.get("/lecturer/providers")
async def my_providers(
    filters: Annotated[ProviderDirectoryFilters, Query()],
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.listing(**filters.model_dump(), user_id=user.id)


@router.post("/lecturer/providers", deprecated=True)
async def create_provider(
    data: ProviderInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["LECTURER"])
    raise HTTPException(403, "Vui lòng gửi yêu cầu tạo đơn vị để admin xét duyệt")


@router.put("/lecturer/providers/{provider_id}", deprecated=True)
async def edit_provider(
    provider_id: UUID,
    data: ProviderInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["LECTURER"])
    raise HTTPException(403, "Chỉ admin được sửa thông tin đơn vị")


@router.get("/admin/providers")
async def admin_providers(
    filters: Annotated[ProviderDirectoryFilters, Query()],
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.listing(**filters.model_dump(), admin=True)


@router.post("/admin/providers")
async def admin_create_provider(
    data: ProviderAdminInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["ADMIN"])
    return await service.save(data, user.id, admin=True)


@router.put("/admin/providers/{provider_id}")
async def admin_edit_provider(
    provider_id: UUID,
    data: ProviderAdminInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["ADMIN"])
    return await service.save(data, user.id, provider_id, admin=True)


@router.put("/admin/providers/{provider_id}/members")
@router.put("/providers/{provider_id}/members", deprecated=True)
async def membership(
    provider_id: UUID,
    data: MemberInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["ADMIN"])
    return await service.member(
        provider_id,
        data,
        user.id,
        admin=True,
    )


@router.get("/lecturer/provider-directory")
async def lecturer_provider_directory(
    filters: Annotated[ProviderDirectoryFilters, Query()],
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.listing(**filters.model_dump(), directory_user_id=user.id)


@router.get("/admin/providers/{provider_id}/members")
async def provider_members(
    provider_id: UUID,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.members(provider_id)


RequestStatus = Literal["pending", "approved", "rejected", "cancelled"]


@router.post("/lecturer/provider-requests", status_code=201)
async def submit_provider_request(
    data: ProviderCreationRequestInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.submit_request(data, user.id)


@router.get("/lecturer/provider-requests")
async def lecturer_provider_requests(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: RequestStatus | None = None,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.request_listing(
        user_id=user.id, page=page, size=size, status=status
    )


@router.get("/lecturer/provider-requests/{request_id}")
async def lecturer_provider_request(
    request_id: UUID,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.request_record(
        await service.request_detail(request_id, user_id=user.id)
    )


@router.post("/lecturer/provider-requests/{request_id}/cancel")
async def cancel_provider_request(
    request_id: UUID,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.cancel_request(request_id, user.id)


@router.get("/admin/provider-requests")
async def admin_provider_requests(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: RequestStatus | None = None,
    search: str | None = Query(None, max_length=160),
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.request_listing(
        page=page, size=size, status=status, search=search
    )


@router.get("/admin/provider-requests/{request_id}")
async def admin_provider_request(
    request_id: UUID,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.request_record(await service.request_detail(request_id))


@router.post("/admin/provider-requests/{request_id}/decision")
async def decide_provider_request(
    request_id: UUID,
    data: ProviderRequestDecision,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["ADMIN"])
    return await service.decide_request(request_id, data, user.id)


@router.get("/admin/provider-member-candidates")
async def provider_member_candidates(
    search: str = Query(..., min_length=2, max_length=160),
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.member_candidates(search)


@router.get("/admin/providers/{provider_id}/membership-events")
async def provider_membership_events(
    provider_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.membership_events(provider_id, page, size)


@router.post("/admin/providers/assets/{kind}")
async def provider_image(
    kind: Literal["avatar", "banner"],
    file: UploadFile,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    from app.services.provider_images import upload_provider_image
    from app.services.shares.file_storage import get_file_storage_service

    return await upload_provider_image(file, kind, get_file_storage_service())


@router.get("/lecturer/provider-join-requests")
async def my_join_requests(
    status: Literal["pending", "approved", "rejected", "cancelled"] | None = None,
    search: str | None = Query(None, max_length=160),
    sort: Literal["newest", "oldest", "provider_name"] = "newest",
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    service: ProviderJoinService = JOIN_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.listing_joins(
        user_id=user.id, page=page, size=size, status=status, search=search, sort=sort
    )


@router.post("/lecturer/provider-join-requests")
async def submit_join_request(
    data: JoinInput,
    service: ProviderJoinService = JOIN_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.submit_join(data, user.id)


@router.post("/lecturer/provider-join-requests/{request_id}/cancel")
async def cancel_join_request(
    request_id: UUID,
    service: ProviderJoinService = JOIN_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.cancel_join(request_id, user.id)


@router.get("/admin/provider-join-requests")
async def admin_join_requests(
    status: Literal["pending", "approved", "rejected", "cancelled"] | None = None,
    search: str | None = Query(None, max_length=160),
    sort: Literal["newest", "oldest", "provider_name"] = "newest",
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    service: ProviderJoinService = JOIN_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.listing_joins(
        status=status, page=page, size=size, search=search, sort=sort
    )


@router.post("/admin/provider-join-requests/{request_id}/decision")
async def decide_join_request(
    request_id: UUID,
    data: JoinDecision,
    service: ProviderJoinService = JOIN_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["ADMIN"])
    return await service.decide_join(request_id, data, user.id)


@router.get("/lecturer/provider-directory-options")
async def lecturer_directory_options(
    service: ProviderService = PROVIDER_DEP, auth: AuthorizationService = AUTH_DEP
):
    await auth.require_role(["LECTURER"])
    return await service.directory_options()


@router.get("/admin/provider-directory-options")
async def admin_directory_options(
    service: ProviderService = PROVIDER_DEP, auth: AuthorizationService = AUTH_DEP
):
    await auth.require_role(["ADMIN"])
    return await service.directory_options(admin=True)
