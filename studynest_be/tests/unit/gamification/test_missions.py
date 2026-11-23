from datetime import UTC, datetime
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.services.gamification.mission_clock import daily_window


def test_daily_cycle_crosses_midnight_in_vietnam():
    before = daily_window(datetime(2026, 11, 22, 16, 59, tzinfo=UTC))
    after = daily_window(datetime(2026, 11, 22, 17, 0, tzinfo=UTC))
    assert before[0].isoformat() == "2026-11-22"
    assert before[2].isoformat() == "2026-11-23T00:00:00+07:00"
    assert after[0].isoformat() == "2026-11-23"
    assert after[1] == before[2]
    assert after[2].isoformat() == "2026-11-24T00:00:00+07:00"


def test_missions_migration_follows_dpop_head():
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[3] / "alembic"))
    revisions = ScriptDirectory.from_config(config)
    assert "af90vw234s567" in {rev.revision for rev in revisions.walk_revisions()}
    assert revisions.get_revision("af90vw234s567").down_revision == "ae89uv123r456"
    assert revisions.get_revision("ae89uv123r456").down_revision == "ad78tu012q345"


def test_chapter_quiz_pass_uses_exact_server_score_and_snapshotted_threshold():
    from uuid import uuid4

    from app.db.models.database import UserMissions
    from app.repositories.gamification.mission_evidence import CourseEvidence
    from app.services.gamification.mission_service import course_progress

    section = uuid4()
    mission = UserMissions(template="chapter.quiz_pass", section_id=section, quiz_pass_percent=70)
    evidence = CourseEvidence(best_quiz={section: (69, 100)})
    now = datetime(2026, 11, 23, tzinfo=UTC)
    assert course_progress(mission, evidence, now.date()) == 0
    evidence.best_quiz[section] = (7, 10)
    assert course_progress(mission, evidence, now.date()) == 1


def test_weekly_streak_detects_a_completed_week_after_rollover():
    from datetime import date

    from app.repositories.gamification.mission_evidence import CourseEvidence

    evidence = CourseEvidence(study_days={date(2026, 11, day) for day in (16, 17, 23)})
    assert evidence.weekly_progress(date(2026, 11, 23), target=3) == 1
    evidence.study_days.add(date(2026, 11, 22))
    assert evidence.weekly_progress(date(2026, 11, 23), target=3) == 3


def test_completed_progress_keeps_original_target_and_timestamp():
    from app.db.models.database import UserMissions
    from app.services.gamification.mission_service import apply_progress

    row = UserMissions(status="assigned", target_count=2, current_count=0, version=1)
    now = datetime(2026, 11, 23, tzinfo=UTC)
    assert apply_progress(row, 2, now)
    assert not apply_progress(row, 1, now)
    assert (row.status, row.current_count, row.target_count, row.completed_at) == ("completed", 2, 2, now)


async def test_mission_endpoints_require_authentication():
    from uuid import uuid4

    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for method, path in (
            ("GET", "missions"), ("POST", f"missions/{uuid4()}/claim"), ("GET", "rewards/inventory"),
        ):
            res = await client.request(method, "/api/v1/gamification/" + path)
            assert res.status_code == 401


async def test_xp_award_crosses_configured_and_fallback_levels():
    from unittest.mock import AsyncMock, Mock
    from uuid import uuid4

    from app.db.models.database import LevelsConfig, UserGamificationProfiles
    from app.services.gamification.profile_service import GamificationProfileService

    user_id, mission_id = uuid4(), uuid4()
    profile = UserGamificationProfiles(user_id=user_id, level=19, current_xp=0, total_xp=9000, version=1)
    db = AsyncMock()
    db.get.return_value = profile
    db.scalars.return_value = [LevelsConfig(level=20, xp_required=1700, rewards_config={"reward_peak": 40})]
    db.add = Mock()

    amount = 1700 + 1750 + 1800 + 1
    updated, level_up = await GamificationProfileService(db).award_xp(user_id, mission_id, amount)
    assert (updated.level, updated.current_xp, updated.total_xp) == (22, 1, 9000 + amount)
    assert level_up.model_dump(by_alias=True) == {"from": 19, "to": 22, "peak_bonus": 40}
    transaction = db.add.call_args.args[0]
    assert (transaction.event_id, transaction.before_xp, transaction.after_xp) == (mission_id, 9000, 9000 + amount)
