from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import (
    User,
    UserGamificationProfiles,
    UserPeakBalances,
    UserStatistics,
)
from app.db.models.shop import ShopItemRow, UserEquipment
from app.schemas.gamification.leaderboard import (
    LeaderboardCategory,
    LeaderboardCategoryMetaDTO,
    LeaderboardEntryDTO,
    LeaderboardResponse,
    MyRankSummaryDTO,
)
from app.schemas.gamification.shop import Equipment
from app.services.gamification.shop_items import serialize_item

CATEGORY_META: dict[LeaderboardCategory, LeaderboardCategoryMetaDTO] = {
    "xp": LeaderboardCategoryMetaDTO(
        id="xp",
        label="Cấp độ & XP",
        tagline="Những ngôi sao tích lũy nhiều kinh nghiệm học tập nhất",
        unit="XP",
    ),
    "streak": LeaderboardCategoryMetaDTO(
        id="streak",
        label="Chuỗi ngày học",
        tagline="Bền bỉ duy trì ngọn lửa học tập qua từng ngày",
        unit="ngày",
    ),
    "coins": LeaderboardCategoryMetaDTO(
        id="coins",
        label="Kho Coin trắng",
        tagline="Tích lũy Coin trắng từ điểm danh, nhiệm vụ và học tập",
        unit="Coin trắng",
    ),
    "lessons": LeaderboardCategoryMetaDTO(
        id="lessons",
        label="Chăm chỉ học bài",
        tagline="Hoàn thành nhiều bài học nhất trên hành trình Mây Mây",
        unit="bài học",
    ),
    "quiz": LeaderboardCategoryMetaDTO(
        id="quiz",
        label="Cao thủ Thực chiến",
        tagline="Vượt qua nhiều bài trắc nghiệm và thử thách lập trình nhất",
        unit="thử thách",
    ),
}


def _format_study_minutes(seconds: int) -> str:
    minutes = max(0, int(seconds or 0)) // 60
    if minutes >= 60:
        hours, rem = divmod(minutes, 60)
        return f"{hours}g {rem}p học" if rem else f"{hours} giờ học"
    return f"{minutes} phút học"


