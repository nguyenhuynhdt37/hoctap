"""Real PostgreSQL tests. Run only against TEST_DATABASE_ASYNC_URL scratch DB."""

import os
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError

from app.api.v1.catalog import router
from app.core.deps import AuthorizationService
from app.db.models.catalog import (
    EducationLevel,
    Exam,
    Grade,
    Provider,
    Subject,
    course_grades,
    grade_subjects,
)
from app.db.models.database import Categories, Courses, User
from app.db.sesson import get_session
from app.schemas.admin.category import CreateCategory, UpdateCategory
from app.schemas.catalog import (
    CatalogFilters,
    CourseTaxonomy,
    MemberInput,
    ProviderInput,
    TaxonomyInput,
)
from app.services.admin.category import CategoryService
from app.services.catalog import CatalogService
from app.services.providers import ProviderService
from scripts.seed_catalog_v2 import seed

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("TEST_DATABASE_ASYNC_URL"),
        reason="Requires explicit scratch database",
    ),
]


async def make_course(db, **values):
    user = await db.scalar(select(User).limit(1))
    category = await db.scalar(select(Categories).where(Categories.slug == "lop-12"))
    row = Courses(
        title="Catalog test",
        slug="catalog-test-" + uuid4().hex,
        instructor_id=user.id,
        category_id=category.id,
        is_published=True,
        approval_status="approved",
        base_price=Decimal(100000),
        created_at=datetime(2026, 1, 1),
        total_enrolls=7,
        rating_avg=4,
        rating_count=1,
    )
    for key, value in values.items():
        setattr(row, key, value)
    db.add(row)
    await db.flush()
    return row, user


async def test_shared_subject_and_seed_idempotency(db_session):
    await seed(db_session)
    counts = []
    for _ in range(2):
        await seed(db_session)
        counts.append(
            (
                await db_session.scalar(select(func.count()).select_from(Subject)),
                await db_session.scalar(select(func.count()).select_from(Grade)),
            )
        )
    assert counts[0] == counts[1] == (15, 12)
    subject = await db_session.scalar(select(Subject).where(Subject.code == "toan"))
    assert (
        await db_session.scalar(
            select(func.count())
            .select_from(grade_subjects)
            .where(grade_subjects.c.subject_id == subject.id)
        )
        == 12
    )


@pytest.mark.parametrize("number", [0, 13])
async def test_invalid_grade(number):
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        TaxonomyInput(code="test", name="Test", grade_number=number)


async def test_unique_grade_and_foreign_key(db_session):
    grade = await db_session.scalar(select(Grade).limit(1))
    async with db_session.begin_nested():
        db_session.add(
            Grade(
                code="test-" + uuid4().hex,
                name="Test",
                grade_number=grade.grade_number,
                slug=uuid4().hex,
                education_level_id=grade.education_level_id,
            )
        )
        with pytest.raises(IntegrityError):
            await db_session.flush()
    async with db_session.begin_nested():
        db_session.add(
            Grade(
                code="test-" + uuid4().hex,
                name="Test",
                grade_number=1,
                slug=uuid4().hex,
                education_level_id=uuid4(),
            )
        )
        with pytest.raises(IntegrityError):
            await db_session.flush()


async def test_category_patch_cycle_slug_and_safe_delete(db_session):
    svc = CategoryService(db_session)
    root = Categories(
        name="Root test", slug="root-" + uuid4().hex, parent_id=None, order_index=0
    )
    db_session.add(root)
    await db_session.flush()
    child = Categories(
        name="Child test", slug="child-" + uuid4().hex, parent_id=root.id, order_index=0
    )
    db_session.add(child)
    await db_session.flush()
    root_id = root.id
    original_slug = child.slug
    await svc.update_category_async(child.id, UpdateCategory(name="Renamed"))
    await db_session.refresh(child)
    assert child.parent_id == root.id and child.slug == original_slug
    child_id = child.id
    with pytest.raises(HTTPException) as e:
        await svc.update_category_async(root_id, UpdateCategory(parent_id=child_id))
    assert e.value.status_code == 422


