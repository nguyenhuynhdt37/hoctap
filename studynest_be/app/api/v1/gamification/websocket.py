import uuid
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from loguru import logger

from app.core.deps import AuthorizationService
from app.core.ws_manager import ws_manager
from app.core.event_bus.redis_bus import event_bus
from app.core.event_bus.base import BaseEvent
from app.db.models.database import User

router = APIRouter(tags=["Gamification – Realtime Gateway"])


@router.websocket("/ws/gamification")
async def ws_gamification(websocket: WebSocket):
    """
    WebSocket Gateway for Gamification Realtime updates.
    Client maintains a single connection to receive:
      - streak.updated
      - streak.restored
      - streak.milestone
      - xp.earned
      - level.up
      - peak.earned
      - mission.completed
      - achievement.unlocked
    """
    await websocket.accept()

    # Authenticate user from JWT
    user: User | None = await AuthorizationService.get_require_role_ws(
        websocket, ["USER", "LECTURER", "ADMIN"]
    )
    if not user:
        logger.warning("[WS][Gamification] Rejecting WS: user is None")
        await websocket.close(code=1008)
        return

    user_id = str(user.id)
    room_id = f"gamification_{user_id}"

    # Join the client to their personal gamification room
    await ws_manager.connect(websocket, room_id)
    logger.info(f"[WS][Gamification] User {user.email} connected to {room_id}")

    try:
        while True:
            # Keep connection alive, listen for ping/pong or client disconnect
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, room_id)
        logger.info(f"[WS][Gamification] User {user.email} disconnected from {room_id}")
    except Exception as exc:
        logger.warning(f"[WS][Gamification] User {user.email} disconnected with error: {exc}")
        ws_manager.disconnect(websocket, room_id)


async def handle_websocket_broadcast(event: BaseEvent) -> None:
    """
    Event handler that routes gamification events to the correct WebSocket room.
    """
    user_id = str(event.user_id)
    room_id = f"gamification_{user_id}"
    logger.debug(f"[WS][Gamification] Routing event {event.event_name} to room {room_id}")

    await ws_manager.broadcast(
        room_id,
        {
            **event.payload,
            "event": event.event_name,
        }
    )


async def register_websocket_subscribers() -> None:
    """
    Register WebSocket routing handlers to the event bus.
    """
    ws_events = [
        "streak.updated",
        "streak.restored",
        "streak.milestone",
        "xp.earned",
        "level.up",
        "peak.earned",
        "mission.completed",
        "achievement.unlocked",
        "daily_checkin.completed",
    ]
    for name in ws_events:
        await event_bus.subscribe(name, handle_websocket_broadcast)
    logger.info("[WS][Gamification] Registered WebSocket event subscribers.")
