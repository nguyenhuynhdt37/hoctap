from contextlib import asynccontextmanager
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import httpx
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_pagination import add_pagination

# --- ADMIN ROUTES ---
from app.api.v1 import test
from app.api.v1.admin import category as admin_category
from app.api.v1.admin import discounts as admin_discounts
from app.api.v1.admin import lecturer as admin_lecturer
from app.api.v1.admin import platform_wallet_service, role
from app.api.v1.admin import refunds as admin_refunds
from app.api.v1.admin import statistics as admin_statistics
from app.api.v1.admin import topic as admin_topic
from app.api.v1.admin import transactions as admin_transactions
from app.api.v1.admin import user as admin_user
from app.api.v1.admin import withdraw as admin_withdraw

# --- CHAT / AI ROUTES ---
from app.api.v1.chat.admin import topic as chat_topic_admin
from app.api.v1.chat.lecturer import course as chat_course_lecturer
from app.api.v1.chat.lecturer import lesson as chat_lesson_lecturer
from app.api.v1.chat.user import profile as chat_profile_user

# --- LECTURER ROUTES ---
from app.api.v1.lecturer import chapter, lesson
from app.api.v1.lecturer import courses as lecturer_courses
from app.api.v1.lecturer import discounts as lecturer_discounts
from app.api.v1.lecturer import payout as lecturer_payout
from app.api.v1.lecturer import refunds as lecturer_refunds
from app.api.v1.lecturer import statistics as lecturer_statistics
from app.api.v1.lecturer import transactions as lecturer_transactions
from app.api.v1.lecturer import wallets as lecturer_wallets
from app.api.v1.lecturer import withdraw as lecturer_withdraw

# share
from app.api.v1.shares import auth, location, notification, profile, upload
from app.api.v1.user import category, favorites, learning, user_preferences, wallets
from app.api.v1.user import chat_sql as user_chat_sql
from app.api.v1.user import course_enroll as course_enroll
from app.api.v1.user import courses as user_courses
from app.api.v1.user import discounts as user_discounts
from app.api.v1.user import lecturer as user_lecturer
from app.api.v1.user import refunds as user_refunds
from app.api.v1.user import transaction as user_transaction
from app.api.v1.user import tutor_chat as user_tutor_chat

# --- GAMIFICATION ROUTES ---
from app.api.v1.gamification import daily_checkin as gamification_checkin
from app.api.v1.gamification import profile as gamification_profile
from app.api.v1.gamification import streak as gamification_streak
from app.api.v1.gamification import websocket as gamification_ws
from app.core.scheduler import scheduler, start_scheduler
from app.core.redis import close_redis, ping_redis

# --- MIDDLEWARE ---
from app.middleware.request_context import RequestContextMiddleware

# --- USER ROUTES ---



@asynccontextmanager
async def lifespan(app: FastAPI):

    # ================================
    # 1) GLOBAL HTTP CLIENT
    # ================================
    http = httpx.AsyncClient(timeout=30)
    app.state.http = http
    print("🌐 HTTP client started")

    # ================================
    # 2) START APSCHEDULER
    # ================================
    start_scheduler(http)
    print("⏱ Scheduler started")

    redis_ready = await ping_redis()
    print("🧠 Redis presence ready" if redis_ready else "⚠ Redis presence unavailable")

    # ================================
    # 5) REDIS EVENT BUS & SUBSCRIBERS
    # ================================
    from app.core.event_bus.redis_bus import event_bus
    from app.services.gamification.mission_subscriber import register_mission_subscribers
    from app.services.gamification.streak_subscriber import register_streak_subscribers
    from app.api.v1.gamification.websocket import register_websocket_subscribers

    await register_mission_subscribers()
    await register_streak_subscribers()
    await register_websocket_subscribers()
    await event_bus.start_listening()
    print("🧠 Redis Event Bus listening started")

    # App chạy
    try:
        yield
    finally:
        # ================================
        # 5) STOP REDIS EVENT BUS
        # ================================
        try:
            await event_bus.stop_listening()
            print("🧠 Redis Event Bus stopped")
        except Exception as e:
            print("⚠ Redis Event Bus stop error:", e)

        # ================================
        # 3) CLOSE HTTP CLIENT
        # ================================
        await app.state.http.aclose()
        print("🌐 HTTP client closed")

        # ================================
        # 4) STOP SCHEDULER
        # ================================
        try:
            scheduler.shutdown(wait=False)
            print("🛑 Scheduler stopped")
        except Exception as e:
            print("⚠ Scheduler shutdown error:", e)

        await close_redis()
        print("🧠 Redis client closed")