@pytest.mark.parametrize(
    "sort", ["newest", "popular", "rating", "price_asc", "price_desc"]
)
async def test_visibility_filters_stable_pagination(db_session, sort):
    public = []
    for _ in range(4):
        row, _user = await make_course(db_session)
        public.append(row.id)
    await make_course(db_session, is_published=False)
    await make_course(db_session, approval_status="pending")
    await make_course(db_session, deleted_at=datetime.now(UTC))
    svc = CatalogService(db_session)
    seen = []
    cursor = None
    while True:
        result = await svc.courses(
            CatalogFilters(keyword="Catalog test", sort=sort, limit=2, cursor=cursor)
        )
        seen.extend(r["id"] for r in result["items"])
        assert result["total"] == 4
        cursor = result["next_cursor"]
        if not cursor:
            break
    assert len(seen) == len(set(seen)) == 4
    assert set(seen) == set(public)
    result = await svc.courses(CatalogFilters(keyword="Catalog test", max_price=0))
    assert result["items"] == []
    assert result["total"] == 0


async def test_combined_taxonomy_and_readback(db_session):
    course, user = await make_course(db_session)
    subject = await db_session.scalar(select(Subject).where(Subject.code == "toan"))
    grades = (
        await db_session.scalars(select(Grade).where(Grade.grade_number.in_([11, 12])))
    ).all()
    exam = await db_session.scalar(select(Exam).where(Exam.code == "tot-nghiep-thpt"))
    svc = CatalogService(db_session)
    await svc.assign(
        course,
        CourseTaxonomy(
            subject_id=subject.id, grade_ids=[g.id for g in grades], exam_ids=[exam.id]
        ),
        user.id,
    )
    assert len((await svc.course_taxonomy(course.id))["grades"]) == 2
    result = await svc.courses(
        CatalogFilters(
            grade=12, subject="toan", exam="tot-nghiep-thpt", min_price=50000, rating=4
        )
    )
    assert course.id in [x["id"] for x in result["items"]]


@pytest.mark.parametrize(
    "sort", ["newest", "popular", "rating", "price_asc", "price_desc"]
)
async def test_browse_projection_and_count_optional_on_cursor(
    db_session, async_engine, sort
):
    title = "Catalog projection " + uuid4().hex
    for _ in range(3):
        course, _ = await make_course(
            db_session, title=title, description="long body " * 1000
        )
        grade = await db_session.scalar(select(Grade).where(Grade.grade_number == 12))
        await db_session.execute(
            course_grades.insert().values(course_id=course.id, grade_id=grade.id)
        )
    statements = []

    def capture(_conn, _cursor, statement, _params, _context, _many):
        statements.append(statement)

    event.listen(async_engine.sync_engine, "before_cursor_execute", capture)
    try:
        service = CatalogService(db_session)
        first = await service.courses(CatalogFilters(keyword=title, sort=sort, limit=1))
        assert first["total"] == 3 and first["has_more"]
        assert len(statements) == 3  # count, projected page, batched grades
        statements.clear()
        following = await service.courses(
            CatalogFilters(
                keyword=title,
                sort=sort,
                limit=2,
                cursor=first["next_cursor"],
                include_total=False,
            )
        )
        assert following["total"] is None and not following["has_more"]
        assert len(following["items"]) == 2 and len(statements) == 2
        assert {row["id"] for row in following["items"]}.isdisjoint(
            {first["items"][0]["id"]}
        )
        assert following["items"][0]["grades"][0]["grade_number"] == 12
        page_projection = statements[0].split("FROM", 1)[0]
        for unused in [
            "description",
            "embedding",
            "search_tsv",
            "outcomes",
            "requirements",
            "approval_note",
        ]:
            assert unused not in page_projection
        assert "count(" not in statements[0].lower()
        statements.clear()
        empty = await service.courses(
            CatalogFilters(keyword=uuid4().hex, include_total=False)
        )
        assert empty == {
            "items": [],
            "next_cursor": None,
            "has_more": False,
            "total": None,
        }
        assert len(statements) == 1  # no count or empty grade lookup
        statements.clear()
        with pytest.raises(HTTPException) as error:
            await service.courses(
                CatalogFilters(keyword="different", cursor=first["next_cursor"])
            )
        assert error.value.status_code == 422 and not statements
    finally:
        event.remove(async_engine.sync_engine, "before_cursor_execute", capture)


