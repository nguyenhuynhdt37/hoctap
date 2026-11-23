from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_learning_hub_routes_require_authentication():
    from app.main import app

    identifier = uuid4()
    routes = [
        ("GET", "/user/review/queue"),
        ("POST", f"/user/review/{identifier}/answer"),
        ("GET", "/user/mastery/courses"),
        ("GET", f"/user/courses/{identifier}/mastery"),
        ("POST", "/user/goals"),
        ("GET", "/user/goals"),
        ("GET", f"/user/goals/{identifier}"),
        ("PATCH", f"/user/goals/{identifier}"),
        ("DELETE", f"/user/goals/{identifier}"),
        ("GET", f"/user/goals/{identifier}/plan"),
        ("GET", "/user/reports/weekly"),
        ("GET", "/gamification/badges"),
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for method, path in routes:
            response = await client.request(method, "/api/v1" + path)
            assert response.status_code == 401, (method, path)


@pytest.mark.parametrize(("correct", "rating", "repetitions", "interval", "expected"), [
    (True, "remembered", 0, 0, (1, 1, 2.6)),
    (True, "remembered", 1, 1, (2, 6, 2.6)),
    (True, "remembered", 2, 6, (3, 16, 2.6)),
    (False, "remembered", 4, 40, (0, 1, 2.18)),
    (True, "forgot", 4, 40, (0, 1, 2.18)),
])
def test_review_schedule_requires_real_correctness_and_resets_at_local_midnight(
    correct, rating, repetitions, interval, expected,
):
    from app.services.user.learning_hub.review import next_review

    before_midnight = datetime(2026, 11, 22, 16, 59, tzinfo=UTC)
    reps, days, ease, due_at = next_review(before_midnight, correct, rating, repetitions, interval, 2.5)
    assert (reps, days, ease) == expected
    assert due_at == datetime(2026, 11, 22, 17, tzinfo=UTC) + timedelta(days=days - 1)
    after_midnight = before_midnight + timedelta(minutes=1)
    assert next_review(after_midnight, correct, rating, repetitions, interval, 2.5)[3] == due_at + timedelta(days=1)


def test_mastery_weights_difficult_answers_and_decays():
    from types import SimpleNamespace as Row

    from app.services.user.learning_hub.mastery import assess

    now = datetime(2026, 11, 23, tzinfo=UTC)
    easy, hard = uuid4(), uuid4()
    details = [{"question_id": str(easy), "is_correct": False}, {"question_id": str(hard), "is_correct": True}]
    attempt = Row(details=details, correct=1, total=2, created_at=now)
    assert assess([attempt], {str(easy): 1, str(hard): 4}, now)[:3] == (80.0, "solid", 1)
    assert assess([attempt], {str(easy): 1, str(hard): 4}, now + timedelta(days=60))[:3] == (40.0, "fading", 1)
    assert assess([], {str(easy): 1}, now)[:3] == (None, "not_started", 0)
    assert assess([attempt], {}, now)[:3] == (None, "no_quiz", 0)


@pytest.mark.parametrize("target", [date(2026, 11, 21), date(2026, 11, 22), date(2026, 11, 23)])
def test_goal_rejects_past_and_too_close_dates(target):
    from app.services.user.learning_hub.goals import validate_target_date

    with pytest.raises(HTTPException) as error:
        validate_target_date(date(2026, 11, 22), target)
    assert error.value.status_code == 422
    assert "ngày" in error.value.detail.casefold()


def test_goal_spreads_lessons_and_reserves_review_sessions():
    from app.services.user.learning_hub.goals import allocate_sessions

    dates = allocate_sessions(date(2026, 11, 23), date(2026, 12, 1), 2, list(range(5)), True)
    assert dates == [
        (date(2026, 11, 23), [0, 1], False),
        (date(2026, 11, 26), [2, 3], True),
        (date(2026, 11, 30), [4], True),
    ]


def test_week_changes_at_monday_midnight_in_vietnam():
    from app.services.user.learning_hub.weekly import week_window

    before = datetime(2026, 11, 22, 16, 59, tzinfo=UTC)
    assert [stamp.date() for stamp in week_window(before)] == [date(2026, 11, 16), date(2026, 11, 23)]
    assert [stamp.date() for stamp in week_window(before + timedelta(minutes=1))] == [
        date(2026, 11, 23), date(2026, 11, 30),
    ]


def test_learning_hub_migrations_have_one_head_and_follow_missions():
    from pathlib import Path

    from alembic.config import Config
    from alembic.script import ScriptDirectory

    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    revisions = ScriptDirectory.from_config(config)
    assert len(revisions.get_heads()) == 1
    assert revisions.get_revision("ah12xy456u789").down_revision == "ag01wx345t678"
    assert revisions.get_revision("ag01wx345t678").down_revision == "af90vw234s567"


@pytest.mark.asyncio
async def test_hub_uses_authenticated_learner_and_localizes_validation_without_echoing_input(monkeypatch):
    from types import SimpleNamespace

    from fastapi import FastAPI
    from redis.exceptions import ConnectionError

    from app.api.v1.user import learning_hub

    user_id = uuid4()

    async def current_user():
        return SimpleNamespace(id=user_id)

    async def empty_courses(_query):
        return []

    def unavailable_redis():
        raise ConnectionError("sensitive test input")

    monkeypatch.setattr(learning_hub, "get_redis", unavailable_redis)
    app = FastAPI()
    app.include_router(learning_hub.router, prefix="/api/v1")
    app.dependency_overrides[learning_hub.AuthorizationService] = (
        lambda: SimpleNamespace(get_current_user=current_user)
    )
    app.dependency_overrides[learning_hub.get_session] = lambda: SimpleNamespace(scalars=empty_courses)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        success = await client.get("/api/v1/user/mastery/courses")
        assert success.status_code == 200 and success.json() == {"courses": []}

        invalid = await client.get("/api/v1/user/review/queue", params={"limit": "sensitive test input"})
        assert invalid.status_code == 422
        assert invalid.json() == {
            "detail": [{"loc": ["query", "limit"], "msg": "Giá trị không hợp lệ hoặc bị thiếu."}],
        }
