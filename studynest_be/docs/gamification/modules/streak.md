# Module 02 – Streak Engine

## Tổng quan

Streak Engine theo dõi chuỗi ngày học tập liên tục của user. Mỗi khi user hoàn thành một hoạt động học tập **đủ điều kiện (qualified activity)**, hệ thống sẽ tự động cập nhật streak thông qua kiến trúc **Event-Driven** sử dụng **Redis Pub/Sub**.

---

## Kiến trúc

```
Business Service
    │
    ├── publish(BaseEvent) ──▶ RedisEventBus ──▶ Redis Channel: "gamification_events"
    │                                                    │
    │                                            Listener Loop (background task)
    │                                                    │
    │                                            dispatch(BaseEvent)
    │                                                    │
    │                                     ┌──────────────┴──────────────┐
    │                                     │                             │
    │                             StreakSubscriber              WebSocket Subscriber
    │                                     │                             │
    │                             StreakService                ws_manager.broadcast()
    │                                     │                        ↓
    │                              PostgreSQL DB            /ws/gamification
    │                                     │
    │                              publish(streak.updated / streak.milestone)
    │                                     │
    └─────────────────────────────────────┘  (re-enter bus for WS broadcast)
```

---

## Qualified Activities (Hoạt động đủ điều kiện)

| Event Name | Điều kiện | Nguồn phát |
|---|---|---|
| `lesson.completed` | Hoàn thành bài video/article lần đầu | `mark_lesson_completed_async()` |
| `quiz.completed` | Hoàn thành bài quiz lần đầu | `mark_lesson_completed_async()` (lesson_type=quiz) |
| `code.completed` | Pass toàn bộ test case lần đầu | `test_user_code_async()` |
| `course.purchased` | Đăng ký khóa học (free hoặc paid) lần đầu | `enroll_in_course_async()`, `checkout_wallet_async()` |
| `daily_checkin.completed` | Check-in ngày thứ 3, 6, 9... (consecutive_day % 3 == 0) | `claim_checkin()` |

---

## Business Rules

### Streak Increment Logic

```
last_active_date == None         → current_streak = 1  (lần đầu)
last_active_date == today        → NO CHANGE           (đã active hôm nay)
last_active_date == yesterday    → current_streak += 1 (liên tiếp)
last_active_date < yesterday     → current_streak = 1  (gián đoạn → reset)
                                   + ghi streak_reset log
```

### Streak Milestones

Khi `current_streak` đạt mốc, publish thêm event `streak.milestone`:

| Mốc |
|-----|
| 7   |
| 14  |
| 30  |
| 60  |
| 100 |
| 365 |

### Streak Freeze (Đóng băng Streak)

- User sở hữu `streak_freezes` (số lượng lượt đóng băng).
- Khi streak bị reset do gián đoạn, user có thể gọi **POST /restore** để dùng 1 freeze khôi phục lại.
- Điều kiện khôi phục: reset xảy ra trong vòng 2 ngày gần nhất.

---

## Redis Event Bus

### Interface

```python
class EventPublisher(ABC):
    async def publish(self, event: BaseEvent) -> None: ...

class EventSubscriber(ABC):
    async def subscribe(self, event_name: str, handler: Callable) -> None: ...

class EventDispatcher(ABC):
    async def dispatch(self, event: BaseEvent) -> None: ...
```

### BaseEvent Schema

```python
class BaseEvent(BaseModel):
    event_id: UUID          # auto-generated
    event_name: str         # e.g. "lesson.completed"
    occurred_at: datetime   # UTC naive
    user_id: UUID
    source_type: str        # e.g. "lesson", "course", "checkin"
    source_id: UUID
    payload: dict
    metadata: dict
```

### Singleton

```python
# app/core/event_bus/redis_bus.py
event_bus = RedisEventBus()  # dùng singleton này toàn ứng dụng
```

### Redis Channel

- Channel duy nhất: `"gamification_events"`
- Tất cả events publish vào 1 channel, dispatcher phân loại theo `event_name`.