async def test_compact_browse_choices_hide_inactive_and_non_public_providers(
    db_session,
):
    service = CatalogService(db_session)
    subject = await db_session.scalar(select(Subject).where(Subject.code == "dia-ly"))
    assert subject is not None
    subject.description = "Long editor-only description " * 100
    inactive = Subject(
        code="hidden-" + uuid4().hex, slug=uuid4().hex, name="Hidden", is_active=False
    )
    db_session.add(inactive)
    grade = await db_session.scalar(select(Grade).where(Grade.grade_number == 12))
    level = await db_session.get(EducationLevel, grade.education_level_id)
    level.is_active = False
    providers = []
    for active, verified, kind, published in [
        (True, "verified", "individual", True),
        (True, "pending", "individual", True),
        (False, "verified", "individual", True),
        (True, "verified", "center", True),
        (True, "verified", "individual", False),
    ]:
        provider = Provider(
            name="Provider choice",
            slug=uuid4().hex,
            is_active=active,
            verification_status=verified,
            provider_type=kind,
        )
        db_session.add(provider)
        await db_session.flush()
        await make_course(db_session, provider_id=provider.id, is_published=published)
        providers.append(provider)
    result = await service.browse_filters()
    assert {p.id for p in providers} & {p["id"] for p in result["providers"]} == {
        providers[0].id
    }
    assert all(set(p) == {"id", "name", "slug"} for p in result["providers"])
    subjects = {s["id"]: s for s in result["subjects"]}
    assert subject.id in subjects and inactive.id not in subjects
    assert set(subjects[subject.id]) == {"id", "code", "name", "slug"}
    assert grade.id not in {g["id"] for g in result["grades"]}
    assert level.id not in {g["id"] for g in result["levels"]}
    assert all(link["subject_id"] in subjects for link in result["grade_subjects"])
    assert all(
        link["grade_id"] in {g["id"] for g in result["grades"]}
        for link in result["grade_subjects"]
    )
    # Rich editor endpoint remains unchanged.
    original = await service.filters()
    assert (
        next(s for s in original["subjects"] if s["id"] == subject.id)["description"]
        == subject.description
    )


async def test_browse_http_contract_and_validation(db_session):
    course, _ = await make_course(db_session, title="HTTP catalog " + uuid4().hex)
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_session] = lambda: db_session
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        options = await client.get("/catalog/browse-filters")
        assert options.status_code == 200
        populated = await client.get("/catalog/courses", params={"keyword": course.title})
        assert populated.status_code == 200
        assert populated.json()["items"][0]["id"] == str(course.id)
        assert "description" not in populated.json()["items"][0]
        assert {"subjects", "providers", "grade_subjects"} <= options.json().keys()
        result = await client.get(
            "/catalog/courses", params={"subject": "dia-ly", "include_total": "false"}
        )
        assert result.status_code == 200 and result.json()["total"] is None
        for params in [
            {"limit": 51},
            {"include_total": "invalid"},
            {"cursor": "invalid"},
            {"unknown": "value"},
        ]:
            assert (
                await client.get("/catalog/courses", params=params)
            ).status_code == 422


