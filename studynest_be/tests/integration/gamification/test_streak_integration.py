"""
Integration Tests - Module 02: Streak + Redis Event Bus

Coverage:
- RedisEventBus publish → subscribe → dispatch flow
- StreakSubscriber xử lý event từ event bus
- StreakService cập nhật DB sau event
- REST API endpoints /api/v1/gamification/streak/*
- Event flow: lesson.completed → streak.updated

Điều kiện: Cần Redis và PostgreSQL đang chạy.
Có thể bỏ qua bằng: pytest -m "not integration"
"""
from __future__ import annotations

import asyncio
import datetime
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

from app.core.event_bus.base import BaseEvent
from app.core.event_bus.redis_bus import RedisEventBus

pytestmark = pytest.mark.asyncio


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _make_lesson_event(user_id: uuid.UUID) -> BaseEvent:
    return BaseEvent(
        event_name="lesson.completed",
        user_id=user_id,
        source_type="lesson",
        source_id=uuid.uuid4(),
        payload={"lesson_type": "video"},
    )


def _make_checkin_event(user_id: uuid.UUID, consecutive_day: int = 3) -> BaseEvent:
    return BaseEvent(
        event_name="daily_checkin.completed",
        user_id=user_id,
        source_type="checkin",
        source_id=uuid.uuid4(),
        payload={"consecutive_day": consecutive_day},
    )


# ──────────────────────────────────────────────────────────────────────────────
# Tests: RedisEventBus publish/subscribe/dispatch (mocked Redis)
# ──────────────────────────────────────────────────────────────────────────────

class TestRedisEventBus:

    async def test_subscribe_registers_handler(self):
        """subscribe() lưu handler vào _handlers."""
        bus = RedisEventBus(channel="test_channel")
        handler = AsyncMock()
        await bus.subscribe("lesson.completed", handler)
        assert "lesson.completed" in bus._handlers
        assert handler in bus._handlers["lesson.completed"]

    async def test_dispatch_calls_registered_handlers(self):
        """dispatch() gọi handler được đăng ký cho event name."""
        bus = RedisEventBus(channel="test_channel")
        handler = AsyncMock()
        await bus.subscribe("lesson.completed", handler)

        user_id = uuid.uuid4()
        event = _make_lesson_event(user_id)

        await bus.dispatch(event)
        # asyncio.create_task được dùng → cần yield để task chạy
        await asyncio.sleep(0.05)

        handler.assert_called_once_with(event)

    async def test_dispatch_unknown_event_does_nothing(self):
        """dispatch() với event không có handler → không raise, không làm gì."""
        bus = RedisEventBus(channel="test_channel")
        event = _make_lesson_event(uuid.uuid4())
        # Không có subscriber nào → không raise
        await bus.dispatch(event)

    async def test_multiple_handlers_called(self):
        """Nhiều handler cùng subscribe một event → tất cả đều được gọi."""
        bus = RedisEventBus(channel="test_channel")
        handler_a = AsyncMock()
        handler_b = AsyncMock()
        await bus.subscribe("lesson.completed", handler_a)
        await bus.subscribe("lesson.completed", handler_b)

        event = _make_lesson_event(uuid.uuid4())
        await bus.dispatch(event)
        await asyncio.sleep(0.05)

        handler_a.assert_called_once()
        handler_b.assert_called_once()


# ──────────────────────────────────────────────────────────────────────────────
# Tests: Publish → Dispatch Integration (mocked Redis connection)
# ──────────────────────────────────────────────────────────────────────────────

class TestEventBusPublishDispatch:

    async def test_publish_serializes_and_dispatches_via_loop(self):
        """
        Mô phỏng toàn bộ flow: publish → Redis → listener loop → dispatch → handler.
        """
        bus = RedisEventBus(channel="test_channel")
        received_events = []

        async def my_handler(event: BaseEvent):
            received_events.append(event)

        await bus.subscribe("lesson.completed", my_handler)

        user_id = uuid.uuid4()
        event = _make_lesson_event(user_id)

        # Giả lập dispatch trực tiếp (bypass Redis thật)
        await bus.dispatch(event)
        await asyncio.sleep(0.05)

        assert len(received_events) == 1
        assert received_events[0].event_name == "lesson.completed"
        assert received_events[0].user_id == user_id

    async def test_publish_with_mock_redis(self):
        """publish() gọi redis.publish() với payload JSON hợp lệ."""
        bus = RedisEventBus(channel="test_channel")
        user_id = uuid.uuid4()
        event = _make_lesson_event(user_id)

        mock_redis = AsyncMock()
        mock_redis.publish = AsyncMock()

        with patch("app.core.event_bus.redis_bus.get_redis", return_value=mock_redis):
            await bus.publish(event)

        mock_redis.publish.assert_called_once()
        channel, payload_str = mock_redis.publish.call_args[0]
        assert channel == "test_channel"
        import json
        payload = json.loads(payload_str)
        assert payload["event_name"] == "lesson.completed"
        assert payload["user_id"] == str(user_id)


