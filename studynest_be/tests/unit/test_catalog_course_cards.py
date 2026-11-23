from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy import create_engine

from app.api.v1 import catalog
from app.libs.formats.datetime import now
from app.schemas.catalog import CatalogCoursesResponse, CatalogFilters
from app.services.catalog import CatalogService


def identity(number):
    return UUID(int=number)


@pytest.fixture
def db():
    # Exercise actual SQL against an isolated in-memory catalog. The full
    # PostgreSQL integration suite uses the repository's scratch DB fixture.
    engine = create_engine("sqlite://")
    with engine.connect() as connection:
        connection.connection.executescript("""
            ATTACH DATABASE ':memory:' AS public;
            CREATE TABLE public.courses (
                id CHAR(32), slug TEXT, title TEXT, thumbnail_url TEXT,
                base_price NUMERIC, currency TEXT, rating_avg NUMERIC,
                rating_count INTEGER, total_enrolls INTEGER, total_length_seconds INTEGER,
                created_at DATETIME, approved_at DATETIME, level TEXT, language TEXT,
                delivery_type TEXT, instructor_id CHAR(32), subject_id CHAR(32),
                provider_id CHAR(32), category_id CHAR(32), is_published BOOLEAN,
                approval_status TEXT, deleted_at DATETIME
            );
            CREATE TABLE public.user (id CHAR(32), fullname TEXT, avatar TEXT, email TEXT);
            CREATE TABLE public.subjects (id CHAR(32), name TEXT, slug TEXT, is_active BOOLEAN);
            CREATE TABLE public.providers (
                id CHAR(32), name TEXT, slug TEXT, provider_type TEXT,
                is_active BOOLEAN, verification_status TEXT
            );
            CREATE TABLE public.course_grades (course_id CHAR(32), grade_id CHAR(32));
            CREATE TABLE public.grades (
                id CHAR(32), name TEXT, grade_number INTEGER,
                education_level_id CHAR(32), is_active BOOLEAN
            );
            CREATE TABLE public.education_levels (id CHAR(32), code TEXT, is_active BOOLEAN);
            CREATE TABLE public.lessons (id CHAR(32), course_id CHAR(32), section_id CHAR(32));
            CREATE TABLE public.course_sections (id CHAR(32), course_id CHAR(32));
            CREATE TABLE public.lesson_videos (lesson_id CHAR(32), duration FLOAT);
            CREATE TABLE public.discounts (
                id CHAR(32), applies_to TEXT, is_active BOOLEAN, is_hidden BOOLEAN,
                start_at DATETIME, end_at DATETIME, discount_code TEXT,
                usage_count INTEGER, usage_limit INTEGER, discount_type TEXT,
                percent_value NUMERIC, fixed_value NUMERIC
            );
            CREATE TABLE public.discount_targets (
                discount_id CHAR(32), course_id CHAR(32), category_id CHAR(32)
            );
        """)
        sql = connection.exec_driver_sql
        sql(
            "INSERT INTO public.user VALUES (?, ?, ?, ?)",
            (identity(1).hex, "Giảng viên", "/avatar.jpg", "private@example.test"),
        )
        sql(
            "INSERT INTO public.subjects VALUES (?, 'Toán', 'toan', 1)",
            (identity(2).hex,),
        )
        sql(
            "INSERT INTO public.education_levels VALUES (?, 'thcs', 1)",
            (identity(3).hex,),
        )
        sql(
            "INSERT INTO public.grades VALUES (?, 'Lớp 8', 8, ?, 1)",
            (identity(4).hex, identity(3).hex),
        )

        def insert_course(number, price, enrolls, rating, created_at, published=True):
            sql(
                "INSERT INTO public.courses VALUES (?, ?, ?, NULL, ?, 'VND', ?, 2, ?, "
                "3600, ?, NULL, 'all', 'vi', 'recorded_video', ?, ?, NULL, NULL, ?, 'approved', NULL)",
                (
                    identity(number).hex,
                    f"course-{number}",
                    "Toán",
                    price,
                    rating,
                    enrolls,
                    created_at,
                    identity(1).hex,
                    identity(2).hex,
                    published,
                ),
            )
            sql(
                "INSERT INTO public.course_grades VALUES (?, ?)",
                (identity(number).hex, identity(4).hex),
            )

        today = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S.%f")
        insert_course(10, 100000, 140, 4.5, today)
        insert_course(11, 0, 110, 5, None)
        insert_course(12, 200000, 700, 5, today, published=False)
        insert_course(13, 100000, 900, 5, today)
        insert_course(14, 100000, 900, 5, today)
        sql(
            "UPDATE public.courses SET approval_status='pending' WHERE id=?",
            (identity(13).hex,),
        )
        sql(
            "UPDATE public.courses SET deleted_at=? WHERE id=?",
            (today, identity(14).hex),
        )
        sql(
            "INSERT INTO public.course_sections VALUES (?, ?)",
            (identity(20).hex, identity(10).hex),
        )
        sql(
            "INSERT INTO public.lessons VALUES (?, ?, ?)",
            (identity(21).hex, identity(10).hex, identity(20).hex),
        )
        sql(
            "INSERT INTO public.lessons VALUES (?, NULL, ?)",
            (identity(22).hex, identity(20).hex),
        )
        sql("INSERT INTO public.lesson_videos VALUES (?, 65.5)", (identity(21).hex,))
        sql("INSERT INTO public.lesson_videos VALUES (?, 120)", (identity(22).hex,))

        current = now()
        date_format = "%Y-%m-%d %H:%M:%S.%f"
        for number, value, hidden, active, max_uses, uses, ends, target in [
            (30, 25, False, True, None, 0, current + timedelta(days=1), 10),
            (31, 90, True, True, None, 0, current + timedelta(days=1), 10),
            (32, 90, False, False, None, 0, current + timedelta(days=1), 10),
            (33, 90, False, True, 3, 3, current + timedelta(days=1), 10),
            (34, 90, False, True, None, 0, current - timedelta(hours=1), 10),
            (35, 90, False, True, None, 0, current + timedelta(days=1), 12),
        ]:
            sql(
                "INSERT INTO public.discounts VALUES (?, 'global', ?, ?, ?, ?, "
                "'never-expose-this-code', ?, ?, 'percent', ?, NULL)",
                (
                    identity(number).hex,
                    active,
                    hidden,
                    (current - timedelta(days=2)).strftime(date_format),
                    ends.strftime(date_format),
                    uses,
                    max_uses,
                    value,
                ),
            )
            sql(
                "INSERT INTO public.discount_targets VALUES (?, ?, NULL)",
                (identity(number).hex, identity(target).hex),
            )
        sql(
            "INSERT INTO public.discounts VALUES (?, 'global', 1, 0, ?, ?, "
            "'another-code', 0, NULL, 'fixed', NULL, 10000)",
            (
                identity(36).hex,
                (current - timedelta(days=1)).strftime(date_format),
                (current + timedelta(days=1)).strftime(date_format),
            ),
        )

        class TestDatabase:
            queries = 0

            async def execute(self, statement):
                self.queries += 1
                return connection.execute(statement)

            async def scalar(self, statement):
                return (await self.execute(statement)).scalar()

        yield TestDatabase()
    engine.dispose()


