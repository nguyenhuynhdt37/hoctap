"""Public teaching discovery: bounded pages, real public metrics and private saves."""

import re
import unicodedata
from datetime import UTC, datetime
from decimal import Decimal
from html.parser import HTMLParser
from urllib.parse import urlsplit

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
)
from app.db.models.database import (
    Categories,
    CourseEnrollments,
    CourseFavourites,
    CourseReviews,
    Courses,
    Topics,
    User,
)
from app.db.models.instructor_favourites import InstructorFavourite
from app.db.sesson import get_session
from app.schemas.user.instructors import (
    InstructorCourseFilters,
    InstructorFilters,
    valid_public_text,
)
from app.services.catalog import (
    CatalogService,
    decode_cursor,
    encode_cursor,
    filter_signature,
    public_course,
)
from app.services.user.instructor_visibility import public_instructor
from fastapi import Depends, HTTPException
from sqlalchemy import (
    Numeric,
    and_,
    case,
    cast,
    delete,
    exists,
    func,
    literal,
    or_,
    select,
    union,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import aliased

EPOCH = datetime(1970, 1, 1, tzinfo=UTC)
# NFC first handles decomposed Unicode as well as Vietnamese precomposed letters.
ACCENTS = "".join(
    chr(n)
    for n in range(0x00C0, 0x2000)
    if unicodedata.category(chr(n)).startswith("L")
    and len(unicodedata.normalize("NFKD", chr(n)).encode("ascii", "ignore")) == 1
)
ASCII = "".join(
    unicodedata.normalize("NFKD", c).encode("ascii", "ignore").decode() for c in ACCENTS
)


def folded(column):
    return func.lower(
        func.translate(
            func.normalize(func.coalesce(column, "")), ACCENTS + "đĐ", ASCII + "dD"
        )
    )


def fold_text(value):
    return "".join(
        c
        for c in unicodedata.normalize(
            "NFKD", value.replace("đ", "d").replace("Đ", "D")
        )
        if not unicodedata.combining(c)
    ).lower()


def search_pattern(value):
    return (
        "%"
        + fold_text(value).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        + "%"
    )


def cursor_name(value):
    if not isinstance(value, str):
        raise TypeError("Invalid name cursor")
    return valid_public_text(value)


class PlainBiography(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "iframe", "object"}:
            self.hidden += 1
        if tag in {"p", "br", "div", "li", "h1", "h2", "h3"} and not self.hidden:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "iframe", "object"}:
            self.hidden = max(0, self.hidden - 1)
        elif tag in {"p", "div", "li"} and not self.hidden:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain_bio(value):
    parser = PlainBiography()
    parser.feed((value or "")[:50000])
    return re.sub(r"\n{3,}", "\n\n", "".join(parser.parts)).strip()


def safe_facebook(value):
    if not value:
        return None
    try:
        url = urlsplit(value.strip())
        if (
            url.scheme in {"https", "http"}
            and url.hostname
            in {
                "facebook.com",
                "www.facebook.com",
                "m.facebook.com",
                "fb.com",
                "www.fb.com",
            }
            and not url.username
            and not url.password
            and not url.port
        ):
            return value.strip()
    except ValueError:
        pass
    return None


def provider_visible():
    return and_(
        Provider.is_active.is_(True), Provider.verification_status == "verified"
    )


def provider_affiliation(instructor_id, provider_id):
    return or_(
        exists(
            select(ProviderMember.user_id)
            .where(
                ProviderMember.user_id == instructor_id,
                ProviderMember.provider_id == provider_id,
                ProviderMember.status == "active",
            )
            .correlate_except(ProviderMember)
        ),
        exists(
            select(Courses.id)
            .where(
                Courses.instructor_id == instructor_id,
                Courses.provider_id == provider_id,
                public_course(),
            )
            .correlate_except(Courses)
        ),
    )


SESSION = Depends(get_session)


