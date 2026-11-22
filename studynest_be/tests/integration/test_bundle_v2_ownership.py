"""Real DB owner/eligibility policy; requires the isolated V2 migration schema."""
import os
from datetime import UTC, datetime, timedelta
from decimal import Decimal
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


async def test_lecturer_save_publishes_without_admin_review(fixture):
    from app.db.models.learning_paths import BundleVersion
    from app.schemas.learning_paths import BundleInput
    from app.services.bundle_management import BundleManagementService
    from app.services.bundles import BundleService

    db, users, courses, *_ = fixture
    await grant_lecturer(db, users[1])
    courses[1].instructor_id = users[1].id
    await db.flush()
    service = BundleManagementService(db)
    draft = BundleInput(
        title="Combo giảng viên kiểm thử",
        description="Nội dung học tập có mục tiêu rõ ràng và các khóa do cùng giảng viên phụ trách.",
        price=200000,
        course_ids=[course.id for course in courses],
    )
    saved = await service.save(draft, users[1].id)
    version = await db.get(BundleVersion, saved["id"])
    assert version.status == "published"
    quote = await BundleService(db).quote(saved["id"], users[0].id)
    assert quote["quote_hash"] and Decimal(quote["total"]) == Decimal("200000.00")
    revised = await service.save(
        draft.model_copy(update={"course_ids": [course.id for course in reversed(courses)]}),
        users[1].id,
        saved["id"],
    )
    assert revised["id"] != saved["id"] and revised["status"] == "published"
    assert [item["course_id"] for item in revised["items"]] == [course.id for course in reversed(courses)]
    assert [item["position"] for item in revised["items"]] == list(range(1, len(courses) + 1))
    assert revised["instructor"] == {"id": users[1].id, "name": users[1].fullname}
    assert revised["course_count"] == len(courses)
    # Updating the learning order must preserve the previously purchased version.
    original = await BundleService(db).detail(saved["id"])
    assert [item["course_id"] for item in original["items"]] == [course.id for course in courses]
    listed = await BundleService(db).listing()
    assert saved["bundle_id"] in {item["bundle_id"] for item in listed["items"]}
    entry = next(item for item in listed["items"] if item["bundle_id"] == saved["bundle_id"])
    assert entry["course_count"] == len(courses)
    assert entry["instructor"]["id"] == users[1].id
    matches = await BundleService(db).listing(keyword="giảng viên kiểm thử")
    assert saved["bundle_id"] in {item["bundle_id"] for item in matches["items"]}
    empty = await BundleService(db).listing(keyword="no-such-roadmap-" + uuid4().hex)
    assert empty["items"] == [] and empty["total"] == 0
    with pytest.raises(HTTPException) as error:
        await service.save(
            draft.model_copy(update={"course_ids": [courses[0].id]}), users[1].id
        )
    assert error.value.status_code == 422


async def test_public_bundle_catalog_filters_before_pagination(fixture):
    from app.schemas.learning_paths import BundleInput
    from app.services.bundle_management import BundleManagementService

    db, users, courses, *_ = fixture
    owner_id = users[1].id
    await grant_lecturer(db, users[1])
    courses[1].instructor_id = owner_id
    await db.flush()
    manager = BundleManagementService(db)
    keyword = f"Combo catalog {uuid4().hex}"
    for suffix, amount in [("Z", 0), ("B", 100000), ("A", 200000)]:
        await manager.save(
            BundleInput(
                title=f"{keyword} {suffix}",
                description="A sufficiently long description for the catalog.",
                price=amount,
                course_ids=[course.id for course in courses],
            ),
            owner_id,
        )

    free = await manager.bundles.listing(keyword=keyword, price_filter="free")
    assert free["total"] == 1 and free["items"][0]["price"] == 0

    for sort, prices in [("price_asc", [100000, 200000]), ("price_desc", [200000, 100000])]:
        for page, amount in enumerate(prices, start=1):
            result = await manager.bundles.listing(
                keyword=keyword, price_filter="paid", sort=sort, page=page, limit=1
            )
            assert result["total"] == 2
            assert [item["price"] for item in result["items"]] == [amount]

    recent = await manager.bundles.listing(keyword=keyword, sort="recent")
    assert [item["price"] for item in recent["items"]] == [200000, 100000, 0]


