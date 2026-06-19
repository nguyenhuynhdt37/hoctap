"""add_gamification_module

Revision ID: dfcf126dad17
Revises: 
Create Date: 2026-06-18 08:06:21.966959

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dfcf126dad17'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. seasons
    op.create_table('seasons',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name='seasons_pkey'),
        sa.UniqueConstraint('code', name='uq_seasons_code'),
        schema='public'
    )
    op.create_index('idx_seasons_active_dates', 'seasons', ['is_active', 'start_date', 'end_date'], unique=False, schema='public')

    # 2. levels_config
    op.create_table('levels_config',
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('xp_required', sa.Integer(), nullable=False),
        sa.Column('rewards_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint('level > 0', name='chk_levels_config_level'),
        sa.CheckConstraint('xp_required >= 0', name='chk_levels_config_xp'),
        sa.PrimaryKeyConstraint('level', name='levels_config_pkey'),
        schema='public'
    )

    # 3. rank_config
    op.create_table('rank_config',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('min_score', sa.Integer(), nullable=False),
        sa.Column('max_score', sa.Integer(), nullable=False),
        sa.Column('icon_url', sa.Text(), nullable=False),
        sa.Column('color_hex', sa.String(length=7), nullable=False),
        sa.Column('priority', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('min_score >= 0 AND max_score >= min_score', name='chk_rank_config_score'),
        sa.PrimaryKeyConstraint('id', name='rank_config_pkey'),
        sa.UniqueConstraint('name', name='uq_rank_config_name'),
        schema='public'
    )

    # 4. badges
    op.create_table('badges',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('badge_type', sa.String(length=50), server_default=sa.text("'event'::character varying"), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_id', sa.Uuid(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name='badges_pkey'),
        schema='public'
    )

    # 5. mystery_boxes
    op.create_table('mystery_boxes',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id', name='mystery_boxes_pkey'),
        sa.UniqueConstraint('code', name='uq_mystery_boxes_code'),
        schema='public'
    )

    # 6. rewards
    op.create_table('rewards',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('cost_peak', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('reward_type', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reward_amount', sa.Integer(), nullable=True),
        sa.Column('target_badge_id', sa.Uuid(), nullable=True),
        sa.Column('reward_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('stock_quantity', sa.Integer(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('cost_peak >= 0', name='chk_rewards_cost'),
        sa.CheckConstraint('stock_quantity IS NULL OR stock_quantity >= 0', name='chk_rewards_stock'),
        sa.ForeignKeyConstraint(['target_badge_id'], ['public.badges.id'], name='fk_rewards_badge_id', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name='rewards_pkey'),
        schema='public'
    )

    # 7. reward_instances
    op.create_table('reward_instances',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('reward_id', sa.Uuid(), nullable=False),
        sa.Column('code_encrypted', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default=sa.text("'available'::character varying"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['reward_id'], ['public.rewards.id'], name='fk_reward_instances_reward_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='reward_instances_pkey'),
        schema='public'
    )
    op.create_index('idx_reward_instances_lookup', 'reward_instances', ['reward_id', 'status'], unique=False, schema='public')

    # 8. loot_tables
    op.create_table('loot_tables',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('box_id', sa.Uuid(), nullable=False),
        sa.Column('reward_type', sa.String(length=50), nullable=False),
        sa.Column('probability', sa.Numeric(precision=5, scale=4), server_default=sa.text('0.0000'), nullable=False),
        sa.Column('quantity', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('reward_amount', sa.Integer(), nullable=True),
        sa.Column('target_badge_id', sa.Uuid(), nullable=True),
        sa.Column('reward_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint('probability >= 0.0000 AND probability <= 1.0000', name='chk_loot_tables_probability'),
        sa.ForeignKeyConstraint(['box_id'], ['public.mystery_boxes.id'], name='fk_loot_tables_box_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_badge_id'], ['public.badges.id'], name='fk_loot_tables_badge_id', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name='loot_tables_pkey'),
        schema='public'
    )

    # 9. daily_checkin_events
    op.create_table('daily_checkin_events',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('cycle_days', sa.Integer(), server_default=sa.text('7'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('season_id', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['season_id'], ['public.seasons.id'], name='fk_daily_checkin_events_season_id', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='daily_checkin_events_pkey'),
        sa.UniqueConstraint('code', name='uq_daily_checkin_events_code'),
        schema='public'
    )

    # 10. daily_checkin_rewards_config
    op.create_table('daily_checkin_rewards_config',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('event_id', sa.Uuid(), nullable=False),
        sa.Column('day_number', sa.Integer(), nullable=False),
        sa.Column('reward_type', sa.String(length=50), nullable=False),
        sa.Column('reward_amount', sa.Integer(), nullable=True),
        sa.Column('target_box_id', sa.Uuid(), nullable=True),
        sa.Column('reward_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint('day_number > 0', name='chk_daily_checkin_rewards_day'),
        sa.ForeignKeyConstraint(['event_id'], ['public.daily_checkin_events.id'], name='fk_daily_checkin_rewards_event_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_box_id'], ['public.mystery_boxes.id'], name='fk_daily_checkin_rewards_box_id', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name='daily_checkin_rewards_config_pkey'),
        sa.UniqueConstraint('event_id', 'day_number', name='uq_daily_checkin_rewards_event_day'),
        schema='public'
    )

    # 11. missions
    op.create_table('missions',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('frequency', sa.String(length=50), server_default=sa.text("'daily'::character varying"), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('target_count', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('reward_xp', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('reward_peak_wallet', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('season_id', sa.Uuid(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("frequency::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying]::text[])", name='chk_missions_frequency'),
        sa.ForeignKeyConstraint(['season_id'], ['public.seasons.id'], name='fk_missions_season_id', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='missions_pkey'),
        schema='public'
    )

    # 12. quests
    op.create_table('quests',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('quest_type', sa.String(length=50), server_default=sa.text("'main'::character varying"), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('season_id', sa.Uuid(), nullable=True),
        sa.CheckConstraint("quest_type::text = ANY (ARRAY['main'::character varying, 'side'::character varying, 'event'::character varying]::text[])", name='chk_quests_type'),
        sa.ForeignKeyConstraint(['season_id'], ['public.seasons.id'], name='fk_quests_season_id', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='quests_pkey'),
        schema='public'
    )

    # 13. quest_chapters
    op.create_table('quest_chapters',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('quest_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('order_index', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.ForeignKeyConstraint(['quest_id'], ['public.quests.id'], name='fk_quest_chapters_quest_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='quest_chapters_pkey'),
        sa.UniqueConstraint('quest_id', 'order_index', name='uq_quest_chapters_quest_order'),
        schema='public'
    )

    # 14. quest_steps
    op.create_table('quest_steps',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('chapter_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('order_index', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('target_count', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('is_optional', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('parent_step_id', sa.Uuid(), nullable=True),
        sa.Column('branch_group', sa.String(length=50), nullable=True),
        sa.Column('criteria_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['chapter_id'], ['public.quest_chapters.id'], name='fk_quest_steps_chapter_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_step_id'], ['public.quest_steps.id'], name='fk_quest_steps_parent_id', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='quest_steps_pkey'),
        schema='public'
    )
    op.create_index('idx_quest_steps_parent', 'quest_steps', ['parent_step_id'], unique=False, schema='public')

    # 15. quest_rewards
    op.create_table('quest_rewards',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('reward_type', sa.String(length=50), nullable=False),
        sa.Column('quest_id', sa.Uuid(), nullable=True),
        sa.Column('chapter_id', sa.Uuid(), nullable=True),
        sa.Column('reward_amount', sa.Integer(), nullable=True),
        sa.Column('target_badge_id', sa.Uuid(), nullable=True),
        sa.Column('reward_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint('quest_id IS NOT NULL AND chapter_id IS NULL OR quest_id IS NULL AND chapter_id IS NOT NULL', name='chk_quest_rewards_exclusivity'),
        sa.CheckConstraint('reward_amount IS NULL OR reward_amount >= 0', name='chk_quest_rewards_amount'),
        sa.ForeignKeyConstraint(['chapter_id'], ['public.quest_chapters.id'], name='fk_quest_rewards_chapter_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['quest_id'], ['public.quests.id'], name='fk_quest_rewards_quest_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_badge_id'], ['public.badges.id'], name='fk_quest_rewards_badge_id', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name='quest_rewards_pkey'),
        schema='public'
    )

    # 16. achievements
    op.create_table('achievements',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('criteria_type', sa.String(length=100), nullable=False),
        sa.Column('criteria_value', sa.Integer(), nullable=False),
        sa.Column('reward_type', sa.String(length=50), nullable=False),
        sa.Column('is_hidden', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_secret', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_repeatable', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('max_repeats', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reward_amount', sa.Integer(), nullable=True),
        sa.Column('target_badge_id', sa.Uuid(), nullable=True),
        sa.Column('target_box_id', sa.Uuid(), nullable=True),
        sa.Column('reward_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('season_id', sa.Uuid(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('max_repeats >= 1', name='chk_achievements_repeats'),
        sa.ForeignKeyConstraint(['season_id'], ['public.seasons.id'], name='fk_achievements_season_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['target_badge_id'], ['public.badges.id'], name='fk_achievements_badge_id', ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['target_box_id'], ['public.mystery_boxes.id'], name='fk_achievements_box_id', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name='achievements_pkey'),
        schema='public'
    )

    # 17. user_gamification_profiles
    op.create_table('user_gamification_profiles',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('level', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('current_xp', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_xp', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_peak_score', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('current_streak', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('best_streak', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('streak_freezes', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('version', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('current_rank_id', sa.Uuid(), nullable=True),
        sa.Column('last_active_date', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['current_rank_id'], ['public.rank_config.id'], name='fk_user_gamification_profiles_rank_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_gamification_profiles_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', name='user_gamification_profiles_pkey'),
        schema='public'
    )

    # 18. user_peak_balances
    op.create_table('user_peak_balances',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('current_balance', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_earned', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_spent', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('version', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('current_balance >= 0', name='chk_user_peak_balances_positive'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_peak_balances_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', name='user_peak_balances_pkey'),
        schema='public'
    )

    # 19. user_checkins
    op.create_table('user_checkins',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('event_id', sa.Uuid(), nullable=False),
        sa.Column('checkin_date', sa.Date(), nullable=False),
        sa.Column('consecutive_day', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('reward_claimed', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['public.daily_checkin_events.id'], name='fk_user_checkins_event_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_checkins_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='user_checkins_pkey'),
        sa.UniqueConstraint('user_id', 'event_id', 'checkin_date', name='uq_user_checkins_date'),
        schema='public'
    )
    op.create_index('idx_user_checkins_user_date', 'user_checkins', ['user_id', 'checkin_date'], unique=False, schema='public')

    # 20. user_missions
    op.create_table('user_missions',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('mission_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('target_count', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('current_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('reward_xp', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('reward_peak_wallet', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('status', sa.String(length=50), server_default=sa.text("'assigned'::character varying"), nullable=False),
        sa.Column('cycle_date', sa.Date(), nullable=False),
        sa.Column('version', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['mission_id'], ['public.missions.id'], name='fk_user_missions_mission_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_missions_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='user_missions_pkey'),
        sa.UniqueConstraint('user_id', 'mission_id', 'cycle_date', name='uq_user_missions_cycle'),
        schema='public'
    )
    op.create_index('idx_user_missions_status', 'user_missions', ['user_id', 'status', 'cycle_date'], unique=False, schema='public')

    # 21. user_quest_progress
    op.create_table('user_quest_progress',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('step_id', sa.Uuid(), nullable=False),
        sa.Column('current_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('status', sa.String(length=50), server_default=sa.text("'in_progress'::character varying"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['step_id'], ['public.quest_steps.id'], name='fk_user_quest_progress_step_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_quest_progress_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='user_quest_progress_pkey'),
        sa.UniqueConstraint('user_id', 'step_id', name='uq_user_quest_progress_step'),
        schema='public'
    )

    # 22. user_reward_inventory
    op.create_table('user_reward_inventory',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('reward_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), server_default=sa.text("'active'::character varying"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reward_id', sa.Uuid(), nullable=True),
        sa.Column('reward_instance_id', sa.Uuid(), nullable=True),
        sa.Column('reward_amount', sa.Integer(), nullable=True),
        sa.Column('inventory_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['reward_id'], ['public.rewards.id'], name='fk_user_reward_inventory_reward_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reward_instance_id'], ['public.reward_instances.id'], name='fk_user_reward_inventory_instance_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_reward_inventory_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='user_reward_inventory_pkey'),
        schema='public'
    )

    # 23. reward_redemptions
    op.create_table('reward_redemptions',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('reward_id', sa.Uuid(), nullable=False),
        sa.Column('cost_peak', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default=sa.text("'pending'::character varying"), nullable=False),
        sa.Column('delivery_status', sa.String(length=50), server_default=sa.text("'pending'::character varying"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('approved_by', sa.Uuid(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_reason', sa.Text(), nullable=True),
        sa.Column('delivery_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['public.user.id'], name='fk_reward_redemptions_admin_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reward_id'], ['public.rewards.id'], name='fk_reward_redemptions_reward_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_reward_redemptions_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='reward_redemptions_pkey'),
        schema='public'
    )
    op.create_index('idx_reward_redemptions_user_created', 'reward_redemptions', ['user_id', 'created_at'], unique=False, schema='public')

    # 24. user_badges
    op.create_table('user_badges',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('badge_id', sa.Uuid(), nullable=False),
        sa.Column('is_equipped', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('unlocked_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['badge_id'], ['public.badges.id'], name='fk_user_badges_badge_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_badges_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='user_badges_pkey'),
        sa.UniqueConstraint('user_id', 'badge_id', name='uq_user_badges_user_badge'),
        schema='public'
    )

    # 25. user_achievements
    op.create_table('user_achievements',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('achievement_id', sa.Uuid(), nullable=False),
        sa.Column('unlocked_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reward_claimed', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['achievement_id'], ['public.achievements.id'], name='fk_user_achievements_achievement_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_achievements_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='user_achievements_pkey'),
        sa.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievements'),
        schema='public'
    )

    # 26. gamification_notifications
    op.create_table('gamification_notifications',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('icon_url', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_gamification_notifications_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='gamification_notifications_pkey'),
        schema='public'
    )
    op.create_index('idx_gamification_notifications_unread', 'gamification_notifications', ['user_id', 'is_read'], unique=False, schema='public')

    # 27. user_statistics
    op.create_table('user_statistics',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('total_lessons_completed', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_quizzes_passed', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_code_lessons_solved', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_study_time_seconds', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('total_active_days', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_user_statistics_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', name='user_statistics_pkey'),
        schema='public'
    )

    # 28. peak_transactions
    op.create_table('peak_transactions',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('before_balance', sa.Integer(), nullable=False),
        sa.Column('after_balance', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('event_id', sa.Uuid(), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint('amount > 0', name='chk_peak_transactions_amount'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_peak_transactions_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='peak_transactions_pkey'),
        schema='public'
    )
    op.create_index('idx_peak_transactions_user_time', 'peak_transactions', ['user_id', 'created_at'], unique=False, schema='public')

    # 29. xp_transactions
    op.create_table('xp_transactions',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('before_xp', sa.Integer(), nullable=False),
        sa.Column('after_xp', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('event_id', sa.Uuid(), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_xp_transactions_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='xp_transactions_pkey'),
        schema='public'
    )
    op.create_index('idx_xp_transactions_user_time', 'xp_transactions', ['user_id', 'created_at'], unique=False, schema='public')

    # 30. gamification_activity_logs
    op.create_table('gamification_activity_logs',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('risk_score', sa.Numeric(precision=3, scale=2), server_default=sa.text('0.00'), nullable=False),
        sa.Column('is_suspicious', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('device_fingerprint', sa.Text(), nullable=True),
        sa.Column('detection_reason', sa.Text(), nullable=True),
        sa.Column('source_event_id', sa.Uuid(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_gamification_activity_logs_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='gamification_activity_logs_pkey'),
        schema='public'
    )
    op.create_index('idx_activity_logs_fraud_check', 'gamification_activity_logs', ['is_suspicious', 'risk_score'], unique=False, schema='public')
    op.create_index('idx_activity_logs_user_action_time', 'gamification_activity_logs', ['user_id', 'action_type', 'created_at'], unique=False, schema='public')

    # 31. leaderboard_snapshots
    op.create_table('leaderboard_snapshots',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('leaderboard_type', sa.String(length=50), nullable=False),
        sa.Column('cycle_start_date', sa.Date(), nullable=False),
        sa.Column('season_id', sa.Uuid(), nullable=True),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('badge_image_url', sa.Text(), nullable=True),
        sa.Column('streak', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['season_id'], ['public.seasons.id'], name='fk_leaderboard_snapshots_season_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], name='fk_leaderboard_snapshots_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='leaderboard_snapshots_pkey'),
        sa.UniqueConstraint('leaderboard_type', 'cycle_start_date', 'season_id', 'user_id', name='uq_leaderboard_snapshots_user'),
        schema='public'
    )
    op.create_index('idx_leaderboard_snapshots_ranking', 'leaderboard_snapshots', ['leaderboard_type', 'cycle_start_date', 'rank'], unique=False, schema='public')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_activity_logs_user_action_time', table_name='gamification_activity_logs', schema='public')
    op.drop_index('idx_activity_logs_fraud_check', table_name='gamification_activity_logs', schema='public')
    op.drop_table('gamification_activity_logs', schema='public')
    op.drop_index('idx_xp_transactions_user_time', table_name='xp_transactions', schema='public')
    op.drop_table('xp_transactions', schema='public')
    op.drop_index('idx_peak_transactions_user_time', table_name='peak_transactions', schema='public')
    op.drop_table('peak_transactions', schema='public')
    op.drop_table('user_statistics', schema='public')
    op.drop_index('idx_gamification_notifications_unread', table_name='gamification_notifications', schema='public')
    op.drop_table('gamification_notifications', schema='public')
    op.drop_table('user_achievements', schema='public')
    op.drop_index('idx_reward_redemptions_user_created', table_name='reward_redemptions', schema='public')
    op.drop_table('reward_redemptions', schema='public')
    op.drop_table('user_reward_inventory', schema='public')
    op.drop_index('idx_quest_steps_parent', table_name='quest_steps', schema='public')
    op.drop_table('quest_steps', schema='public')
    op.drop_table('quest_rewards', schema='public')
    op.drop_index('idx_user_missions_status', table_name='user_missions', schema='public')
    op.drop_table('user_missions', schema='public')
    op.drop_index('idx_user_checkins_user_date', table_name='user_checkins', schema='public')
    op.drop_table('user_checkins', schema='public')
    op.drop_table('user_peak_balances', schema='public')
    op.drop_table('user_gamification_profiles', schema='public')
    op.drop_table('user_quest_progress', schema='public')
    op.drop_table('user_badges', schema='public')
    op.drop_table('rewards', schema='public')
    op.drop_table('quests', schema='public')
    op.drop_table('missions', schema='public')
    op.drop_table('loot_tables', schema='public')
    op.drop_index('idx_leaderboard_snapshots_ranking', table_name='leaderboard_snapshots', schema='public')
    op.drop_table('leaderboard_snapshots', schema='public')
    op.drop_table('reward_instances', schema='public')
    op.drop_table('quest_chapters', schema='public')
    op.drop_table('daily_checkin_rewards_config', schema='public')
    op.drop_table('daily_checkin_events', schema='public')
    op.drop_table('achievements', schema='public')
    op.drop_index('idx_seasons_active_dates', table_name='seasons', schema='public')
    op.drop_table('seasons', schema='public')
    op.drop_table('mystery_boxes', schema='public')
    op.drop_table('badges', schema='public')
    op.drop_table('rank_config', schema='public')
    op.drop_table('levels_config', schema='public')
