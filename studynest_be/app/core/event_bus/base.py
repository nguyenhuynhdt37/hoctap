import datetime
import uuid
from abc import ABC, abstractmethod
from typing import Any, Callable, Coroutine, Dict
from pydantic import BaseModel, Field


class BaseEvent(BaseModel):
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_name: str
    occurred_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    )
    user_id: uuid.UUID
    source_type: str  # e.g., 'lesson', 'quiz', 'code', 'course', 'checkin'
    source_id: uuid.UUID
    payload: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EventPublisher(ABC):
    @abstractmethod
    async def publish(self, event: BaseEvent) -> None:
        """Publish an event to the event bus."""
        pass


class EventSubscriber(ABC):
    @abstractmethod
    async def subscribe(self, event_name: str, handler: Callable[[BaseEvent], Coroutine[Any, Any, None]]) -> None:
        """Subscribe to a specific event name on the event bus."""
        pass


class EventDispatcher(ABC):
    @abstractmethod
    async def dispatch(self, event: BaseEvent) -> None:
        """Dispatch a received event to all registered subscribers."""
        pass