async def test_combo_presentation_is_owner_scoped_and_versioned(fixture):
    from app.schemas.learning_paths import BundleInput
    from app.services.bundle_management import BundleManagementService
    from app.services.shares.file_storage import FileStorageService

    db, users, courses, *_ = fixture
    owner, other = users[1:]
    owner_id, other_id = owner.id, other.id
    await grant_lecturer(db, owner)
    courses[1].instructor_id = owner.id
    await db.commit()
    service = BundleManagementService(db)

    def cover(user_id):
        key = FileStorageService.object_key(
            ["bundles", str(user_id), "thumbnails"], "thumbnail.webp"
        )
        return FileStorageService.file_url(key)

    draft = BundleInput(
        title="Combo có ảnh bìa",
        description="Mô tả đủ dài để xuất bản combo.",
        price=200000,
        course_ids=[course.id for course in courses],
    )
    with pytest.raises(HTTPException) as error:
        await service.save(draft.model_copy(update={"thumbnail_url": cover(other_id)}), owner_id)
    assert error.value.status_code == 422

    fields = {
        "thumbnail_url": cover(owner_id),
        "subtitle": "Ôn tập trước kỳ thi",
        "target_audience": ["Học sinh lớp 10"],
        "requirements": ["Biết giải phương trình bậc nhất"],
        "outcomes": ["Giải được hệ phương trình"],
    }
    first = await service.save(draft.model_copy(update=fields), owner_id)
    second = await service.save(draft, owner_id, first["id"])
    assert {field: second[field] for field in fields} == fields
    third = await service.save(
        draft.model_copy(update={"thumbnail_url": None, "outcomes": []}),
        owner_id,
        second["id"],
    )
    public = await service.bundles.by_slug(third["slug"])
    assert public["thumbnail_url"] is None and public["outcomes"] == []
    assert public["subtitle"] == fields["subtitle"]
    original = await service.bundles.detail(first["id"], admin=True)
    assert {field: original[field] for field in fields} == fields


async def test_owner_coupon_quotes_and_other_lecturer_is_refused(fixture):
    from app.schemas.learning_paths import BundleCouponInput, BundleInput
    from app.services.bundle_coupons import BundleCouponService
    from app.services.bundle_management import BundleManagementService
    from app.services.bundles import BundleService

    db, users, courses, *_ = fixture
    await grant_lecturer(db, users[1])
    await grant_lecturer(db, users[2])
    courses[1].instructor_id = users[1].id
    await db.flush()
    service = BundleManagementService(db)
    saved = await service.save(
        BundleInput(
            title="Combo có mã ưu đãi",
            description="Nội dung học tập có mục tiêu rõ ràng và các khóa do cùng giảng viên phụ trách.",
            price=200000,
            course_ids=[course.id for course in courses],
        ),
        users[1].id,
    )
    version_id, bundle_id = saved["id"], saved["bundle_id"]
    coupons = BundleCouponService(db)
    code = "M" + uuid4().hex[:8].upper()
    policy = BundleCouponInput(
        code=code,
        discount_type="percent",
        value=20,
        max_discount=25000,
        starts_at=datetime.now(UTC) - timedelta(days=1),
        ends_at=datetime.now(UTC) + timedelta(days=30),
    )
    with pytest.raises(HTTPException) as error:
        await coupons.save_owned(bundle_id, policy, users[2].id)
    assert error.value.status_code == 404
    await coupons.save_owned(bundle_id, policy, users[1].id)
    quote = await BundleService(db).quote(
        version_id, users[0].id, coupon_code=code.lower()
    )
    assert quote["coupon_code"] == code
    assert Decimal(quote["total"]) == Decimal("175000.00")


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