async def test_provider_permissions_and_settlement_guard(db_session):
    course, user = await make_course(db_session, is_published=False)
    svc = ProviderService(db_session)
    data = await svc.save(
        ProviderInput(
            name="Test center", slug="test-" + uuid4().hex, provider_type="center"
        ),
        user.id,
    )
    provider_id = data["id"]
    assert data["verification_status"] == "pending"
    profile = await svc.detail(data["slug"])
    assert profile["course_count"] == 0 and profile["subjects"] == []
    assert "email" not in profile
    catalog = CatalogService(db_session)
    await catalog.assign(course, CourseTaxonomy(provider_id=provider_id), user.id)
    with pytest.raises(HTTPException) as e:
        await catalog.validate_assignment(
            CourseTaxonomy(provider_id=provider_id), uuid4()
        )
    assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        await catalog.validate_assignment(
            CourseTaxonomy(provider_id=provider_id), user.id, publishing=True
        )
    assert e.value.status_code == 409
    with pytest.raises(HTTPException):
        await svc.member(
            provider_id, MemberInput(user_id=user.id, role="instructor"), user.id
        )
    # A teacher can belong to more than one provider.
    other = await svc.save(
        ProviderInput(name="Second teacher", slug="test-" + uuid4().hex), user.id
    )
    assert other["id"] != provider_id


async def test_http_validation_anonymous_mutation_and_draft(db_session):
    app = FastAPI()
    app.include_router(router)

    async def session():
        yield db_session

    app.dependency_overrides[get_session] = session

    class DenyAuth:
        async def require_role(self, roles):
            raise HTTPException(401, "Login required")

        async def get_current_user_if_any(self):
            return None

    app.dependency_overrides[AuthorizationService] = DenyAuth
    course, _ = await make_course(db_session, is_published=False)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        for query in (
            "grade=13",
            "sort=invalid",
            "cursor=garbage",
            "min_price=100&max_price=0",
        ):
            assert (await client.get("/catalog/courses?" + query)).status_code == 422
        assert (
            await client.get("/catalog/courses/" + str(course.id) + "/taxonomy")
        ).status_code == 404
        assert (
            await client.post(
                "/admin/catalog/subjects",
                json={"code": "unauthorized", "name": "Test", "slug": "unauthorized"},
            )
        ).status_code == 401
        assert (
            await client.put(
                "/lecturer/courses/" + str(course.id) + "/taxonomy", json={}
            )
        ).status_code == 401


async def test_legacy_and_v2_course_crud_and_ownership(db_session):
    from fastapi import BackgroundTasks

    from app.schemas.lecturer.courses import CreateCourse, UpdateCourse
    from app.services.lecturer.course import CourseService

    user = await db_session.scalar(select(User).limit(1))
    category = await db_session.scalar(
        select(Categories).where(Categories.slug == "lop-12")
    )
    svc = CourseService(db=db_session, storage=None, embedding=None)
    result = await svc.create_course_async(
        user,
        CreateCourse(title="Integration CRUD " + uuid4().hex, category_id=category.id),
        BackgroundTasks(),
    )
    identity = result["course_id"]
    detail = await svc.get_course_detail_async(identity, user.id)
    assert detail["education"]["needs_classification"]
    grade = await db_session.scalar(select(Grade).where(Grade.grade_number == 12))
    subject = await db_session.scalar(select(Subject).where(Subject.code == "toan"))
    updated = await svc.update_course_async(
        identity,
        user.id,
        UpdateCourse(
            title=detail["title"],
            category_id=category.id,
            education=CourseTaxonomy(subject_id=subject.id, grade_ids=[grade.id]),
        ),
        BackgroundTasks(),
    )
    assert updated["education"]["subject"]["id"] == subject.id
    assert len(updated["education"]["grades"]) == 1
    assert updated["slug"] == detail["slug"]
    with pytest.raises(HTTPException) as error:
        await svc.update_course_async(
            identity,
            uuid4(),
            UpdateCourse(title=detail["title"], category_id=category.id),
            BackgroundTasks(),
        )
    assert error.value.status_code == 404