---

## Files

### Core Infrastructure

| File | Mô tả |
|------|-------|
| [`app/core/event_bus/base.py`](../../../app/core/event_bus/base.py) | `BaseEvent`, interfaces `EventPublisher`, `EventSubscriber`, `EventDispatcher` |
| [`app/core/event_bus/redis_bus.py`](../../../app/core/event_bus/redis_bus.py) | `RedisEventBus` – implements tất cả interfaces, background listener loop, singleton `event_bus` |

### Streak Engine

| File | Mô tả |
|------|-------|
| [`app/repositories/gamification/streak_repository.py`](../../../app/repositories/gamification/streak_repository.py) | DB access: `get_or_create_profile`, `has_logged_event`, `log_activity`, `get_streak_history`, `get_active_days_in_range` |
| [`app/services/gamification/streak_service.py`](../../../app/services/gamification/streak_service.py) | Business logic: `process_activity()`, `restore_streak()`, `get_streak_status()`, `get_streak_calendar()`, `get_streak_history()` |
| [`app/services/gamification/streak_subscriber.py`](../../../app/services/gamification/streak_subscriber.py) | Đăng ký handlers vào event bus: `register_streak_subscribers()` |

### API Layer

| File | Mô tả |
|------|-------|
| [`app/api/v1/gamification/streak.py`](../../../app/api/v1/gamification/streak.py) | REST endpoints `/api/v1/gamification/streak/*` |
| [`app/api/v1/gamification/websocket.py`](../../../app/api/v1/gamification/websocket.py) | WebSocket `/ws/gamification` + `register_websocket_subscribers()` |
| [`app/schemas/gamification/streak.py`](../../../app/schemas/gamification/streak.py) | Pydantic schemas: `StreakResponse`, `StreakRestoreResponse`, `StreakHistoryResponse`, `StreakCalendarResponse` |

### Event Integration (Publishers)

| File | Event được publish |
|------|--------------------|
| [`app/services/user/learning.py`](../../../app/services/user/learning.py) | `lesson.completed`, `quiz.completed`, `code.completed` |
| [`app/services/user/courses.py`](../../../app/services/user/courses.py) | `course.purchased` (free enroll) |
| [`app/services/shares/transaction.py`](../../../app/services/shares/transaction.py) | `course.purchased` (free & paid checkout) |
| [`app/services/gamification/daily_checkin_service.py`](../../../app/services/gamification/daily_checkin_service.py) | `daily_checkin.completed` |

---

## REST API

### Base URL: `/api/v1/gamification/streak`

#### `GET /`

Lấy thông tin Streak hiện tại.

**Response:**
```json
{
  "current_streak": 7,
  "best_streak": 14,
  "streak_freezes": 2,
  "last_active_date": "2026-06-18"
}
```

---

#### `GET /calendar?days=30`

Lấy danh sách các ngày học tập tích cực trong N ngày gần đây.

**Query params:**
- `days` (int, 1–365, default=30)

**Response:**
```json
{
  "active_dates": ["2026-06-16", "2026-06-17", "2026-06-18"]
}
```

---

#### `GET /history?limit=20`

Lấy lịch sử chi tiết các hoạt động đạt chuẩn (lesson, quiz, code, checkin, course).

**Query params:**
- `limit` (int, 1–100, default=20)

**Response:**
```json
{
  "activities": [
    {
      "id": "...",
      "action_type": "lesson.completed",
      "source_event_id": "...",
      "created_at": "2026-06-18T08:00:00",
      "metadata": {}
    }
  ]
}
```

---

#### `POST /restore`

Khôi phục chuỗi streak bị gián đoạn bằng Streak Freeze.

**Response (success):**
```json
{
  "success": true,
  "message": "Khôi phục chuỗi học tập thành công! 🎉",
  "current_streak": 8,
  "streak_freezes_left": 1
}
```

**Response (error – no freeze):**
```json
{ "detail": "Bạn không còn lượt đóng băng Streak (Streak Freeze)." }
```
HTTP 400

