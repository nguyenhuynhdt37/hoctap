import datetime
import uuid
from typing import List, Optional, Set
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.database import UserGamificationProfiles, GamificationActivityLogs


class StreakRepository:
    """
    Repository for managing User Gamification Profiles and Activity Logs related to Streak calculations.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_profile(self, user_id: uuid.UUID) -> Optional[UserGamificationProfiles]:
        """Fetch gamification profile for a user."""
        return await self.db.get(UserGamificationProfiles, user_id)

    async def get_or_create_profile(self, user_id: uuid.UUID) -> UserGamificationProfiles:
        """Fetch profile, or create it if not found."""
        profile = await self.get_profile(user_id)
        if profile is None:
            profile = UserGamificationProfiles(
                user_id=user_id,
                level=1,
                current_xp=0,
                total_xp=0,
                total_peak_score=0,
                current_streak=0,
                best_streak=0,
                streak_freezes=0,
                version=1,
                last_active_date=None,
            )
            self.db.add(profile)
            await self.db.flush()
        return profile

    async def has_logged_event(self, user_id: uuid.UUID, event_name: str, source_id: uuid.UUID) -> bool:
        """
        Check if an activity has already been logged/processed for this event and source.
        Used to ensure event idempotency.
        """
        stmt = select(GamificationActivityLogs.id).where(
            and_(
                GamificationActivityLogs.user_id == user_id,
                GamificationActivityLogs.action_type == event_name,
                GamificationActivityLogs.source_event_id == source_id,
            )
        )
        res = await self.db.execute(stmt)
        return res.first() is not None

    async def log_activity(
        self,
        user_id: uuid.UUID,
        action_type: str,
        source_event_id: uuid.UUID,
        metadata: Optional[dict] = None
    ) -> GamificationActivityLogs:
        """Log a gamification activity."""
        log = GamificationActivityLogs(
            id=uuid.uuid4(),
            user_id=user_id,
            action_type=action_type,
            source_event_id=source_event_id,
            metadata_=metadata or {},
            risk_score=0.0,
            is_suspicious=False,
            created_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        )
        self.db.add(log)
        await self.db.flush()
        return log

    async def get_streak_history(self, user_id: uuid.UUID, limit: int = 50) -> List[GamificationActivityLogs]:
        """Get the user's qualified activity history."""
        stmt = (
            select(GamificationActivityLogs)
            .where(
                and_(
                    GamificationActivityLogs.user_id == user_id,
                    GamificationActivityLogs.action_type.in_(
                        ["lesson.completed", "quiz.completed", "code.completed", "course.purchased", "daily_checkin.completed"]
                    )
                )
            )
            .order_by(GamificationActivityLogs.created_at.desc())
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_active_days_in_range(
        self, user_id: uuid.UUID, start_date: datetime.date, end_date: datetime.date
    ) -> Set[datetime.date]:
        """Get unique active days (local date format) in a date range."""
        # Convert dates to UTC datetime bounds for scanning activity logs
        start_dt = datetime.datetime.combine(start_date, datetime.time.min)
        end_dt = datetime.datetime.combine(end_date, datetime.time.max)

        stmt = select(GamificationActivityLogs.created_at).where(
            and_(
                GamificationActivityLogs.user_id == user_id,
                GamificationActivityLogs.action_type.in_(
                    ["lesson.completed", "quiz.completed", "code.completed", "course.purchased", "daily_checkin.completed"]
                ),
                GamificationActivityLogs.created_at.between(start_dt, end_dt)
            )
        )
        res = await self.db.execute(stmt)
        # Convert created_at datetimes to dates
        return {dt.date() for dt in res.scalars().all()}
