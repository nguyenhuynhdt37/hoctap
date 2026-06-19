"""
Repository cho module Daily Check-in.

Chỉ thao tác với database, không chứa Business Logic.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import (
    DailyCheckinEvents,
    DailyCheckinRewardsConfig,
    GamificationActivityLogs,
    PeakTransactions,
    User,
    UserCheckins,
    UserGamificationProfiles,
    UserPeakBalances,
    UserStatistics,
)
from app.libs.formats.datetime import now as get_now


class DailyCheckinRepository:
    """Repository cho Daily Check-in.

    Mọi hàm nhận `db: AsyncSession` và chỉ thao tác dữ liệu thuần tuý.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ──────────────────────────────────────────────────────────────────
    # EVENTS
    # ──────────────────────────────────────────────────────────────────

    async def get_active_event(self) -> Optional[DailyCheckinEvents]:
        """Lấy sự kiện Check-in đang hoạt động (is_active=True)."""
        today = datetime.date.today()
        stmt = (
            select(DailyCheckinEvents)
            .where(DailyCheckinEvents.is_active.is_(True))
            .where(
                (DailyCheckinEvents.start_date.is_(None))
                | (DailyCheckinEvents.start_date <= today)
            )
            .where(
                (DailyCheckinEvents.end_date.is_(None))
                | (DailyCheckinEvents.end_date >= today)
            )
            .order_by(DailyCheckinEvents.created_at.desc())
            .limit(1)
        )
        return await self.db.scalar(stmt)

    # ──────────────────────────────────────────────────────────────────
    # CHECKIN RECORDS
    # ──────────────────────────────────────────────────────────────────

    async def get_today_checkin(
        self,
        user_id: uuid.UUID,
        event_id: uuid.UUID,
    ) -> Optional[UserCheckins]:
        """Lấy bản ghi Check-in của user trong ngày hôm nay cho sự kiện."""
        today = datetime.date.today()
        stmt = select(UserCheckins).where(
            and_(
                UserCheckins.user_id == user_id,
                UserCheckins.event_id == event_id,
                UserCheckins.checkin_date == today,
            )
        )
        return await self.db.scalar(stmt)

    async def get_checkin_history(
        self,
        user_id: uuid.UUID,
        event_id: uuid.UUID,
        limit: int = 40,
    ) -> list[UserCheckins]:
        """Lấy danh sách lịch sử Check-in của user theo event (mới nhất trước)."""
        stmt = (
            select(UserCheckins)
            .where(
                and_(
                    UserCheckins.user_id == user_id,
                    UserCheckins.event_id == event_id,
                )
            )
            .order_by(UserCheckins.checkin_date.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_current_cycle_start(
        self,
        user_id: uuid.UUID,
        event_id: uuid.UUID,
        cycle_days: int,
    ) -> datetime.date:
        """Tính ngày bắt đầu của chu kỳ hiện tại dựa trên số ngày đã check-in.

        Logic:
          - Đếm tổng số bản ghi Check-in.
          - cycle_day_of_user = total_checkins % cycle_days
          - Ngày bắt đầu cycle = today - (cycle_day_of_user - 1) ngày
        """
        count_stmt = select(func.count(UserCheckins.id)).where(
            and_(
                UserCheckins.user_id == user_id,
                UserCheckins.event_id == event_id,
            )
        )
        total: int = (await self.db.scalar(count_stmt)) or 0
        day_in_cycle = total % cycle_days  # 0-indexed vị trí hôm nay trong chu kỳ
        today = datetime.date.today()
        cycle_start = today - datetime.timedelta(days=day_in_cycle)
        return cycle_start

    async def get_consecutive_day(
        self,
        user_id: uuid.UUID,
        event_id: uuid.UUID,
    ) -> int:
        """Tính ngày liên tiếp trong chu kỳ của user.

        Tra cứu ngày check-in ngay hôm qua; nếu tồn tại thì lấy
        consecutive_day + 1, ngược lại reset về 1.
        """
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        stmt = select(UserCheckins).where(
            and_(
                UserCheckins.user_id == user_id,
                UserCheckins.event_id == event_id,
                UserCheckins.checkin_date == yesterday,
            )
        )
        yesterday_checkin: Optional[UserCheckins] = await self.db.scalar(stmt)
        if yesterday_checkin:
            return yesterday_checkin.consecutive_day + 1
        return 1

    async def create_checkin(
        self,
        user_id: uuid.UUID,
        event_id: uuid.UUID,
        checkin_date: datetime.date,
        consecutive_day: int,
    ) -> UserCheckins:
        """Tạo bản ghi Check-in mới."""
        checkin = UserCheckins(
            user_id=user_id,
            event_id=event_id,
            checkin_date=checkin_date,
            consecutive_day=consecutive_day,
            reward_claimed=True,
        )
        self.db.add(checkin)
        await self.db.flush()
        await self.db.refresh(checkin)
        return checkin

    # ──────────────────────────────────────────────────────────────────
    # REWARD CONFIG
    # ──────────────────────────────────────────────────────────────────

    async def get_reward_by_day(
        self,
        event_id: uuid.UUID,
        day_number: int,
    ) -> Optional[DailyCheckinRewardsConfig]:
        """Lấy cấu hình phần thưởng cho ngày cụ thể trong sự kiện."""
        stmt = select(DailyCheckinRewardsConfig).where(
            and_(
                DailyCheckinRewardsConfig.event_id == event_id,
                DailyCheckinRewardsConfig.day_number == day_number,
            )
        )
        return await self.db.scalar(stmt)

    async def get_all_rewards_for_event(
        self,
        event_id: uuid.UUID,
    ) -> list[DailyCheckinRewardsConfig]:
        """Lấy toàn bộ phần thưởng cấu hình của sự kiện, sắp xếp theo day_number."""
        stmt = (
            select(DailyCheckinRewardsConfig)
            .where(DailyCheckinRewardsConfig.event_id == event_id)
            .order_by(DailyCheckinRewardsConfig.day_number)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ──────────────────────────────────────────────────────────────────
    # USER PROFILES
    # ──────────────────────────────────────────────────────────────────

    async def get_gamification_profile(
        self,
        user_id: uuid.UUID,
    ) -> Optional[UserGamificationProfiles]:
        """Lấy profile gamification của user."""
        return await self.db.get(UserGamificationProfiles, user_id)

    async def get_or_create_gamification_profile(
        self,
        user_id: uuid.UUID,
    ) -> UserGamificationProfiles:
        """Lấy hoặc tạo mới profile gamification."""
        profile = await self.get_gamification_profile(user_id)
        if profile is None:
            profile = UserGamificationProfiles(user_id=user_id)
            self.db.add(profile)
            await self.db.flush()
            await self.db.refresh(profile)
        return profile

    async def update_streak(
        self,
        profile: UserGamificationProfiles,
        new_streak: int,
    ) -> None:
        """Cập nhật chuỗi streak và last_active_date."""
        profile.current_streak = new_streak
        if new_streak > profile.best_streak:
            profile.best_streak = new_streak
        profile.last_active_date = datetime.date.today()
        profile.updated_at = get_now()
        await self.db.flush()

    # ──────────────────────────────────────────────────────────────────
    # PEAK WALLET / BALANCE
    # ──────────────────────────────────────────────────────────────────

    async def get_peak_balance(
        self,
        user_id: uuid.UUID,
    ) -> Optional[UserPeakBalances]:
        """Lấy số dư Peak Wallet của user."""
        return await self.db.get(UserPeakBalances, user_id)

    async def get_or_create_peak_balance(
        self,
        user_id: uuid.UUID,
    ) -> UserPeakBalances:
        """Lấy hoặc tạo mới Peak Wallet."""
        balance = await self.get_peak_balance(user_id)
        if balance is None:
            balance = UserPeakBalances(user_id=user_id)
            self.db.add(balance)
            await self.db.flush()
            await self.db.refresh(balance)
        return balance

    async def credit_peak_wallet(
        self,
        balance: UserPeakBalances,
        amount: int,
    ) -> tuple[int, int]:
        """Cộng thêm số Peak vào ví.

        Returns:
            (before_balance, after_balance)
        """
        before = balance.current_balance
        balance.current_balance += amount
        balance.total_earned += amount
        balance.version += 1
        balance.updated_at = get_now()
        await self.db.flush()
        return before, balance.current_balance

    # ──────────────────────────────────────────────────────────────────
    # PEAK TRANSACTIONS (LEDGER)
    # ──────────────────────────────────────────────────────────────────

    async def create_peak_transaction(
        self,
        user_id: uuid.UUID,
        amount: int,
        before_balance: int,
        after_balance: int,
        source: str,
        event_id: Optional[uuid.UUID] = None,
        event_type: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> PeakTransactions:
        """Ghi bản ghi Peak Transaction (ledger)."""
        tx = PeakTransactions(
            user_id=user_id,
            amount=amount,
            type="credit",
            before_balance=before_balance,
            after_balance=after_balance,
            source=source,
            event_id=event_id,
            event_type=event_type,
            metadata_=metadata,
        )
        self.db.add(tx)
        await self.db.flush()
        return tx

    # ──────────────────────────────────────────────────────────────────
    # ACTIVITY LOG
    # ──────────────────────────────────────────────────────────────────

    async def create_activity_log(
        self,
        user_id: uuid.UUID,
        action_type: str,
        source_event_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> GamificationActivityLogs:
        """Ghi bản ghi Activity Log sau khi Check-in thành công."""
        log = GamificationActivityLogs(
            user_id=user_id,
            action_type=action_type,
            source_event_id=source_event_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_=metadata,
        )
        self.db.add(log)
        await self.db.flush()
        return log

    # ──────────────────────────────────────────────────────────────────
    # USER STATISTICS
    # ──────────────────────────────────────────────────────────────────

    async def increment_active_days(self, user_id: uuid.UUID) -> None:
        """Tăng total_active_days trong user_statistics sau mỗi lần check-in."""
        stats = await self.db.get(UserStatistics, user_id)
        if stats is None:
            stats = UserStatistics(user_id=user_id, total_active_days=1)
            self.db.add(stats)
        else:
            stats.total_active_days += 1
            stats.updated_at = get_now()
        await self.db.flush()

    # ──────────────────────────────────────────────────────────────────
    # USER
    # ──────────────────────────────────────────────────────────────────

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Lấy user theo ID."""
        return await self.db.get(User, user_id)
