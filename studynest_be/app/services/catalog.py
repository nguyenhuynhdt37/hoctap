"""Catalog queries and authorization shared by new and legacy course APIs."""

import base64
import hashlib
import json
from asyncio import timeout
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import Depends, HTTPException
from pydantic import ValidationError
from redis.exceptions import RedisError
from sqlalchemy import (
    Integer,
    String,
    and_,
    case,
    cast,
    delete,
    exists,
    func,
    null,
    or_,
    select,
    union_all,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.db.models.catalog import (
    EducationLevel,
    Exam,
    Grade,
    LearningGoal,
    Provider,
    ProviderMember,
    Subject,
    course_exams,
    course_grades,
    course_learning_goals,
    grade_subjects,
)
from app.db.models.database import (
    Courses,
    CourseSections,
    Discounts,
    DiscountTargets,
    Lessons,
    LessonVideos,
    User,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as discount_clock
from app.schemas.catalog import (
    CatalogCourseCounts,
    CatalogFilters,
    CatalogSubjectCourseCounts,
    CourseTaxonomy,
)
from app.services.catalog_slugs import create_slugged

ENTITIES = {
    "levels": EducationLevel,
    "grades": Grade,
    "subjects": Subject,
    "learning-goals": LearningGoal,
    "exams": Exam,
}
LINKS = (
    (course_grades, "grade_id", "grade_ids", Grade),
    (course_learning_goals, "learning_goal_id", "learning_goal_ids", LearningGoal),
    (course_exams, "exam_id", "exam_ids", Exam),
)


def public_course():
    # Provider is display attribution only. Organization settlement isn't enabled.
    organization = exists(
        select(Provider.id)
        .where(
            Provider.id == Courses.provider_id,
            or_(
                Provider.provider_type != "individual",
                Provider.is_active.is_(False),
                Provider.verification_status != "verified",
            ),
        )
        .correlate(Courses)
    )
    return and_(
        Courses.is_published.is_(True),
        Courses.approval_status == "approved",
        Courses.deleted_at.is_(None),
        ~Courses.slug.like("demo-catalog-%"),
        ~Courses.slug.like("seed-shop-%"),
        ~organization,
    )


def record(model):
    return {
        column.name: getattr(model, column.name) for column in model.__table__.columns
    }


def filter_signature(filters):
    payload = filters.model_dump(
        mode="json", exclude={"cursor", "limit", "include_total"}
    )
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:20]


def encode_cursor(value, course_id, signature):
    return base64.urlsafe_b64encode(
        json.dumps(
            {"v": 1, "value": str(value), "id": str(course_id), "filter": signature}
        ).encode()
    ).decode()


def decode_cursor(cursor, converter, signature):
    try:
        data = json.loads(base64.b64decode(cursor, altchars=b"-_", validate=True))
        if data["v"] != 1 or data["filter"] != signature:
            raise ValueError()
        value = converter(data["value"])
        if isinstance(value, Decimal) and (
            not value.is_finite() or abs(value) > Decimal(9999999999)
        ):
            raise ValueError()
        if isinstance(value, int) and not 0 <= value <= 9223372036854775807:
            raise ValueError()
        if isinstance(value, datetime):
            value = (
                value.replace(tzinfo=UTC)
                if value.tzinfo is None
                else value.astimezone(UTC)
            )
        return value, UUID(data["id"])
    except (ValueError, KeyError, TypeError, OverflowError, InvalidOperation):
        raise HTTPException(422, "Cursor không hợp lệ hoặc không khớp bộ lọc") from None


SESSION_DEP = Depends(get_session)
COURSE_COUNTS_CACHE_KEY = "catalog:course-counts:v1"
COURSE_COUNTS_CACHE_TTL = 60
COURSE_NEW_WINDOW = timedelta(days=30)
COURSE_BESTSELLER_MIN_ENROLLMENTS = 100


class CatalogService:
    def __init__(self, db: AsyncSession = SESSION_DEP):
        self.db = db

    async def list_taxonomy(self, kind, include_inactive=False):
        model = ENTITIES.get(kind)
        if not model:
            raise HTTPException(404, "Loại danh mục không hợp lệ")
        stmt = select(model).order_by(model.order_index, model.name, model.id)
        if not include_inactive:
            stmt = stmt.where(model.is_active.is_(True))
        return [record(row) for row in (await self.db.scalars(stmt)).all()]

    async def filters(self):
        data = {
            kind.replace("-", "_"): await self.list_taxonomy(kind) for kind in ENTITIES
        }
        data["grade_subjects"] = [
            dict(row)
            for row in (await self.db.execute(select(grade_subjects))).mappings()
        ]
        data["delivery_types"] = [{"code": "recorded_video", "name": "Video bài giảng"}]
        return data

    async def course_counts(self) -> CatalogCourseCounts:
        redis = get_redis()
        can_cache = True
        try:
            async with timeout(0.25):
                cached = await redis.get(COURSE_COUNTS_CACHE_KEY)
            if cached is not None:
                return CatalogCourseCounts.model_validate_json(cached)
        except (RedisError, TimeoutError):
            can_cache = False
        except ValidationError:
            pass

        result = await self._query_course_counts()
        if can_cache:
            try:
                async with timeout(0.25):
                    await redis.set(
                        COURSE_COUNTS_CACHE_KEY,
                        result.model_dump_json(),
                        ex=COURSE_COUNTS_CACHE_TTL,
                    )
            except (RedisError, TimeoutError):
                pass
        return result

    async def _query_course_counts(self) -> CatalogCourseCounts:
        active_grades = (
            select(
                course_grades.c.course_id,
                EducationLevel.code.label("level_code"),
                Grade.grade_number,
            )
            .join(Grade, Grade.id == course_grades.c.grade_id)
            .join(EducationLevel, EducationLevel.id == Grade.education_level_id)
            .where(Grade.is_active.is_(True), EducationLevel.is_active.is_(True))
            .subquery()
        )
        offerings = (
            select(
                Courses.id.label("course_id"),
                Subject.id.label("subject_id"),
                active_grades.c.level_code,
                active_grades.c.grade_number,
            )
            .join(User, User.id == Courses.instructor_id)
            .outerjoin(
                Subject, and_(Subject.id == Courses.subject_id, Subject.is_active.is_(True))
            )
            .outerjoin(active_grades, active_grades.c.course_id == Courses.id)
            .where(public_course(), Courses.currency == CatalogFilters().currency)
            .cte("public_course_scopes")
        ).c
        # A course can target multiple grades. Count it once in each applicable scope.
        count = func.count(offerings.course_id.distinct()).label("course_count")
        grouped = union_all(
            select(
                offerings.subject_id,
                cast(null(), String).label("level_code"),
                cast(null(), Integer).label("grade_number"),
                count,
            )
            .group_by(offerings.subject_id),
            select(offerings.subject_id, offerings.level_code, null(), count)
            .where(offerings.level_code.is_not(None))
            .group_by(offerings.subject_id, offerings.level_code),
            select(offerings.subject_id, null(), offerings.grade_number, count)
            .where(offerings.subject_id.is_not(None), offerings.grade_number.is_not(None))
            .group_by(offerings.subject_id, offerings.grade_number),
        )

        result = CatalogCourseCounts(total=0, by_level={}, by_subject={})
        for subject_id, level, grade, course_count in await self.db.execute(grouped):
            subject = None
            if subject_id is not None:
                subject = result.by_subject.get(subject_id)
                if subject is None:
                    subject = CatalogSubjectCourseCounts(total=0, by_level={}, by_grade={})
                    result.by_subject[subject_id] = subject
            if grade is not None and subject is not None:
                subject.by_grade[grade] = course_count
            elif level is not None:
                result.by_level[level] = result.by_level.get(level, 0) + course_count
                if subject is not None:
                    subject.by_level[level] = course_count
            else:
                result.total += course_count
                if subject is not None:
                    subject.total = course_count
        return result

    async def browse_filters(self):
        """Small public choices; keep the richer editor endpoint unchanged."""
        data = {}
        for kind, model in ENTITIES.items():
            columns = [model.id, model.code, model.name]
            if model is Grade:
                columns.extend(
                    [Grade.education_level_id, Grade.grade_number, Grade.slug]
                )
            elif model is Subject:
                columns.append(Subject.slug)
            stmt = select(*columns).where(model.is_active.is_(True))
            if model is Grade:
                stmt = stmt.join(EducationLevel).where(
                    EducationLevel.is_active.is_(True)
                )
            rows = await self.db.execute(
                stmt.order_by(model.order_index, model.name, model.id)
            )
            data[kind.replace("-", "_")] = [dict(row) for row in rows.mappings()]
        # Reuse the choices already read, without exposing links to hidden taxonomies.
        rows = await self.db.execute(
            select(grade_subjects)
            .where(
                grade_subjects.c.grade_id.in_([row["id"] for row in data["grades"]]),
                grade_subjects.c.subject_id.in_(
                    [row["id"] for row in data["subjects"]]
                ),
            )
            .order_by(grade_subjects.c.grade_id, grade_subjects.c.subject_id)
        )
        data["grade_subjects"] = [dict(row) for row in rows.mappings()]
        rows = await self.db.execute(
            select(Provider.id, Provider.name, Provider.slug)
            .where(
                exists(
                    select(Courses.id)
                    .where(Courses.provider_id == Provider.id, public_course())
                    .correlate(Provider)
                )
            )
            .order_by(Provider.name, Provider.id)
        )
        data["providers"] = [dict(row) for row in rows.mappings()]
        data["delivery_types"] = [{"code": "recorded_video", "name": "Video bài giảng"}]
        return data

    async def taxonomy_mutation(self, kind, schema, item_id=None):
        model = ENTITIES.get(kind)
        if not model:
            raise HTTPException(404, "Loại danh mục không hợp lệ")
        fields = set(model.__table__.columns.keys()) - {"id"}
        data = {
            k: v
            for k, v in schema.model_dump().items()
            if k in fields and v is not None
        }
        if (
            kind == "grades"
            and not {"grade_number", "education_level_id"} <= data.keys()
        ):
            raise HTTPException(422, "Khối lớp cần số lớp và cấp học")
        if kind == "grades":
            level = await self.db.get(EducationLevel, data["education_level_id"])
            if not level or not level.is_active:
                raise HTTPException(422, "Cấp học không hợp lệ")
        item = await self.db.get(model, item_id) if item_id else model()
        if item is None:
            raise HTTPException(404, "Không tìm thấy danh mục")
        if item_id and (
            item.code != data["code"] or ("slug" in data and item.slug != data["slug"])
        ):
            raise HTTPException(409, "Code và slug ổn định; chỉ thay tên hiển thị")
        try:
            if not item_id and "slug" in model.__table__.c:
                values = {key: value for key, value in data.items() if key != "slug"}
                item = await create_slugged(
                    self.db, model, data["name"], data.get("slug") or "", **values
                )
            else:
                for key, value in data.items():
                    setattr(item, key, value)
                self.db.add(item)
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Code, slug hoặc số lớp đã tồn tại") from None
        await self.db.refresh(item)
        return record(item)

    async def delete_taxonomy(self, kind, item_id):
        model = ENTITIES.get(kind)
        if not model:
            raise HTTPException(404, "Loại danh mục không hợp lệ")
        item = await self.db.get(model, item_id)
        if not item:
            raise HTTPException(404, "Không tìm thấy danh mục")
        try:
            await self.db.delete(item)
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                409, "Danh mục đang được sử dụng; hãy ngừng kích hoạt"
            ) from None
        return {"message": "Đã xóa danh mục"}

    async def set_grade_subjects(self, grade_id, subject_ids):
        if not await self.db.get(Grade, grade_id):
            raise HTTPException(404, "Không tìm thấy lớp")
        ids = set(subject_ids)
        found = set(
            (
                await self.db.scalars(
                    select(Subject.id).where(
                        Subject.id.in_(ids), Subject.is_active.is_(True)
                    )
                )
            ).all()
        )
        if found != ids:
            raise HTTPException(422, "Môn học không hợp lệ")
        # Prevent changing mappings that would invalidate assigned courses.
        used = set(
            (
                await self.db.scalars(
                    select(Courses.subject_id)
                    .join(course_grades, course_grades.c.course_id == Courses.id)
                    .where(
                        course_grades.c.grade_id == grade_id,
                        Courses.subject_id.is_not(None),
                    )
                )
            ).all()
        )
        if not used <= ids:
            raise HTTPException(409, "Môn đang được khóa học của lớp này sử dụng")
        await self.db.execute(
            delete(grade_subjects).where(grade_subjects.c.grade_id == grade_id)
        )
        if ids:
            await self.db.execute(
                grade_subjects.insert(),
                [{"grade_id": grade_id, "subject_id": s} for s in ids],
            )
        await self.db.commit()
        return {"message": "Đã cập nhật môn theo lớp"}

    async def provider_permission(self, provider_id, user_id):
        provider = await self.db.get(Provider, provider_id)
        membership = await self.db.get(ProviderMember, (provider_id, user_id))
        if (
            not provider
            or not provider.is_active
            or provider.verification_status != "verified"
            or not membership
            or membership.status != "active"
        ):
            raise HTTPException(
                403, "Bạn không có quyền quản lý khóa học của đơn vị này"
            )
        return provider

    async def validate_assignment(
        self, data: CourseTaxonomy, user_id, publishing=False, admin=False
    ):
        for _, _, field, model in LINKS:
            ids = getattr(data, field)
            if len(ids) != len(set(ids)):
                raise HTTPException(422, "Không được lặp ID phân loại")
            found = set(
                (
                    await self.db.scalars(
                        select(model.id).where(
                            model.id.in_(ids), model.is_active.is_(True)
                        )
                    )
                ).all()
            )
            if found != set(ids):
                raise HTTPException(
                    422, "Phân loại không tồn tại hoặc đã ngừng hoạt động"
                )
        if data.subject_id:
            subject = await self.db.get(Subject, data.subject_id)
            if not subject or not subject.is_active:
                raise HTTPException(422, "Môn học không hợp lệ")
            mapped = set(
                (
                    await self.db.scalars(
                        select(grade_subjects.c.grade_id).where(
                            grade_subjects.c.subject_id == data.subject_id,
                            grade_subjects.c.grade_id.in_(data.grade_ids),
                        )
                    )
                ).all()
            )
            if mapped != set(data.grade_ids):
                raise HTTPException(
                    422, "Môn học chưa được cấu hình cho các lớp đã chọn"
                )
        if data.provider_id:
            provider = (
                await self.db.get(Provider, data.provider_id)
                if admin
                else await self.provider_permission(data.provider_id, user_id)
            )
            if not provider or not provider.is_active:
                raise HTTPException(422, "Đơn vị không hoạt động")
            if publishing and (
                provider.provider_type != "individual"
                or provider.verification_status != "verified"
            ):
                raise HTTPException(
                    409,
                    "Đơn vị chưa được phép bán: cần xác minh và cơ chế đối soát phù hợp",
                )
        return data

    async def assign(self, course, data, user_id, admin=False, commit=True):
        if data.provider_id is not None and data.provider_id != course.provider_id:
            raise HTTPException(422, "Không còn hỗ trợ gán đơn vị cho khóa học")
        # Keep historical attribution when current clients update taxonomy.
        data = data.model_copy(update={"provider_id": course.provider_id})
        await self.validate_assignment(
            data, user_id, publishing=bool(course.is_published), admin=admin
        )
        course.subject_id = data.subject_id
        course.delivery_type = data.delivery_type
        for table, key, field, _ in LINKS:
            await self.db.execute(delete(table).where(table.c.course_id == course.id))
            ids = getattr(data, field)
            if ids:
                await self.db.execute(
                    table.insert(),
                    [{"course_id": course.id, key: value} for value in ids],
                )
        if commit:
            await self.db.commit()
        return await self.course_taxonomy(course.id)

    async def course_taxonomy(self, course_id):
        course = await self.db.get(Courses, course_id)
        if not course:
            raise HTTPException(404, "Không tìm thấy khóa học")
        subject = (
            await self.db.get(Subject, course.subject_id) if course.subject_id else None
        )
        provider = (
            await self.db.get(Provider, course.provider_id)
            if course.provider_id
            else None
        )
        result = {
            "subject": record(subject) if subject else None,
            "provider": self.public_provider(provider) if provider else None,
            "delivery_type": course.delivery_type,
        }
        for table, key, field, model in LINKS:
            rows = (
                await self.db.scalars(
                    select(model)
                    .join(table, table.c[key] == model.id)
                    .where(table.c.course_id == course_id)
                    .order_by(model.order_index, model.name)
                )
            ).all()
            result[
                field.removesuffix("_ids") + "s"
                if field == "grade_ids"
                else "learning_goals"
                if field == "learning_goal_ids"
                else "exams"
            ] = [record(row) for row in rows]
        result["needs_classification"] = not result["grades"] or not subject
        return result

    @staticmethod
    def public_provider(provider):
        return {
            key: getattr(provider, key)
            for key in (
                "id",
                "name",
                "slug",
                "provider_type",
                "description",
                "logo_url",
                "banner_url",
                "province",
                "address",
                "website_url",
                "verification_status",
            )
        }

    async def _course_lesson_stats(
        self, course_ids: list[UUID]
    ) -> dict[UUID, tuple[int, int]]:
        # Some legacy lessons only have a section FK. Keep the branches disjoint.
        lessons = union_all(
            select(Lessons.id, Lessons.course_id).where(Lessons.course_id.in_(course_ids)),
            select(Lessons.id, CourseSections.course_id)
            .join(CourseSections, CourseSections.id == Lessons.section_id)
            .where(Lessons.course_id.is_(None), CourseSections.course_id.in_(course_ids)),
        ).subquery()
        rows = await self.db.execute(
            select(lessons.c.course_id, func.count(), func.sum(LessonVideos.duration))
            .outerjoin(
                LessonVideos,
                and_(
                    LessonVideos.lesson_id == lessons.c.id,
                    LessonVideos.duration > 0,
                    LessonVideos.duration < float("inf"),
                ),
            )
            .group_by(lessons.c.course_id)
        )
        return {
            course_id: (count, round(duration or 0))
            for course_id, count, duration in rows
        }

    async def _course_public_discounts(
        self, course_ids: list[UUID]
    ) -> dict[UUID, Decimal]:
        clock = discount_clock()
        targets = select(DiscountTargets.discount_id).where(
            DiscountTargets.discount_id == Discounts.id
        )
        matching_target = targets.where(
            or_(
                DiscountTargets.course_id == Courses.id,
                DiscountTargets.category_id == Courses.category_id,
            )
        ).correlate(Discounts, Courses)
        # A global coupon with explicit targets still uses those targets at checkout.
        applies = or_(
            matching_target.exists(),
            and_(Discounts.applies_to == "global", ~targets.correlate(Discounts).exists()),
        )
        amount = case(
            (
                Discounts.discount_type == "percent",
                Courses.base_price * Discounts.percent_value / 100,
            ),
            (Discounts.discount_type == "fixed", Discounts.fixed_value),
            else_=0,
        )
        rows = await self.db.execute(
            select(Courses.id, func.max(amount))
            .join(Discounts, applies)
            .where(
                Courses.id.in_(course_ids),
                Courses.base_price > 0,
                Discounts.is_active.is_(True),
                Discounts.is_hidden.is_(False),
                Discounts.discount_code.is_not(None),
                func.trim(Discounts.discount_code) != "",
                Discounts.start_at <= clock,
                Discounts.end_at >= clock,
                or_(
                    Discounts.usage_limit.is_(None),
                    Discounts.usage_limit == 0,
                    func.coalesce(Discounts.usage_count, 0) < Discounts.usage_limit,
                ),
            )
            .group_by(Courses.id)
        )
        return {
            course_id: reduction
            for course_id, reduction in rows
            if reduction and reduction > 0
        }

    async def courses(
        self,
        filters: CatalogFilters,
        category_ids=None,
        extra_conditions=(),
        scope="",
        *,
        include_card_details: bool = False,
    ):
        f = filters
        stmt = (
            select(
                Courses.id,
                Courses.slug,
                Courses.title,
                Courses.thumbnail_url,
                Courses.base_price,
                Courses.currency,
                Courses.rating_avg,
                Courses.rating_count,
                Courses.total_enrolls,
                Courses.total_length_seconds,
                Courses.created_at,
                Courses.level,
                Courses.language,
                Courses.delivery_type,
                Courses.instructor_id,
                Courses.subject_id,
                Courses.provider_id,
                User.fullname,
                User.avatar,
                Subject.name.label("subject_name"),
                Provider.name.label("provider_name"),
                Provider.slug.label("provider_slug"),
            )
            .join(User, User.id == Courses.instructor_id)
            .outerjoin(Subject, Subject.id == Courses.subject_id)
            .outerjoin(Provider, Provider.id == Courses.provider_id)
            .where(public_course())
        )
        if include_card_details:
            stmt = stmt.add_columns(Courses.approved_at)
        stmt = stmt.where(*extra_conditions)
        if category_ids is not None:
            stmt = stmt.where(Courses.category_id.in_(category_ids))
        if f.subject:
            stmt = stmt.where(Subject.slug == f.subject, Subject.is_active.is_(True))
        if f.provider:
            stmt = stmt.where(Provider.slug == f.provider, Provider.is_active.is_(True))
        if f.grade or f.level:
            grades = (
                select(course_grades.c.course_id)
                .join(Grade, Grade.id == course_grades.c.grade_id)
                .join(EducationLevel, EducationLevel.id == Grade.education_level_id)
                .where(Grade.is_active.is_(True), EducationLevel.is_active.is_(True))
            )
            if f.grade:
                grades = grades.where(Grade.grade_number == f.grade)
            if f.level:
                grades = grades.where(EducationLevel.code == f.level)
            stmt = stmt.where(Courses.id.in_(grades))
        for value, table, key, model in (
            (f.goal, course_learning_goals, "learning_goal_id", LearningGoal),
            (f.exam, course_exams, "exam_id", Exam),
        ):
            if value:
                stmt = stmt.where(
                    Courses.id.in_(
                        select(table.c.course_id)
                        .join(model, table.c[key] == model.id)
                        .where(model.code == value, model.is_active.is_(True))
                    )
                )
        if f.delivery_type:
            stmt = stmt.where(Courses.delivery_type == f.delivery_type)
        if f.currency:
            stmt = stmt.where(Courses.currency == f.currency)
        if f.min_price is not None:
            stmt = stmt.where(Courses.base_price >= f.min_price)
        if f.max_price is not None:
            stmt = stmt.where(Courses.base_price <= f.max_price)
        if f.rating is not None:
            stmt = stmt.where(Courses.rating_avg >= f.rating, Courses.rating_count > 0)
        if f.keyword:
            stmt = stmt.where(
                Courses.title.ilike(
                    "%"
                    + f.keyword.replace("\\", "\\\\")
                    .replace("%", "\\%")
                    .replace("_", "\\_")
                    + "%",
                    escape="\\",
                )
            )
        sorts = {
            "newest": (
                func.coalesce(Courses.created_at, datetime(1970, 1, 1, tzinfo=UTC)),
                datetime.fromisoformat,
            ),
            "popular": (func.coalesce(Courses.total_enrolls, 0), int),
            "rating": (func.coalesce(Courses.rating_avg, 0), Decimal),
            "price_asc": (func.coalesce(Courses.base_price, 0), Decimal),
            "price_desc": (func.coalesce(Courses.base_price, 0), Decimal),
        }
        column, converter = sorts[f.sort]
        signature = hashlib.sha256((filter_signature(f) + scope).encode()).hexdigest()[
            :20
        ]
        if category_ids is not None:
            signature = hashlib.sha256(
                (signature + ",".join(sorted(map(str, category_ids)))).encode()
            ).hexdigest()[:20]
        ascending = f.sort == "price_asc"
        position = decode_cursor(f.cursor, converter, signature) if f.cursor else None
        total = None
        if f.include_total:
            total = int(
                await self.db.scalar(
                    select(func.count()).select_from(
                        stmt.with_only_columns(Courses.id).order_by(None).subquery()
                    )
                )
                or 0
            )
        if position:
            value, identity = position
            stmt = stmt.where(
                or_(
                    column > value if ascending else column < value,
                    and_(
                        column == value,
                        Courses.id > identity if ascending else Courses.id < identity,
                    ),
                )
            )
        rows = (
            (
                await self.db.execute(
                    stmt.add_columns(column.label("cursor_value"))
                    .order_by(
                        column.asc() if ascending else column.desc(),
                        Courses.id.asc() if ascending else Courses.id.desc(),
                    )
                    .limit(f.limit + 1)
                )
            )
            .mappings()
            .all()
        )
        selected = rows[: f.limit]
        course_ids = [row.id for row in selected]
        # One batched lookup for grades, no per-card queries.
        grade_rows = (
            (
                await self.db.execute(
                    select(
                        course_grades.c.course_id,
                        Grade.id,
                        Grade.name,
                        Grade.grade_number,
                    )
                    .join(Grade, Grade.id == course_grades.c.grade_id)
                    .where(course_grades.c.course_id.in_(course_ids))
                    .order_by(Grade.grade_number)
                )
            ).all()
            if selected
            else []
        )
        grades_by_course = {}
        for r in grade_rows:
            grades_by_course.setdefault(r.course_id, []).append(
                {"id": r.id, "name": r.name, "grade_number": r.grade_number}
            )
        lesson_stats = {}
        public_discounts = {}
        if include_card_details and course_ids:
            lesson_stats = await self._course_lesson_stats(course_ids)
            paid_ids = [row.id for row in selected if row.base_price and row.base_price > 0]
            if paid_ids:
                public_discounts = await self._course_public_discounts(paid_ids)
        clock = datetime.now(UTC)
        items = []
        for c in selected:
            item = {
                "id": c.id,
                "slug": c.slug,
                "title": c.title,
                "thumbnail": c.thumbnail_url,
                "base_price": float(c.base_price or 0),
                "currency": c.currency,
                "rating_avg": float(c.rating_avg or 0),
                "rating_count": c.rating_count or 0,
                "total_enrolls": c.total_enrolls or 0,
                "total_hours": round((c.total_length_seconds or 0) / 3600, 1),
                "created_at": c.created_at,
                "level": c.level,
                "language": c.language,
                "delivery_type": c.delivery_type,
                "instructor": {
                    "id": c.instructor_id,
                    "fullname": c.fullname,
                    "avatar": c.avatar,
                },
                "subject": {"id": c.subject_id, "name": c.subject_name}
                if c.subject_id
                else None,
                "provider": {
                    "id": c.provider_id,
                    "name": c.provider_name,
                    "slug": c.provider_slug,
                }
                if c.provider_id
                else None,
                "grades": grades_by_course.get(c.id, []),
            }
            if include_card_details:
                lessons_count, duration = lesson_stats.get(c.id, (0, 0))
                if lessons_count and not duration:
                    duration = max(c.total_length_seconds or 0, 0)
                price = c.base_price
                reduction = public_discounts.get(c.id)
                published_at = c.approved_at or c.created_at
                if published_at and published_at.tzinfo is None:
                    published_at = published_at.replace(tzinfo=UTC)
                item.update(
                    students_count=max(c.total_enrolls or 0, 0),
                    lessons_count=lessons_count,
                    duration_seconds=duration,
                    original_price=float(price) if price is not None and price >= 0 else None,
                    discount_price=float(max(price - reduction, 0))
                    if price is not None and reduction is not None
                    else None,
                    is_free=price == 0,
                    is_new=bool(
                        published_at and clock - COURSE_NEW_WINDOW <= published_at <= clock
                    ),
                    is_bestseller=(
                        price is not None
                        and price > 0
                        and (c.total_enrolls or 0) >= COURSE_BESTSELLER_MIN_ENROLLMENTS
                    ),
                    lecturer={"name": c.fullname, "avatar": c.avatar},
                )
            items.append(item)
        more = len(rows) > f.limit
        return {
            "items": items,
            "next_cursor": encode_cursor(
                selected[-1].cursor_value, selected[-1].id, signature
            )
            if more
            else None,
            "has_more": more,
            "total": total,
        }


def require_real_course(course):
    """Retired fixtures cannot enter official paths, bundles or purchases."""
    if course.slug.startswith(("demo-catalog-", "seed-shop-")):
        raise HTTPException(
            409,
            "Khóa học đã lưu trữ, không thể dùng cho lộ trình, combo hoặc đăng ký mới.",
        )
