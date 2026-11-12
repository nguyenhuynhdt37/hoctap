"""Management-only V2 routes; financial publication is enabled in a later phase."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, text

from app.core.deps import AuthorizationService
from app.db.models.bundle_commerce import BundleVersionReview
from app.db.models.database import Courses
from app.db.sesson import get_session
from app.schemas.learning_paths import BundleInput
from app.services.bundle_management import BundleManagementService
from app.services.catalog import public_course, record

router = APIRouter(tags=["Instructor bundle products"])
DB = Depends(get_session)
AUTH = Depends(AuthorizationService)


async def ready(db):
    if not await db.scalar(text("SELECT to_regclass('public.bundle_version_reviews')")):
        raise HTTPException(
            503, "Chức năng quản lý combo đang chờ cập nhật cơ sở dữ liệu"
        )


@router.get("/lecturer/bundles/course-options")
async def course_options(
    keyword: str = Query("", max_length=160), db=DB, auth: AuthorizationService = AUTH
):
    user = await auth.require_role(["LECTURER"])
    service = BundleManagementService(db)
    await service.policy.lecturer(user.id)
    rows = (
        await db.scalars(
            select(Courses)
            .where(
                Courses.instructor_id == user.id,
                Courses.currency == "VND",
                public_course(),
                Courses.title.ilike("%" + keyword + "%"),
            )
            .order_by(Courses.title, Courses.id)
            .limit(60)
        )
    ).all()
    return {
        "items": [
            {
                "id": row.id,
                "title": row.title,
                "slug": row.slug,
                "base_price": str(row.base_price or 0),
                "currency": row.currency,
                "thumbnail_url": row.thumbnail_url,
            }
            for row in rows
        ]
    }


@router.get("/lecturer/bundles")
async def listing(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=60),
    keyword: str = Query("", max_length=160),
    db=DB,
    auth: AuthorizationService = AUTH,
):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    await BundleManagementService(db).policy.lecturer(user.id)
    query = """FROM public.course_bundles b JOIN LATERAL (SELECT * FROM public.course_bundle_versions WHERE bundle_id=b.id ORDER BY version DESC LIMIT 1) v ON true LEFT JOIN public.bundle_version_reviews r ON r.version_id=v.id WHERE b.owner_id=:owner AND b.origin='lecturer' AND b.deleted_at IS NULL AND v.title ILIKE :keyword"""
    params = {
        "owner": user.id,
        "keyword": "%" + keyword + "%",
        "limit": limit,
        "offset": (page - 1) * limit,
    }
    total = await db.scalar(text("SELECT count(*) " + query), params)
    rows = (
        (
            await db.execute(
                text(
                    "SELECT b.id AS bundle_id,b.code,b.slug,b.is_active,v.id,v.title,v.version,v.price,v.status,r.status AS review_status "
                    + query
                    + " ORDER BY v.title,b.id LIMIT :limit OFFSET :offset"
                ),
                params,
            )
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/lecturer/bundles")
async def create(data: BundleInput, db=DB, auth: AuthorizationService = AUTH):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleManagementService(db).save(data, user.id)


@router.get("/lecturer/bundles/versions/{version_id}")
async def detail(version_id: UUID, db=DB, auth: AuthorizationService = AUTH):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    service = BundleManagementService(db)
    await service.version(version_id, user.id)
    result = await service.bundles.detail(version_id, admin=True)
    review = await db.get(BundleVersionReview, version_id)
    return {**result, "review": record(review) if review else None}


@router.put("/lecturer/bundles/versions/{version_id}")
async def update(
    version_id: UUID, data: BundleInput, db=DB, auth: AuthorizationService = AUTH
):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleManagementService(db).save(data, user.id, version_id)


@router.post("/lecturer/bundles/versions/{version_id}/submit")
async def submit(version_id: UUID, db=DB, auth: AuthorizationService = AUTH):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleManagementService(db).submit(version_id, user.id)


class ReviewDecision(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    decision: Literal["approved", "changes_requested"]
    reason: str = Field(min_length=10, max_length=4000)


@router.post("/admin/bundles/versions/{version_id}/review")
async def review(
    version_id: UUID, data: ReviewDecision, db=DB, auth: AuthorizationService = AUTH
):
    user = await auth.require_role(["ADMIN"])
    await ready(db)
    return await BundleManagementService(db).review(
        version_id, user.id, data.decision, data.reason
    )
