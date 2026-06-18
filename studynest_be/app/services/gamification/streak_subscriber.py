from loguru import logger

from app.core.event_bus.redis_bus import event_bus
from app.core.event_bus.base import BaseEvent
from app.db.sesson import AsyncSessionLocal
from app.services.gamification.streak_service import StreakService


async def handle_gamification_activity(event: BaseEvent) -> None:
    """
    Generic event handler for all qualified activities.
    Creates a new database session and processes the activity.
    """
    logger.info(f"[StreakSubscriber] Received event: {event.event_name} for user: {event.user_id}")
    async with AsyncSessionLocal() as db:
        service = StreakService(db)
        try:
            await service.process_activity(event)
        except Exception as e:
            logger.exception(f"[StreakSubscriber] Failed to process event {event.event_name}: {e}")


async def register_streak_subscribers() -> None:
    """
    Register all streak-related event handlers to the event bus.
    """
    event_names = [
        "lesson.completed",
        "quiz.completed",
        "code.completed",
        "course.purchased",
        "daily_checkin.completed",
        "mission.completed",
    ]

    for name in event_names:
        await event_bus.subscribe(name, handle_gamification_activity)

    logger.info("[StreakSubscriber] Registered all streak subscribers successfully.")