async def test_thumbnail_rejects_other_instructor_before_storage(db_session):
    from io import BytesIO

    from fastapi import UploadFile

    from app.services.lecturer.course import CourseService

    course, _ = await make_course(db_session)
    identity = str(course.id)
    svc = CourseService(db=db_session, storage=None, embedding=None)
    with pytest.raises(HTTPException) as error:
        await svc.upload_thumbnail_async(
            identity, UploadFile(filename="test.png", file=BytesIO(b"test")), uuid4()
        )
    assert error.value.status_code == 404


async def test_category_create_move_reorder_delete_and_depth(db_session):
    svc = CategoryService(db_session)
    await svc.create_category_async(CreateCategory(name="Catalog root " + uuid4().hex))
    root = await db_session.scalar(
        select(Categories).where(Categories.name.like("Catalog root %"))
    )
    root_id = root.id
    await svc.create_category_async(
        CreateCategory(name="Catalog child " + uuid4().hex, parent_id=root_id)
    )
    child = await db_session.scalar(
        select(Categories).where(Categories.parent_id == root_id)
    )
    child_id = child.id
    await svc.update_category_async(
        child_id, UpdateCategory(parent_id=None, order_index=0)
    )
    await db_session.refresh(child)
    assert child.parent_id is None and child.order_index == 0
    await svc.delete_category_async(child_id)
    await svc.delete_category_async(root_id)
    # Existing grade is depth 1; an additional child is depth 2, not depth 3.
    grade_category = await db_session.scalar(
        select(Categories).where(Categories.slug == "lop-12")
    )
    await svc.create_category_async(
        CreateCategory(name="Depth test " + uuid4().hex, parent_id=grade_category.id)
    )
    leaf = await db_session.scalar(
        select(Categories).where(Categories.name.like("Depth test %"))
    )
    with pytest.raises(HTTPException) as error:
        await svc.create_category_async(
            CreateCategory(name="Too deep " + uuid4().hex, parent_id=leaf.id)
        )
    assert error.value.status_code == 422


async def test_admin_taxonomy_create_update_and_safe_delete(db_session):
    svc = CatalogService(db_session)
    code = "test-" + uuid4().hex
    subject = await svc.taxonomy_mutation(
        "subjects", TaxonomyInput(code=code, name="Subject test", slug=code)
    )
    subject_id = subject["id"]
    updated = await svc.taxonomy_mutation(
        "subjects", TaxonomyInput(code=code, name="Renamed test", slug=code), subject_id
    )
    assert updated["name"] == "Renamed test"
    grade = await db_session.scalar(select(Grade).where(Grade.grade_number == 12))
    grade_id = grade.id
    existing = list(
        (
            await db_session.scalars(
                select(grade_subjects.c.subject_id).where(
                    grade_subjects.c.grade_id == grade_id
                )
            )
        ).all()
    )
    await svc.set_grade_subjects(grade_id, [*existing, subject_id])
    with pytest.raises(HTTPException) as error:
        await svc.delete_taxonomy("subjects", subject_id)
    assert error.value.status_code == 409


@pytest.mark.parametrize("paid", [False, True])
@pytest.mark.parametrize("slug_prefix", ["demo-catalog", "seed-shop"])
async def test_demo_fixtures_cannot_enroll_or_charge(db_session, paid, slug_prefix):
    from fastapi import BackgroundTasks

    from app.services.shares.transaction import TransactionsService
    from app.services.user.courses import CoursePublicService

    course, user = await make_course(
        db_session,
        slug=f"{slug_prefix}-test-" + uuid4().hex,
        base_price=100000 if paid else 0,
    )
    course_id = course.id
    with pytest.raises(HTTPException) as error:
        if paid:
            await TransactionsService(db_session).checkout_wallet_async(
                user, [course_id], None, None, None
            )
        else:
            await CoursePublicService(
                db=db_session, embedding=None
            ).enroll_in_course_async(course_id, BackgroundTasks(), user)
    assert error.value.status_code == (400 if paid else 404)
