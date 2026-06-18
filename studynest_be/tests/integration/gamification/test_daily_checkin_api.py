"""
Integration Tests cho Daily Check-in API.

Kiểm tra end-to-end: HTTP → Router → Service (mocked) → Response.
Dùng FastAPI dependency_overrides để inject service mock.
"""
from __future__ import annotations

import asyncio
import datetime
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.db.models.database import (
    DailyCheckinEvents,
    DailyCheckinRewardsConfig,
    User,
)
from app.main import app
from app.schemas.gamification.daily_checkin import (
    CalendarDayDTO,
    CheckinClaimResponse,
    CheckinStatusResponse,
    RewardDTO,
)
from app.services.gamification.daily_checkin_service import DailyCheckinService
from app.core.deps import AuthorizationService

# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────


def _fake_user() -> User:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.is_banned = False
    user.deleted_at = None
    return user


def _fake_reward_dto(day: int = 1, amount: int = 50) -> RewardDTO:
    return RewardDTO(
        day_number=day,
        reward_type="peak_wallet",
        reward_amount=amount,
        reward_metadata=None,
    )


def _fake_calendar(cycle: int = 7) -> list[CalendarDayDTO]:
    reward = _fake_reward_dto(1)
    today = datetime.date.today()
    return [
        CalendarDayDTO(
            day_number=i,
            checkin_date=today if i == 1 else None,
            is_checked=(i == 1),
            reward=reward if i == 1 else None,
        )
        for i in range(1, cycle + 1)
    ]


def _make_status_response(checked_today: bool = False) -> CheckinStatusResponse:
    return CheckinStatusResponse(
        checked_today=checked_today,
        current_streak=1 if checked_today else 0,
        best_streak=1 if checked_today else 0,
        current_day_in_cycle=1,
        cycle_days=7,
        today_reward=None if checked_today else _fake_reward_dto(),
        next_reward=_fake_reward_dto(day=2, amount=100),
        calendar=_fake_calendar(),
        current_peak_balance=50 if checked_today else 0,
    )


def _make_claim_response() -> CheckinClaimResponse:
    return CheckinClaimResponse(
        success=True,
        message="Check-in thành công! 🎉",
        current_day=1,
        reward=_fake_reward_dto(),
        current_peak_balance=50,
        current_streak=1,
        best_streak=1,
        calendar=_fake_calendar(),
    )


# ──────────────────────────────────────────────────────────────────────────────
# FIXTURE: Override dependencies
# ──────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def fake_user() -> User:
    return _fake_user()


@pytest.fixture
def override_deps(fake_user):
    """Override cả AuthorizationService và DailyCheckinService."""
    service_mock = AsyncMock(spec=DailyCheckinService)
    service_mock.get_checkin_status.return_value = _make_status_response()
    service_mock.claim_checkin.return_value = _make_claim_response()

    auth_mock = AsyncMock(spec=AuthorizationService)
    auth_mock.get_current_user = AsyncMock(return_value=fake_user)

    # Override FastAPI deps
    app.dependency_overrides[DailyCheckinService] = lambda: service_mock
    app.dependency_overrides[AuthorizationService] = lambda: auth_mock

    yield service_mock, auth_mock, fake_user

    # Cleanup
    app.dependency_overrides.pop(DailyCheckinService, None)
    app.dependency_overrides.pop(AuthorizationService, None)


# ──────────────────────────────────────────────────────────────────────────────
# TESTS: GET /api/v1/gamification/checkin
# ──────────────────────────────────────────────────────────────────────────────


