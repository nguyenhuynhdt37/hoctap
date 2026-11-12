"""Real PostgreSQL; an explicit disposable/scratch database is mandatory."""

import os
import unicodedata
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from app.api.v1.user.lecturer import router
from app.core.deps import AuthorizationService
from app.db.models.catalog import (
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
    CourseReviews,
    Courses,
    Role,
    User,
    UserRoles,
)
from app.db.models.instructor_favourites import InstructorFavourite
from app.db.sesson import get_session
from app.schemas.user.instructors import InstructorCourseFilters, InstructorFilters
from app.services.providers import ProviderService
from app.services.user.instructor_discovery import (
    InstructorDiscoveryService,
    plain_bio,
    safe_facebook,
)
from app.services.user.lecturer import LecturerService
from fastapi import FastAPI, HTTPException
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("TEST_DATABASE_ASYNC_URL"), reason="Explicit scratch DB required"
    ),
]


@pytest_asyncio.fixture
async def db(async_engine):
    async with async_engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()


async def person(db, name="Teacher", role=True, **values):
    if values.get("deleted_at") is not None:
        values["deleted_at"] = values["deleted_at"].replace(tzinfo=None)
    user = User(
        fullname=name,
        email=uuid4().hex + "@instructor.test.invalid",
        password="!disabled",
        **values,
    )
    db.add(user)
    await db.flush()
    if role:
        lecturer_role = await db.scalar(
            select(Role).where(Role.role_name == "LECTURER")
        )
        if not lecturer_role:
            lecturer_role = Role(role_name="LECTURER")
            db.add(lecturer_role)
            await db.flush()
        db.add(UserRoles(user_id=user.id, role_id=lecturer_role.id))
        await db.flush()
    return user


