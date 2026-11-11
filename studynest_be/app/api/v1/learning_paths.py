from uuid import UUID

from app.core.deps import AuthorizationService
from app.db.models.learning_paths import (
    BundleOrder,
    CourseBundle,
    LearningPath,
    PathVersion,
    UserLearningPath,
)
from app.db.sesson import get_session
from app.schemas.learning_paths import (
    BundleCheckout,
    BundleCouponInput,
    BundleInput,
    FrameworkInput,
    PathInput,
    ProficiencyInput,
)
from app.services.bundle_coupons import BundleCouponService
from app.services.bundles import BundleService
from app.services.learning_paths import LearningPathService
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

router = APIRouter(tags=["Learning paths & bundles"])
SESSION = Depends(get_session)
AUTH = Depends(AuthorizationService)
IDS_QUERY = Query(default=[])


async def require_path_admin(auth):
    user = await auth.require_role(["ADMIN"])
    if user.is_banned or user.deleted_at:
        raise HTTPException(403, "Tài khoản quản trị không hoạt động")
    return user


@router.get("/admin/learning-paths/course-options")
async def course_options(
    keyword: str = Query("", max_length=160),
    subject_id: UUID | None = None,
    ids: list[UUID] = IDS_QUERY,
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    await require_path_admin(auth)
    from app.db.models.database import Courses

    stmt = select(
        Courses.id,
        Courses.title,
        Courses.slug,
        Courses.subject_id,
        Courses.base_price,
        Courses.currency,
        Courses.is_published,
        Courses.approval_status,
    ).where(
        Courses.deleted_at.is_(None),
        ~Courses.slug.like("demo-catalog-%"),
        ~Courses.slug.like("seed-shop-%"),
    )
    if len(ids) > 100:
        raise HTTPException(422, "Tối đa 100 ID")
    if ids:
        stmt = stmt.where(Courses.id.in_(ids))
    elif keyword:
        stmt = stmt.where(Courses.title.ilike("%" + keyword + "%"))
    if subject_id:
        stmt = stmt.where(Courses.subject_id == subject_id)
    return {
        "items": [
            dict(r)
            for r in (
                await db.execute(
                    stmt.order_by(Courses.title, Courses.id).limit(100 if ids else 30)
                )
            ).mappings()
        ]
    }


@router.get("/learning-paths/frameworks")
async def frameworks(db=SESSION):
    return await LearningPathService(db).frameworks()


@router.post("/admin/learning-paths/frameworks")
async def framework_create(
    data: FrameworkInput, db=SESSION, auth: AuthorizationService = AUTH
):
    await require_path_admin(auth)
    return await LearningPathService(db).create_framework(data)


@router.get("/admin/courses/{course_id}/proficiency")
async def labels(course_id: UUID, db=SESSION, auth: AuthorizationService = AUTH):
    await require_path_admin(auth)
    return await LearningPathService(db).labels(course_id)


@router.put("/admin/courses/{course_id}/proficiency")
async def label(
    course_id: UUID,
    data: ProficiencyInput,
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    user = await require_path_admin(auth)
    return await LearningPathService(db).label_course(course_id, data, user.id)


@router.get("/learning-paths")
async def paths(
    page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=50), db=SESSION
):
    return await LearningPathService(db).listing(page=page, limit=limit)


@router.get("/learning-paths/my")
async def my_paths(db=SESSION, auth: AuthorizationService = AUTH):
    user = await auth.get_current_user()
    rows = (
        (
            await db.execute(
                select(
                    UserLearningPath.version_id, PathVersion.title, LearningPath.slug
                )
                .join(PathVersion, PathVersion.id == UserLearningPath.version_id)
                .join(LearningPath, LearningPath.id == PathVersion.path_id)
                .where(UserLearningPath.user_id == user.id)
                .order_by(UserLearningPath.started_at.desc())
            )
        )
        .mappings()
        .all()
    )
    return {"items": [dict(row) for row in rows]}


@router.get("/learning-paths/versions/{version_id}")
async def path_version(version_id: UUID, db=SESSION, auth: AuthorizationService = AUTH):
    user = await auth.get_current_user_if_any()
    return await LearningPathService(db).detail(
        version_id, user_id=user.id if user else None
    )


@router.post("/learning-paths/versions/{version_id}/follow")
async def follow(version_id: UUID, db=SESSION, auth: AuthorizationService = AUTH):
    user = await auth.get_current_user()
    return await LearningPathService(db).follow(version_id, user.id)


@router.get("/learning-paths/{slug}")
async def path_detail(slug: str, db=SESSION, auth: AuthorizationService = AUTH):
    user = await auth.get_current_user_if_any()
    return await LearningPathService(db).by_slug(slug, user.id if user else None)


@router.get("/admin/learning-paths")
async def admin_paths(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    keyword: str = Query("", max_length=160),
    status: str | None = Query(None, pattern="^(draft|published|archived)$"),
    active: bool | None = None,
    history_id: UUID | None = None,
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    await require_path_admin(auth)
    return await LearningPathService(db).listing(
        admin=True,
        page=page,
        limit=limit,
        keyword=keyword,
        status=status,
        active=active,
        history_id=history_id,
    )


@router.post("/admin/learning-paths")
async def create_path(data: PathInput, db=SESSION, auth: AuthorizationService = AUTH):
    user = await require_path_admin(auth)
    return await LearningPathService(db).create(data, user.id)


@router.get("/admin/learning-paths/versions/{version_id}")
async def admin_path_detail(
    version_id: UUID, db=SESSION, auth: AuthorizationService = AUTH
):
    await require_path_admin(auth)
    return await LearningPathService(db).detail(version_id, admin=True)


@router.put("/admin/learning-paths/versions/{version_id}")
async def update_path(
    version_id: UUID, data: PathInput, db=SESSION, auth: AuthorizationService = AUTH
):
    user = await require_path_admin(auth)
    return await LearningPathService(db).create(data, user.id, version_id=version_id)


@router.post("/admin/learning-paths/versions/{version_id}/publish")
async def publish_path(version_id: UUID, db=SESSION, auth: AuthorizationService = AUTH):
    await require_path_admin(auth)
    return await LearningPathService(db).publish(version_id)


@router.get("/bundles")
async def bundles(
    page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=50), db=SESSION
):
    return await BundleService(db).listing(page=page, limit=limit)


@router.get("/bundles/orders/my")
async def orders(db=SESSION, auth: AuthorizationService = AUTH):
    user = await auth.get_current_user()
    rows = (
        await db.scalars(
            select(BundleOrder)
            .where(BundleOrder.user_id == user.id)
            .order_by(BundleOrder.created_at.desc())
            .limit(100)
        )
    ).all()
    from app.services.catalog import record

    return {"items": [record(r) for r in rows]}


@router.get("/bundles/orders/{order_id}")
async def receipt(order_id: UUID, db=SESSION, auth: AuthorizationService = AUTH):
    user = await auth.get_current_user()
    return await BundleService(db).receipt(order_id, user.id)


@router.get("/bundles/versions/{version_id}/quote")
async def quote(
    version_id: UUID,
    coupon_code: str | None = Query(None, max_length=40),
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    user = await auth.get_current_user_if_any()
    return await BundleService(db).quote(
        version_id, user.id if user else None, coupon_code=coupon_code
    )


@router.post("/bundles/checkout")
async def checkout(data: BundleCheckout, db=SESSION, auth: AuthorizationService = AUTH):
    user = await auth.get_current_user()
    return await BundleService(db).checkout(data, user.id)


@router.get("/bundles/{slug}")
async def bundle_detail(slug: str, db=SESSION):
    return await BundleService(db).by_slug(slug)


@router.get("/admin/bundles")
async def admin_bundles(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    keyword: str = Query("", max_length=160),
    status: str | None = Query(None, pattern="^(draft|published|archived)$"),
    active: bool | None = None,
    history_id: UUID | None = None,
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    await require_path_admin(auth)
    return await BundleService(db).listing(
        admin=True,
        page=page,
        limit=limit,
        keyword=keyword,
        status=status,
        active=active,
        history_id=history_id,
    )


@router.post("/admin/bundles")
async def create_bundle(
    data: BundleInput, db=SESSION, auth: AuthorizationService = AUTH
):
    user = await require_path_admin(auth)
    return await BundleService(db).create(data, user.id)


@router.get("/admin/bundles/versions/{version_id}")
async def admin_bundle_detail(
    version_id: UUID, db=SESSION, auth: AuthorizationService = AUTH
):
    await require_path_admin(auth)
    return await BundleService(db).detail(version_id, admin=True)


@router.put("/admin/bundles/versions/{version_id}")
async def update_bundle(
    version_id: UUID, data: BundleInput, db=SESSION, auth: AuthorizationService = AUTH
):
    user = await require_path_admin(auth)
    return await BundleService(db).create(data, user.id, version_id=version_id)


@router.get("/admin/bundles/{bundle_id}/coupons")
async def bundle_coupons(
    bundle_id: UUID, db=SESSION, auth: AuthorizationService = AUTH
):
    await require_path_admin(auth)
    return await BundleCouponService(db).listing(bundle_id)


@router.post("/admin/bundles/{bundle_id}/coupons")
async def create_coupon(
    bundle_id: UUID,
    data: BundleCouponInput,
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    user = await require_path_admin(auth)
    return await BundleCouponService(db).save(bundle_id, data, user.id)


@router.put("/admin/bundles/{bundle_id}/coupons/{coupon_id}")
async def update_coupon(
    bundle_id: UUID,
    coupon_id: UUID,
    data: BundleCouponInput,
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    user = await require_path_admin(auth)
    return await BundleCouponService(db).save(
        bundle_id, data, user.id, coupon_id=coupon_id
    )


@router.put("/admin/bundles/{bundle_id}/coupons/{coupon_id}/active")
async def active_coupon(
    bundle_id: UUID,
    coupon_id: UUID,
    active: bool,
    db=SESSION,
    auth: AuthorizationService = AUTH,
):
    await require_path_admin(auth)
    return await BundleCouponService(db).active(bundle_id, coupon_id, active)


@router.post("/admin/bundles/versions/{version_id}/publish")
async def publish_bundle(
    version_id: UUID, db=SESSION, auth: AuthorizationService = AUTH
):
    await require_path_admin(auth)
    return await BundleService(db).publish(version_id)


@router.put("/admin/learning-paths/{path_id}/active")
async def active_path(
    path_id: UUID, active: bool, db=SESSION, auth: AuthorizationService = AUTH
):
    await require_path_admin(auth)
    item = await db.get(LearningPath, path_id)
    if not item or item.deleted_at:
        raise HTTPException(404, "Không tìm thấy lộ trình")
    item.is_active = active
    await db.commit()
    return {"is_active": item.is_active}


@router.put("/admin/bundles/{bundle_id}/active")
async def active_bundle(
    bundle_id: UUID, active: bool, db=SESSION, auth: AuthorizationService = AUTH
):
    await require_path_admin(auth)
    item = await db.get(CourseBundle, bundle_id)
    if not item or item.deleted_at:
        raise HTTPException(404, "Không tìm thấy combo")
    item.is_active = active
    await db.commit()
    return {"is_active": item.is_active}
