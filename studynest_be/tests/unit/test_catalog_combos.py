from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy.dialects import postgresql

from app.api.v1 import catalog
from app.schemas.catalog_combos import CatalogComboFilters
from app.services import catalog_combos as service


def combo_row(**changes):
    values = {
        "id": uuid4(),
        "slug": "combo-kiem-thu",
        "title": "Combo kiểm thử",
        "thumbnail": None,
        "description": "Mô tả ngắn",
        "levels": ["thpt"],
        "subjects": [{"code": "toan", "name": "Toán"}],
        "course_count": 2,
        "lesson_count": 6,
        "duration_seconds": 5400,
        "price": Decimal("200000.00"),
        "standalone_total": Decimal("300000.00"),
        "courses": [{"id": uuid4(), "title": "Toán 10", "thumbnail": "/toan.jpg"}],
        "instructor_id": uuid4(),
        "instructor_name": "Giảng viên",
        "promotion_ends_at": None,
        "available_levels": ["thpt", "thcs"],
        "has_public_combos": True,
    }
    return SimpleNamespace(**(values | changes))


@pytest.fixture
def catalog_dependencies(monkeypatch):
    db = SimpleNamespace(
        execute=AsyncMock(return_value=SimpleNamespace(all=lambda: [combo_row()]))
    )
    redis = SimpleNamespace(get=AsyncMock(return_value=None), set=AsyncMock())
    monkeypatch.setattr(service, "get_redis", lambda: redis)
    return db, redis


@pytest.fixture
def client(catalog_dependencies):
    db, _ = catalog_dependencies
    api = FastAPI()
    api.include_router(catalog.router, prefix="/api/v1")
    api.dependency_overrides[catalog.CATALOG_DEP.dependency] = lambda: SimpleNamespace(
        db=db
    )
    with TestClient(api) as test_client:
        yield test_client


@pytest.mark.parametrize(
    "query", ["limit=0", "limit=51", "level=college", "sort=random", "subject=%20toan"]
)
def test_public_endpoint_validates_query_before_accessing_db(
    client, catalog_dependencies, query
):
    db, _ = catalog_dependencies
    response = client.get(f"/api/v1/catalog/combos?{query}")
    assert response.status_code == 422
    db.execute.assert_not_awaited()


def test_anonymous_response_has_cache_headers_and_only_public_fields(client):
    response = client.get("/api/v1/catalog/combos?sort=price_asc&limit=3")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "public, max-age=30"
    body = response.json()
    assert body["available_levels"] == ["thcs", "thpt"]
    assert body["has_public_combos"] is True
    (item,) = body["items"]
    assert item["price"] == "200000.00"
    assert item["standalone_total"] == "300000.00"
    assert item["savings_amount"] == "100000.00"
    assert item["savings_percent"] == 33
    assert item["duration_seconds"] == 5400
    assert set(item["instructor"]) == {"id", "name"}
    assert set(item["courses"][0]) == {"id", "title", "thumbnail"}
    assert item["promotion"] is None


@pytest.mark.parametrize("standalone,price", [("0.00", "0.00"), ("100.00", "200.00")])
def test_never_advertises_negative_savings(standalone, price):
    item = service._item(
        combo_row(standalone_total=Decimal(standalone), price=Decimal(price))
    )
    assert item.savings_amount == 0
    assert item.savings_percent == 0


async def test_redis_cache_is_keyed_by_validated_filters_and_avoids_a_second_query(
    catalog_dependencies,
):
    db, redis = catalog_dependencies
    filters = CatalogComboFilters(level="thpt", limit=10, sort="price_desc")
    result = await service.catalog_combos(db, filters)

    key = "catalog:combos:v1:10:thpt:price_desc"
    redis.get.assert_awaited_once_with(key)
    redis.set.assert_awaited_once_with(key, result.model_dump_json(), ex=60)
    redis.get.return_value = result.model_dump_json()
    assert await service.catalog_combos(db, filters) == result
    db.execute.assert_awaited_once()


async def test_redis_failure_falls_back_to_database(catalog_dependencies):
    db, redis = catalog_dependencies
    redis.get.side_effect = RedisConnectionError
    redis.set.side_effect = RedisConnectionError
    result = await service.catalog_combos(db, CatalogComboFilters())
    assert result.items[0].slug == "combo-kiem-thu"
    db.execute.assert_awaited_once()


@pytest.mark.parametrize("has_public_combos", [False, True])
async def test_empty_page_retains_catalog_availability_and_skips_unbounded_cache_keys(
    catalog_dependencies, has_public_combos
):
    db, redis = catalog_dependencies
    db.execute.return_value.all = lambda: [
        combo_row(
            id=None,
            has_public_combos=has_public_combos,
            available_levels=["thpt"] if has_public_combos else None,
        )
    ]
    result = await service.catalog_combos(db, CatalogComboFilters(subject="no-matches"))
    assert result.items == []
    assert result.has_public_combos is has_public_combos
    assert result.available_levels == (["thpt"] if has_public_combos else [])
    redis.get.assert_not_awaited()
    redis.set.assert_not_awaited()


async def test_expiring_promotion_is_not_cached_beyond_deadline(catalog_dependencies):
    db, redis = catalog_dependencies
    deadline = datetime.now(UTC) + timedelta(seconds=10)
    db.execute.return_value.all = lambda: [combo_row(promotion_ends_at=deadline)]
    result = await service.catalog_combos(db, CatalogComboFilters())

    assert result.items[0].promotion.model_dump() == {
        "status": "coupon_required",
        "ends_at": deadline,
    }
    assert 0 <= service.cache_seconds(result) <= 10
    redis.set.assert_not_awaited()


def test_postgresql_query_uses_bound_filters_and_batches_preview_and_lessons():
    query = service._catalog_query(
        CatalogComboFilters(level="thpt", subject="toan", limit=3)
    )
    compiled = query.compile(dialect=postgresql.dialect())
    sql = str(compiled)
    assert "thpt" in compiled.params.values() and "toan" in compiled.params.values()
    assert "'toan'" not in sql
    assert "row_number() OVER (PARTITION BY" in sql
    assert (
        "JOIN LATERAL" in sql
        and "ORDER BY public.course_bundle_versions.version DESC" in sql
    )
    assert "UNION ALL" in sql and "public.lessons.course_id IS NULL" in sql
    assert "public.course_bundle_items.list_price" not in sql
    assert 'public."user".email' not in sql