async def course(db, teacher, **values):
    category = await db.scalar(select(Categories).where(Categories.slug == "lop-12"))
    subject = await db.scalar(select(Subject).where(Subject.slug == "toan"))
    c = Courses(
        title="Public course",
        slug="instructor-test-" + uuid4().hex,
        instructor_id=teacher.id,
        category_id=category.id,
        subject_id=subject.id,
        is_published=True,
        approval_status="approved",
        base_price=100000,
        currency="VND",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    for key, value in values.items():
        setattr(c, key, value)
    db.add(c)
    await db.flush()
    return c


async def mapping(db, c, grade=12):
    g = await db.scalar(select(Grade).where(Grade.grade_number == grade))
    exam = await db.scalar(select(Exam).where(Exam.code == "tot-nghiep-thpt"))
    goal = await db.scalar(select(LearningGoal).limit(1))
    await db.execute(course_grades.insert().values(course_id=c.id, grade_id=g.id))
    await db.execute(course_exams.insert().values(course_id=c.id, exam_id=exam.id))
    await db.execute(
        course_learning_goals.insert().values(course_id=c.id, learning_goal_id=goal.id)
    )
    return g, exam, goal


async def review(db, c, user, rating, **values):
    db.add(
        CourseReviews(
            course_id=c.id,
            user_id=user.id,
            rating=rating,
            content="Actual course feedback",
            **values,
        )
    )
    await db.flush()


async def test_eligibility_empty_and_public_count(db):
    service = InstructorDiscoveryService(db)
    query = "unique-" + uuid4().hex
    assert (await service.listing(InstructorFilters(q=query)))["items"] == []
    valid = await person(db, query)
    a = await course(db, valid)
    await course(db, valid, is_published=False)
    await course(db, valid, approval_status="rejected")
    await course(db, valid, deleted_at=datetime.now(UTC))
    await course(db, valid, slug="demo-catalog-" + uuid4().hex)
    for params in [
        {"role": False},
        {"is_banned": True},
        {"deleted_at": datetime.now(UTC)},
    ]:
        other = await person(db, query, **params)
        await course(db, other)
        with pytest.raises(HTTPException) as error:
            await service.detail(other.id)
        assert error.value.status_code == 404
    no_course = await person(db, query)
    rows = await service.listing(InstructorFilters(q=query))
    assert rows["total"] == 2
    by_id = {row["id"]: row for row in rows["items"]}
    assert by_id[valid.id]["public_course_count"] == 1
    assert by_id[no_course.id]["public_course_count"] == 0
    assert (await service.detail(no_course.id))["course_count"] == 0
    assert (await service.courses(no_course.id, InstructorCourseFilters()))[
        "items"
    ] == []
    assert [
        r["id"]
        for r in (await service.listing(InstructorFilters(q=query, has_courses=True)))[
            "items"
        ]
    ] == [valid.id]
    assert [
        r["id"]
        for r in (await service.listing(InstructorFilters(q=query, has_courses=False)))[
            "items"
        ]
    ] == [no_course.id]
    detail = await service.detail(valid.id)
    assert detail["rating_count"] == 0 and detail["rating_avg"] == 0
    assert (await service.courses(valid.id, InstructorCourseFilters()))["items"][0][
        "id"
    ] == a.id


async def test_unicode_search_academic_and_combined_filters(db):
    service = InstructorDiscoveryService(db)
    name = "Nguyễn Ánh Đào " + uuid4().hex[:8]
    teacher = await person(
        db, name, instructor_description="<p>Hướng dẫn tư duy độc lập</p>"
    )
    c = await course(db, teacher)
    _grade, exam, goal = await mapping(db, c)
    for text in [
        name,
        unicodedata.normalize("NFD", name),
        "nguyen anh dao",
        "Tư duy độc lập",
        "Toán",
    ]:
        data = await service.listing(InstructorFilters(q="  " + text + "  "))
        assert teacher.id in {x["id"] for x in data["items"]}
    for kwargs in [
        {"grade": 12},
        {"subject": "toan"},
        {"exam": exam.code},
        {"goal": goal.code},
        {"grade": 12, "subject": "toan", "exam": exam.code, "goal": goal.code},
    ]:
        assert teacher.id in {
            x["id"]
            for x in (await service.listing(InstructorFilters(q=name, **kwargs)))[
                "items"
            ]
        }
    assert not (await service.listing(InstructorFilters(q=name, grade=1)))["items"]
    # Combined academic predicates must match one actual course.
    geography = await db.scalar(select(Subject).where(Subject.slug == "dia-ly"))
    geo = await course(db, teacher, subject_id=geography.id)
    await mapping(db, geo, grade=10)
    assert not (
        await service.listing(InstructorFilters(q=name, subject="dia-ly", grade=12))
    )["items"]
    assert (await service.listing(InstructorFilters(q=name, level="thpt")))[
        "total"
    ] == 1
    for kwargs in [
        {"subject": "invented"},
        {"provider": "unknown"},
        {"exam": "unknown"},
        {"goal": "unknown"},
        {"level": "unknown"},
    ]:
        with pytest.raises(HTTPException) as e:
            await service.listing(InstructorFilters(**kwargs))
        assert e.value.status_code == 422


async def test_provider_affiliation_visibility_no_duplicates(db):
    svc = InstructorDiscoveryService(db)
    teacher = await person(db, "Provider Teacher " + uuid4().hex)
    provider = Provider(
        name="Trung tâm Đường Mây",
        slug=uuid4().hex,
        provider_type="center",
        verification_status="verified",
        is_active=True,
    )
    individual = Provider(
        name="Giảng dạy độc lập",
        slug=uuid4().hex,
        provider_type="individual",
        verification_status="verified",
        is_active=True,
    )
    db.add_all([provider, individual])
    await db.flush()
    await course(db, teacher, provider_id=individual.id)
    await course(
        db, teacher, provider_id=provider.id
    )  # blocked by existing settlement policy
    db.add(
        ProviderMember(
            provider_id=provider.id,
            user_id=teacher.id,
            status="active",
        )
    )
    db.add(
        ProviderMember(
            provider_id=individual.id,
            user_id=teacher.id,
            status="active",
        )
    )
    await db.flush()
    for p in [provider, individual]:
        result = await svc.listing(InstructorFilters(provider=p.slug))
        assert [r["id"] for r in result["items"]].count(teacher.id) == 1
        assert {r["id"] for r in (await svc.options())["providers"]} >= {p.id}
    detail = await svc.detail(teacher.id)
    assert detail["course_count"] == 1 and len(detail["providers"]) == 2
    assert (await ProviderService(db).detail(provider.slug))["instructors"][0][
        "id"
    ] == teacher.id
    teacher.is_banned = True
    await db.flush()
    assert not (await ProviderService(db).detail(provider.slug))["instructors"]
    teacher.is_banned = False
    individual.is_active = False
    await db.flush()
    assert (await svc.detail(teacher.id))["public_course_count"] == 0


async def test_real_metrics_reviews_distinct_learners_and_confidence(db):
    svc = InstructorDiscoveryService(db)
    a = await person(
        db,
        "metrics-" + uuid4().hex,
        student_count=99999,
        course_count=999,
        rating_avg=5,
        evaluated_count=999,
    )
    c1 = await course(db, a)
    c2 = await course(db, a)
    draft = await course(db, a, is_published=False)
    learner = await person(db, "Learner", role=False)
    outsider = await person(db, "Outside", role=False)
    db.add_all(
        [
            CourseEnrollments(course_id=c1.id, user_id=learner.id, status="active"),
            CourseEnrollments(course_id=c2.id, user_id=learner.id, status="active"),
        ]
    )
    await db.flush()
    await review(db, c1, learner, 1, updated_at=datetime(2025, 1, 1))
    await review(
        db, c1, learner, 4, updated_at=datetime(2026, 1, 1)
    )  # newest pair only
    await review(db, c2, learner, 5)
    await review(db, c1, outsider, 1)  # unenrolled ignored
    await review(db, draft, learner, 1)
    await review(db, c1, a, 5)  # self-review ignored
    detail = await svc.detail(a.id)
    assert (
        detail["student_count"],
        detail["course_count"],
        detail["rating_count"],
        detail["rating_avg"],
    ) == (1, 2, 2, 4.5)
    assert (await svc.listing(InstructorFilters(q=a.fullname, min_rating=4.5)))[
        "total"
    ] == 1
    assert (await svc.listing(InstructorFilters(q=a.fullname, min_rating=4.6)))[
        "total"
    ] == 0
    learner.is_banned = True
    await db.flush()
    after = await svc.detail(a.id)
    assert after["student_count"] == 0 and after["rating_count"] == 0


@pytest.mark.parametrize(
    "sort", ["relevant", "popular", "rating", "courses", "newest", "name"]
)
async def test_directory_stable_pagination_all_sorts(db, sort):
    token = "pagination " + uuid4().hex
    expected = []
    for i in range(5):
        t = await person(db, token + " " + str(i))
        await course(db, t)
        expected.append(t.id)
    service = InstructorDiscoveryService(db)
    cursor = None
    seen = []
    while True:
        page = await service.listing(
            InstructorFilters(
                q=token, sort=sort, limit=2, cursor=cursor, include_total=cursor is None
            )
        )
        seen.extend(r["id"] for r in page["items"])
        cursor = page["next_cursor"]
        if not cursor:
            break
    assert set(seen) == set(expected) and len(seen) == 5
    first = await service.listing(InstructorFilters(q=token, sort=sort, limit=1))
    with pytest.raises(HTTPException) as error:
        await service.listing(
            InstructorFilters(q="different", sort=sort, cursor=first["next_cursor"])
        )
    assert error.value.status_code == 422
    with pytest.raises(HTTPException):
        await service.listing(InstructorFilters(cursor="bad"))


@pytest.mark.parametrize(
    "sort",
    [
        "created_at_desc",
        "created_at_asc",
        "views_desc",
        "views_asc",
        "rating_desc",
        "rating_asc",
        "enrolls_desc",
        "enrolls_asc",
    ],
)
async def test_legacy_course_keysets_all_sorts(db, sort):
    teacher = await person(db)
    ids = []
    for i in range(6):
        c = await course(
            db,
            teacher,
            created_at=datetime(2026, 1, 1, tzinfo=UTC) + timedelta(days=i // 2),
            rating_avg=Decimal(i // 2),
            views=i // 2,
            total_enrolls=i // 2,
        )
        ids.append(c.id)
    service = InstructorDiscoveryService(db)
    cursor = None
    seen = []
    while True:
        result = await service.courses(
            teacher.id, InstructorCourseFilters(sort=sort, limit=2, cursor=cursor)
        )
        assert result["total"] == 6
        seen.extend(r["id"] for r in result["items"])
        cursor = result["next_cursor"]
        if not cursor:
            break
    assert len(seen) == len(set(seen)) == 6 and set(seen) == set(ids)
    if sort.endswith("asc"):
        assert seen[0] in ids[:2]
    else:
        assert seen[0] in ids[-2:]
    assert (
        await LecturerService(db).get_instructor_courses_async(
            teacher.id, None, limit=1, sort=sort
        )
    )["items"]


async def test_saved_owner_isolation_idempotence_hidden_removal(db):
    svc = InstructorDiscoveryService(db)
    teacher = await person(db)
    await course(db, teacher)
    a = await person(db, role=False)
    b = await person(db, role=False)
    assert await svc.save(a, teacher.id, True) == {"saved": True}
    await svc.save(a, teacher.id, True)
    assert (
        await db.scalar(
            select(func.count())
            .select_from(InstructorFavourite)
            .where(InstructorFavourite.user_id == a.id)
        )
        == 1
    )
    assert (await svc.saved_ids(a, [teacher.id]))["ids"] == [teacher.id]
    assert not (await svc.saved_ids(b, [teacher.id]))["ids"]
    assert (await svc.listing(InstructorFilters(), saved_by=a.id))["total"] == 1
    assert (await svc.listing(InstructorFilters(), saved_by=b.id))["total"] == 0
    teacher.is_banned = True
    await db.flush()
    assert not (await svc.saved_ids(a, [teacher.id]))["ids"]
    assert (await svc.listing(InstructorFilters(), saved_by=a.id))["total"] == 0
    await svc.save(a, teacher.id, False)
    await svc.save(a, teacher.id, False)
    assert (
        await db.scalar(
            select(func.count())
            .select_from(InstructorFavourite)
            .where(InstructorFavourite.user_id == a.id)
        )
        == 0
    )
    a.is_banned = True
    with pytest.raises(HTTPException) as e:
        await svc.save(a, teacher.id, True)
    assert e.value.status_code == 403


async def test_http_routes_guest_privacy_validation_and_safe_bio(db):
    teacher = await person(
        db,
        "Đặng Thị Mây",
        instructor_description="<script>steal()</script><p>Giới thiệu <b>thật</b></p><img src=x onerror=evil()>",
        facebook_url="javascript:evil()",
    )
    await course(db, teacher)
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_session] = lambda: db

    class Guest:
        async def get_current_user_if_any(self):
            return None

        async def get_current_user(self):
            raise HTTPException(401, "Login required")

    app.dependency_overrides[AuthorizationService] = Guest
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        for path in [
            "",
            "/top",
            "/" + str(teacher.id),
            "/" + str(teacher.id) + "/courses",
            "/filter-options",
        ]:
            r = await client.get("/users/instructors" + path)
            assert r.status_code == 200, (path, r.text)
            text = r.text
            for private in [
                "citizenship_identity",
                "password",
                "email",
                "wallet",
                "district",
                "conscious",
            ]:
                assert private not in text
        detail = (await client.get("/users/instructors/" + str(teacher.id))).json()
        assert (
            "steal" not in detail["instructor_description"]
            and "<" not in detail["instructor_description"]
        )
        assert detail["facebook_url"] is None
        for path in ["/not-a-uuid", "/" + str(uuid4())]:
            assert (await client.get("/users/instructors" + path)).status_code in {
                404,
                422,
            }
        for params in [
            {"limit": 31},
            {"grade": 13},
            {"sort": "fake"},
            {"min_rating": 6},
            {"q": "x" * 161},
            {"extra": "bad"},
            {"cursor": "malformed"},
        ]:
            assert (
                await client.get("/users/instructors", params=params)
            ).status_code == 422
        for path in ["/saved", "/saved/ids"]:
            assert (await client.get("/users/instructors" + path)).status_code == 401
        for method in ["put", "delete"]:
            assert (
                await getattr(client, method)(
                    "/users/instructors/" + str(teacher.id) + "/saved"
                )
            ).status_code == 401
    assert plain_bio("<style>bad</style><p>Hello</p>") == "Hello"
    assert safe_facebook("https://facebook.com.evil.test/user") is None
    assert (
        safe_facebook("https://www.facebook.com/profile")
        == "https://www.facebook.com/profile"
    )


async def test_page_query_count_constant_and_no_user_entity_fetch(db, async_engine):
    token = "querybudget-" + uuid4().hex
    for i in range(5):
        t = await person(db, token + " " + str(i))
        await course(db, t)
    statements = []

    def capture(_conn, _cursor, statement, _parameters, _context, _many):
        statements.append(statement)

    event.listen(async_engine.sync_engine, "before_cursor_execute", capture)
    try:
        svc = InstructorDiscoveryService(db)
        await svc.listing(InstructorFilters(q=token, limit=1))
        one = len(statements)
        statements.clear()
        await svc.listing(InstructorFilters(q=token, limit=5))
        assert len(statements) == one == 7  # count + page + 4 taxonomies + affiliations
        projection = (
            statements[1].split('FROM public."user"')[-2].rsplit("SELECT", 1)[-1]
        )
        assert "password" not in projection and "citizenship_identity" not in projection
    finally:
        event.remove(async_engine.sync_engine, "before_cursor_execute", capture)


async def test_default_rating_sorts_highest_average_first(db):
    token = "ranking-" + uuid4().hex
    single = await person(db, token + " single")
    a = await course(db, single)
    established = await person(db, token + " established")
    b = await course(db, established)
    for c, ratings in [(a, [5]), (b, [5, 5, 5, 5, 5, 4])]:
        for score in ratings:
            learner = await person(db, role=False)
            db.add(
                CourseEnrollments(user_id=learner.id, course_id=c.id, status="active")
            )
            await db.flush()
            await review(db, c, learner, score)
    result = await InstructorDiscoveryService(db).listing(InstructorFilters(q=token))
    assert [r["id"] for r in result["items"]] == [single.id, established.id]
    assert result["items"][0]["rating_avg"] > result["items"][1]["rating_avg"]
    popular = await InstructorDiscoveryService(db).listing(
        InstructorFilters(q=token, sort="popular")
    )
    assert popular["items"][0]["id"] == established.id


async def test_http_private_bookmarks_own_user_only_and_bounded_ids(db):
    teacher = await person(db)
    await course(db, teacher)
    owner = await person(db, role=False)
    other = await person(db, role=False)
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_session] = lambda: db

    class Current:
        async def get_current_user(self):
            return owner

    app.dependency_overrides[AuthorizationService] = Current
    base = "/users/instructors"
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        for _ in range(2):
            assert (
                await client.put(
                    base + "/" + str(teacher.id) + "/saved",
                    json={"user_id": str(other.id)},
                )
            ).status_code == 200
        assert (await client.get(base + "/saved")).json()["total"] == 1
        assert (
            await client.get(base + "/saved/ids", params={"ids": str(teacher.id)})
        ).json()["ids"] == [str(teacher.id)]
        assert (
            await client.get(
                base + "/saved/ids", params=[("ids", str(uuid4())) for _ in range(31)]
            )
        ).status_code == 422
        assert not (
            await InstructorDiscoveryService(db).saved_ids(other, [teacher.id])
        )["ids"]
        for _ in range(2):
            assert (
                await client.delete(base + "/" + str(teacher.id) + "/saved")
            ).status_code == 200
        assert (await client.get(base + "/saved")).json()["total"] == 0
        owner.is_banned = True
        await db.flush()
        assert (await client.get(base + "/saved")).status_code == 403


async def test_search_escapes_wildcards_and_preserves_non_latin_unicode(db):
    svc = InstructorDiscoveryService(db)
    token = uuid4().hex
    name = token + " 100% _ Đặng 教師"
    teacher = await person(db, name)
    await course(db, teacher)
    for q in [token + " 100%", token + " 100% _", "教師"]:
        assert teacher.id in {
            i["id"] for i in (await svc.listing(InstructorFilters(q=q)))["items"]
        }
    assert (await svc.listing(InstructorFilters(q=token + "%missing")))["total"] == 0


async def test_newest_means_account_registration_and_course_cursor_bound(db):
    svc = InstructorDiscoveryService(db)
    token = "new-account-" + uuid4().hex
    old = await person(db, token + " old", create_at=datetime(2020, 1, 1))
    new = await person(db, token + " new", create_at=datetime(2026, 1, 1))
    for i in range(3):
        await course(db, old, created_at=datetime(2026, 5, 1, tzinfo=UTC))
    await course(db, new, created_at=datetime(2020, 1, 1, tzinfo=UTC))
    items = (await svc.listing(InstructorFilters(q=token, sort="newest")))["items"]
    assert [r["id"] for r in items] == [new.id, old.id]
    page = await svc.courses(old.id, InstructorCourseFilters(limit=1))
    for kwargs in [{"sort": "views_desc"}, {"keyword": "different"}]:
        with pytest.raises(HTTPException) as e:
            await svc.courses(
                old.id, InstructorCourseFilters(cursor=page["next_cursor"], **kwargs)
            )
        assert e.value.status_code == 422
    with pytest.raises(HTTPException):
        await svc.courses(new.id, InstructorCourseFilters(cursor=page["next_cursor"]))


async def test_malformed_unicode_control_char_and_name_cursor_are_422(db):
    import base64
    import json

    from pydantic import ValidationError

    for kwargs in [{"q": "bad\x00name"}, {"subject": "bad\x00subject"}]:
        with pytest.raises(ValidationError):
            InstructorFilters(**kwargs)
    with pytest.raises(ValidationError):
        InstructorCourseFilters(keyword="bad\x00title")
    svc = InstructorDiscoveryService(db)
    token = "cursor-control-" + uuid4().hex
    for _ in range(2):
        teacher = await person(db, token)
        await course(db, teacher)
    page = await svc.listing(InstructorFilters(q=token, sort="name", limit=1))
    payload = json.loads(base64.urlsafe_b64decode(page["next_cursor"]))
    for bad in ["bad\x00name", "\ud800", {"not": "a name"}]:
        payload["value"] = bad
        cursor = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
        with pytest.raises(HTTPException) as error:
            await svc.listing(InstructorFilters(q=token, sort="name", cursor=cursor))
        assert error.value.status_code == 422
