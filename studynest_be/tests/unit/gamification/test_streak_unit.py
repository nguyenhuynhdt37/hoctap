"""
Unit Tests - Module 02: Streak Engine

Coverage:
- StreakService.process_activity() với các event types
- Logic tăng streak (consecutive), reset streak (gap), đã active hôm nay (noop)
- Milestone events (7, 14, 30, 60, 100, 365)
- Idempotency guard
- daily_checkin.completed chỉ qualify khi consecutive_day % 3 == 0
- restore_streak() với freeze balance
"""
from __future__ import annotations

import datetime
import uuid
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest
import pytest_asyncio

from app.core.event_bus.base import BaseEvent
from app.db.models.database import UserGamificationProfiles, GamificationActivityLogs


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

def _make_profile(
    current_streak: int = 0,
    best_streak: int = 0,
    last_active_date: datetime.date | None = None,
    streak_freezes: int = 0,
) -> MagicMock:
    """Tạo mock UserGamificationProfiles."""
    profile = MagicMock(spec=UserGamificationProfiles)
    profile.current_streak = current_streak
    profile.best_streak = best_streak
    profile.last_active_date = last_active_date
    profile.streak_freezes = streak_freezes
    return profile


def _make_event(
    event_name: str,
    user_id: uuid.UUID | None = None,
    source_id: uuid.UUID | None = None,
    payload: dict | None = None,
) -> BaseEvent:
    return BaseEvent(
        event_name=event_name,
        user_id=user_id or uuid.uuid4(),
        source_type="test",
        source_id=source_id or uuid.uuid4(),
        payload=payload or {},
    )


# ──────────────────────────────────────────────────────────────────────────────
# Helper: build StreakService với mock repo và db
# ──────────────────────────────────────────────────────────────────────────────

def _build_service_with_profile(profile: MagicMock):
    """Tạo StreakService với mocked db và repo, trả về (service, mock_repo)."""
    from app.services.gamification.streak_service import StreakService

    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.delete = AsyncMock()
    mock_db.execute = AsyncMock()

    service = StreakService(db=mock_db)

    # Patch repo
    mock_repo = AsyncMock()
    mock_repo.get_or_create_profile = AsyncMock(return_value=profile)
    mock_repo.has_logged_event = AsyncMock(return_value=False)
    mock_repo.log_activity = AsyncMock()
    mock_repo.get_active_days_in_range = AsyncMock(return_value=[])
    mock_repo.get_streak_history = AsyncMock(return_value=[])
    service.repo = mock_repo

    return service, mock_repo


# ──────────────────────────────────────────────────────────────────────────────
# Tests: process_activity - lesson.completed
# ──────────────────────────────────────────────────────────────────────────────

class TestProcessActivityLessonCompleted:

    @pytest.mark.asyncio
    async def test_first_activity_sets_streak_to_1(self):
        """Lần đầu tiên hoạt động → streak = 1."""
        profile = _make_profile(current_streak=0, last_active_date=None)
        service, repo = _build_service_with_profile(profile)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(_make_event("lesson.completed"))

        assert profile.current_streak == 1
        assert profile.best_streak == 1
        assert profile.last_active_date == datetime.date.today()

    @pytest.mark.asyncio
    async def test_consecutive_day_increments_streak(self):
        """Hôm qua active → streak tăng 1."""
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        profile = _make_profile(current_streak=3, best_streak=5, last_active_date=yesterday)
        service, repo = _build_service_with_profile(profile)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(_make_event("lesson.completed"))

        assert profile.current_streak == 4
        assert profile.best_streak == 5  # vẫn giữ best = 5

    @pytest.mark.asyncio
    async def test_consecutive_day_updates_best_streak(self):
        """Streak vượt best → cập nhật best."""
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        profile = _make_profile(current_streak=5, best_streak=5, last_active_date=yesterday)
        service, repo = _build_service_with_profile(profile)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(_make_event("lesson.completed"))

        assert profile.current_streak == 6
        assert profile.best_streak == 6

    @pytest.mark.asyncio
    async def test_already_active_today_does_nothing(self):
        """Đã active hôm nay → không thay đổi streak."""
        today = datetime.date.today()
        profile = _make_profile(current_streak=5, last_active_date=today)
        service, repo = _build_service_with_profile(profile)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(_make_event("lesson.completed"))

        assert profile.current_streak == 5  # không đổi
        mock_bus.publish.assert_not_called()  # không publish streak.updated

    @pytest.mark.asyncio
    async def test_gap_resets_streak_to_1(self):
        """Nghỉ 2+ ngày → reset streak về 1."""
        two_days_ago = datetime.date.today() - datetime.timedelta(days=2)
        profile = _make_profile(current_streak=10, last_active_date=two_days_ago)
        service, repo = _build_service_with_profile(profile)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(_make_event("lesson.completed"))

        assert profile.current_streak == 1
        # log_activity được gọi 2 lần: qualified activity + streak_reset
        assert repo.log_activity.call_count == 2

    @pytest.mark.asyncio
    async def test_idempotency_skips_duplicate_event(self):
        """Event đã xử lý → skip, không thay đổi streak."""
        profile = _make_profile(current_streak=3, last_active_date=datetime.date.today())
        service, repo = _build_service_with_profile(profile)
        repo.has_logged_event = AsyncMock(return_value=True)  # đã xử lý

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(_make_event("lesson.completed"))

        # Không cập nhật gì, không publish
        mock_bus.publish.assert_not_called()


# ──────────────────────────────────────────────────────────────────────────────
# Tests: process_activity - daily_checkin.completed
# ──────────────────────────────────────────────────────────────────────────────

