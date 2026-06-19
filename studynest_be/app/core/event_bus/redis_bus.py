import asyncio
import json
from typing import Any, Callable, Coroutine, Dict, List, Optional
from loguru import logger
from redis.asyncio import Redis

from app.core.redis import get_redis
from app.core.event_bus.base import BaseEvent, EventDispatcher, EventPublisher, EventSubscriber

REDIS_CHANNEL = "gamification_events"


class RedisEventBus(EventPublisher, EventSubscriber, EventDispatcher):
    """
    Redis Pub/Sub implementation of Event Bus.
    Acts as Publisher, Subscriber, and Dispatcher.
    """

    def __init__(self, channel: str = REDIS_CHANNEL) -> None:
        self.channel = channel
        self._handlers: Dict[str, List[Callable[[BaseEvent], Coroutine[Any, Any, None]]]] = {}
        self._listener_task: Optional[asyncio.Task] = None
        self._pubsub = None

    async def publish(self, event: BaseEvent) -> None:
        """Serialize event to JSON and publish to Redis Channel."""
        try:
            redis: Redis = get_redis()
            payload = event.model_dump_json()
            await redis.publish(self.channel, payload)
            logger.debug(f"[EventBus] Published {event.event_name} (id: {event.event_id}) to {self.channel}")
        except Exception as e:
            logger.error(f"[EventBus] Failed to publish event {event.event_name}: {e}")

    async def subscribe(self, event_name: str, handler: Callable[[BaseEvent], Coroutine[Any, Any, None]]) -> None:
        """Register a handler for a specific event name."""
        if event_name not in self._handlers:
            self._handlers[event_name] = []
        self._handlers[event_name].append(handler)
        logger.info(f"[EventBus] Subscribed handler to event: {event_name}")

    async def dispatch(self, event: BaseEvent) -> None:
        """Dispatch event to all registered handlers for the event's name."""
        handlers = self._handlers.get(event.event_name, [])
        if not handlers:
            return

        logger.debug(f"[EventBus] Dispatching {event.event_name} to {len(handlers)} handlers")
        for handler in handlers:
            try:
                # Schedule handler asynchronously so they run concurrently without blocking each other
                asyncio.create_task(handler(event))
            except Exception as e:
                logger.exception(f"[EventBus] Error launching handler for {event.event_name}: {e}")

    async def start_listening(self) -> None:
        """Start background task to listen to Redis Pub/Sub."""
        if self._listener_task is not None:
            logger.warning("[EventBus] Listener is already running.")
            return

        redis: Redis = get_redis()
        self._pubsub = redis.pubsub()
        await self._pubsub.subscribe(self.channel)
        logger.info(f"[EventBus] Subscribed to Redis channel: {self.channel}")

        self._listener_task = asyncio.create_task(self._listen_loop())

    async def stop_listening(self) -> None:
        """Stop listening background task and clean up Pub/Sub subscription."""
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None

        if self._pubsub:
            await self._pubsub.unsubscribe(self.channel)
            await self._pubsub.aclose()
            self._pubsub = None
            logger.info("[EventBus] Stopped listening and closed Pub/Sub.")

    async def _listen_loop(self) -> None:
        """Read loop running in the background to fetch events from Redis."""
        logger.info("[EventBus] Starting Redis listener loop...")
        try:
            while True:
                try:
                    # Retrieve next message with a short timeout to prevent blocking indefinitely
                    message = await self._pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message.get("type") == "message":
                        data_str = message.get("data")
                        if not data_str:
                            continue

                        # Parse message payload
                        try:
                            if isinstance(data_str, bytes):
                                data_str = data_str.decode("utf-8")
                            event_dict = json.loads(data_str)
                            event = BaseEvent.model_validate(event_dict)
                            await self.dispatch(event)
                        except json.JSONDecodeError as je:
                            logger.error(f"[EventBus] JSON decode error in message: {je}")
                        except Exception as pe:
                            logger.error(f"[EventBus] Failed to validate event dict: {pe}")

                except asyncio.CancelledError:
                    raise
                except Exception as loop_err:
                    logger.error(f"[EventBus] Error in pubsub read loop: {loop_err}")
                    await asyncio.sleep(1)  # brief pause before retrying to avoid spamming
        except asyncio.CancelledError:
            logger.info("[EventBus] Listener loop cancelled.")
        except Exception as e:
            logger.critical(f"[EventBus] Listener loop crashed: {e}")


# Singleton instance of Event Bus
event_bus = RedisEventBus()