class LeaderboardService:
    """Tổng hợp bảng xếp hạng đa hạng mục từ dữ liệu thực trong PostgreSQL."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_leaderboard(
        self,
        *,
        category: LeaderboardCategory = "xp",
        limit: int = 50,
        current_user_id: UUID | None = None,
    ) -> LeaderboardResponse:
        safe_limit = max(1, min(limit, 100))

        level_expr = func.coalesce(UserGamificationProfiles.level, 1)
        total_xp_expr = func.coalesce(UserGamificationProfiles.total_xp, 0)
        current_streak_expr = func.coalesce(UserGamificationProfiles.current_streak, 0)
        best_streak_expr = func.coalesce(UserGamificationProfiles.best_streak, 0)
        coins_earned_expr = func.coalesce(UserPeakBalances.total_earned, 0)
        coins_balance_expr = func.coalesce(UserPeakBalances.current_balance, 0)
        lessons_expr = func.coalesce(UserStatistics.total_lessons_completed, 0)
        study_sec_expr = func.coalesce(UserStatistics.total_study_time_seconds, 0)
        active_days_expr = func.coalesce(UserStatistics.total_active_days, 0)
        quizzes_expr = func.coalesce(UserStatistics.total_quizzes_passed, 0)
        code_expr = func.coalesce(UserStatistics.total_code_lessons_solved, 0)
        practice_expr = quizzes_expr + code_expr

        if category == "xp":
            order_by = (desc(total_xp_expr), desc(level_expr), desc(current_streak_expr), User.create_at.asc())
        elif category == "streak":
            order_by = (desc(current_streak_expr), desc(best_streak_expr), desc(total_xp_expr), User.create_at.asc())
        elif category == "coins":
            order_by = (desc(coins_earned_expr), desc(coins_balance_expr), desc(total_xp_expr), User.create_at.asc())
        elif category == "lessons":
            order_by = (desc(lessons_expr), desc(study_sec_expr), desc(active_days_expr), User.create_at.asc())
        else:  # quiz
            order_by = (desc(practice_expr), desc(quizzes_expr), desc(code_expr), User.create_at.asc())

        stmt = (
            select(
                User.id.label("user_id"),
                User.fullname.label("fullname"),
                User.avatar.label("avatar"),
                level_expr.label("level"),
                total_xp_expr.label("total_xp"),
                current_streak_expr.label("current_streak"),
                best_streak_expr.label("best_streak"),
                coins_earned_expr.label("coins_earned"),
                coins_balance_expr.label("coins_balance"),
                lessons_expr.label("lessons"),
                study_sec_expr.label("study_sec"),
                active_days_expr.label("active_days"),
                quizzes_expr.label("quizzes"),
                code_expr.label("code_solved"),
                practice_expr.label("practice_total"),
            )
            .outerjoin(UserGamificationProfiles, UserGamificationProfiles.user_id == User.id)
            .outerjoin(UserPeakBalances, UserPeakBalances.user_id == User.id)
            .outerjoin(UserStatistics, UserStatistics.user_id == User.id)
            .where(User.deleted_at.is_(None))
            .where((User.is_banned.is_(False)) | (User.is_banned.is_(None)))
            .order_by(*order_by)
        )

        rows = list((await self.db.execute(stmt)).mappings().all())
        total_participants = len(rows)

        if total_participants == 0:
            return LeaderboardResponse(
                category=category,
                meta=CATEGORY_META[category],
                total_participants=0,
                top_score=0,
                entries=[],
                me=None,
            )

        def _extract_metrics(row: dict) -> tuple[int, int, str]:
            if category == "xp":
                return int(row["total_xp"]), int(row["level"]), f"Cấp {int(row['level'])}"
            if category == "streak":
                best = int(row["best_streak"])
                return int(row["current_streak"]), best, f"Kỷ lục {best} ngày"
            if category == "coins":
                bal = int(row["coins_balance"])
                return int(row["coins_earned"]), bal, f"Đang giữ {bal:,}".replace(",", ".")
            if category == "lessons":
                sec = int(row["study_sec"])
                return int(row["lessons"]), sec, _format_study_minutes(sec)
            quizzes = int(row["quizzes"])
            code_solved = int(row["code_solved"])
            return int(row["practice_total"]), quizzes, f"{quizzes} quiz · {code_solved} code"

        top_rows = rows[:safe_limit]
        top_user_ids = [row["user_id"] for row in top_rows]
        equipment_map = await self._load_equipment_batch(top_user_ids)

        entries: list[LeaderboardEntryDTO] = []
        for idx, row in enumerate(top_rows, start=1):
            score, sec_val, sec_label = _extract_metrics(row)
            uid: UUID = row["user_id"]
            entries.append(
                LeaderboardEntryDTO(
                    rank=idx,
                    user_id=uid,
                    fullname=(row["fullname"] or "Học viên Mây Mây").strip(),
                    avatar=row["avatar"],
                    level=int(row["level"]),
                    score=score,
                    secondary_value=sec_val,
                    secondary_label=sec_label,
                    current_streak=int(row["current_streak"]),
                    total_xp=int(row["total_xp"]),
                    equipment=equipment_map.get(uid, Equipment()),
                    is_me=bool(current_user_id and uid == current_user_id),
                )
            )

        top_score = entries[0].score if entries else 0

        me_summary: MyRankSummaryDTO | None = None
        if current_user_id is not None:
            for idx, row in enumerate(rows, start=1):
                if row["user_id"] == current_user_id:
                    my_score, my_sec_val, my_sec_label = _extract_metrics(row)
                    next_gap: int | None = None
                    next_name: str | None = None
                    if idx > 1:
                        prev_row = rows[idx - 2]
                        prev_score, _, _ = _extract_metrics(prev_row)
                        next_gap = max(1, prev_score - my_score)
                        next_name = (prev_row["fullname"] or "Học viên phía trên").strip()
                    top_percent = round((idx / total_participants) * 100.0, 1)
                    me_summary = MyRankSummaryDTO(
                        rank=idx,
                        total_participants=total_participants,
                        top_percent=top_percent,
                        score=my_score,
                        secondary_value=my_sec_val,
                        secondary_label=my_sec_label,
                        level=int(row["level"]),
                        next_rank_gap=next_gap,
                        next_rank_user_name=next_name,
                    )
                    break

        return LeaderboardResponse(
            category=category,
            meta=CATEGORY_META[category],
            total_participants=total_participants,
            top_score=top_score,
            entries=entries,
            me=me_summary,
        )

    async def _load_equipment_batch(self, user_ids: list[UUID]) -> dict[UUID, Equipment]:
        if not user_ids:
            return {}
        stmt = (
            select(UserEquipment.user_id, ShopItemRow)
            .join(ShopItemRow, ShopItemRow.id == UserEquipment.item_id)
            .where(UserEquipment.user_id.in_(user_ids))
        )
        rows = (await self.db.execute(stmt)).all()
        grouped: dict[UUID, dict[str, object]] = defaultdict(dict)
        for uid, item_row in rows:
            grouped[uid][item_row.kind] = serialize_item(item_row, owned=True, equipped=True)
        return {uid: Equipment(**slots) for uid, slots in grouped.items()}
