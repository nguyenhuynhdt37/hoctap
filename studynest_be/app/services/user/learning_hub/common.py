from urllib.parse import quote
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from app.db.models.database import CourseEnrollments, Courses, CourseSections, LessonProgress, Lessons


async def lock_learner(db: AsyncSession, scope: str, user_id: UUID) -> None:
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtextextended(f"{scope}:{user_id}", 0))))


async def active_courses(
    db: AsyncSession,
    user_id: UUID,
    course_ids: list[UUID] | None = None,
    *,
    lock: bool = False,
) -> dict[UUID, Courses]:
    # Same entitlement as course missions. Active enrollment is mandatory even for previews.
    stmt = (
        select(Courses)
        .options(load_only(Courses.id, Courses.title, Courses.slug, Courses.thumbnail_url, Courses.is_lock_lesson))
        .join(CourseEnrollments, CourseEnrollments.course_id == Courses.id)
        .where(CourseEnrollments.user_id == user_id, CourseEnrollments.status == "active",
               Courses.deleted_at.is_(None))
        .order_by(Courses.id, CourseEnrollments.id)
        .execution_options(populate_existing=True)
    )
    if course_ids is not None:
        stmt = stmt.where(Courses.id.in_(course_ids))
    if lock:
        stmt = stmt.with_for_update(read=True, of=CourseEnrollments)
    return {course.id: course for course in await db.scalars(stmt)}


def curriculum_query(course_ids):
    return (
        select(Lessons)
        .options(load_only(Lessons.id, Lessons.course_id, Lessons.section_id, Lessons.title,
                           Lessons.lesson_type, Lessons.position))
        .outerjoin(CourseSections, and_(CourseSections.id == Lessons.section_id,
                                       CourseSections.course_id == Lessons.course_id))
        .where(Lessons.course_id.in_(course_ids))
        .order_by(Lessons.course_id, CourseSections.position.asc().nulls_last(), CourseSections.id,
                  Lessons.position, Lessons.id)
    )


def lesson_href(course: Courses, lesson_id: UUID) -> str:
    return f"/learning/{quote(course.slug, safe='')}?lesson_id={lesson_id}"


def owned_progress_join(user_id: UUID):
    return and_(
        LessonProgress.user_id == user_id,
        LessonProgress.lesson_id == Lessons.id,
        LessonProgress.course_id == Lessons.course_id,
    )
