from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
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
    ProviderInput,
    TaxonomyInput,
)
from app.services.catalog import CatalogService, public_course
from app.services.providers import ProviderService

router = APIRouter(tags=["Education Catalog V2"])
CATALOG_DEP = Depends(CatalogService)
PROVIDER_DEP = Depends(ProviderService)
AUTH_DEP = Depends(AuthorizationService)


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
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=160),
    service: ProviderService = PROVIDER_DEP,
):
    return await service.listing(page, size, search)


@router.get("/providers/{slug}")
async def provider_detail(slug: str, service: ProviderService = PROVIDER_DEP):
    return await service.detail(slug)


@router.get("/lecturer/providers")
async def my_providers(
    service: ProviderService = PROVIDER_DEP, auth: AuthorizationService = AUTH_DEP
):
    user = await auth.require_role(["LECTURER"])
    return await service.listing(size=100, user_id=user.id)


@router.post("/lecturer/providers")
async def create_provider(
    data: ProviderInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.save(data, user.id)


@router.put("/lecturer/providers/{provider_id}")
async def edit_provider(
    provider_id: UUID,
    data: ProviderInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER"])
    return await service.save(data, user.id, provider_id)


@router.get("/admin/providers")
async def admin_providers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=160),
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    await auth.require_role(["ADMIN"])
    return await service.listing(page, size, search, admin=True)


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


@router.put("/providers/{provider_id}/members")
async def membership(
    provider_id: UUID,
    data: MemberInput,
    service: ProviderService = PROVIDER_DEP,
    auth: AuthorizationService = AUTH_DEP,
):
    user = await auth.require_role(["LECTURER", "ADMIN"])
    return await service.member(
        provider_id,
        data,
        user.id,
        admin="ADMIN" in await auth.get_list_role_in_user(user),
    )
