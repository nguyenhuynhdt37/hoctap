"""Application permission boundary shared by tutor, editor and execution tools."""
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from app.db.models.database import (
    Courses,
    CourseEnrollments,
    CourseSections,
    Lessons,
    LessonProgress,
    User,
)


async def require_lesson_access(db, user_id: UUID, lesson_id: UUID, *, course_id=None):
    user = await db.get(User, user_id, populate_existing=True)
    if not user or user.is_banned or user.deleted_at:
        raise HTTPException(403, "Tài khoản không được phép học.")
    row = (await db.execute(select(Lessons, Courses).join(
        Courses, Courses.id == Lessons.course_id).where(Lessons.id == lesson_id)
        .execution_options(populate_existing=True))).first()
    if not row or row[1].deleted_at or (course_id and row[1].id != course_id):
        raise HTTPException(404, "Không tìm thấy bài học trong khóa học này.")
    lesson, course = row
    enrollment = await db.scalar(select(CourseEnrollments.id).where(
        CourseEnrollments.user_id == user_id, CourseEnrollments.course_id == course.id,
        CourseEnrollments.status == 'active'))
    if not enrollment:
        # A public preview grants only that lesson, never the whole course.
        if not lesson.is_preview or not course.is_published or course.approval_status != 'approved':
            raise HTTPException(403, "Bạn chưa có quyền truy cập bài học này.")
    if enrollment and course.is_lock_lesson and not lesson.is_preview:
        progress = await db.scalar(select(LessonProgress.id).where(
            LessonProgress.user_id == user_id, LessonProgress.lesson_id == lesson.id))
        if not progress:
            completed_exists = (
                select(LessonProgress.id)
                .where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.lesson_id == Lessons.id,
                    LessonProgress.is_completed.is_(True),
                )
                .exists()
            )
            frontier = await db.scalar(
                select(Lessons.id)
                .outerjoin(CourseSections, CourseSections.id == Lessons.section_id)
                .where(
                    Lessons.course_id == course.id,
                    Lessons.is_preview.is_not(True),
                    ~completed_exists,
                )
                .order_by(
                    CourseSections.position.asc().nullslast(),
                    Lessons.position.asc().nullslast(),
                    Lessons.id,
                )
                .limit(1)
            )
            if frontier and frontier != lesson.id:
                raise HTTPException(403, "Bài học chưa được mở khóa.")
    return {'lesson': lesson, 'course': course}