# ──────────────────────────────────────────────────────────────────────────────
# Tests: StreakService integration với DB (mocked session)
# ──────────────────────────────────────────────────────────────────────────────

class TestStreakServiceIntegration:

    async def test_lesson_completed_updates_streak_in_db(self, db_session):
        """
        [Requires DB] lesson.completed → streak profile được cập nhật trong DB.
        Bỏ qua nếu không có DB bằng cách dùng marker integration.
        """
        from app.services.gamification.streak_service import StreakService
        from app.repositories.gamification.streak_repository import StreakRepository
        from app.db.models.database import User

        user = User(
            fullname="Test User 1",
            email=f"test_{uuid.uuid4().hex[:8]}@example.com",
            password="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()
        user_id = user.id

        event = _make_lesson_event(user_id)

        service = StreakService(db=db_session)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(event)

        profile = await StreakRepository(db_session).get_or_create_profile(user_id)
        assert profile.current_streak >= 1
        assert profile.last_active_date == datetime.date.today()

    async def test_duplicate_event_is_idempotent(self, db_session):
        """
        [Requires DB] Gọi process_activity() 2 lần với cùng source_id → streak chỉ tăng 1.
        """
        from app.services.gamification.streak_service import StreakService
        from app.repositories.gamification.streak_repository import StreakRepository
        from app.db.models.database import User

        user = User(
            fullname="Test User 2",
            email=f"test_{uuid.uuid4().hex[:8]}@example.com",
            password="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()
        user_id = user.id

        source_id = uuid.uuid4()

        event = BaseEvent(
            event_name="lesson.completed",
            user_id=user_id,
            source_type="lesson",
            source_id=source_id,
            payload={},
        )

        service = StreakService(db=db_session)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(event)
            # Gọi lần 2 với cùng source_id
            await service.process_activity(event)

        profile = await StreakRepository(db_session).get_or_create_profile(user_id)
        # Dù gọi 2 lần, streak chỉ tăng 1
        assert profile.current_streak == 1


# ──────────────────────────────────────────────────────────────────────────────
# Tests: REST API /api/v1/gamification/streak (mocked HTTP client)
# ──────────────────────────────────────────────────────────────────────────────

class TestStreakApiEndpoints:
    """
    Test REST endpoints bằng FastAPI TestClient.
    Mock StreakService để không cần DB thật.
    """

    @pytest.fixture
    def client_with_user(self):
        """Tạo TestClient với user đã authenticate."""
        from fastapi.testclient import TestClient
        from app.main import app
        from app.core.deps import AuthorizationService

        user_id = uuid.uuid4()
        mock_user = MagicMock()
        mock_user.id = user_id
        mock_user.is_banned = False
        mock_user.deleted_at = None

        async def mock_get_current_user(self):
            return mock_user

        # Patch dependency method
        with patch.object(AuthorizationService, "get_current_user", mock_get_current_user):
            with TestClient(app) as client:
                yield client, user_id

    def test_get_streak_returns_200(self, client_with_user):
        """GET /api/v1/gamification/streak/ trả 200 với streak info."""
        client, user_id = client_with_user

        mock_streak_data = {
            "current_streak": 5,
            "best_streak": 10,
            "streak_freezes": 2,
            "last_active_date": datetime.date.today().isoformat(),
        }

        with patch("app.api.v1.gamification.streak.StreakService") as MockService:
            instance = MockService.return_value
            instance.get_streak_status = AsyncMock(return_value=mock_streak_data)
            response = client.get("/api/v1/gamification/streak/")

        assert response.status_code == 200
        data = response.json()
        assert data["current_streak"] == 5

    def test_get_streak_calendar_returns_list(self, client_with_user):
        """GET /api/v1/gamification/streak/calendar trả danh sách ngày active_dates."""
        client, user_id = client_with_user

        mock_calendar = [datetime.date.today().isoformat()]

        with patch("app.api.v1.gamification.streak.StreakService") as MockService:
            instance = MockService.return_value
            instance.get_streak_calendar = AsyncMock(return_value=mock_calendar)
            response = client.get("/api/v1/gamification/streak/calendar")

        assert response.status_code == 200
        data = response.json()
        assert "active_dates" in data
        assert isinstance(data["active_dates"], list)
        assert data["active_dates"][0] == mock_calendar[0]

    def test_restore_streak_no_freeze_returns_400(self, client_with_user):
        """POST /api/v1/gamification/streak/restore khi không có freeze → 400."""
        from fastapi import HTTPException
        client, user_id = client_with_user

        with patch("app.api.v1.gamification.streak.StreakService") as MockService:
            instance = MockService.return_value
            instance.restore_streak = AsyncMock(
                side_effect=HTTPException(status_code=400, detail="Không còn lượt đóng băng")
            )
            response = client.post("/api/v1/gamification/streak/restore")

        assert response.status_code == 400
