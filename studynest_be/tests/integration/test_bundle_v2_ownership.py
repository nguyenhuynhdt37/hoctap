"""Real DB owner/eligibility policy; requires the isolated V2 migration schema."""
import os
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text

from app.db.models.database import Role, UserRoles
from app.services.bundle_ownership import BundleOwnershipPolicy
from tests.integration.test_paths_bundles import db_session, fixture  # noqa: F401

pytestmark = [pytest.mark.asyncio, pytest.mark.skipif(not os.getenv("TEST_DATABASE_ASYNC_URL"), reason="Explicit disposable DB required")]


async def grant_lecturer(db, user):
    role = await db.scalar(select(Role).where(Role.role_name == "LECTURER"))
    if not role:
        role = Role(id=uuid4(), role_name="LECTURER")
        db.add(role)
        await db.flush()
    db.add(UserRoles(user_id=user.id, role_id=role.id))
    await db.flush()


async def test_owned_draft_submission_review_and_edit_guard(fixture):
    from app.services.bundle_management import BundleManagementService
    from app.schemas.learning_paths import BundleInput
    db, users, courses, *_ = fixture
    await grant_lecturer(db, users[1])
    admin_role = await db.scalar(select(Role).where(Role.role_name == "ADMIN"))
    if not admin_role:
        admin_role = Role(id=uuid4(), role_name="ADMIN")
        db.add(admin_role)
        await db.flush()
    db.add(UserRoles(user_id=users[0].id, role_id=admin_role.id))
    courses[1].instructor_id = users[1].id
    await db.flush()
    service = BundleManagementService(db)
    draft = BundleInput(title="Combo giảng viên kiểm thử", description="Nội dung học tập có mục tiêu rõ ràng và các khóa do cùng giảng viên phụ trách.", price=200000, course_ids=[course.id for course in courses])
    saved = await service.save(draft, users[1].id)
    actor, version = users[1].id, saved["id"]
    admin_id = users[0].id
    assert (await service.submit(version, actor))["review_status"] == "pending"
    with pytest.raises(HTTPException) as error:
        await service.save(draft, actor, version)
    assert error.value.status_code == 409
    assert (await service.review(version, admin_id, "changes_requested", "Cần bổ sung thông tin học viên mục tiêu."))["review_status"] == "changes_requested"
    await service.save(draft, actor, version)
    await service.submit(version, actor)
    assert (await service.review(version, admin_id, "approved", "Đã kiểm tra quyền sở hữu và nội dung học tập."))["review_status"] == "approved"


async def test_foreign_courses_and_duplicate_ids_are_rejected(fixture):
    db, users, courses, *_ = fixture
    await grant_lecturer(db, users[1])
    policy = BundleOwnershipPolicy(db)
    valid = await policy.courses([courses[0].id], users[1].id)
    assert set(valid) == {courses[0].id}
    for selected in [[courses[1].id], [courses[0].id, courses[0].id]]:
        with pytest.raises(HTTPException) as error:
            await policy.courses(selected, users[1].id)
        assert error.value.status_code == 422
    with pytest.raises(HTTPException):
        await policy.courses([courses[0].id], users[1].id, publishing=True)


async def test_root_scope_cannot_claim_legacy_or_another_instructors_bundle(fixture):
    db, users, *_ = fixture
    for user in users[1:]:
        await grant_lecturer(db, user)
    root = uuid4()
    await db.execute(text("INSERT INTO public.course_bundles(id,slug,origin,owner_id) VALUES (:id,:slug,'lecturer',:owner)"), {"id": root, "slug": f"owner-test-{root}", "owner": users[1].id})
    policy = BundleOwnershipPolicy(db)
    assert (await policy.root(root, users[1].id))["owner_id"] == users[1].id
    with pytest.raises(HTTPException) as error:
        await policy.root(root, users[2].id)
    assert error.value.status_code == 404
    legacy = uuid4()
    await db.execute(text("INSERT INTO public.course_bundles(id,slug) VALUES (:id,:slug)"), {"id": legacy, "slug": f"legacy-owner-test-{legacy}"})
    with pytest.raises(HTTPException) as error:
        await policy.root(legacy, users[1].id)
    assert error.value.status_code == 404


async def test_blocked_owner_and_unpublished_course_are_rejected(fixture):
    db, users, courses, *_ = fixture
    await grant_lecturer(db, users[1])
    policy = BundleOwnershipPolicy(db)
    courses[0].is_published = False
    await db.flush()
    with pytest.raises(HTTPException):
        await policy.courses([courses[0].id], users[1].id)
    users[1].is_banned = True
    await db.flush()
    with pytest.raises(HTTPException) as error:
        await policy.lecturer(users[1].id)
    assert error.value.status_code == 403
