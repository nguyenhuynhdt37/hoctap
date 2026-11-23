"""
Unit Tests cho DailyCheckinService.

Dùng Mock để cô lập hoàn toàn khỏi DB.
Kiểm tra mọi nhánh logic quan trọng.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.database import (
    DailyCheckinEvents,
    DailyCheckinRewardsConfig,
    User,
    UserCheckins,
    UserGamificationProfiles,
    UserPeakBalances,
)
from app.services.gamification.daily_checkin_service import DailyCheckinService


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────


def _make_user(
    banned: bool = False,
    deleted: bool = False,
) -> User:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.is_banned = banned
    user.deleted_at = datetime.datetime.now() if deleted else None
    return user


def _make_event(cycle_days: int = 7) -> DailyCheckinEvents:
    event = MagicMock(spec=DailyCheckinEvents)
    event.id = uuid.uuid4()
    event.code = "TEST_EVENT"
    event.cycle_days = cycle_days
    event.is_active = True
    event.start_date = None
    event.end_date = None
    return event


def _make_reward(day: int = 1, amount: int = 50) -> DailyCheckinRewardsConfig:
    reward = MagicMock(spec=DailyCheckinRewardsConfig)
    reward.id = uuid.uuid4()
    reward.day_number = day
    reward.reward_type = "peak_wallet"
    reward.reward_amount = amount
    reward.reward_metadata = None
    return reward


def _make_profile(streak: int = 0, best: int = 0) -> UserGamificationProfiles:
    profile = MagicMock(spec=UserGamificationProfiles)
    profile.user_id = uuid.uuid4()
    profile.current_streak = streak
    profile.best_streak = best
    profile.last_active_date = None
    return profile


def _make_balance(current: int = 0) -> UserPeakBalances:
    balance = MagicMock(spec=UserPeakBalances)
    balance.user_id = uuid.uuid4()
    balance.current_balance = current
    balance.total_earned = 0
    return balance


def _make_service() -> tuple[DailyCheckinService, MagicMock]:
    """Tạo service với repo được mock hoàn toàn."""
    db = AsyncMock()
    db.begin_nested = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=None),
        __aexit__=AsyncMock(return_value=False),
    ))
    service = DailyCheckinService.__new__(DailyCheckinService)
    service.db = db
    repo = AsyncMock()
    service.repo = repo
    return service, repo


# ──────────────────────────────────────────────────────────────────────────────
# TEST: VALIDATE USER
# ──────────────────────────────────────────────────────────────────────────────


class TestValidateUser:
    @pytest.mark.asyncio
    async def test_banned_user_raises_403(self):
        service, _ = _make_service()
        user = _make_user(banned=True)
        with pytest.raises(Exception) as exc_info:
            await service._validate_user(user)
        assert exc_info.value.status_code == 403
        assert "USER_DISABLED" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_deleted_user_raises_403(self):
        service, _ = _make_service()
        user = _make_user(deleted=True)
        with pytest.raises(Exception) as exc_info:
            await service._validate_user(user)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_valid_user_passes(self):
        service, _ = _make_service()
        user = _make_user()
        # Không raise
        await service._validate_user(user)


# ──────────────────────────────────────────────────────────────────────────────
# TEST: CAN CHECKIN
# ──────────────────────────────────────────────────────────────────────────────


class TestCanCheckin:
    @pytest.mark.asyncio
    async def test_can_checkin_when_not_checked_today(self):
        service, repo = _make_service()
        user = _make_user()
        event = _make_event()
        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = None  # chưa check-in

        result = await service.can_checkin(user)

        assert result is True

    @pytest.mark.asyncio
    async def test_cannot_checkin_when_already_checked(self):
        service, repo = _make_service()
        user = _make_user()
        event = _make_event()
        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = MagicMock()  # đã check-in

        result = await service.can_checkin(user)

        assert result is False

    @pytest.mark.asyncio
    async def test_cannot_checkin_when_no_event(self):
        service, repo = _make_service()
        user = _make_user()
        repo.get_active_event.return_value = None

        result = await service.can_checkin(user)

        assert result is False


# ──────────────────────────────────────────────────────────────────────────────
# TEST: CLAIM CHECKIN – SUCCESS
# ──────────────────────────────────────────────────────────────────────────────


class _FrozenDateTime(datetime.datetime):
    """Helper giả lập ngày hiện tại cố định cho unit test lịch theo thứ."""

    fixed_date: datetime.date = datetime.date(2026, 11, 23)  # Thứ 2

    @classmethod
    def now(cls, tz=None):
        return datetime.datetime(
            cls.fixed_date.year,
            cls.fixed_date.month,
            cls.fixed_date.day,
            10,
            0,
            0,
            tzinfo=tz,
        )


def _patch_today(target_date: datetime.date):
    class _Patched(_FrozenDateTime):
        fixed_date = target_date

    return patch("app.services.gamification.daily_checkin_service.datetime.datetime", _Patched)


class TestClaimCheckinSuccess:
    @pytest.mark.asyncio
    async def test_first_checkin_on_monday_creates_record_and_credits_peak(self):
        """Điểm danh vào Thứ 2 → tính ngày 1, tạo bản ghi, cộng Peak, ghi log."""
        monday = datetime.date(2026, 11, 23)  # Thứ 2
        service, repo = _make_service()
        user = _make_user()
        event = _make_event(cycle_days=7)
        reward_cfg = _make_reward(day=1, amount=50)
        profile = _make_profile(streak=0, best=0)
        balance = _make_balance(current=0)

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = None
        repo.get_checkin_history.return_value = []
        repo.get_consecutive_day.return_value = 1
        repo.get_reward_by_day.return_value = reward_cfg
        repo.create_checkin.return_value = MagicMock()
        repo.get_or_create_gamification_profile.return_value = profile
        repo.update_streak.return_value = None
        repo.get_or_create_peak_balance.return_value = balance
        repo.credit_peak_wallet.return_value = (0, 50)
        repo.create_peak_transaction.return_value = MagicMock()
        repo.create_activity_log.return_value = MagicMock()
        repo.increment_active_days.return_value = None
        repo.get_all_rewards_for_event.return_value = [reward_cfg]
        profile.current_streak = 1
        profile.best_streak = 1

        service.db.commit = AsyncMock()

        with _patch_today(monday):
            result = await service.claim_checkin(user)

        assert result.success is True
        assert result.current_day == 1
        assert result.reward is not None
        assert result.reward.reward_amount == 50
        assert result.current_peak_balance == 50
        assert result.current_streak == 1
        assert result.calendar[0].is_checked is True
        assert result.calendar[0].is_today is True
        assert result.calendar[0].is_missed is False
        repo.create_checkin.assert_called_once()
        repo.credit_peak_wallet.assert_called_once()
        repo.create_peak_transaction.assert_called_once()
        repo.create_activity_log.assert_called_once()
        repo.increment_active_days.assert_called_once()

    @pytest.mark.asyncio
    async def test_skip_monday_checkin_tuesday_only_counts_tuesday(self):
        """Thứ 2 không điểm danh, Thứ 3 mới điểm danh → T2 bị bỏ lỡ, chỉ tính T3 (day=2)."""
        tuesday = datetime.date(2026, 11, 24)  # Thứ 3
        monday = datetime.date(2026, 11, 23)   # Thứ 2
        service, repo = _make_service()
        user = _make_user()
        event = _make_event(cycle_days=7)
        reward_mon = _make_reward(day=1, amount=10)
        reward_tue = _make_reward(day=2, amount=20)
        profile = _make_profile(streak=0, best=0)
        balance = _make_balance(current=0)

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = None
        repo.get_checkin_history.return_value = []  # Thứ 2 không điểm danh
        repo.get_consecutive_day.return_value = 1
        repo.get_reward_by_day.return_value = reward_tue
        repo.create_checkin.return_value = MagicMock()
        repo.get_or_create_gamification_profile.return_value = profile
        repo.update_streak.return_value = None
        repo.get_or_create_peak_balance.return_value = balance
        repo.credit_peak_wallet.return_value = (0, 20)
        repo.create_peak_transaction.return_value = MagicMock()
        repo.create_activity_log.return_value = MagicMock()
        repo.increment_active_days.return_value = None
        repo.get_all_rewards_for_event.return_value = [reward_mon, reward_tue]
        profile.current_streak = 1
        profile.best_streak = 1

        service.db.commit = AsyncMock()

        with _patch_today(tuesday):
            result = await service.claim_checkin(user)

        assert result.current_day == 2
        repo.get_reward_by_day.assert_called_once_with(event.id, 2)
        # Ô Thứ 2: bỏ lỡ, KHÔNG được tính
        assert result.calendar[0].day_number == 1
        assert result.calendar[0].calendar_date == monday
        assert result.calendar[0].is_checked is False
        assert result.calendar[0].is_missed is True
        assert result.calendar[0].is_today is False
        # Ô Thứ 3: chỉ tính Thứ 3
        assert result.calendar[1].day_number == 2
        assert result.calendar[1].calendar_date == tuesday
        assert result.calendar[1].is_checked is True
        assert result.calendar[1].checkin_date == tuesday
        assert result.calendar[1].is_today is True
        assert result.calendar[1].is_missed is False
        # Thứ 4..CN: chưa tới
        assert all((not d.is_checked and not d.is_missed) for d in result.calendar[2:])

    @pytest.mark.asyncio
    async def test_streak_increments_on_consecutive_days(self):
        """Điểm danh Thứ 2 rồi Thứ 3 liên tiếp → day=2, streak=2."""
        monday = datetime.date(2026, 11, 23)
        tuesday = datetime.date(2026, 11, 24)
        service, repo = _make_service()
        user = _make_user()
        event = _make_event(cycle_days=7)
        reward_cfg = _make_reward(day=2, amount=100)
        profile = _make_profile(streak=1, best=1)
        balance = _make_balance(current=50)
        mon_record = MagicMock()
        mon_record.checkin_date = monday

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = None
        repo.get_checkin_history.return_value = [mon_record]
        repo.get_consecutive_day.return_value = 2
        repo.get_reward_by_day.return_value = reward_cfg
        repo.create_checkin.return_value = MagicMock()
        repo.get_or_create_gamification_profile.return_value = profile
        repo.update_streak.return_value = None
        repo.get_or_create_peak_balance.return_value = balance
        repo.credit_peak_wallet.return_value = (50, 150)
        repo.create_peak_transaction.return_value = MagicMock()
        repo.create_activity_log.return_value = MagicMock()
        repo.increment_active_days.return_value = None
        repo.get_all_rewards_for_event.return_value = [reward_cfg]
        profile.current_streak = 2
        profile.best_streak = 2

        service.db.commit = AsyncMock()

        with _patch_today(tuesday):
            result = await service.claim_checkin(user)

        assert result.current_day == 2
        assert result.current_streak == 2
        assert result.calendar[0].is_checked is True
        assert result.calendar[1].is_checked is True
        repo.update_streak.assert_called_once_with(profile, 2)

    @pytest.mark.asyncio
    async def test_cycle_resets_on_new_monday(self):
        """Sang Thứ 2 tuần mới → ngày mới là 1, không dính lịch tuần trước."""
        next_monday = datetime.date(2026, 11, 30)  # Thứ 2 tuần sau
        prev_week_records = [
            MagicMock(checkin_date=datetime.date(2026, 11, 23) + datetime.timedelta(days=i))
            for i in range(7)
        ]
        service, repo = _make_service()
        user = _make_user()
        event = _make_event(cycle_days=7)
        reward_cfg = _make_reward(day=1, amount=50)
        profile = _make_profile(streak=7, best=7)
        balance = _make_balance(current=350)

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = None
        repo.get_checkin_history.return_value = prev_week_records
        repo.get_consecutive_day.return_value = 8
        repo.get_reward_by_day.return_value = reward_cfg
        repo.create_checkin.return_value = MagicMock()
        repo.get_or_create_gamification_profile.return_value = profile
        repo.update_streak.return_value = None
        repo.get_or_create_peak_balance.return_value = balance
        repo.credit_peak_wallet.return_value = (350, 400)
        repo.create_peak_transaction.return_value = MagicMock()
        repo.create_activity_log.return_value = MagicMock()
        repo.increment_active_days.return_value = None
        repo.get_all_rewards_for_event.return_value = [reward_cfg]
        profile.current_streak = 8
        profile.best_streak = 8

        service.db.commit = AsyncMock()

        with _patch_today(next_monday):
            result = await service.claim_checkin(user)

        assert result.current_day == 1
        assert result.calendar[0].is_checked is True
        assert all(not d.is_checked for d in result.calendar[1:])


# ──────────────────────────────────────────────────────────────────────────────
# TEST: CLAIM CHECKIN – IDEMPOTENT
# ──────────────────────────────────────────────────────────────────────────────


class TestClaimCheckinIdempotent:
    @pytest.mark.asyncio
    async def test_second_request_raises_409(self):
        """Request thứ 2 trong ngày → 409 ALREADY_CHECKED_IN."""
        service, repo = _make_service()
        user = _make_user()
        event = _make_event()

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = MagicMock()  # đã có bản ghi

        with pytest.raises(Exception) as exc_info:
            await service.claim_checkin(user)

        assert exc_info.value.status_code == 409
        detail = exc_info.value.detail
        assert detail["code"] == "ALREADY_CHECKED_IN"

    @pytest.mark.asyncio
    async def test_peak_wallet_not_credited_twice(self):
        """Peak Wallet không được cộng hai lần khi request trùng."""
        service, repo = _make_service()
        user = _make_user()
        event = _make_event()

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = MagicMock()  # đã check-in

        try:
            await service.claim_checkin(user)
        except Exception:
            pass

        repo.credit_peak_wallet.assert_not_called()


# ──────────────────────────────────────────────────────────────────────────────
# TEST: CLAIM CHECKIN – ERROR CASES
# ──────────────────────────────────────────────────────────────────────────────


class TestClaimCheckinErrors:
    @pytest.mark.asyncio
    async def test_no_active_event_raises_404(self):
        service, repo = _make_service()
        user = _make_user()
        repo.get_active_event.return_value = None

        with pytest.raises(Exception) as exc_info:
            await service.claim_checkin(user)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_missing_reward_config_raises_422(self):
        """Không tìm thấy reward config → 422."""
        service, repo = _make_service()
        user = _make_user()
        event = _make_event()

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = None
        repo.get_checkin_history.return_value = []
        repo.get_consecutive_day.return_value = 1
        repo.get_reward_by_day.return_value = None  # không có reward

        with pytest.raises(Exception) as exc_info:
            await service.claim_checkin(user)

        assert exc_info.value.status_code == 422
        assert "INVALID_REWARD" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_integrity_error_is_handled_as_409(self):
        """SQLAlchemy IntegrityError (race condition) → 409."""
        from sqlalchemy.exc import IntegrityError

        service, repo = _make_service()
        user = _make_user()
        event = _make_event()
        reward_cfg = _make_reward()
        profile = _make_profile()
        balance = _make_balance()

        repo.get_active_event.return_value = event
        repo.get_today_checkin.return_value = None
        repo.get_checkin_history.return_value = []
        repo.get_consecutive_day.return_value = 1
        repo.get_reward_by_day.return_value = reward_cfg
        repo.get_or_create_gamification_profile.return_value = profile
        repo.update_streak.return_value = None
        repo.get_or_create_peak_balance.return_value = balance
        repo.credit_peak_wallet.return_value = (0, 50)

        # Giả lập IntegrityError khi create_checkin
        repo.create_checkin.side_effect = IntegrityError("duplicate", {}, None)

        service.db.rollback = AsyncMock()

        with pytest.raises(Exception) as exc_info:
            await service.claim_checkin(user)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail["code"] == "ALREADY_CHECKED_IN"


# ──────────────────────────────────────────────────────────────────────────────
# TEST: BUILD CALENDAR
# ──────────────────────────────────────────────────────────────────────────────


class TestBuildCalendar:
    def test_calendar_length_matches_cycle_days(self):
        service, _ = _make_service()
        reward_cfg = _make_reward(day=1, amount=50)
        reward_map = {1: reward_cfg}
        today = datetime.date.today()
        history = {today}

        calendar = service._build_calendar(
            cycle_days=7,
            cycle_start=today,
            history_dates=history,
            reward_map=reward_map,
        )

        assert len(calendar) == 7

    def test_checked_day_is_marked(self):
        service, _ = _make_service()
        today = datetime.date.today()
        reward_map = {1: _make_reward(day=1)}

        calendar = service._build_calendar(
            cycle_days=7,
            cycle_start=today,
            history_dates={today},
            reward_map=reward_map,
        )

        assert calendar[0].is_checked is True
        assert calendar[0].checkin_date == today

    def test_unchecked_day_is_not_marked(self):
        service, _ = _make_service()
        today = datetime.date.today()
        reward_map = {1: _make_reward(day=1)}

        calendar = service._build_calendar(
            cycle_days=7,
            cycle_start=today,
            history_dates=set(),   # chưa check-in ngày nào
            reward_map=reward_map,
        )

        assert all(not d.is_checked for d in calendar)

    def test_reward_is_attached_to_correct_day(self):
        service, _ = _make_service()
        today = datetime.date.today()
        reward_day3 = _make_reward(day=3, amount=200)
        reward_map = {3: reward_day3}

        calendar = service._build_calendar(
            cycle_days=7,
            cycle_start=today,
            history_dates=set(),
            reward_map=reward_map,
        )

        assert calendar[2].reward is not None
        assert calendar[2].reward.reward_amount == 200
        assert calendar[0].reward is None

    def test_30_day_cycle_calendar(self):
        """Chu kỳ 30 ngày cũng hoạt động đúng."""
        service, _ = _make_service()
        today = datetime.date.today()
        reward_map = {i: _make_reward(day=i, amount=i * 10) for i in range(1, 31)}

        calendar = service._build_calendar(
            cycle_days=30,
            cycle_start=today,
            history_dates=set(),
            reward_map=reward_map,
        )

        assert len(calendar) == 30
        assert calendar[29].reward.reward_amount == 300
