"""Public combo projection against an explicitly isolated PostgreSQL DB."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.db.models.catalog import EducationLevel, Grade, Subject, course_grades
from app.db.models.database import (
    Courses,
    CourseSections,
    Lessons,
    LessonTypeEnum,
    LessonVideos,
)
from app.schemas.catalog_combos import CatalogComboFilters
from app.schemas.learning_paths import BundleCouponInput, BundleInput
from app.services.bundle_coupons import BundleCouponService
from app.services.bundle_management import BundleManagementService
from app.services.catalog_combos import catalog_combos
from tests.integration.test_bundle_v2_ownership import grant_lecturer
from tests.integration.test_paths_bundles import setup_fixture

pytestmark = pytest.mark.asyncio


async def test_public_projection_uses_latest_version_and_rechecks_constituents(
    db_session,
):
    db, users, courses, _, _ = await setup_fixture(db_session)
    owner = users[1]
    await grant_lecturer(db, owner)
    maths = Subject(
        code=f"maths-{uuid4().hex}", name="Toán", slug=f"maths-{uuid4().hex}"
    )
    physics = Subject(
        code=f"physics-{uuid4().hex}", name="Vật lý", slug=f"physics-{uuid4().hex}"
    )
    db.add_all([maths, physics])
    await db.flush()
    for index in range(3):
        new_course = Courses(
            title=f"Public combo course {index}",
            slug=f"combo-course-{uuid4().hex}",
            category_id=courses[0].category_id,
            instructor_id=owner.id,
            thumbnail_url=f"/course-{index}.webp",
            is_published=True,
            approval_status="approved",
            base_price=100000,
            currency="VND",
        )
        db.add(new_course)
        courses.append(new_course)
    for index, course in enumerate(courses):
        course.instructor_id = owner.id
        course.subject_id = physics.id if index == 0 else maths.id
    await db.flush()

    grades = dict(
        (
            await db.execute(
                select(Grade.grade_number, Grade.id)
                .join(EducationLevel, EducationLevel.id == Grade.education_level_id)
                .where(
                    Grade.grade_number.in_([8, 10]),
                    Grade.is_active.is_(True),
                    EducationLevel.is_active.is_(True),
                )
            )
        ).all()
    )
    for index, course in enumerate(courses):
        await db.execute(
            course_grades.insert().values(
                course_id=course.id, grade_id=grades[10 if index == 0 else 8]
            )
        )

    section = CourseSections(title="Mở đầu", position=1, course_id=courses[0].id)
    db.add(section)
    await db.flush()
    first = Lessons(
        title="Video",
        position=1,
        lesson_type=LessonTypeEnum.VIDEO,
        course_id=courses[0].id,
        section_id=section.id,
    )
    legacy = Lessons(
        title="Bài cũ",
        position=2,
        lesson_type=LessonTypeEnum.ARTICLE,
        section_id=section.id,
    )
    db.add_all([first, legacy])
    await db.flush()
    db.add(
        LessonVideos(
            lesson_id=first.id, video_url="https://example.test/lesson", duration=3720
        )
    )
    await db.flush()

    manager = BundleManagementService(db)
    payload = BundleInput(
        title="Combo đã xuất bản",
        description="Một mô tả đủ dài cho combo đã xuất bản.",
        price=470000,
        course_ids=[course.id for course in courses],
    )
    original = await manager.save(payload, owner.id)
    latest = await manager.save(
        payload.model_copy(update={"title": "Bản mới", "price": Decimal(400000)}),
        owner.id,
        original["id"],
    )
    await manager.bundles.create(
        payload.model_copy(
            update={"title": "Bản nháp", "bundle_id": latest["bundle_id"]}
        ),
        owner.id,
    )
    courses[0].base_price = 150000
    await db.flush()

    now = datetime.now(UTC)
    deadline = now + timedelta(days=2)
    coupons = BundleCouponService(db)
    await coupons.save_owned(
        latest["bundle_id"],
        BundleCouponInput(
            code=f"TEST-{uuid4().hex}",
            discount_type="percent",
            value=10,
            starts_at=now - timedelta(days=1),
            ends_at=deadline,
        ),
        owner.id,
    )

    filters = CatalogComboFilters(level="thcs", subject=maths.code, limit=1)
    result = await catalog_combos(db, filters)
    (item,) = result.items
    assert item.id == latest["bundle_id"] and item.title == "Bản mới"
    assert item.levels == ["thcs", "thpt"] and "thcs" in result.available_levels
    assert item.instructor.id == owner.id
    assert item.course_count == 5 and [course.id for course in item.courses] == [
        course.id for course in courses[:4]
    ]
    assert item.lesson_count == 2 and item.duration_seconds == 3720
    assert item.price == 400000 and item.standalone_total == 650000
    assert item.savings_amount == 250000 and item.savings_percent == 38
    assert item.promotion and item.promotion.ends_at == deadline
    assert (
        await catalog_combos(db, filters.model_copy(update={"level": "thpt"}))
    ).items == []

    courses[0].is_published = False
    await db.flush()
    assert (await catalog_combos(db, filters)).items == []