# ===== APP CONFIG =====
app = FastAPI(
    title="FastAPI Starter 2025",
    description="Backend demo với cấu hình trong main.py",
    version="0.1.0",
    lifespan=lifespan,
    swagger_ui_parameters={"withCredentials": True},  # 🔑 Cho phép Swagger gửi cookie
)

# --- CORS ---
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
    # Allow all ngrok/tunnel origins for development
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


app.add_middleware(RequestContextMiddleware)
add_pagination(app)
prefix = "/api/v1"

# ===== REGISTER ROUTERS =====
app.include_router(test.router, prefix=prefix)
# --- Share ---
app.include_router(auth.router, prefix=prefix)
app.include_router(location.router, prefix=prefix)
app.include_router(wallets.router, prefix=prefix)
app.include_router(notification.router, prefix=prefix)
app.include_router(upload.router, prefix=prefix)
app.include_router(profile.router, prefix=prefix)

# --- USER ROUTES ---
app.include_router(category.router, prefix=prefix)
app.include_router(user_courses.router, prefix=prefix)
app.include_router(course_enroll.router, prefix=prefix)
app.include_router(favorites.router, prefix=prefix)
app.include_router(learning.router, prefix=prefix)
app.include_router(user_preferences.router, prefix=prefix)
app.include_router(user_transaction.router, prefix=prefix)
app.include_router(user_discounts.router, prefix=prefix)
app.include_router(user_refunds.router, prefix=prefix)
app.include_router(user_lecturer.router, prefix=prefix)
app.include_router(user_tutor_chat.router, prefix=prefix)
app.include_router(user_chat_sql.router, prefix=prefix)

# --- GAMIFICATION ROUTES ---
app.include_router(gamification_checkin.router, prefix=prefix)
app.include_router(gamification_profile.router, prefix=prefix)
app.include_router(gamification_streak.router, prefix=prefix)
app.include_router(gamification_ws.router, prefix=f"{prefix}/gamification")

# --- LECTURER ROUTES ---
app.include_router(lecturer_courses.router, prefix=prefix)
app.include_router(lesson.router, prefix=prefix)
app.include_router(chapter.router, prefix=prefix)
app.include_router(lecturer_discounts.router, prefix=prefix)
app.include_router(lecturer_wallets.router, prefix=prefix)
app.include_router(lecturer_transactions.router, prefix=prefix)
app.include_router(lecturer_refunds.router, prefix=prefix)
app.include_router(lecturer_payout.router, prefix=prefix)
app.include_router(lecturer_withdraw.router, prefix=prefix)
app.include_router(lecturer_statistics.router, prefix=prefix)

# --- ADMIN ROUTES ---
app.include_router(admin_user.router, prefix=prefix)
app.include_router(admin_lecturer.router, prefix=prefix)
app.include_router(admin_category.router, prefix=prefix)
app.include_router(admin_topic.router, prefix=prefix)
app.include_router(role.router, prefix=prefix)
app.include_router(platform_wallet_service.router, prefix=prefix)
app.include_router(admin_discounts.router, prefix=prefix)
app.include_router(admin_transactions.router, prefix=prefix)
app.include_router(admin_refunds.router, prefix=prefix)
app.include_router(admin_withdraw.router, prefix=prefix)
app.include_router(admin_statistics.router, prefix=prefix)

# --- CHAT / AI ROUTES ---
app.include_router(chat_topic_admin.router, prefix=prefix)
app.include_router(chat_course_lecturer.router, prefix=prefix)
app.include_router(chat_lesson_lecturer.router, prefix=prefix)
app.include_router(chat_profile_user.router, prefix=prefix)

@app.get("/health")
async def health():
    return {"status": "ok"}


# ===== ROOT =====
@app.get("/")
async def hello_world():
    return {"message": "Hello world"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