@pytest.mark.asyncio
async def test_enriched_cards_and_legacy_projection(db):
    service = CatalogService(db)
    filters = CatalogFilters(level="thcs", subject="toan", sort="popular", limit=1)
    page = await service.courses(filters, include_card_details=True)
    response = CatalogCoursesResponse.model_validate(page)
    card = response.items[0]
    assert response.total == 2 and response.has_more
    assert card.slug == "course-10"
    assert card.students_count == card.total_enrolls == 140 and card.is_bestseller
    assert card.rating_avg == 4.5 and card.rating_count == 2
    assert card.lessons_count == 2 and card.duration_seconds == 186
    assert card.original_price == card.base_price == 100000
    assert card.discount_price == 75000 and not card.is_free
    assert card.is_new and card.lecturer.name == card.instructor.fullname
    assert card.lecturer.avatar == "/avatar.jpg"
    assert card.subject.name == "Toán" and card.grades[0].grade_number == 8
    assert "another-code" not in response.model_dump_json()
    assert "private@example.test" not in response.model_dump_json()
    assert (
        db.queries == 5
    )  # count, page, grades, batched lesson stats and public prices

    next_filters = filters.model_copy(
        update={"cursor": response.next_cursor, "include_total": False}
    )
    following = await service.courses(next_filters, include_card_details=True)
    free = CatalogCoursesResponse.model_validate(following).items[0]
    assert free.slug == "course-11" and free.is_free and free.discount_price is None
    assert free.lessons_count == 0 and free.duration_seconds == 0
    assert not free.is_new and not free.is_bestseller
    assert not following["has_more"] and following["total"] is None

    db.queries = 0
    legacy = await service.courses(filters)
    assert legacy["items"][0]["base_price"] == 100000
    assert "discount_price" not in legacy["items"][0] and db.queries == 3


