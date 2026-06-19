import datetime
import uuid
from typing import Any, Optional
from zoneinfo import ZoneInfo

from loguru import logger
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_bus.base import BaseEvent
from app.core.event_bus.redis_bus import event_bus
from app.db.models.database import (
    GamificationActivityLogs,
    LevelsConfig,
    Missions,
    PeakTransactions,
    UserGamificationProfiles,
    UserMissions,
    UserPeakBalances,
)
from app.db.sesson import AsyncSessionLocal

MISSION_SOURCE_EVENTS = [
    "lesson.completed",
    "quiz.completed",
    "code.completed",
    "course.purchased",
    "daily_checkin.completed",
]

DEFAULT_MISSIONS = [
    {
        "title": "Hoàn thành 1 bài học",
        "description": "Hoàn thành một bài học bất kỳ trong ngày.",
        "frequency": "daily",
        "event_type": "lesson.completed",
        "target_count": 1,
        "reward_xp": 50,
        "reward_peak_wallet": 0,
    },
    {
        "title": "Hoàn thành 3 bài học",
        "description": "Hoàn thành ba bài học trong ngày.",
        "frequency": "daily",
        "event_type": "lesson.completed",
        "target_count": 3,
        "reward_xp": 100,
        "reward_peak_wallet": 50,
    },
    {
        "title": "Hoàn thành bài thực hành",
        "description": "Vượt qua một bài code hoặc thực hành.",
        "frequency": "daily",
        "event_type": "code.completed",
        "target_count": 1,
        "reward_xp": 70,
        "reward_peak_wallet": 0,
    },
    {
        "title": "Điểm danh học tập",
        "description": "Điểm danh hằng ngày.",
        "frequency": "daily",
        "event_type": "daily_checkin.completed",
        "target_count": 1,
        "reward_xp": 20,
        "reward_peak_wallet": 0,
    },
]

DEFAULT_LEVELS = [
    {"level": 1, "xp_required": 0, "rewards_config": {}},
    {"level": 2, "xp_required": 100, "rewards_config": {"reward_peak": 25}},
    {"level": 3, "xp_required": 200, "rewards_config": {"reward_peak": 50}},
    {"level": 4, "xp_required": 300, "rewards_config": {"reward_peak": 75}},
    {"level": 5, "xp_required": 500, "rewards_config": {"reward_peak": 100}},
    {"level": 6, "xp_required": 750, "rewards_config": {"reward_peak": 125}},
    {"level": 7, "xp_required": 1000, "rewards_config": {"reward_peak": 150}},
]


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


