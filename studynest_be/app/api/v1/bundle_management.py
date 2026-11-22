"""Lecturer combo sales and owner-scoped coupons. Admins do not manage combos."""

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select, text

from app.core.deps import AuthorizationService
from app.db.models.bundle_commerce import BundleVersionReview
from app.db.models.database import Courses
from app.db.sesson import get_session
from app.schemas.learning_paths import BundleCouponInput, BundleInput
from app.services.bundle_coupons import BundleCouponService
from app.services.bundle_management import BundleManagementService
from app.services.catalog import public_course, record
from app.services.provider_images import MAX_IMAGE_BYTES, normalize_image
from app.services.shares.file_storage import FileStorageService, get_file_storage_service

router = APIRouter(tags=["Instructor bundle products"])
DB = Depends(get_session)
AUTH = Depends(AuthorizationService)


@router.post("/lecturer/bundles/thumbnail")
async def upload_thumbnail(
    file: UploadFile = File(...),
    db=DB,
    auth: AuthorizationService = AUTH,
    storage: FileStorageService = Depends(get_file_storage_service),
):
    user = await auth.require_role(["LECTURER"])
    await BundleManagementService(db).policy.lecturer(user.id)
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Ảnh bìa combo tối đa 5 MB")
    image = await asyncio.to_thread(normalize_image, content, "banner")
    result = await storage.upload_file(
        ["bundles", str(user.id), "thumbnails"], "thumbnail.webp", image, "image/webp"
    )
    return {"thumbnail_url": result["url"]}


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
    select_cols = """
        SELECT
            b.id AS bundle_id,
            b.code,
            b.slug,
            b.is_active,
            v.id,
            v.title,
            v.version,
            v.price,
            v.status,
            r.status AS review_status,
            COALESCE((SELECT SUM(i.list_price) FROM public.course_bundle_items i WHERE i.version_id = v.id), 0) AS original_price,
            COALESCE((SELECT COUNT(i.course_id) FROM public.course_bundle_items i WHERE i.version_id = v.id), 0) AS course_count,
            COALESCE(v.thumbnail_url, (SELECT c.thumbnail_url
             FROM public.course_bundle_items bi
             JOIN public.courses c ON c.id = bi.course_id
             WHERE bi.version_id = v.id
             ORDER BY bi.position ASC LIMIT 1)) AS primary_thumbnail,
            COALESCE((SELECT COUNT(DISTINCT bo.id) FROM public.bundle_orders bo WHERE bo.version_id = v.id), 0) AS total_orders,
            COALESCE((SELECT SUM(bol.paid) FROM public.bundle_orders bo JOIN public.bundle_order_lines bol ON bol.order_id = bo.id WHERE bo.version_id = v.id), 0) AS total_revenue
    """
    rows = (
        (
            await db.execute(
                text(
                    select_cols
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
        "items": [
            {
                **dict(row),
                "original_price": str(row["original_price"]),
                "price": str(row["price"]),
                "total_revenue": str(row["total_revenue"]),
            }
            for row in rows
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.put("/lecturer/bundles/{bundle_id}/active")
async def toggle_active(
    bundle_id: UUID, active: bool, db=DB, auth: AuthorizationService = AUTH
):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleManagementService(db).active_owned(bundle_id, active, user.id)


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


@router.get("/lecturer/bundles/{bundle_id}/coupons")
async def lecturer_coupons(
    bundle_id: UUID, db=DB, auth: AuthorizationService = AUTH
):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleCouponService(db).listing_owned(bundle_id, user.id)


@router.post("/lecturer/bundles/{bundle_id}/coupons")
async def create_lecturer_coupon(
    bundle_id: UUID,
    data: BundleCouponInput,
    db=DB,
    auth: AuthorizationService = AUTH,
):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleCouponService(db).save_owned(bundle_id, data, user.id)


@router.put("/lecturer/bundles/{bundle_id}/coupons/{coupon_id}")
async def update_lecturer_coupon(
    bundle_id: UUID,
    coupon_id: UUID,
    data: BundleCouponInput,
    db=DB,
    auth: AuthorizationService = AUTH,
):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleCouponService(db).save_owned(
        bundle_id, data, user.id, coupon_id=coupon_id
    )


@router.put("/lecturer/bundles/{bundle_id}/coupons/{coupon_id}/active")
async def active_lecturer_coupon(
    bundle_id: UUID,
    coupon_id: UUID,
    active: bool,
    db=DB,
    auth: AuthorizationService = AUTH,
):
    user = await auth.require_role(["LECTURER"])
    await ready(db)
    return await BundleCouponService(db).active_owned(
        bundle_id, coupon_id, active, user.id
    )