class TestGetCheckinStatus:
    @pytest.mark.asyncio
    async def test_returns_200_with_correct_schema(self, override_deps):
        """GET /checkin → 200 + schema đúng."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "checked_today" in data
        assert "current_streak" in data
        assert "calendar" in data
        assert len(data["calendar"]) == 7
        assert "current_peak_balance" in data

    @pytest.mark.asyncio
    async def test_checked_today_false_when_not_checked(self, override_deps):
        """Khi chưa check-in hôm nay → checked_today = false."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )
        assert response.json()["checked_today"] is False

    @pytest.mark.asyncio
    async def test_checked_today_true_after_checkin(self, override_deps):
        """Khi đã check-in → checked_today = true."""
        service_mock, _, _ = override_deps
        service_mock.get_checkin_status.return_value = _make_status_response(
            checked_today=True
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 200
        assert response.json()["checked_today"] is True

    @pytest.mark.asyncio
    async def test_no_event_returns_404(self, override_deps):
        """Khi không có sự kiện → 404."""
        service_mock, _, _ = override_deps
        service_mock.get_checkin_status.side_effect = HTTPException(
            status_code=404,
            detail={"code": "NO_ACTIVE_EVENT", "message": "Không có sự kiện"},
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 404


# ──────────────────────────────────────────────────────────────────────────────
# TESTS: POST /api/v1/gamification/checkin
# ──────────────────────────────────────────────────────────────────────────────


class TestClaimCheckin:
    @pytest.mark.asyncio
    async def test_first_checkin_returns_200_and_reward(self, override_deps):
        """Check-in lần đầu → 200 + có phần thưởng."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["current_day"] == 1
        assert data["reward"] is not None
        assert data["reward"]["reward_amount"] == 50
        assert data["current_peak_balance"] == 50
        assert data["current_streak"] == 1

    @pytest.mark.asyncio
    async def test_duplicate_checkin_returns_409(self, override_deps):
        """Check-in lần 2 → 409 ALREADY_CHECKED_IN."""
        service_mock, _, _ = override_deps
        service_mock.claim_checkin.side_effect = HTTPException(
            status_code=409,
            detail={"code": "ALREADY_CHECKED_IN", "message": "Đã check-in hôm nay"},
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 409
        detail = response.json()["detail"]
        assert detail["code"] == "ALREADY_CHECKED_IN"

    @pytest.mark.asyncio
    async def test_concurrent_requests_only_one_succeeds(self, override_deps):
        """3 request đồng thời → 1 thành công, 2 nhận 409."""
        service_mock, _, _ = override_deps
        call_count = {"n": 0}

        async def side_effect(*args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] > 1:
                raise HTTPException(
                    status_code=409,
                    detail={"code": "ALREADY_CHECKED_IN", "message": "Đã check-in"},
                )
            return _make_claim_response()

        service_mock.claim_checkin.side_effect = side_effect

        async def _single_request():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                return await client.post(
                    "/api/v1/gamification/checkin",
                    headers={"authorization": "Bearer faketoken"},
                )

        responses = await asyncio.gather(
            _single_request(), _single_request(), _single_request()
        )
        status_codes = [r.status_code for r in responses]
        assert status_codes.count(200) == 1
        assert status_codes.count(409) == 2

    @pytest.mark.asyncio
    async def test_no_active_event_returns_404(self, override_deps):
        """Không có sự kiện check-in → 404."""
        service_mock, _, _ = override_deps
        service_mock.claim_checkin.side_effect = HTTPException(
            status_code=404,
            detail={"code": "NO_ACTIVE_EVENT", "message": "Không có sự kiện"},
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_internal_error_returns_500(self, override_deps):
        """Lỗi hệ thống → 500 + không có dữ liệu bị lưu (đã rollback ở service)."""
        service_mock, _, _ = override_deps
        service_mock.claim_checkin.side_effect = HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Lỗi hệ thống"},
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 500


# ──────────────────────────────────────────────────────────────────────────────
# TESTS: RESPONSE SCHEMA VALIDATION
# ──────────────────────────────────────────────────────────────────────────────


class TestResponseSchema:
    @pytest.mark.asyncio
    async def test_claim_response_has_all_required_fields(self, override_deps):
        """POST /checkin response phải có đủ các trường bắt buộc."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 200
        data = response.json()
        required_fields = [
            "success",
            "message",
            "current_day",
            "reward",
            "current_peak_balance",
            "current_streak",
            "best_streak",
            "calendar",
        ]
        for field in required_fields:
            assert field in data, f"Thiếu trường: {field}"

    @pytest.mark.asyncio
    async def test_calendar_day_has_required_fields(self, override_deps):
        """Mỗi ngày trong calendar phải có day_number và is_checked."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        assert response.status_code == 200
        data = response.json()
        if data.get("calendar"):
            day = data["calendar"][0]
            assert "day_number" in day
            assert "is_checked" in day

    @pytest.mark.asyncio
    async def test_reward_dto_structure(self, override_deps):
        """Reward DTO phải có đủ trường."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/gamification/checkin",
                headers={"authorization": "Bearer faketoken"},
            )

        data = response.json()
        reward = data.get("reward")
        if reward:
            assert "day_number" in reward
            assert "reward_type" in reward
            assert "reward_amount" in reward
