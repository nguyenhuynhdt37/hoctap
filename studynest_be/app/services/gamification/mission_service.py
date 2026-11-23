from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from urllib.parse import quote
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from app.core.event_bus.base import BaseEvent
from app.core.event_bus.redis_bus import event_bus
from app.core.settings import settings
from app.db.models.database import (
    CourseEnrollments, Courses, MissionTemplates, RewardGrants, RewardInstances, Rewards,
    UserMissions, UserRewardInventory,
)
from app.repositories.gamification.mission_evidence import CourseEvidence, load_mission_evidence
from app.schemas.gamification.missions import (
    ClaimResult, CouponOffer, CourseMissions, CourseSummary, GrantedRewards, InventoryCoupon,
    Mission, MissionProgress, MissionReward, MissionsOverview, RewardInventory, SectionSummary,
)
from app.services.gamification.mission_clock import VIETNAM, daily_window
from app.services.gamification.profile_service import GamificationProfileService


def serialize_mission(
    row: UserMissions,
    course: Courses | None = None,
    evidence: CourseEvidence | None = None,
) -> Mission:
    section = evidence.sections.get(row.section_id) if evidence and row.section_id else None
    if course:
        href = f"/learning/{quote(course.slug, safe='')}"
        if section:
            quiz_id = evidence.first_quizzes.get(section.id) if row.template == "chapter.quiz_pass" else None
            href += f"?lesson_id={quiz_id}" if quiz_id else f"?section_id={section.id}"
    elif row.template == "daily_checkin.completed":
        href = "/#diem-danh-hom-nay"
    else:
        href = "/my-learning"

    offer = None
    if (row.status != "claimed" and settings.MISSION_COUPON_REWARDS_ENABLED
            and row.coupon_max_percent and row.coupon_valid_days):
        offer = CouponOffer(max_percent=row.coupon_max_percent, valid_days=row.coupon_valid_days)
    return Mission(
        id=row.id, scope=row.scope, template=row.template, title=row.title,
        description=row.description or "",
        course=CourseSummary.model_validate(course, from_attributes=True) if course else None,
        section=SectionSummary.model_validate(section, from_attributes=True) if section else None,
        progress=MissionProgress(current=row.current_count, target=row.target_count),
        status=row.status,
        reward=MissionReward(xp=row.reward_xp, peak=row.reward_peak_wallet, coupon=offer),
        expires_at=(
            datetime.combine(row.cycle_date + timedelta(days=1), time.min, tzinfo=VIETNAM)
            if row.scope == "daily" else None
        ),
        completed_at=row.completed_at, claimed_at=row.claimed_at,
        href=href,
    )


def assignment_values(
    user_id: UUID, template: MissionTemplates, day: date, *, target: int,
    course_id: UUID | None = None, section_id: UUID | None = None,
) -> dict:
    return {
        "user_id": user_id, "scope": template.scope, "template": template.template,
        "template_key": template.key, "event_type": template.template,
        "title": template.title, "description": template.description, "target_count": target,
        "cycle_date": day, "course_id": course_id, "section_id": section_id,
        "quiz_pass_percent": template.quiz_pass_percent,
        "reward_xp": template.reward_xp * (target if template.template == "chapter.complete" else 1),
        "reward_peak_wallet": template.reward_peak, "coupon_max_percent": template.coupon_max_percent,
        "coupon_valid_days": template.coupon_valid_days,
    }


def apply_progress(row: UserMissions, current: int, now: datetime) -> bool:
    if row.status in ("completed", "claimed"):
        return False
    current = min(current, row.target_count)
    status = "completed" if current >= row.target_count else "in_progress" if current else "assigned"
    if current == row.current_count and status == row.status:
        return False
    row.current_count = current
    row.status = status
    row.version += 1
    if status == "completed":
        row.completed_at = now
        return True
    return False


