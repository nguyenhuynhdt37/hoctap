import asyncio
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException
from loguru import logger

from app.core.deps import AuthorizationService, receive_bounded_ws_text_async
from app.core.ws_manager import ws_manager
from app.core.event_bus.redis_bus import event_bus
from app.core.event_bus.base import BaseEvent
from app.db.models.database import User

router = APIRouter(tags=["Gamification – Realtime Gateway"])


_ROLES = ["USER", "LECTURER", "ADMIN"]
_RECHECK_SECONDS = 15


async def _watch_session_async(websocket: WebSocket) -> None:
    expires_at = websocket.state.access_identity.expires_at
    while True:
        await asyncio.sleep(max(0, min(_RECHECK_SECONDS, expires_at - time.time())))
        if expires_at <= time.time():
            await websocket.close(code=4401)
            return
        if not await AuthorizationService.get_require_role_ws(websocket, _ROLES):
            return


async def _receive_until_disconnect_async(websocket: WebSocket) -> None:
    try:
        while True:
            await receive_bounded_ws_text_async(websocket)
    except WebSocketDisconnect:
        pass
    except WebSocketException as exc:
        await websocket.close(code=exc.code)


@router.websocket("/ws/gamification")
async def ws_gamification(websocket: WebSocket):
    await websocket.accept()
    user: User | None = await AuthorizationService.get_require_role_ws(websocket, _ROLES)
    if not user:
        return

    room_id = f"gamification_{user.id}"
    await ws_manager.connect(websocket, room_id)
    tasks = {
        asyncio.create_task(_watch_session_async(websocket)),
        asyncio.create_task(_receive_until_disconnect_async(websocket)),
    }
    try:
        done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            task.result()
    except Exception:
        logger.warning("Gamification WebSocket closed unexpectedly")
    finally:
        ws_manager.disconnect(websocket, room_id)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def handle_websocket_broadcast(event: BaseEvent) -> None:
    """
    Event handler that routes gamification events to the correct WebSocket room.
    """
    user_id = str(event.user_id)
    room_id = f"gamification_{user_id}"

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
