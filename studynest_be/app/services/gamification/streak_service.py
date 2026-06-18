import datetime
import uuid
from typing import Optional
from fastapi import HTTPException
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.event_bus.redis_bus import event_bus
from app.core.event_bus.base import BaseEvent
from app.repositories.gamification.streak_repository import StreakRepository
from app.db.models.database import UserGamificationProfiles, GamificationActivityLogs

MILESTONES = {3, 7, 14, 30, 60, 100, 365}


class StreakService:
    """
    StreakEngine service that implements business logic for user streak updates, restores, and milestones.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = StreakRepository(db)

    async def get_streak_status(self, user_id: uuid.UUID) -> dict:
        """Get the current streak status for a user."""
        profile = await self.repo.get_or_create_profile(user_id)
        return {
            "current_streak": profile.current_streak,
            "best_streak": profile.best_streak,
            "streak_freezes": profile.streak_freezes,
            "last_active_date": profile.last_active_date.isoformat() if profile.last_active_date else None,
        }

    async def get_streak_calendar(self, user_id: uuid.UUID, days: int = 30) -> list:
        """Get list of active dates in the last N days."""
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=days)
        active_dates = await self.repo.get_active_days_in_range(user_id, start_date, end_date)
        return [d.isoformat() for d in sorted(active_dates)]

    async def get_streak_history(self, user_id: uuid.UUID, limit: int = 20) -> list:
        """Get history logs of qualified activities."""
        history = await self.repo.get_streak_history(user_id, limit=limit)
        return [
            {
                "id": str(log.id),
                "action_type": log.action_type,
                "source_event_id": str(log.source_event_id) if log.source_event_id else None,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "metadata": log.metadata_ or {},
            }
            for log in history
        ]

    async def process_activity(self, event: BaseEvent) -> None:
        """
        Process a received event.
        Ensures idempotency, validates rules, updates user streak, and fires secondary events.
        """
        user_id = event.user_id
        event_name = event.event_name
        source_id = event.source_id

        # 1. Idempotency Check
        if await self.repo.has_logged_event(user_id, event_name, source_id):
            logger.debug(f"[StreakEngine] Event {event_name} for source {source_id} already processed. Skipping.")
            return

        # 2. Qualified Activity Validation
        is_qualified = False
        meta = event.payload or {}

        if event_name == "lesson.completed":
            is_qualified = True
        elif event_name == "quiz.completed":
            is_qualified = True
        elif event_name == "code.completed":
            is_qualified = True
        elif event_name == "course.purchased":
            is_qualified = True
        elif event_name == "mission.completed":
            is_qualified = True
        elif event_name == "daily_checkin.completed":
            # Qualified only if consecutive_day is a multiple of 3
            consecutive_day = meta.get("consecutive_day", 0)
            if consecutive_day > 0 and consecutive_day % 3 == 0:
                is_qualified = True

        if not is_qualified:
            logger.debug(f"[StreakEngine] Event {event_name} is not a qualified activity. Skipping.")
            return

        # 3. Process streak increment
        profile = await self.repo.get_or_create_profile(user_id)
        today = datetime.date.today()

        # Log the qualified activity
        await self.repo.log_activity(user_id, event_name, source_id, event.metadata)

        last_date = profile.last_active_date
        streak_updated = False
        old_streak = profile.current_streak

        if last_date is None:
            # First time activity
            profile.current_streak = 1
            profile.best_streak = max(profile.best_streak, 1)
            profile.last_active_date = today
            streak_updated = True
        elif last_date == today:
            # Already active today
            logger.debug(f"[StreakEngine] User {user_id} already qualified today. No streak change.")
        elif last_date == today - datetime.timedelta(days=1):
            # Consecutive activity
            profile.current_streak += 1
            profile.best_streak = max(profile.best_streak, profile.current_streak)
            profile.last_active_date = today
            streak_updated = True
        else:
            # Gap detected -> Reset streak
            # Save previous state in a streak_reset log for restore function
            await self.repo.log_activity(
                user_id=user_id,
                action_type="streak_reset",
                source_event_id=event.event_id,
                metadata={
                    "previous_streak": profile.current_streak,
                    "last_active_date": last_date.isoformat(),
                    "reset_date": today.isoformat(),
                }
            )

            profile.current_streak = 1
            profile.last_active_date = today
            streak_updated = True

        await self.db.commit()

        # 4. Trigger secondary events
        if streak_updated:
            # Publish streak.updated
            update_event = BaseEvent(
                event_name="streak.updated",
                user_id=user_id,
                source_type="profile",
                source_id=user_id,
                payload={
                    "current_streak": profile.current_streak,
                    "previous_streak": old_streak,
                    "best_streak": profile.best_streak,
                    "today_completed": True,
                    "milestone": profile.current_streak if profile.current_streak in MILESTONES else None,
                }
            )
            await event_bus.publish(update_event)

            # Check for milestones
            if profile.current_streak in MILESTONES:
                milestone_event = BaseEvent(
                    event_name="streak.milestone",
                    user_id=user_id,
                    source_type="profile",
                    source_id=user_id,
                    payload={
                        "current_streak": profile.current_streak,
                        "milestone": profile.current_streak,
                    }
                )
                await event_bus.publish(milestone_event)

    async def restore_streak(self, user_id: uuid.UUID) -> dict:
        """
        Restore a broken streak using a freeze.
        Checks for freeze balance and business conditions.
        """
        profile = await self.repo.get_or_create_profile(user_id)

        if profile.streak_freezes <= 0:
            raise HTTPException(status_code=400, detail="Bạn không còn lượt đóng băng Streak (Streak Freeze).")

        today = datetime.date.today()
        restored = False
        old_streak = profile.current_streak
        previous_streak = 0

        # Case A: User has today's active reset log (streak is currently 1, reset from yesterday)
        stmt = (
            select(GamificationActivityLogs)
            .where(
                and_(
                    GamificationActivityLogs.user_id == user_id,
                    GamificationActivityLogs.action_type == "streak_reset"
                )
            )
            .order_by(GamificationActivityLogs.created_at.desc())
            .limit(1)
        )
        res = await self.db.execute(stmt)
        reset_log = res.scalar_one_or_none()

        if reset_log:
            meta = reset_log.metadata_ or {}
            previous_streak = meta.get("previous_streak", 0)
            last_active_str = meta.get("last_active_date")

            if last_active_str:
                last_active_date = datetime.date.fromisoformat(last_active_str)
                # Ensure the reset is recent (yesterday or today)
                if last_active_date >= today - datetime.timedelta(days=2):
                    profile.current_streak = previous_streak + 1
                    profile.best_streak = max(profile.best_streak, profile.current_streak)
                    profile.last_active_date = today
                    profile.streak_freezes -= 1
                    # Remove the reset log so it cannot be reused
                    await self.db.delete(reset_log)
                    restored = True

        # Case B: Lazy evaluation, user hasn't done any activity today, but yesterday was missed (last active was 2 days ago)
        if not restored and profile.last_active_date == today - datetime.timedelta(days=2):
            profile.last_active_date = today - datetime.timedelta(days=1)  # Freeze yesterday
            profile.streak_freezes -= 1
            restored = True
            previous_streak = profile.current_streak

        if not restored:
            raise HTTPException(status_code=400, detail="Không đủ điều kiện khôi phục Streak.")

        await self.db.commit()

        # Publish streak.restored event
        restore_event = BaseEvent(
            event_name="streak.restored",
            user_id=user_id,
            source_type="profile",
            source_id=user_id,
            payload={
                "current_streak": profile.current_streak,
                "previous_streak": previous_streak,
                "best_streak": profile.best_streak,
                "streak_freezes_left": profile.streak_freezes,
                "today_completed": profile.last_active_date == datetime.date.today(),
            }
        )
        await event_bus.publish(restore_event)

        return {
            "success": True,
            "message": "Khôi phục chuỗi học tập thành công! 🎉",
            "current_streak": profile.current_streak,
            "streak_freezes_left": profile.streak_freezes,
        }