async def _seed_default_missions_if_empty(db: AsyncSession) -> None:
    stmt = select(Missions.id).limit(1)
    result = await db.execute(stmt)
    if result.first() is not None:
        return

    now = _now()
    for item in DEFAULT_MISSIONS:
        db.add(
            Missions(
                title=item["title"],
                description=item["description"],
                frequency=item["frequency"],
                event_type=item["event_type"],
                target_count=item["target_count"],
                reward_xp=item["reward_xp"],
                reward_peak_wallet=item["reward_peak_wallet"],
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )
    await db.flush()


async def _seed_default_levels_if_empty(db: AsyncSession) -> None:
    stmt = select(LevelsConfig.level).limit(1)
    result = await db.execute(stmt)
    if result.first() is not None:
        return

    for item in DEFAULT_LEVELS:
        db.add(
            LevelsConfig(
                level=item["level"],
                xp_required=item["xp_required"],
                rewards_config=item["rewards_config"],
            )
        )
    await db.flush()


async def _backfill_today_activities() -> None:
    local_tz = ZoneInfo("Asia/Ho_Chi_Minh")
    today = datetime.datetime.now(local_tz).date()
    local_start = datetime.datetime.combine(today, datetime.time.min, tzinfo=local_tz)
    start_of_day = local_start.astimezone(datetime.timezone.utc)
    end_of_day = start_of_day + datetime.timedelta(days=1)

    async with AsyncSessionLocal() as db:
        stmt = (
            select(GamificationActivityLogs)
            .where(
                and_(
                    GamificationActivityLogs.created_at >= start_of_day,
                    GamificationActivityLogs.created_at < end_of_day,
                    GamificationActivityLogs.action_type.in_(
                        [
                            "lesson.completed",
                            "quiz.completed",
                            "code.completed",
                            "course.purchased",
                            "daily_checkin",
                        ]
                    ),
                )
            )
            .order_by(GamificationActivityLogs.created_at.asc())
        )
        result = await db.execute(stmt)
        activities = result.scalars().all()

    for activity in activities:
        event_name = (
            "daily_checkin.completed"
            if activity.action_type == "daily_checkin"
            else activity.action_type
        )
        await handle_mission_progress(
            BaseEvent(
                event_name=event_name,
                user_id=activity.user_id,
                source_type="activity_backfill",
                source_id=activity.source_event_id or activity.id,
                payload=activity.metadata_ or {},
                metadata={"backfilled": True},
            )
        )


def _cycle_date_for_mission(mission: Missions) -> datetime.date:
    today = datetime.date.today()
    if mission.frequency == "weekly":
        return today - datetime.timedelta(days=today.weekday())
    return today


async def _assign_active_missions_for_event(
    db: AsyncSession,
    user_id: uuid.UUID,
    event_name: str,
) -> None:
    stmt = select(Missions).where(
        and_(
            Missions.event_type == event_name,
            Missions.is_active.is_(True),
            Missions.deleted_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    missions = result.scalars().all()

    for mission in missions:
        cycle_date = _cycle_date_for_mission(mission)
        existing_stmt = select(UserMissions.id).where(
            and_(
                UserMissions.user_id == user_id,
                UserMissions.mission_id == mission.id,
                UserMissions.cycle_date == cycle_date,
            )
        )
        existing = await db.execute(existing_stmt)
        if existing.first() is not None:
            continue

        db.add(
            UserMissions(
                user_id=user_id,
                mission_id=mission.id,
                title=mission.title,
                description=mission.description,
                event_type=mission.event_type,
                target_count=mission.target_count,
                current_count=0,
                reward_xp=mission.reward_xp,
                reward_peak_wallet=mission.reward_peak_wallet,
                status="assigned",
                cycle_date=cycle_date,
                version=1,
                assigned_at=_now(),
            )
        )
    await db.flush()


async def _get_or_create_profile(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UserGamificationProfiles:
    profile = await db.get(UserGamificationProfiles, user_id)
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
        db.add(profile)
        await db.flush()
    return profile


async def _get_next_level_xp(
    db: AsyncSession,
    level: int,
) -> int:
    stmt = select(LevelsConfig).where(LevelsConfig.level == level + 1)
    result = await db.execute(stmt)
    next_level = result.scalar_one_or_none()
    if next_level:
        return next_level.xp_required
    return max(100, (level + 1) * 100)


async def _credit_peak_wallet(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: int,
    source: str,
    event_id: uuid.UUID,
    event_type: str,
    metadata: Optional[dict[str, Any]] = None,
) -> int:
    balance = await db.get(UserPeakBalances, user_id)
    if balance is None:
        balance = UserPeakBalances(user_id=user_id)
        db.add(balance)
        await db.flush()

    before_balance = balance.current_balance
    balance.current_balance += amount
    balance.total_earned += amount
    balance.version += 1
    balance.updated_at = _now()

    db.add(
        PeakTransactions(
            user_id=user_id,
            amount=amount,
            type="credit",
            before_balance=before_balance,
            after_balance=balance.current_balance,
            source=source,
            event_id=event_id,
            event_type=event_type,
            metadata_=metadata or {},
        )
    )
    await db.flush()
    return balance.current_balance


async def _award_xp(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: int,
) -> tuple[UserGamificationProfiles, int, int, int, Optional[int]]:
    profile = await _get_or_create_profile(db, user_id)
    previous_level = profile.level

    profile.current_xp += amount
    profile.total_xp += amount
    profile.version += 1
    profile.updated_at = _now()

    reward_peak = 0
    while True:
        stmt = select(LevelsConfig).where(LevelsConfig.level == profile.level + 1)
        result = await db.execute(stmt)
        next_level = result.scalar_one_or_none()
        if not next_level:
            break
        if profile.current_xp < next_level.xp_required:
            break

        profile.current_xp -= next_level.xp_required
        profile.level += 1

        rewards_config = next_level.rewards_config or {}
        reward_peak += int(
            rewards_config.get("reward_peak")
            or rewards_config.get("peak")
            or rewards_config.get("peak_wallet")
            or 0
        )

    if reward_peak > 0:
        await _credit_peak_wallet(
            db=db,
            user_id=user_id,
            amount=reward_peak,
            source="level_up",
            event_id=user_id,
            event_type="level.up",
            metadata={"previous_level": previous_level, "current_level": profile.level},
        )

    next_level_xp = await _get_next_level_xp(db, profile.level)
    leveled_reward = reward_peak if profile.level > previous_level else None
    return profile, previous_level, profile.level, next_level_xp, leveled_reward


async def _already_counted(
    db: AsyncSession,
    user_id: uuid.UUID,
    user_mission_id: uuid.UUID,
    source_id: uuid.UUID,
) -> bool:
    stmt = select(GamificationActivityLogs.id).where(
        and_(
            GamificationActivityLogs.user_id == user_id,
            GamificationActivityLogs.action_type == f"mission.progress.{user_mission_id}",
            GamificationActivityLogs.source_event_id == source_id,
        )
    )
    result = await db.execute(stmt)
    return result.first() is not None


async def handle_mission_progress(event: BaseEvent) -> None:
    logger.info(f"[MissionSubscriber] Received event: {event.event_name} for user: {event.user_id}")
    async with AsyncSessionLocal() as db:
        try:
            await _assign_active_missions_for_event(db, event.user_id, event.event_name)

            today = datetime.date.today()
            week_start = today - datetime.timedelta(days=today.weekday())
            stmt = (
                select(UserMissions)
                .where(
                    and_(
                        UserMissions.user_id == event.user_id,
                        UserMissions.event_type == event.event_name,
                        UserMissions.cycle_date.in_([today, week_start]),
                        UserMissions.status.in_(["assigned", "in_progress"]),
                    )
                )
                .with_for_update()
            )
            result = await db.execute(stmt)
            missions = result.scalars().all()
            completed_events: list[BaseEvent] = []
            xp_events: list[BaseEvent] = []
            level_events: list[BaseEvent] = []
            peak_events: list[BaseEvent] = []

            for mission in missions:
                if await _already_counted(db, event.user_id, mission.id, event.source_id):
                    continue

                mission.current_count = min(mission.target_count, mission.current_count + 1)
                mission.version += 1
                if mission.status == "assigned":
                    mission.status = "in_progress"

                db.add(
                    GamificationActivityLogs(
                        id=uuid.uuid4(),
                        user_id=event.user_id,
                        action_type=f"mission.progress.{mission.id}",
                        source_event_id=event.source_id,
                        metadata_={
                            "event_name": event.event_name,
                            "user_mission_id": str(mission.id),
                            "current_count": mission.current_count,
                            "target_count": mission.target_count,
                        },
                        risk_score=0.0,
                        is_suspicious=False,
                        created_at=_now(),
                    )
                )

                if mission.current_count < mission.target_count:
                    continue

                mission.status = "completed"
                mission.completed_at = _now()

                peak_balance: Optional[int] = None
                if mission.reward_peak_wallet > 0:
                    peak_balance = await _credit_peak_wallet(
                        db=db,
                        user_id=event.user_id,
                        amount=mission.reward_peak_wallet,
                        source="mission",
                        event_id=mission.id,
                        event_type="mission.completed",
                        metadata={"mission_name": mission.title},
                    )

                profile: Optional[UserGamificationProfiles] = None
                previous_level = 0
                next_level_xp = 0
                level_reward_peak: Optional[int] = None
                if mission.reward_xp > 0:
                    (
                        profile,
                        previous_level,
                        _current_level,
                        next_level_xp,
                        level_reward_peak,
                    ) = await _award_xp(db, event.user_id, mission.reward_xp)

                completed_events.append(
                    BaseEvent(
                        event_name="mission.completed",
                        user_id=event.user_id,
                        source_type="mission",
                        source_id=mission.id,
                        payload={
                            "mission_name": mission.title,
                            "reward_peak": mission.reward_peak_wallet,
                            "reward_xp": mission.reward_xp,
                        },
                    )
                )

                if mission.reward_xp > 0 and profile is not None:
                    xp_events.append(
                        BaseEvent(
                            event_name="xp.earned",
                            user_id=event.user_id,
                            source_type="mission",
                            source_id=mission.id,
                            payload={
                                "xp": mission.reward_xp,
                                "current_xp": profile.current_xp,
                                "next_level_xp": next_level_xp,
                            },
                        )
                    )

                    if profile.level > previous_level:
                        level_events.append(
                            BaseEvent(
                                event_name="level.up",
                                user_id=event.user_id,
                                source_type="mission",
                                source_id=mission.id,
                                payload={
                                    "previous_level": previous_level,
                                    "current_level": profile.level,
                                    "current_xp": profile.current_xp,
                                    "next_level_xp": next_level_xp,
                                    "reward_peak": level_reward_peak or 0,
                                },
                            )
                        )

                if mission.reward_peak_wallet > 0 and peak_balance is not None:
                    peak_events.append(
                        BaseEvent(
                            event_name="peak.earned",
                            user_id=event.user_id,
                            source_type="mission",
                            source_id=mission.id,
                            payload={
                                "amount": mission.reward_peak_wallet,
                                "balance": peak_balance,
                            },
                        )
                    )

            await db.commit()

            for outgoing in xp_events + level_events + peak_events + completed_events:
                await event_bus.publish(outgoing)

        except Exception as exc:
            await db.rollback()
            logger.exception(f"[MissionSubscriber] Failed to process event {event.event_name}: {exc}")


async def register_mission_subscribers() -> None:
    async with AsyncSessionLocal() as db:
        try:
            await _seed_default_missions_if_empty(db)
            await _seed_default_levels_if_empty(db)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.exception(f"[MissionSubscriber] Failed to seed default missions: {exc}")

    for name in MISSION_SOURCE_EVENTS:
        await event_bus.subscribe(name, handle_mission_progress)

    await _backfill_today_activities()

    logger.info("[MissionSubscriber] Registered all mission subscribers successfully.")
