from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy import create_engine

from app.api.v1.catalog import router
from app.services import catalog


@pytest.fixture
def course_rows():
    # Run the real aggregation against a local fixture without database credentials.
    engine = create_engine("sqlite://")
    with engine.begin() as db:
        db.exec_driver_sql("ATTACH DATABASE ':memory:' AS public")
        for name, columns in {
            '"user"': "id text",
            "subjects": "id text, is_active boolean",
            "education_levels": "id text, code text, is_active boolean",
            "grades": "id text, education_level_id text, grade_number int, is_active boolean",
            "providers": "id text, provider_type text, is_active boolean, verification_status text",
            "courses": (
                "id text, subject_id text, instructor_id text, provider_id text, is_published boolean, "
                "approval_status text, deleted_at text, slug text, currency text"
            ),
            "course_grades": "course_id text, grade_id text",
        }.items():
            db.exec_driver_sql(f"CREATE TABLE public.{name} ({columns})")

        math, hidden, primary, middle, inactive = [uuid4().hex for _ in range(5)]
        db.exec_driver_sql("INSERT INTO public.\"user\" VALUES ('teacher')")
        db.exec_driver_sql(
            "INSERT INTO public.subjects VALUES (?, ?)", [(math, 1), (hidden, 0)]
        )
        db.exec_driver_sql(
            "INSERT INTO public.education_levels VALUES (?, ?, ?)",
            [(primary, "tieu-hoc", 1), (middle, "thcs", 1), (inactive, "thpt", 0)],
        )
        db.exec_driver_sql(
            "INSERT INTO public.grades VALUES (?, ?, ?, ?)",
            [
                ("one", primary, 1, 1),
                ("two", primary, 2, 1),
                ("three", primary, 3, 0),
                ("six", middle, 6, 1),
                ("ten", inactive, 10, 1),
            ],
        )
        db.exec_driver_sql(
            "INSERT INTO public.providers VALUES ('org', 'school', 1, 'verified')"
        )
        db.exec_driver_sql(
            "INSERT INTO public.courses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                ("multi", math, "teacher", None, 1, "approved", None, "multi", "VND"),
                (
                    "unclassified",
                    math,
                    "teacher",
                    None,
                    1,
                    "approved",
                    None,
                    "unclassified",
                    "VND",
                ),
                (
                    "hidden-subject",
                    hidden,
                    "teacher",
                    None,
                    1,
                    "approved",
                    None,
                    "hidden-subject",
                    "VND",
                ),
                ("draft", math, "teacher", None, 0, "approved", None, "draft", "VND"),
                (
                    "pending",
                    math,
                    "teacher",
                    None,
                    1,
                    "pending",
                    None,
                    "pending",
                    "VND",
                ),
                (
                    "deleted",
                    math,
                    "teacher",
                    None,
                    1,
                    "approved",
                    "date",
                    "deleted",
                    "VND",
                ),
                (
                    "demo",
                    math,
                    "teacher",
                    None,
                    1,
                    "approved",
                    None,
                    "demo-catalog-example",
                    "VND",
                ),
                ("usd", math, "teacher", None, 1, "approved", None, "usd", "USD"),
                ("org", math, "teacher", "org", 1, "approved", None, "org", "VND"),
            ],
        )
        db.exec_driver_sql(
            "INSERT INTO public.course_grades VALUES (?, ?)",
            [("multi", grade) for grade in ("one", "two", "three", "six", "ten")]
            + [("hidden-subject", "one")]
            + [
                (course, "one")
                for course in ("draft", "pending", "deleted", "demo", "usd", "org")
            ],
        )
        yield db, str(UUID(hex=math))
    engine.dispose()


@pytest.mark.asyncio
async def test_counts_match_public_catalog_and_deduplicate_courses(
    course_rows, monkeypatch
):
    db, math_id = course_rows
    redis = SimpleNamespace(get=AsyncMock(return_value=None), set=AsyncMock())
    monkeypatch.setattr(catalog, "get_redis", lambda: redis, raising=False)
    execute = AsyncMock(side_effect=db.execute)
    service = catalog.CatalogService(SimpleNamespace(execute=execute))

    result = await service.course_counts()

    assert result.model_dump(mode="json") == {
        "total": 3,
        "by_level": {"tieu-hoc": 2, "thcs": 1},
        "by_subject": {
            math_id: {
                "total": 2,
                "by_level": {"tieu-hoc": 1, "thcs": 1},
                "by_grade": {"1": 1, "2": 1, "6": 1},
            }
        },
    }
    execute.assert_awaited_once()
    cache_key, cached_body = redis.set.await_args.args
    assert redis.set.await_args.kwargs == {"ex": 60}
    redis.get.return_value = cached_body
    assert await service.course_counts() == result
    redis.get.assert_awaited_with(cache_key)
    execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_redis_outage_still_returns_database_counts(course_rows, monkeypatch):
    db, _ = course_rows
    redis = SimpleNamespace(
        get=AsyncMock(side_effect=RedisConnectionError), set=AsyncMock()
    )
    monkeypatch.setattr(catalog, "get_redis", lambda: redis, raising=False)
    service = catalog.CatalogService(
        SimpleNamespace(execute=AsyncMock(side_effect=db.execute))
    )

    assert (await service.course_counts()).total == 3
    redis.set.assert_not_awaited()


def test_public_filters_include_counts_only_when_requested():
    options = {
        "levels": [
            {
                "id": str(uuid4()),
                "code": "thcs",
                "name": "THCS",
                "is_active": True,
                "order_index": 2,
            }
        ],
        "grades": [],
        "subjects": [],
        "learning_goals": [],
        "exams": [],
        "grade_subjects": [],
        "delivery_types": [{"code": "recorded_video", "name": "Video bài giảng"}],
    }
    counts = {"total": 2, "by_level": {"thcs": 2}, "by_subject": {}}
    service = SimpleNamespace(
        filters=AsyncMock(side_effect=lambda: dict(options)),
        course_counts=AsyncMock(return_value=counts),
    )
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[catalog.CatalogService] = lambda: service

    with TestClient(app) as client:
        original = client.get("/catalog/filters")
        assert original.status_code == 200
        assert original.json() == options
        assert "Cache-Control" not in original.headers
        service.course_counts.assert_not_awaited()

        with_counts = client.get(
            "/catalog/filters", params={"include_course_counts": "true"}
        )
        assert with_counts.status_code == 200
        assert with_counts.json() == {**options, "course_counts": counts}
        assert with_counts.headers["Cache-Control"] == "public, max-age=30"
        service.course_counts.assert_awaited_once()

        assert (
            client.get("/catalog/filters?include_course_counts=maybe").status_code
            == 422
        )
