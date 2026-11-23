from asyncio import timeout
from hashlib import sha256
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from pydantic import ValidationError
from redis.exceptions import RedisError
from sqlalchemy import select

from app.core.deps import AuthorizationService
from app.core.redis import get_redis
from app.db.models.database import Courses
from app.schemas.catalog import (
    BrowseFiltersResponse,
    CatalogCoursesResponse,
    CatalogFilters,
    CatalogOptionsResponse,
    CourseTaxonomy,
    TaxonomyInput,
)
from app.schemas.catalog_combos import CatalogComboFilters, CatalogCombosResponse
from app.services.catalog import CatalogService, public_course
from app.services.catalog_combos import cache_seconds, catalog_combos

router = APIRouter(tags=["Education Catalog V2"])
CATALOG_DEP = Depends(CatalogService)
AUTH_DEP = Depends(AuthorizationService)
COURSES_CACHE_TTL = 60


@router.get(
    "/catalog/filters",
    response_model=CatalogOptionsResponse,
    response_model_exclude_unset=True,
)
async def filters(
    response: Response,
    include_course_counts: bool = False,
    service: CatalogService = CATALOG_DEP,
):
    options = await service.filters()
    if include_course_counts:
        options["course_counts"] = await service.course_counts()
        response.headers["Cache-Control"] = "public, max-age=30"
    return options


@router.get("/catalog/courses", response_model=CatalogCoursesResponse)
async def courses(
    filters: Annotated[CatalogFilters, Query()],
    response: Response,
    service: CatalogService = CATALOG_DEP,
) -> CatalogCoursesResponse:
    if filters.cursor is not None or filters.keyword:
        response.headers["Cache-Control"] = "no-store"
        return CatalogCoursesResponse.model_validate(
            await service.courses(filters, include_card_details=True)
        )

    response.headers["Cache-Control"] = "public, max-age=30"
    key = "catalog:courses:v1:" + sha256(filters.model_dump_json().encode()).hexdigest()
    redis = get_redis()
    can_cache = True
    try:
        async with timeout(0.25):
            cached = await redis.get(key)
        if cached is not None:
            return CatalogCoursesResponse.model_validate_json(cached)
    except (RedisError, TimeoutError):
        can_cache = False
    except ValidationError:
        pass

    result = CatalogCoursesResponse.model_validate(
        await service.courses(filters, include_card_details=True)
    )
    if can_cache:
        try:
            async with timeout(0.25):
                await redis.set(key, result.model_dump_json(), ex=COURSES_CACHE_TTL)
        except (RedisError, TimeoutError):
            pass
    return result


@router.get("/catalog/browse-filters", response_model=BrowseFiltersResponse)
async def browse_filters(service: CatalogService = CATALOG_DEP):
    return await service.browse_filters()


@router.get("/catalog/combos", response_model=CatalogCombosResponse)
async def combos(
    response: Response,
    filters: Annotated[CatalogComboFilters, Query()],
    service: CatalogService = CATALOG_DEP,
):
    result = await catalog_combos(service.db, filters)
    response.headers["Cache-Control"] = f"public, max-age={min(30, cache_seconds(result))}"
    return result


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
