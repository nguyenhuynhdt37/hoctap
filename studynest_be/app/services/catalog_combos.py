from asyncio import timeout
from datetime import UTC, datetime
from decimal import Decimal

from pydantic import ValidationError
from redis.exceptions import RedisError
from sqlalchemy import (
    and_,
    distinct,
    func,
    literal_column,
    or_,
    select,
    true,
    union_all,
)
from sqlalchemy.dialects.postgresql import aggregate_order_by
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.db.models.catalog import EducationLevel, Grade, Subject, course_grades
from app.db.models.database import (
    Courses,
    CourseSections,
    Lessons,
    LessonVideos,
    Role,
    User,
    UserRoles,
)
from app.db.models.learning_paths import (
    BundleCoupon,
    BundleItem,
    BundleOrder,
    BundleVersion,
    CourseBundle,
)
from app.schemas.catalog_combos import (
    COMBO_LEVELS,
    CatalogCombo,
    CatalogComboFilters,
    CatalogCombosResponse,
    ComboInstructor,
    ComboPromotion,
)
from app.services.catalog import public_course

CACHE_SECONDS = 60


def _eligible_bundles():
    owner_id = literal_column("public.course_bundles.owner_id", type_=User.id.type)
    lecturer = (
        select(UserRoles.user_id)
        .join(Role, Role.id == UserRoles.role_id)
        .where(UserRoles.user_id == User.id, Role.role_name == "LECTURER")
        .correlate(User)
        .exists()
    )
    latest = (
        select(
            BundleVersion.id.label("version_id"),
            BundleVersion.title,
            BundleVersion.thumbnail_url.label("thumbnail"),
            func.left(
                func.coalesce(
                    func.nullif(func.btrim(BundleVersion.subtitle), ""),
                    BundleVersion.description,
                ),
                240,
            ).label("description"),
            BundleVersion.price,
            BundleVersion.currency,
            BundleVersion.published_at,
        )
        .where(
            BundleVersion.bundle_id == CourseBundle.id,
            BundleVersion.status == "published",
        )
        .correlate(CourseBundle)
        .order_by(BundleVersion.version.desc())
        .limit(1)
        .lateral("latest_published_combo")
    )
    versions = (
        select(
            latest,
            CourseBundle.id,
            CourseBundle.slug,
            User.id.label("instructor_id"),
            User.fullname.label("instructor_name"),
        )
        .select_from(CourseBundle)
        .join(latest, true())
        .join(User, User.id == owner_id)
        .where(
            CourseBundle.is_active.is_(True),
            CourseBundle.deleted_at.is_(None),
            literal_column("public.course_bundles.origin") == "lecturer",
            literal_column("public.course_bundles.suspended_at").is_(None),
            User.deleted_at.is_(None),
            User.is_banned.is_not(True),
            lecturer,
        )
        .cte("latest_public_bundle_versions")
    )
    all_courses_sellable = func.bool_and(
        func.coalesce(
            and_(
                public_course(),
                Courses.instructor_id == versions.c.instructor_id,
                Courses.currency == versions.c.currency,
            ),
            False,
        )
    )
    totals = (
        select(
            BundleItem.version_id,
            func.count().label("course_count"),
            func.sum(func.coalesce(Courses.base_price, 0)).label("standalone_total"),
            func.sum(BundleItem.allocated_price).label("allocated_total"),
        )
        .join(versions, BundleItem.version_id == versions.c.version_id)
        .outerjoin(Courses, Courses.id == BundleItem.course_id)
        .group_by(BundleItem.version_id)
        .having(all_courses_sellable, func.count() >= 2)
        .cte("sellable_bundle_totals")
    )
    return (
        select(versions, totals.c.course_count, totals.c.standalone_total)
        .join(totals, totals.c.version_id == versions.c.version_id)
        .where(
            versions.c.currency == "VND", versions.c.price == totals.c.allocated_total
        )
        .cte("eligible_bundles")
    )