class InstructorDiscoveryService:
    def __init__(self, db=SESSION):
        self.db = db

    async def require(self, identity):
        row = await self.db.scalar(
            select(User.id).where(User.id == identity, public_instructor())
        )
        if not row:
            raise HTTPException(404, "Không tìm thấy giảng viên công khai")

    async def validate_filters(self, f):
        for value, model, column in [
            (getattr(f, "subject", None), Subject, Subject.slug),
            (getattr(f, "exam", None), Exam, Exam.code),
            (getattr(f, "goal", None), LearningGoal, LearningGoal.code),
            (getattr(f, "grade", None), Grade, Grade.grade_number),
            (getattr(f, "provider", None), Provider, Provider.slug),
            (
                f.level if isinstance(f, InstructorFilters) else None,
                EducationLevel,
                EducationLevel.code,
            ),
        ]:
            if value is not None:
                cond = (
                    provider_visible()
                    if model is Provider
                    else model.is_active.is_(True)
                )
                stmt = select(model.id).where(column == value, cond)
                if model is Grade:
                    stmt = stmt.join(EducationLevel).where(
                        EducationLevel.is_active.is_(True)
                    )
                if not await self.db.scalar(stmt):
                    raise HTTPException(
                        422, "Bộ lọc danh mục không hợp lệ hoặc đã ngừng hiển thị"
                    )

    def academic_conditions(self, f, course=Courses, instructor_id=None):
        conditions = []
        if f.subject:
            conditions.append(
                course.subject_id.in_(
                    select(Subject.id).where(
                        Subject.slug == f.subject, Subject.is_active.is_(True)
                    )
                )
            )
        education = f.level if isinstance(f, InstructorFilters) else None
        if f.grade or education:
            stmt = (
                select(course_grades.c.course_id)
                .join(Grade, Grade.id == course_grades.c.grade_id)
                .join(EducationLevel, EducationLevel.id == Grade.education_level_id)
                .where(Grade.is_active.is_(True), EducationLevel.is_active.is_(True))
            )
            if f.grade:
                stmt = stmt.where(Grade.grade_number == f.grade)
            if education:
                stmt = stmt.where(EducationLevel.code == education)
            conditions.append(course.id.in_(stmt))
        for value, table, field, model in [
            (f.exam, course_exams, "exam_id", Exam),
            (f.goal, course_learning_goals, "learning_goal_id", LearningGoal),
        ]:
            if value:
                conditions.append(
                    course.id.in_(
                        select(table.c.course_id)
                        .join(model, model.id == table.c[field])
                        .where(model.code == value, model.is_active.is_(True))
                    )
                )
        if f.provider:
            stmt = select(Provider.id).where(
                Provider.slug == f.provider, provider_visible()
            )
            if instructor_id is None:
                conditions.append(course.provider_id.in_(stmt))
            else:
                conditions.append(
                    exists(stmt.where(provider_affiliation(instructor_id, Provider.id)))
                )
        return conditions

    def metrics(self):
        pc = (
            select(
                Courses.id,
                Courses.instructor_id,
                Courses.subject_id,
                Courses.provider_id,
            )
            .where(public_course())
            .cte("public_teaching_courses")
        )
        counts = (
            select(
                pc.c.instructor_id,
                func.count().label("course_count"),
            )
            .group_by(pc.c.instructor_id)
            .cte("course_metrics")
        )
        learner = aliased(User)
        enrollments = (
            select(
                pc.c.instructor_id,
                func.count(func.distinct(CourseEnrollments.user_id)).label(
                    "student_count"
                ),
            )
            .join(CourseEnrollments, CourseEnrollments.course_id == pc.c.id)
            .join(learner, learner.id == CourseEnrollments.user_id)
            .where(
                CourseEnrollments.status == "active",
                learner.deleted_at.is_(None),
                learner.is_banned.is_(False),
                learner.id != pc.c.instructor_id,
            )
            .group_by(pc.c.instructor_id)
            .cte("learner_metrics")
        )
        reviewer = aliased(User)
        reviews = (
            select(
                pc.c.instructor_id,
                CourseReviews.rating,
                func.row_number()
                .over(
                    partition_by=(CourseReviews.course_id, CourseReviews.user_id),
                    order_by=(
                        CourseReviews.updated_at.desc().nulls_last(),
                        CourseReviews.created_at.desc().nulls_last(),
                        CourseReviews.id.desc(),
                    ),
                )
                .label("rn"),
            )
            .join(CourseReviews, CourseReviews.course_id == pc.c.id)
            .join(reviewer, reviewer.id == CourseReviews.user_id)
            .where(
                CourseReviews.rating.between(1, 5),
                reviewer.deleted_at.is_(None),
                reviewer.is_banned.is_(False),
                reviewer.id != pc.c.instructor_id,
                exists(
                    select(CourseEnrollments.id)
                    .where(
                        CourseEnrollments.course_id == pc.c.id,
                        CourseEnrollments.user_id == reviewer.id,
                        CourseEnrollments.status == "active",
                    )
                    .correlate(pc, reviewer)
                ),
            )
            .cte("eligible_course_reviews")
        )
        ratings = (
            select(
                reviews.c.instructor_id,
                func.count().label("rating_count"),
                func.avg(reviews.c.rating).label("rating_avg"),
            )
            .where(reviews.c.rn == 1)
            .group_by(reviews.c.instructor_id)
            .cte("rating_metrics")
        )
        return pc, counts, enrollments, ratings

    def listing_query(self, f, saved_by=None):
        _pc, counts, students, ratings = self.metrics()
        student_count = func.coalesce(students.c.student_count, 0)
        rating_count = func.coalesce(ratings.c.rating_count, 0)
        rating_avg = func.coalesce(ratings.c.rating_avg, 0)
        course_count = func.coalesce(counts.c.course_count, 0)
        stmt = (
            select(
                User.id,
                User.fullname.label("name"),
                User.avatar,
                func.left(User.bio, 4096).label("bio"),
                func.left(User.instructor_description, 4096).label(
                    "instructor_description"
                ),
                course_count.label("course_count"),
                student_count.label("student_count"),
                rating_avg.label("rating_avg"),
                rating_count.label("rating_count"),
            )
            .outerjoin(counts, counts.c.instructor_id == User.id)
            .outerjoin(students, students.c.instructor_id == User.id)
            .outerjoin(ratings, ratings.c.instructor_id == User.id)
            .where(public_instructor())
        )
        academic = self.academic_conditions(f, instructor_id=User.id)
        if academic:
            stmt = stmt.where(
                exists(
                    select(Courses.id)
                    .where(Courses.instructor_id == User.id, public_course(), *academic)
                    .correlate(User)
                )
            )
        if saved_by:
            stmt = stmt.where(
                exists(
                    select(InstructorFavourite.user_id)
                    .where(
                        InstructorFavourite.user_id == saved_by,
                        InstructorFavourite.instructor_id == User.id,
                    )
                    .correlate(User)
                )
            )
        if f.has_courses is not None:
            stmt = stmt.where(course_count > 0 if f.has_courses else course_count == 0)
        if f.min_rating is not None:
            stmt = stmt.where(rating_count > 0, rating_avg >= f.min_rating)
        relevance = student_count
        if f.q:
            pattern = search_pattern(f.q)
            name_match = folded(User.fullname).like(pattern, escape="\\")
            subject_match = exists(
                select(Courses.id)
                .join(Subject, Subject.id == Courses.subject_id)
                .where(
                    Courses.instructor_id == User.id,
                    public_course(),
                    Subject.is_active.is_(True),
                    folded(Subject.name).like(pattern, escape="\\"),
                )
                .correlate(User)
            )
            provider_match = exists(
                select(Provider.id)
                .where(
                    provider_visible(),
                    provider_affiliation(User.id, Provider.id),
                    folded(Provider.name).like(pattern, escape="\\"),
                )
                .correlate(User)
            )
            # Search authored descriptions as plain text in SQL, never render stored HTML.
            bio_match = folded(
                func.regexp_replace(
                    func.coalesce(User.instructor_description, ""), "<[^>]*>", " ", "g"
                )
            ).like(pattern, escape="\\")
            stmt = stmt.where(or_(name_match, subject_match, provider_match, bio_match))
            relevance = case(
                (folded(User.fullname) == fold_text(f.q), 4),
                (name_match, 3),
                (subject_match, 2),
                (provider_match, 1),
                else_=0,
            )
        sorts = {
            "relevant": (relevance, int, False),
            "popular": (student_count, int, False),
            "rating": (cast(rating_avg, Numeric(12, 6)), Decimal, False),
            "courses": (course_count, int, False),
            "newest": (
                func.coalesce(func.timezone("UTC", User.create_at), EPOCH),
                datetime.fromisoformat,
                False,
            ),
            "name": (folded(User.fullname).collate("C"), cursor_name, True),
        }
        return stmt, sorts[f.sort]

    async def listing(self, f, saved_by=None):
        await self.validate_filters(f)
        stmt, (column, converter, ascending) = self.listing_query(f, saved_by)
        signature = filter_signature(f) + ":instructors:" + str(saved_by or "")
        position = decode_cursor(f.cursor, converter, signature) if f.cursor else None
        total = (
            await self.db.scalar(
                select(func.count()).select_from(
                    stmt.with_only_columns(User.id).subquery()
                )
            )
            if f.include_total
            else None
        )
        if position:
            value, identity = position
            stmt = stmt.where(
                or_(
                    column > value if ascending else column < value,
                    and_(
                        column == value,
                        User.id > identity if ascending else User.id < identity,
                    ),
                )
            )
        rows = (
            (
                await self.db.execute(
                    stmt.add_columns(column.label("cursor_value"))
                    .order_by(
                        column.asc() if ascending else column.desc(),
                        User.id.asc() if ascending else User.id.desc(),
                    )
                    .limit(f.limit + 1)
                )
            )
            .mappings()
            .all()
        )
        selected = rows[: f.limit]
        items = await self.decorate(selected)
        return {
            "items": items,
            "total": total,
            "has_more": len(rows) > f.limit,
            "next_cursor": encode_cursor(
                selected[-1].cursor_value, selected[-1].id, signature
            )
            if len(rows) > f.limit
            else None,
        }

    async def decorate(self, rows):
        if not rows:
            return []
        ids = [r.id for r in rows]
        grouped = {
            i: {
                "subjects": [],
                "grades": [],
                "exams": [],
                "learning_goals": [],
                "providers": [],
            }
            for i in ids
        }
        for key, model, link, link_field, columns in [
            ("subjects", Subject, None, None, (Subject.id, Subject.name, Subject.slug)),
            (
                "grades",
                Grade,
                course_grades,
                "grade_id",
                (Grade.id, Grade.name, Grade.grade_number),
            ),
            ("exams", Exam, course_exams, "exam_id", (Exam.id, Exam.name, Exam.code)),
            (
                "learning_goals",
                LearningGoal,
                course_learning_goals,
                "learning_goal_id",
                (LearningGoal.id, LearningGoal.name, LearningGoal.code),
            ),
        ]:
            stmt = select(Courses.instructor_id, *columns).select_from(Courses)
            if link is None:
                stmt = stmt.join(model, model.id == Courses.subject_id)
            else:
                stmt = stmt.join(link, link.c.course_id == Courses.id).join(
                    model, model.id == link.c[link_field]
                )
            stmt = stmt.where(
                Courses.instructor_id.in_(ids),
                public_course(),
                model.is_active.is_(True),
            )
            if model is Grade:
                stmt = stmt.join(EducationLevel).where(
                    EducationLevel.is_active.is_(True)
                )
            result = (
                await self.db.execute(stmt.distinct().order_by(model.name, model.id))
            ).mappings()
            for r in result:
                grouped[r.instructor_id][key].append(
                    {k: v for k, v in r.items() if k != "instructor_id"}
                )
        # Affiliation is not a credential and not proof of teaching a subject.
        course_pairs = select(
            Courses.instructor_id, Courses.provider_id.label("provider_id")
        ).where(
            Courses.instructor_id.in_(ids),
            public_course(),
            Courses.provider_id.is_not(None),
        )
        member_pairs = select(
            ProviderMember.user_id.label("instructor_id"), ProviderMember.provider_id
        ).where(
            ProviderMember.user_id.in_(ids),
            ProviderMember.status == "active",
        )
        affiliations = union(course_pairs, member_pairs).subquery()
        result = (
            await self.db.execute(
                select(
                    affiliations.c.instructor_id,
                    Provider.id,
                    Provider.name,
                    Provider.slug,
                )
                .join(Provider, Provider.id == affiliations.c.provider_id)
                .where(provider_visible())
                .order_by(Provider.name, Provider.id)
            )
        ).mappings()
        for r in result:
            grouped[r.instructor_id]["providers"].append(
                {"id": r.id, "name": r.name, "slug": r.slug}
            )
        return [
            {
                "id": r.id,
                "name": r.name,
                "avatar": r.avatar,
                "short_bio": " ".join(plain_bio(r.bio or r.instructor_description).split())[
                    :240
                ],
                "public_course_count": r.course_count,
                "course_count": r.course_count,
                "student_count": r.student_count,
                "rating_avg": round(float(r.rating_avg), 2),
                "rating_count": r.rating_count,
                "evaluated_count": r.rating_count,
                **grouped[r.id],
            }
            for r in rows
        ]

    async def detail(self, identity):
        stmt, _ = self.listing_query(InstructorFilters())
        row = (
            (await self.db.execute(stmt.where(User.id == identity)))
            .mappings()
            .one_or_none()
        )
        if row is None:
            raise HTTPException(404, "Không tìm thấy giảng viên công khai")
        extra = (
            await self.db.execute(
                select(
                    User.create_at, User.facebook_url, User.instructor_description
                ).where(User.id == identity)
            )
        ).one()
        return {
            **(await self.decorate([row]))[0],
            "instructor_description": plain_bio(extra.instructor_description),
            "facebook_url": safe_facebook(extra.facebook_url),
            "created_at": extra.create_at,
        }

    async def options(self):
        result = await CatalogService(self.db).browse_filters()
        providers = (
            await self.db.execute(
                select(Provider.id, Provider.name, Provider.slug)
                .where(
                    provider_visible(),
                    exists(
                        select(User.id)
                        .where(
                            public_instructor(),
                            provider_affiliation(User.id, Provider.id),
                        )
                        .correlate(Provider)
                    ),
                )
                .order_by(Provider.name, Provider.id)
            )
        ).mappings()
        result["providers"] = [dict(p) for p in providers]
        return result

    @staticmethod
    def require_viewer(user):
        if user.deleted_at or user.is_banned:
            raise HTTPException(403, "Tài khoản không hoạt động")

    async def saved_ids(self, user, ids):
        self.require_viewer(user)
        result = await self.db.scalars(
            select(InstructorFavourite.instructor_id)
            .join(User, User.id == InstructorFavourite.instructor_id)
            .where(
                InstructorFavourite.user_id == user.id,
                InstructorFavourite.instructor_id.in_(ids),
                public_instructor(),
            )
        )
        return {"ids": list(result)}

    async def save(self, user, identity, saved):
        self.require_viewer(user)
        if saved:
            await self.require(identity)
            await self.db.execute(
                insert(InstructorFavourite)
                .values(user_id=user.id, instructor_id=identity)
                .on_conflict_do_nothing()
            )
        else:
            await self.db.execute(
                delete(InstructorFavourite).where(
                    InstructorFavourite.user_id == user.id,
                    InstructorFavourite.instructor_id == identity,
                )
            )
        await self.db.commit()
        return {"saved": saved}

    async def courses(self, identity, f: InstructorCourseFilters, user_id=None):
        await self.require(identity)
        await self.validate_filters(f)
        conditions = [
            Courses.instructor_id == identity,
            public_course(),
            *self.academic_conditions(f),
        ]
        if f.keyword:
            conditions.append(
                folded(Courses.title).like(search_pattern(f.keyword), escape="\\")
            )
        if f.category_slug:
            conditions.append(
                Courses.category_id.in_(
                    select(Categories.id).where(Categories.slug == f.category_slug)
                )
            )
        if f.topic_slug:
            conditions.append(
                Courses.topic_id.in_(
                    select(Topics.id).where(Topics.slug == f.topic_slug)
                )
            )
        if f.level:
            conditions.append(Courses.level == f.level)
        sorts = {
            "created_at": (
                func.coalesce(Courses.created_at, EPOCH),
                datetime.fromisoformat,
            ),
            "views": (func.coalesce(Courses.views, 0), int),
            "rating": (func.coalesce(Courses.rating_avg, 0), Decimal),
            "enrolls": (func.coalesce(Courses.total_enrolls, 0), int),
        }
        key, direction = f.sort.rsplit("_", 1)
        column, converter = sorts[key]
        ascending = direction == "asc"
        signature = filter_signature(f) + ":instructor-courses:" + str(identity)
        position = decode_cursor(f.cursor, converter, signature) if f.cursor else None
        total = await self.db.scalar(
            select(func.count()).select_from(Courses).where(*conditions)
        )
        if position:
            value, last_id = position
            conditions.append(
                or_(
                    column > value if ascending else column < value,
                    and_(
                        column == value,
                        Courses.id > last_id if ascending else Courses.id < last_id,
                    ),
                )
            )
        purchased = (
            exists(
                select(CourseEnrollments.id)
                .where(
                    CourseEnrollments.course_id == Courses.id,
                    CourseEnrollments.user_id == user_id,
                    CourseEnrollments.status == "active",
                )
                .correlate(Courses)
            )
            if user_id
            else literal(False)
        )
        favourite = (
            exists(
                select(CourseFavourites.course_id)
                .where(
                    CourseFavourites.course_id == Courses.id,
                    CourseFavourites.user_id == user_id,
                )
                .correlate(Courses)
            )
            if user_id
            else literal(False)
        )
        stmt = (
            select(
                Courses.id,
                Courses.title,
                Courses.slug,
                Courses.thumbnail_url,
                Courses.base_price,
                Courses.currency,
                Courses.rating_avg,
                Courses.rating_count,
                Courses.total_enrolls,
                Courses.views,
                Courses.level,
                Courses.language,
                Courses.created_at,
                Courses.updated_at,
                Categories.id.label("category_id"),
                Categories.name.label("category_name"),
                Categories.slug.label("category_slug"),
                Topics.id.label("topic_id"),
                Topics.name.label("topic_name"),
                Topics.slug.label("topic_slug"),
                purchased.label("is_purchased"),
                favourite.label("is_favorite"),
                column.label("cursor_value"),
            )
            .outerjoin(Categories, Categories.id == Courses.category_id)
            .outerjoin(Topics, Topics.id == Courses.topic_id)
            .where(*conditions)
            .order_by(
                column.asc() if ascending else column.desc(),
                Courses.id.asc() if ascending else Courses.id.desc(),
            )
            .limit(f.limit + 1)
        )
        rows = (await self.db.execute(stmt)).mappings().all()
        selected = rows[: f.limit]
        items = []
        for r in selected:
            item = {
                k: r[k]
                for k in [
                    "id",
                    "title",
                    "slug",
                    "currency",
                    "level",
                    "language",
                    "created_at",
                    "updated_at",
                    "is_purchased",
                    "is_favorite",
                ]
            }
            item.update(
                thumbnail=r.thumbnail_url,
                base_price=float(r.base_price or 0),
                rating_avg=float(r.rating_avg or 0),
                rating_count=r.rating_count or 0,
                total_enrolls=r.total_enrolls or 0,
                views=r.views or 0,
            )
            for kind in ["category", "topic"]:
                item[kind] = (
                    {k: r[kind + "_" + k] for k in ["id", "name", "slug"]}
                    if r[kind + "_id"]
                    else None
                )
            items.append(item)
        return {
            "items": items,
            "total": total,
            "has_more": len(rows) > f.limit,
            "next_cursor": encode_cursor(
                selected[-1].cursor_value, selected[-1].id, signature
            )
            if len(rows) > f.limit
            else None,
        }
