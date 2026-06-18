"""
Business Service cho module Daily Check-in.

Toàn bộ Business Logic nằm trong class này.
Repository chỉ được gọi từ đây.
Mọi thao tác check-in đều nằm trong 1 Database Transaction.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from fastapi import Depends, HTTPException, Request
from loguru import logger
from sqlalchemy import exc as sa_exc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import (
    DailyCheckinEvents,
    DailyCheckinRewardsConfig,
    User,
    UserCheckins,
    UserGamificationProfiles,
    UserPeakBalances,
)
from app.db.sesson import get_session
from app.repositories.gamification.daily_checkin_repository import (
    DailyCheckinRepository,
)
from app.schemas.gamification.daily_checkin import (
    CalendarDayDTO,
    CheckinClaimResponse,
    CheckinStatusResponse,
    RewardDTO,
)

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

CHECKIN_ACTION_TYPE = "daily_checkin"
PEAK_SOURCE = "daily_checkin"


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS (private)
# ──────────────────────────────────────────────────────────────────────────────


def _reward_to_dto(
    reward_cfg: Optional[DailyCheckinRewardsConfig],
) -> Optional[RewardDTO]:
    """Chuyển ORM model sang RewardDTO."""
    if reward_cfg is None:
        return None
    return RewardDTO(
        day_number=reward_cfg.day_number,
        reward_type=reward_cfg.reward_type,
        reward_amount=reward_cfg.reward_amount,
        reward_metadata=reward_cfg.reward_metadata,
    )


def _compute_current_day_in_cycle(
    total_checkins_so_far: int,
    cycle_days: int,
) -> int:
    """Ngày trong chu kỳ SAU khi check-in (1-based).

    Ví dụ: total_checkins_so_far = 7 (đã có 7 lần), cycle=7 → hôm nay là ngày 1 của chu kỳ mới.
    """
    # Trước khi check-in, tổng là total_checkins_so_far
    # Ngày trong chu kỳ = (total % cycle_days) + 1
    return (total_checkins_so_far % cycle_days) + 1


# ──────────────────────────────────────────────────────────────────────────────
# SERVICE
# ──────────────────────────────────────────────────────────────────────────────


class DailyCheckinService:
    """Service nghiệp vụ cho Daily Check-in."""

    def __init__(self, db: AsyncSession = Depends(get_session)) -> None:
        self.db = db
        self.repo = DailyCheckinRepository(db)

    # ──────────────────────────────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────────────────────────────

    async def get_checkin_status(
        self,
        user: User,
        request: Optional[Request] = None,
    ) -> CheckinStatusResponse:
        """Trả về trạng thái check-in hiện tại của user.

        - Đã check-in hôm nay chưa.
        - Streak hiện tại / cao nhất.
        - Phần thưởng hôm nay + ngày mai.
        - Lịch check-in của chu kỳ hiện tại.
        """
        # 1. Validate user
        await self._validate_user(user)

        # 2. Lấy sự kiện active
        event = await self.repo.get_active_event()
        if event is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NO_ACTIVE_EVENT",
                    "message": "Không có sự kiện Check-in đang hoạt động",
                },
            )

        # 3. Kiểm tra đã check-in hôm nay chưa
        today_checkin = await self.repo.get_today_checkin(user.id, event.id)
        checked_today = today_checkin is not None

        # 4. Lấy profile & balance
        profile = await self.repo.get_or_create_gamification_profile(user.id)
        balance = await self.repo.get_or_create_peak_balance(user.id)

        # 5. Lịch sử check-in để build calendar
        history = await self.repo.get_checkin_history(
            user.id, event.id, limit=event.cycle_days
        )
        history_dates: set[datetime.date] = {c.checkin_date for c in history}

        # 6. Tính ngày trong chu kỳ hiện tại
        total_checkins = len(await self.repo.get_checkin_history(user.id, event.id, limit=9999))
        day_in_cycle = (total_checkins % event.cycle_days) if not checked_today else (
            (total_checkins - 1) % event.cycle_days
        )
        # day_in_cycle là 0-indexed position đã hoàn thành → ngày hiện tại (1-based)
        current_day = day_in_cycle + 1 if not checked_today else (
            ((total_checkins - 1) % event.cycle_days) + 1
        )

        # 7. Tải toàn bộ reward config
        all_rewards = await self.repo.get_all_rewards_for_event(event.id)
        reward_map: dict[int, DailyCheckinRewardsConfig] = {
            r.day_number: r for r in all_rewards
        }

        # 8. Today reward & next reward
        today_reward_cfg = reward_map.get(current_day) if not checked_today else None
        next_day = (current_day % event.cycle_days) + 1
        next_reward_cfg = reward_map.get(next_day)

        # 9. Build calendar cho chu kỳ hiện tại
        cycle_start = await self.repo.get_current_cycle_start(
            user.id, event.id, event.cycle_days
        )
        calendar = self._build_calendar(
            cycle_days=event.cycle_days,
            cycle_start=cycle_start,
            history_dates=history_dates,
            reward_map=reward_map,
        )

        return CheckinStatusResponse(
            checked_today=checked_today,
            current_streak=profile.current_streak,
            best_streak=profile.best_streak,
            current_day_in_cycle=current_day,
            cycle_days=event.cycle_days,
            today_reward=_reward_to_dto(today_reward_cfg),
            next_reward=_reward_to_dto(next_reward_cfg),
            calendar=calendar,
            current_peak_balance=balance.current_balance,
        )

    async def claim_checkin(
        self,
        user: User,
        request: Optional[Request] = None,
    ) -> CheckinClaimResponse:
        """Thực hiện Check-in.

        Toàn bộ nằm trong 1 Transaction:
        1. Kiểm tra điều kiện.
        2. Tạo bản ghi Check-in.
        3. Cập nhật streak.
        4. Cộng Peak Wallet.
        5. Ghi Peak Transaction.
        6. Ghi Activity Log.
        7. Tăng user_statistics.active_days.
        """
        # Validate user
        await self._validate_user(user)

        # Lấy sự kiện active
        event = await self.repo.get_active_event()
        if event is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NO_ACTIVE_EVENT",
                    "message": "Không có sự kiện Check-in đang hoạt động",
                },
            )

        # ── IDEMPOTENT CHECK (trước transaction) ──────────────────────
        today_checkin = await self.repo.get_today_checkin(user.id, event.id)
        if today_checkin is not None:
            # Đã check-in → trả về kết quả idempotent, không raise exception
            profile = await self.repo.get_or_create_gamification_profile(user.id)
            balance = await self.repo.get_or_create_peak_balance(user.id)
            total_checkins = len(
                await self.repo.get_checkin_history(user.id, event.id, limit=9999)
            )
            current_day = ((total_checkins - 1) % event.cycle_days) + 1
            history = await self.repo.get_checkin_history(
                user.id, event.id, limit=event.cycle_days
            )
            history_dates = {c.checkin_date for c in history}
            all_rewards = await self.repo.get_all_rewards_for_event(event.id)
            reward_map = {r.day_number: r for r in all_rewards}
            cycle_start = await self.repo.get_current_cycle_start(
                user.id, event.id, event.cycle_days
            )
            calendar = self._build_calendar(
                cycle_days=event.cycle_days,
                cycle_start=cycle_start,
                history_dates=history_dates,
                reward_map=reward_map,
            )
            reward_cfg = reward_map.get(current_day)
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "ALREADY_CHECKED_IN",
                    "message": "Bạn đã Check-in hôm nay rồi",
                },
            )

        # ── TRANSACTION ───────────────────────────────────────────────
        try:
            async with self.db.begin_nested():
                # a. Tính ngày trong chu kỳ TRƯỚC khi tạo bản ghi mới
                history_before = await self.repo.get_checkin_history(
                    user.id, event.id, limit=9999
                )
                total_before = len(history_before)
                current_day = (total_before % event.cycle_days) + 1

                # b. Tính consecutive_day
                consecutive_day = await self.repo.get_consecutive_day(
                    user.id, event.id
                )

                # c. Lấy reward config cho ngày này
                reward_cfg = await self.repo.get_reward_by_day(event.id, current_day)

                # d. Validate reward (phải có cấu hình cho ngày này)
                if reward_cfg is None:
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "code": "INVALID_REWARD",
                            "message": f"Không tìm thấy phần thưởng cho ngày {current_day}",
                        },
                    )

                # e. Tạo bản ghi Check-in
                checkin = await self.repo.create_checkin(
                    user_id=user.id,
                    event_id=event.id,
                    checkin_date=datetime.date.today(),
                    consecutive_day=consecutive_day,
                )

                # f. Lấy / tạo profile
                profile = await self.repo.get_or_create_gamification_profile(user.id)

                # g. Cập nhật streak
                await self.repo.update_streak(profile, consecutive_day)

                # h. Peak Wallet
                balance = await self.repo.get_or_create_peak_balance(user.id)
                peak_amount = reward_cfg.reward_amount or 0
                before_balance, after_balance = 0, balance.current_balance
                if peak_amount > 0 and reward_cfg.reward_type in ("peak_wallet", "peak"):
                    before_balance, after_balance = await self.repo.credit_peak_wallet(
                        balance, peak_amount
                    )

                    # i. Peak Transaction
                    ip = (
                        request.client.host
                        if request and request.client
                        else None
                    )
                    await self.repo.create_peak_transaction(
                        user_id=user.id,
                        amount=peak_amount,
                        before_balance=before_balance,
                        after_balance=after_balance,
                        source=PEAK_SOURCE,
                        event_id=event.id,
                        event_type=CHECKIN_ACTION_TYPE,
                        metadata={
                            "day_number": current_day,
                            "event_code": event.code,
                        },
                    )

                # j. Activity Log
                await self.repo.create_activity_log(
                    user_id=user.id,
                    action_type=CHECKIN_ACTION_TYPE,
                    source_event_id=event.id,
                    ip_address=request.client.host if request and request.client else None,
                    user_agent=request.headers.get("user-agent") if request else None,
                    metadata={
                        "day_number": current_day,
                        "consecutive_day": consecutive_day,
                        "event_code": event.code,
                        "peak_earned": peak_amount if peak_amount > 0 else 0,
                    },
                )

                # k. Tăng user_statistics.total_active_days
                await self.repo.increment_active_days(user.id)

            # Commit outer transaction
            await self.db.commit()

            # l. Build calendar response
            history = await self.repo.get_checkin_history(
                user.id, event.id, limit=event.cycle_days
            )
            history_dates = {c.checkin_date for c in history}
            all_rewards = await self.repo.get_all_rewards_for_event(event.id)
            reward_map = {r.day_number: r for r in all_rewards}
            cycle_start = await self.repo.get_current_cycle_start(
                user.id, event.id, event.cycle_days
            )
            calendar = self._build_calendar(
                cycle_days=event.cycle_days,
                cycle_start=cycle_start,
                history_dates=history_dates,
                reward_map=reward_map,
            )

            logger.info(
                f"✅ User {user.id} check-in thành công ngày {current_day} "
                f"(streak={consecutive_day}, peak={peak_amount})"
            )

            return CheckinClaimResponse(
                success=True,
                message="Check-in thành công! 🎉",
                current_day=current_day,
                reward=_reward_to_dto(reward_cfg),
                current_peak_balance=after_balance,
                current_streak=profile.current_streak,
                best_streak=profile.best_streak,
                calendar=calendar,
            )

        except HTTPException:
            await self.db.rollback()
            raise
        except sa_exc.IntegrityError:
            # Race condition: unique constraint violation → đã check-in rồi
            await self.db.rollback()
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "ALREADY_CHECKED_IN",
                    "message": "Bạn đã Check-in hôm nay rồi",
                },
            )
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Check-in thất bại cho user {user.id}: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "code": "INTERNAL_ERROR",
                    "message": "Lỗi hệ thống khi thực hiện Check-in",
                },
            )

    async def can_checkin(self, user: User) -> bool:
        """Kiểm tra nhanh user có thể check-in không (chưa check-in hôm nay)."""
        await self._validate_user(user)
        event = await self.repo.get_active_event()
        if event is None:
            return False
        today_checkin = await self.repo.get_today_checkin(user.id, event.id)
        return today_checkin is None

    async def get_current_streak(self, user: User) -> int:
        """Lấy chuỗi streak hiện tại của user."""
        profile = await self.repo.get_gamification_profile(user.id)
        return profile.current_streak if profile else 0

    # ──────────────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ──────────────────────────────────────────────────────────────────

    async def _validate_user(self, user: User) -> None:
        """Validate user tồn tại và hoạt động."""
        if user is None:
            raise HTTPException(
                status_code=401,
                detail={"code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại"},
            )
        if getattr(user, "is_banned", False):
            raise HTTPException(
                status_code=403,
                detail={"code": "USER_DISABLED", "message": "Tài khoản đang bị khóa"},
            )
        if getattr(user, "deleted_at", None) is not None:
            raise HTTPException(
                status_code=403,
                detail={"code": "USER_DISABLED", "message": "Tài khoản đã bị xóa"},
            )

    def _build_calendar(
        self,
        cycle_days: int,
        cycle_start: datetime.date,
        history_dates: set[datetime.date],
        reward_map: dict[int, DailyCheckinRewardsConfig],
    ) -> list[CalendarDayDTO]:
        """Xây dựng danh sách ngày trong chu kỳ hiện tại kèm trạng thái check-in."""
        calendar: list[CalendarDayDTO] = []
        for i in range(cycle_days):
            day_num = i + 1
            day_date = cycle_start + datetime.timedelta(days=i)
            is_checked = day_date in history_dates
            reward_cfg = reward_map.get(day_num)
            calendar.append(
                CalendarDayDTO(
                    day_number=day_num,
                    checkin_date=day_date if is_checked else None,
                    is_checked=is_checked,
                    reward=_reward_to_dto(reward_cfg),
                )
            )
        return calendar