def _course_facets(eligible):
    return (
        select(
            BundleItem.version_id,
            EducationLevel.code.label("level"),
            Subject.code.label("subject_code"),
            Subject.name.label("subject_name"),
        )
        .join(eligible, eligible.c.version_id == BundleItem.version_id)
        .join(Courses, Courses.id == BundleItem.course_id)
        .outerjoin(
            Subject, and_(Subject.id == Courses.subject_id, Subject.is_active.is_(True))
        )
        .outerjoin(course_grades, course_grades.c.course_id == Courses.id)
        .outerjoin(
            Grade, and_(Grade.id == course_grades.c.grade_id, Grade.is_active.is_(True))
        )
        .outerjoin(
            EducationLevel,
            and_(
                EducationLevel.id == Grade.education_level_id,
                EducationLevel.is_active.is_(True),
                EducationLevel.code.in_(COMBO_LEVELS),
            ),
        )
        .cte("bundle_course_facets")
    )


def _selected_course_details(page):
    components = (
        select(
            BundleItem.version_id,
            BundleItem.course_id,
            BundleItem.position,
            Courses.title,
            Courses.thumbnail_url,
            func.row_number()
            .over(partition_by=BundleItem.version_id, order_by=BundleItem.position)
            .label("preview_rank"),
        )
        .join(page, page.c.version_id == BundleItem.version_id)
        .join(Courses, Courses.id == BundleItem.course_id)
        .cte("selected_bundle_components")
    )
    course_ids = select(components.c.course_id).distinct().cte("selected_course_ids")
    # Older lessons may only point to the course through their section.
    selected_lessons = union_all(
        select(Lessons.id, Lessons.course_id).join(
            course_ids, course_ids.c.course_id == Lessons.course_id
        ),
        select(Lessons.id, CourseSections.course_id)
        .join(CourseSections, CourseSections.id == Lessons.section_id)
        .join(course_ids, course_ids.c.course_id == CourseSections.course_id)
        .where(Lessons.course_id.is_(None)),
    ).subquery()
    lessons = (
        select(
            selected_lessons.c.course_id,
            func.count().label("lesson_count"),
            func.sum(LessonVideos.duration).label("duration_seconds"),
        )
        .outerjoin(
            LessonVideos,
            and_(
                LessonVideos.lesson_id == selected_lessons.c.id,
                LessonVideos.duration > 0,
                LessonVideos.duration < float("inf"),
            ),
        )
        .group_by(selected_lessons.c.course_id)
        .cte("selected_lesson_totals")
    )
    preview = func.jsonb_build_object(
        "id",
        components.c.course_id,
        "title",
        components.c.title,
        "thumbnail",
        components.c.thumbnail_url,
    )
    return (
        select(
            components.c.version_id,
            func.sum(func.coalesce(lessons.c.lesson_count, 0)).label("lesson_count"),
            func.round(func.sum(func.coalesce(lessons.c.duration_seconds, 0))).label(
                "duration_seconds"
            ),
            func.jsonb_agg(aggregate_order_by(preview, components.c.position))
            .filter(components.c.preview_rank <= 4)
            .label("courses"),
        )
        .outerjoin(lessons, lessons.c.course_id == components.c.course_id)
        .group_by(components.c.version_id)
        .cte("selected_bundle_details")
    )


def _promotion_deadline(page):
    uses = (
        select(func.count())
        .select_from(BundleOrder)
        .where(BundleOrder.coupon_id == BundleCoupon.id)
        .correlate(BundleCoupon)
        .scalar_subquery()
    )
    return (
        select(func.max(BundleCoupon.ends_at))
        .where(
            BundleCoupon.bundle_id == page.c.id,
            BundleCoupon.is_active.is_(True),
            BundleCoupon.starts_at <= func.now(),
            BundleCoupon.ends_at > func.now(),
            page.c.price > 0,
            BundleCoupon.min_total <= page.c.price,
            or_(BundleCoupon.max_uses.is_(None), uses < BundleCoupon.max_uses),
        )
        .correlate(page)
        .scalar_subquery()
    )


