from loguru import logger

from app.core.event_bus.base import BaseEvent
from app.core.event_bus.redis_bus import event_bus
from app.db.sesson import AsyncSessionLocal
from app.services.gamification.mission_service import MissionService

MISSION_SOURCE_EVENTS = (
    "lesson.completed",
    "quiz.completed",
    "quiz.attempted",
    "code.completed",
    "course.purchased",
    "daily_checkin.completed",
)


async def handle_mission_progress(event: BaseEvent) -> None:
    try:
        async with AsyncSessionLocal() as db:
            completed = await MissionService(db).refresh_from_event(event)
        for outgoing in completed:
            await event_bus.publish(outgoing)
    except Exception as exc:
        # GET can recover missed notifications from the persisted learning evidence.
        logger.warning("Không đồng bộ được nhiệm vụ qua sự kiện ({})", type(exc).__name__)


async def register_mission_subscribers() -> None:
    for name in MISSION_SOURCE_EVENTS:
        await event_bus.subscribe(name, handle_mission_progress)