@pytest.mark.asyncio
async def test_sort_filters_and_null_dates_on_cursor_pages(db):
    service = CatalogService(db)
    latest = await service.courses(CatalogFilters(limit=1))
    following = await service.courses(
        CatalogFilters(limit=1, cursor=latest["next_cursor"])
    )
    assert [latest["items"][0]["slug"], following["items"][0]["slug"]] == [
        "course-10",
        "course-11",
    ]
    rated = await service.courses(CatalogFilters(sort="rating"))
    assert [item["slug"] for item in rated["items"]] == ["course-11", "course-10"]
    free = await service.courses(CatalogFilters(min_price=0, max_price=0))
    assert [item["slug"] for item in free["items"]] == ["course-11"]


def test_course_route_validates_filters_and_caches_public_first_page(monkeypatch):
    class Redis:
        def __init__(self):
            self.values = {}
            self.unavailable = False

        async def get(self, key):
            if self.unavailable:
                raise RedisConnectionError()
            return self.values.get(key)

        async def set(self, key, value, *, ex):
            assert 30 <= ex <= 120
            if self.unavailable:
                raise RedisConnectionError()
            self.values[key] = value

    service = AsyncMock(spec=CatalogService)
    service.courses.return_value = {
        "items": [],
        "next_cursor": None,
        "has_more": False,
        "total": 0,
    }
    redis = Redis()
    monkeypatch.setattr(catalog, "get_redis", lambda: redis)
    app = FastAPI()
    app.include_router(catalog.router)
    app.dependency_overrides[CatalogService] = lambda: service
    with TestClient(app) as client:
        path = "/catalog/courses?limit=4&level=thcs"
        first = client.get(path)
        assert first.status_code == 200
        assert "public" in first.headers["cache-control"]
        assert client.get(path).json() == first.json()
        service.courses.assert_awaited_once()
        assert service.courses.call_args.kwargs == {"include_card_details": True}
        for query in ("sort=anything", "limit=51", "max_price=-1", "unexpected=true"):
            assert client.get(f"/catalog/courses?{query}").status_code == 422
        assert client.get("/catalog/courses?level=thpt").status_code == 200
        assert service.courses.await_count == 2
        for _ in range(2):
            page = client.get("/catalog/courses?cursor=another-page")
            assert page.status_code == 200
            assert page.headers["cache-control"] == "no-store"
        assert service.courses.await_count == 4
        redis.unavailable = True
        assert client.get("/catalog/courses?level=tieu-hoc").status_code == 200
        assert service.courses.await_count == 5