def _catalog_query(filters: CatalogComboFilters):
    eligible = _eligible_bundles()
    facets = _course_facets(eligible)
    options = select(
        select(eligible.c.id).exists().label("has_public_combos"),
        func.array_agg(distinct(facets.c.level))
        .filter(facets.c.level.is_not(None))
        .label("available_levels"),
    ).cte("combo_filter_options")

    def ordering(rows):
        primary = {
            "recent": rows.c.published_at.desc().nulls_last(),
            "price_asc": rows.c.price.asc(),
            "price_desc": rows.c.price.desc(),
        }[filters.sort]
        return primary, rows.c.id

    selected = select(eligible)
    if filters.level or filters.subject:
        matching = select(facets.c.version_id).where(
            facets.c.version_id == eligible.c.version_id
        )
        if filters.level:
            matching = matching.where(facets.c.level == filters.level)
        if filters.subject:
            matching = matching.where(facets.c.subject_code == filters.subject)
        selected = selected.where(matching.exists())
    page = (
        selected.order_by(*ordering(eligible))
        .limit(filters.limit)
        .cte("selected_bundles")
    )
    details = _selected_course_details(page)
    selected_facets = (
        select(
            facets.c.version_id,
            func.array_agg(distinct(facets.c.level))
            .filter(facets.c.level.is_not(None))
            .label("levels"),
            func.jsonb_agg(
                distinct(
                    func.jsonb_build_object(
                        "code",
                        facets.c.subject_code,
                        "name",
                        facets.c.subject_name,
                    )
                )
            )
            .filter(facets.c.subject_code.is_not(None))
            .label("subjects"),
        )
        .join(page, page.c.version_id == facets.c.version_id)
        .group_by(facets.c.version_id)
        .cte("selected_bundle_facets")
    )
    return (
        select(
            options,
            page.c.id,
            page.c.slug,
            page.c.title,
            page.c.thumbnail,
            page.c.description,
            page.c.course_count,
            page.c.price,
            page.c.standalone_total,
            page.c.instructor_id,
            page.c.instructor_name,
            details.c.lesson_count,
            details.c.duration_seconds,
            details.c.courses,
            selected_facets.c.levels,
            selected_facets.c.subjects,
            _promotion_deadline(page).label("promotion_ends_at"),
        )
        .select_from(options)
        .outerjoin(page, true())
        .outerjoin(details, details.c.version_id == page.c.version_id)
        .outerjoin(selected_facets, selected_facets.c.version_id == page.c.version_id)
        .order_by(*ordering(page))
    )


def _item(row):
    savings = max(Decimal(0), row.standalone_total - row.price)
    return CatalogCombo(
        id=row.id,
        slug=row.slug,
        title=row.title,
        thumbnail=row.thumbnail,
        description=row.description,
        levels=[level for level in COMBO_LEVELS if level in (row.levels or ())],
        subjects=sorted(row.subjects or [], key=lambda subject: subject["code"]),
        course_count=row.course_count,
        lesson_count=row.lesson_count,
        duration_seconds=int(row.duration_seconds),
        price=row.price,
        standalone_total=row.standalone_total,
        savings_amount=savings,
        savings_percent=int(savings * 100 / row.standalone_total) if savings else 0,
        courses=row.courses,
        instructor=ComboInstructor(id=row.instructor_id, name=row.instructor_name),
        promotion=ComboPromotion(ends_at=row.promotion_ends_at)
        if row.promotion_ends_at
        else None,
    )


def cache_seconds(result: CatalogCombosResponse) -> int:
    now = datetime.now(UTC)
    return min(
        [CACHE_SECONDS]
        + [
            max(0, int((item.promotion.ends_at - now).total_seconds()))
            for item in result.items
            if item.promotion
        ]
    )


async def catalog_combos(
    db: AsyncSession, filters: CatalogComboFilters
) -> CatalogCombosResponse:
    # Do not populate Redis with arbitrary subject strings from anonymous requests.
    cache_key = (
        None
        if filters.subject
        else (
            f"catalog:combos:v1:{filters.limit}:{filters.level or 'all'}:{filters.sort}"
        )
    )
    if cache_key:
        try:
            async with timeout(0.25):
                cached = await get_redis().get(cache_key)
            if cached:
                return CatalogCombosResponse.model_validate_json(cached)
        except (RedisError, TimeoutError):
            cache_key = None
        except ValidationError:
            pass

    rows = (await db.execute(_catalog_query(filters))).all()
    result = CatalogCombosResponse(
        items=[_item(row) for row in rows if row.id is not None],
        available_levels=[
            level for level in COMBO_LEVELS if level in (rows[0].available_levels or ())
        ],
        has_public_combos=rows[0].has_public_combos,
    )
    ttl = cache_seconds(result)
    if cache_key and ttl >= 30:
        try:
            async with timeout(0.25):
                await get_redis().set(cache_key, result.model_dump_json(), ex=ttl)
        except (RedisError, TimeoutError):
            pass
    return result