class TestProcessActivityDailyCheckin:

    @pytest.mark.asyncio
    async def test_checkin_not_multiple_of_3_not_qualified(self):
        """consecutive_day không chia hết cho 3 → không qualify."""
        profile = _make_profile()
        service, repo = _build_service_with_profile(profile)

        event = _make_event("daily_checkin.completed", payload={"consecutive_day": 1})
        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(event)

        # Không có thay đổi
        mock_bus.publish.assert_not_called()

    @pytest.mark.asyncio
    async def test_checkin_multiple_of_3_qualifies(self):
        """consecutive_day chia hết 3 → qualify, streak tăng."""
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        profile = _make_profile(current_streak=2, last_active_date=yesterday)
        service, repo = _build_service_with_profile(profile)

        event = _make_event("daily_checkin.completed", payload={"consecutive_day": 3})
        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(event)

        assert profile.current_streak == 3
        assert mock_bus.publish.await_count == 2
        published_names = [
            call.args[0].event_name
            for call in mock_bus.publish.await_args_list
        ]
        assert published_names == ["streak.updated", "streak.milestone"]

    @pytest.mark.asyncio
    async def test_checkin_day_6_qualifies(self):
        """consecutive_day = 6 → qualify (6 % 3 == 0)."""
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        profile = _make_profile(current_streak=1, last_active_date=yesterday)
        service, repo = _build_service_with_profile(profile)

        event = _make_event("daily_checkin.completed", payload={"consecutive_day": 6})
        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(event)

        assert profile.current_streak == 2

    @pytest.mark.asyncio
    async def test_checkin_day_0_not_qualified(self):
        """consecutive_day = 0 → không qualify."""
        profile = _make_profile()
        service, repo = _build_service_with_profile(profile)

        event = _make_event("daily_checkin.completed", payload={"consecutive_day": 0})
        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            await service.process_activity(event)

        mock_bus.publish.assert_not_called()


# ──────────────────────────────────────────────────────────────────────────────
# Tests: Milestones
# ──────────────────────────────────────────────────────────────────────────────

class TestMilestones:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("milestone", [7, 14, 30, 60, 100, 365])
    async def test_milestone_triggers_event(self, milestone: int):
        """Đạt milestone → publish streak.milestone."""
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        profile = _make_profile(
            current_streak=milestone - 1,
            best_streak=milestone - 1,
            last_active_date=yesterday,
        )
        service, repo = _build_service_with_profile(profile)

        published_events = []

        async def capture_publish(event: BaseEvent):
            published_events.append(event)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock(side_effect=capture_publish)
            await service.process_activity(_make_event("lesson.completed"))

        event_names = [e.event_name for e in published_events]
        assert "streak.updated" in event_names
        assert "streak.milestone" in event_names

        milestone_event = next(e for e in published_events if e.event_name == "streak.milestone")
        assert milestone_event.payload["milestone"] == milestone

    @pytest.mark.asyncio
    async def test_non_milestone_does_not_trigger_milestone_event(self):
        """Streak = 5 không phải milestone → không publish streak.milestone."""
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        profile = _make_profile(current_streak=4, best_streak=4, last_active_date=yesterday)
        service, repo = _build_service_with_profile(profile)

        published_events = []

        async def capture_publish(event: BaseEvent):
            published_events.append(event)

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock(side_effect=capture_publish)
            await service.process_activity(_make_event("lesson.completed"))

        event_names = [e.event_name for e in published_events]
        assert "streak.updated" in event_names
        assert "streak.milestone" not in event_names


# ──────────────────────────────────────────────────────────────────────────────
# Tests: restore_streak
# ──────────────────────────────────────────────────────────────────────────────

class TestRestoreStreak:

    @pytest.mark.asyncio
    async def test_restore_no_freeze_raises(self):
        """Không có freeze → raise HTTPException."""
        from fastapi import HTTPException
        from app.services.gamification.streak_service import StreakService

        profile = _make_profile(streak_freezes=0)
        mock_db = AsyncMock()
        service = StreakService(db=mock_db)
        mock_repo = AsyncMock()
        mock_repo.get_or_create_profile = AsyncMock(return_value=profile)
        service.repo = mock_repo

        with pytest.raises(HTTPException) as exc_info:
            await service.restore_streak(uuid.uuid4())
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_restore_with_freeze_and_recent_reset(self):
        """Có freeze + reset log gần đây → khôi phục thành công."""
        from app.services.gamification.streak_service import StreakService

        today = datetime.date.today()
        yesterday = today - datetime.timedelta(days=1)

        profile = _make_profile(current_streak=1, best_streak=10, streak_freezes=1)
        profile.last_active_date = today

        mock_db = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.delete = AsyncMock()

        # Mock reset log
        reset_log = MagicMock()
        reset_log.metadata_ = {
            "previous_streak": 10,
            "last_active_date": yesterday.isoformat(),
            "reset_date": today.isoformat(),
        }
        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none = MagicMock(return_value=reset_log)
        mock_db.execute = AsyncMock(return_value=scalar_result)

        service = StreakService(db=mock_db)
        mock_repo = AsyncMock()
        mock_repo.get_or_create_profile = AsyncMock(return_value=profile)
        service.repo = mock_repo

        with patch("app.services.gamification.streak_service.event_bus") as mock_bus:
            mock_bus.publish = AsyncMock()
            result = await service.restore_streak(uuid.uuid4())

        assert result["success"] is True
        assert profile.current_streak == 11  # previous_streak(10) + 1
        assert profile.streak_freezes == 0
        mock_bus.publish.assert_called_once()
        published = mock_bus.publish.call_args[0][0]
        assert published.event_name == "streak.restored"