---

## WebSocket

### Endpoint: `GET /ws/gamification`

**Authentication:** JWT token qua query param `token`.

```
ws://host/ws/gamification?token=<JWT>&role_name=USER
```

**Events nhận được:**

| Event Name | Payload | Mô tả |
|------------|---------|-------|
| `streak.updated` | `{ current_streak, previous_streak, best_streak }` | Streak được cập nhật |
| `streak.milestone` | `{ milestone }` | Đạt mốc streak (7, 14, 30...) |
| `streak.restored` | `{ current_streak, previous_streak, streak_freezes_left }` | Streak được khôi phục bằng freeze |

**Ví dụ message:**
```json
{
  "event": "streak.updated",
  "payload": {
    "current_streak": 8,
    "previous_streak": 7,
    "best_streak": 14
  }
}
```

---

## Lifespan Integration

Trong `app/main.py`, event bus được khởi động khi app start:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Đăng ký subscribers
    await register_streak_subscribers()
    await register_websocket_subscribers()
    # Bắt đầu listen Redis
    await event_bus.start_listening()
    yield
    # Dừng khi shutdown
    await event_bus.stop_listening()
```

---

## Idempotency

- Mỗi event được kiểm tra trong `GamificationActivityLogs` theo `(user_id, action_type, source_event_id)`.
- Nếu đã tồn tại → **skip**, không xử lý lại.
- Đảm bảo an toàn khi message bị publish trùng lặp do lỗi mạng.

---

## Tests

### Unit Tests

```bash
.venv/bin/pytest tests/unit/gamification/test_streak_unit.py -v
```

Coverage:
- `TestProcessActivityLessonCompleted` – 6 tests: first activity, consecutive, best streak, noop today, gap reset, idempotency
- `TestProcessActivityDailyCheckin` – 4 tests: consecutive_day % 3 logic
- `TestMilestones` – 7 tests: tất cả milestones + non-milestone
- `TestRestoreStreak` – 2 tests: no freeze error, restore with recent reset log

### Integration Tests

```bash
.venv/bin/pytest tests/integration/gamification/test_streak_integration.py -v
```

Coverage:
- `TestRedisEventBus` – publish/subscribe/dispatch flow
- `TestEventBusPublishDispatch` – mock Redis, verify JSON serialization
- `TestStreakServiceIntegration` – DB-level streak update (requires DB)
- `TestStreakApiEndpoints` – REST endpoint behavior (mocked service)

---

## Database Tables sử dụng

| Table | Mục đích |
|-------|---------|
| `user_gamification_profiles` | Lưu `current_streak`, `best_streak`, `streak_freezes`, `last_active_date` |
| `gamification_activity_logs` | Log các qualified activities, idempotency guard, streak_reset history |

> **Không thay đổi schema DB.** Cả 2 table đã được thiết kế và migrate trong Module 01.

---

## Events Flow Summary

```
User hoàn thành bài học
        │
        ▼
mark_lesson_completed_async()
        │
        ├── Commit DB (LessonProgress)
        │
        └── event_bus.publish(lesson.completed)
                │
                ▼
        Redis Channel: gamification_events
                │
                ▼
        RedisEventBus._listen_loop()
                │
                ├──▶ StreakSubscriber.handle_gamification_activity()
                │           │
                │           ▼
                │    StreakService.process_activity()
                │           │
                │           ├── Check idempotency
                │           ├── Validate qualified activity
                │           ├── Update user_gamification_profiles
                │           ├── Log GamificationActivityLogs
                │           └── publish(streak.updated) [+ streak.milestone nếu đạt mốc]
                │                       │
                │                       ▼
                │               Redis Channel: gamification_events
                │                       │
                │                       ▼
                └──▶ WebSocketSubscriber.handle_websocket_broadcast()
                                │
                                ▼
                    ws_manager.broadcast(gamification_{user_id})
                                │
                                ▼
                    Client nhận real-time update 🎉
```