def course_progress(mission: UserMissions, evidence: CourseEvidence, day: date) -> int:
    if mission.template == "chapter.complete":
        return evidence.completed_counts[mission.section_id]
    if mission.template == "chapter.quiz_pass":
        correct, total = evidence.best_quiz.get(mission.section_id, (0, 0))
        return int(total > 0 and correct * 100 >= total * mission.quiz_pass_percent)
    if mission.template == "course.complete":
        return evidence.completed_counts.total()
    return evidence.weekly_progress(day, mission.target_count)


@dataclass
class MissionRefresh:
    courses: dict[UUID, Courses]
    evidence: dict[UUID, CourseEvidence]
    daily: list[UserMissions]
    long_term: dict[UUID, list[UserMissions]]
    resets_at: datetime
    completed: list[UserMissions]


class MissionService:
    def __init__(self, db: AsyncSession, *, now: datetime | None = None) -> None:
        self.db = db
        self.now = now
        self.profiles = GamificationProfileService(db)

    async def _lock_user(self, user_id: UUID) -> datetime:
        # Serializes assignment, refresh and claim for one user across all workers.
        await self.db.execute(
            select(func.pg_advisory_xact_lock(func.hashtextextended(f"missions:{user_id}", 0)))
        )
        return self.now or datetime.now(UTC)

    async def _active_courses(self, user_id: UUID, course_id: UUID | None = None) -> dict[UUID, Courses]:
        stmt = (
            select(Courses).options(load_only(Courses.id, Courses.title, Courses.slug, Courses.thumbnail_url))
            .join(CourseEnrollments, CourseEnrollments.course_id == Courses.id)
            .where(CourseEnrollments.user_id == user_id, CourseEnrollments.status == "active",
                   Courses.deleted_at.is_(None))
            .order_by(Courses.id)
            .with_for_update(read=True, of=CourseEnrollments)
        )
        if course_id is not None:
            stmt = stmt.where(Courses.id == course_id)
        return {course.id: course for course in await self.db.scalars(stmt)}

    async def _refresh(
        self, user_id: UUID, now: datetime, *, purchased_course_id: UUID | None = None,
    ) -> MissionRefresh:
        day, start, resets_at = daily_window(now)
        courses = await self._active_courses(user_id, purchased_course_id)
        evidence, daily_counts = await load_mission_evidence(self.db, user_id, list(courses), day, start, now)
        course_rows = and_(UserMissions.scope == "course", UserMissions.course_id.in_(list(courses)))
        scope_filter = course_rows
        if purchased_course_id is None:
            scope_filter = or_(
                course_rows, and_(UserMissions.scope == "daily", UserMissions.cycle_date == day),
            )
        rows = list(await self.db.scalars(
            select(UserMissions).where(UserMissions.user_id == user_id, scope_filter)
            .order_by(UserMissions.template_key, UserMissions.section_id, UserMissions.id)
        ))
        assigned = {
            (row.template_key if row.scope == "daily" else row.template, row.course_id, row.section_id)
            for row in rows
        }

        templates = await self.db.scalars(select(MissionTemplates).where(MissionTemplates.is_active.is_(True))
                                          .order_by(MissionTemplates.key))
        missing = []
        for template in templates:
            if template.scope == "daily":
                if purchased_course_id is None and (template.key, None, None) not in assigned:
                    missing.append(assignment_values(user_id, template, day, target=template.target_count))
                continue
            for course_id, course in evidence.items():
                if template.template.startswith("chapter."):
                    for section_id in course.sections:
                        key = (template.template, course_id, section_id)
                        lesson_count = course.lesson_counts[section_id]
                        if key in assigned or not lesson_count:
                            continue
                        if template.template == "chapter.quiz_pass" and section_id not in course.first_quizzes:
                            continue
                        target = lesson_count if template.template == "chapter.complete" else 1
                        missing.append(assignment_values(
                            user_id, template, day, target=target, course_id=course_id, section_id=section_id,
                        ))
                elif (template.template, course_id, None) not in assigned:
                    target = (max(1, course.lesson_counts.total()) if template.template == "course.complete"
                              else template.target_count)
                    missing.append(assignment_values(user_id, template, day, target=target, course_id=course_id))

        # Limit SQL parameters when backfilling a large library.
        for offset in range(0, len(missing), 500):
            rows.extend(await self.db.scalars(
                insert(UserMissions).values(missing[offset:offset + 500])
                .on_conflict_do_nothing().returning(UserMissions)
            ))

        daily = []
        long_term = defaultdict(list)
        completed = []
        for row in rows:
            if row.scope == "daily":
                daily.append(row)
                current = daily_counts[row.template]
            else:
                course = evidence[row.course_id]
                if row.section_id is not None and row.section_id not in course.sections:
                    continue
                long_term[row.course_id].append(row)
                if row.status in ("completed", "claimed"):
                    continue
                current = course_progress(row, course, day)
            if apply_progress(row, current, now):
                completed.append(row)
        return MissionRefresh(courses, evidence, daily, long_term, resets_at, completed)

    async def overview(self, user_id: UUID) -> MissionsOverview:
        now = await self._lock_user(user_id)
        state = await self._refresh(user_id, now)
        groups = []
        for course_id, course in state.courses.items():
            evidence = state.evidence[course_id]
            progress_percent = round(100 * evidence.completed_counts.total() / max(1, evidence.lesson_counts.total()), 2)
            groups.append(CourseMissions(
                course=CourseSummary.model_validate(course, from_attributes=True),
                progress_percent=progress_percent,
                missions=[serialize_mission(row, course, evidence) for row in state.long_term[course_id]],
            ))
        profile = await self.profiles.backfill_levels(user_id)
        response = MissionsOverview(
            xp=await self.profiles.xp_state(user_id, profile=profile), daily=[serialize_mission(row) for row in state.daily],
            daily_resets_at=state.resets_at,
            long_term=groups,
        )
        await self.db.commit()
        return response

    async def refresh_from_event(self, event: BaseEvent) -> list[BaseEvent]:
        user_id = event.user_id
        now = await self._lock_user(user_id)
        course_id = event.source_id if event.event_name == "course.purchased" else None
        state = await self._refresh(user_id, now, purchased_course_id=course_id)
        events = [
            BaseEvent(
                event_name="mission.completed", user_id=user_id, source_type="mission", source_id=row.id,
                payload={"mission_name": row.title, "reward_peak": row.reward_peak_wallet,
                         "reward_xp": row.reward_xp},
            )
            for row in state.completed
        ]
        await self.db.commit()
        return events

    async def claim(self, user_id: UUID, mission_id: UUID) -> ClaimResult:
        now = await self._lock_user(user_id)
        row = await self.db.scalar(select(UserMissions).where(
            UserMissions.id == mission_id, UserMissions.user_id == user_id, UserMissions.scope.is_not(None),
        ).with_for_update())
        if row is None:
            raise HTTPException(404, "Không tìm thấy nhiệm vụ.")
        if row.claim_result is not None:
            response = ClaimResult.model_validate(row.claim_result)
            await self.db.commit()
            return response

        day, start, _ = daily_window(now)
        course = None
        course_evidence = None
        if row.scope == "course":
            course = (await self._active_courses(user_id, row.course_id)).get(row.course_id)
            if course is None:
                raise HTTPException(404, "Không tìm thấy nhiệm vụ trong khóa học bạn đang sở hữu.")
        elif row.cycle_date != day:
            raise HTTPException(409, "Nhiệm vụ đã hết hạn nhận thưởng.")

        if course or row.status != "completed":
            evidence, daily = await load_mission_evidence(
                self.db, user_id, [course.id] if course else list(await self._active_courses(user_id)),
                day, start, now,
            )
            if course:
                course_evidence = evidence[course.id]
                if row.section_id is not None and row.section_id not in course_evidence.sections:
                    raise HTTPException(404, "Không tìm thấy chương của nhiệm vụ.")
                current = course_progress(row, course_evidence, day)
            else:
                current = daily[row.template]
            apply_progress(row, current, now)
        if row.status != "completed":
            raise HTTPException(409, "Bạn chưa hoàn thành nhiệm vụ.")

        profile, level_up = None, None
        if row.reward_xp:
            profile, level_up = await self.profiles.award_xp(user_id, row.id, row.reward_xp)
        for kind, amount in (("xp", row.reward_xp), ("peak", row.reward_peak_wallet)):
            if amount:
                self.db.add(RewardGrants(user_id=user_id, mission_id=row.id, reward_kind=kind, amount=amount))
        if row.reward_peak_wallet:
            await self.profiles.award_peak(user_id, row.id, row.reward_peak_wallet)
        row.status = "claimed"
        row.claimed_at = now
        row.version += 1
        result = ClaimResult(
            mission=serialize_mission(row, course, course_evidence),
            granted=GrantedRewards(xp=row.reward_xp, peak=row.reward_peak_wallet, coupon=None),
            xp=await self.profiles.xp_state(user_id, profile=profile),
            level_up=level_up,
        )
        row.claim_result = result.model_dump(mode="json", by_alias=True)
        await self.db.commit()
        await self._publish_claim(user_id, result)
        return result

    async def _publish_claim(self, user_id: UUID, result: ClaimResult) -> None:
        state, level_up = result.xp, result.level_up
        updates = []
        if result.granted.xp:
            updates.append(("xp.earned", {"xp": result.granted.xp, "current_xp": state.current_xp,
                                          "next_level_xp": state.required_xp}))
        if level_up:
            updates.append(("level.up", {"previous_level": level_up.from_level, "current_level": level_up.to,
                                         "current_xp": state.current_xp, "next_level_xp": state.required_xp,
                                         "reward_peak": level_up.peak_bonus}))
        if amount := result.granted.peak + (level_up.peak_bonus if level_up else 0):
            updates.append(("peak.earned", {"amount": amount, "balance": state.peak_balance}))
        for name, payload in updates:
            await event_bus.publish(BaseEvent(
                event_name=name, user_id=user_id, source_type="mission", source_id=result.mission.id,
                payload=payload,
            ))

    async def inventory(self, user_id: UUID) -> RewardInventory:
        await self.profiles.backfill_levels(user_id)
        expiry = func.coalesce(UserRewardInventory.expires_at, RewardInstances.expires_at)
        rows = await self.db.execute(
            select(RewardInstances.id, Rewards.title, RewardInstances.code_masked, RewardInstances.max_percent,
                   expiry, UserRewardInventory.status, RewardInstances.status, UserRewardInventory.used_at)
            .select_from(UserRewardInventory)
            .join(RewardInstances, RewardInstances.id == UserRewardInventory.reward_instance_id)
            .join(Rewards, Rewards.id == RewardInstances.reward_id)
            .where(UserRewardInventory.user_id == user_id, UserRewardInventory.reward_type == "coupon",
                   RewardInstances.max_percent.is_not(None), expiry.is_not(None))
            .order_by(expiry, RewardInstances.id)
        )
        now = self.now or datetime.now(UTC)
        coupons = []
        for coupon_id, title, masked, max_percent, expires_at, owned_status, code_status, used_at in rows:
            statuses = {owned_status, code_status}
            if "revoked" in statuses:
                status = "revoked"
            elif used_at or "used" in statuses:
                status = "used"
            elif "expired" in statuses or expires_at <= now:
                status = "expired"
            else:
                status = "available"
            coupons.append(InventoryCoupon(
                id=coupon_id, title=title, code_masked=masked or "••••", max_percent=max_percent,
                expires_at=expires_at, status=status,
            ))
        result = RewardInventory(peak_balance=await self.profiles.peak_balance(user_id), coupons=coupons)
        await self.db.commit()
        return result
