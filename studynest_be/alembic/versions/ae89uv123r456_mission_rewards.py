"""Add scoped mission assignments, templates and audited reward grants."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision = "ae89uv123r456"
down_revision = "ad78tu012q345"
branch_labels = None
depends_on = None

SCHEMA = "public"


def upgrade() -> None:
    op.create_table(
        "mission_templates",
        sa.Column("key", sa.String(80), primary_key=True),
        sa.Column("scope", sa.String(12), nullable=False),
        sa.Column("template", sa.String(40), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("target_count", sa.Integer(), nullable=False),
        sa.Column("quiz_pass_percent", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("reward_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reward_peak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("coupon_max_percent", sa.Integer()),
        sa.Column("coupon_valid_days", sa.Integer()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint(
            "(scope = 'daily' AND template IN ('lesson.completed', 'quiz.completed', "
            "'code.completed', 'daily_checkin.completed')) OR "
            "(scope = 'course' AND template IN ('chapter.complete', 'chapter.quiz_pass', "
            "'course.complete', 'course.weekly_streak'))",
            name="chk_mission_templates_scope",
        ),
        sa.CheckConstraint("target_count > 0 AND reward_xp >= 0 AND reward_peak >= 0",
                           name="chk_mission_templates_amounts"),
        sa.CheckConstraint(
            "quiz_pass_percent BETWEEN 0 AND 100 AND "
            "(template <> 'chapter.quiz_pass' OR target_count = 1) AND "
            "(template <> 'course.weekly_streak' OR target_count <= 7)",
            name="chk_mission_templates_criteria",
        ),
        sa.CheckConstraint(
            "(coupon_max_percent IS NULL AND coupon_valid_days IS NULL) OR "
            "(coupon_max_percent IS NOT NULL AND coupon_valid_days IS NOT NULL AND "
            "coupon_max_percent BETWEEN 1 AND 100 AND coupon_valid_days > 0)",
            name="chk_mission_templates_coupon",
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "uq_mission_templates_course_kind", "mission_templates", ["template"],
        unique=True, postgresql_where=sa.text("scope = 'course'"), schema=SCHEMA,
    )

    for name, type_ in (
        ("scope", sa.String(12)),
        ("template", sa.String(40)),
        ("template_key", sa.String(80)),
        ("course_id", sa.Uuid()),
        ("section_id", sa.Uuid()),
        ("quiz_pass_percent", sa.Integer()),
        ("coupon_max_percent", sa.Integer()),
        ("coupon_valid_days", sa.Integer()),
        ("claim_result", pg.JSONB()),
    ):
        op.add_column("user_missions", sa.Column(name, type_), schema=SCHEMA)
    # completed_at and claimed_at already exist in dfcf126dad17.
    op.alter_column("user_missions", "mission_id", existing_type=sa.Uuid(), nullable=True, schema=SCHEMA)
    op.create_foreign_key(
        "fk_user_missions_template", "user_missions", "mission_templates",
        ["template_key"], ["key"], source_schema=SCHEMA, referent_schema=SCHEMA,
        postgresql_not_valid=True,
    )
    op.execute("""
        ALTER TABLE public.user_missions ADD CONSTRAINT chk_user_missions_scope CHECK (
            CASE WHEN scope IS NULL THEN mission_id IS NOT NULL
            WHEN scope = 'daily' THEN mission_id IS NULL AND template_key IS NOT NULL
                 AND template IS NOT NULL AND course_id IS NULL AND section_id IS NULL
            WHEN scope = 'course' THEN mission_id IS NULL AND template_key IS NOT NULL
                 AND course_id IS NOT NULL AND template IS NOT NULL AND
                 ((section_id IS NOT NULL AND template IN ('chapter.complete', 'chapter.quiz_pass')) OR
                  (section_id IS NULL AND template IN ('course.complete', 'course.weekly_streak')))
            ELSE false END
        ) NOT VALID
    """)
    op.create_table(
        "reward_grants",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mission_id", sa.Uuid(), sa.ForeignKey("public.user_missions.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("reward_kind", sa.String(20), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "mission_id", "reward_kind", name="uq_reward_grants_mission_kind"),
        sa.CheckConstraint("reward_kind IN ('xp', 'peak', 'level_up_peak', 'coupon') AND amount > 0",
                           name="chk_reward_grants_kind_amount"),
        schema=SCHEMA,
    )
    op.create_index("ix_reward_grants_mission", "reward_grants", ["mission_id"], schema=SCHEMA)
    op.add_column("reward_instances", sa.Column("code_masked", sa.String(80)), schema=SCHEMA)
    op.add_column("reward_instances", sa.Column("max_percent", sa.Integer()), schema=SCHEMA)
    op.add_column("reward_instances", sa.Column("source_mission_id", sa.Uuid()), schema=SCHEMA)
    op.create_foreign_key(
        "fk_reward_instances_source_mission", "reward_instances", "user_missions",
        ["source_mission_id"], ["id"], source_schema=SCHEMA, referent_schema=SCHEMA,
        ondelete="SET NULL", postgresql_not_valid=True,
    )

    op.execute("""
        INSERT INTO public.mission_templates
            (key, scope, template, title, description, target_count, reward_xp, reward_peak,
             coupon_max_percent, coupon_valid_days)
        VALUES
            ('daily_lesson_one', 'daily', 'lesson.completed', 'Hoàn thành 1 bài học',
             'Hoàn thành một bài học bất kỳ trong ngày.', 1, 50, 0, NULL, NULL),
            ('daily_lesson_three', 'daily', 'lesson.completed', 'Hoàn thành 3 bài học',
             'Hoàn thành ba bài học trong ngày.', 3, 100, 50, NULL, NULL),
            ('daily_quiz', 'daily', 'quiz.completed', 'Hoàn thành bài trắc nghiệm',
             'Nộp một bài trắc nghiệm trong ngày.', 1, 50, 0, NULL, NULL),
            ('daily_code', 'daily', 'code.completed', 'Hoàn thành bài thực hành',
             'Vượt qua bộ kiểm thử và lưu bài thực hành trong ngày.', 1, 70, 0, NULL, NULL),
            ('daily_checkin', 'daily', 'daily_checkin.completed', 'Điểm danh học tập',
             'Điểm danh hằng ngày.', 1, 20, 0, NULL, NULL),
            ('chapter_complete', 'course', 'chapter.complete', 'Hoàn thành chương',
             'Hoàn thành các bài học của chương.', 1, 30, 0, NULL, NULL),
            ('chapter_quiz_pass', 'course', 'chapter.quiz_pass', 'Vượt qua trắc nghiệm chương',
             'Đạt điểm yêu cầu ở một bài trắc nghiệm của chương.', 1, 80, 25, NULL, NULL),
            ('course_complete', 'course', 'course.complete', 'Hoàn thành khóa học',
             'Hoàn thành các bài học của khóa.', 1, 300, 0, 15, 30),
            ('course_weekly_streak', 'course', 'course.weekly_streak', 'Học đều trong tuần',
             'Học vào các ngày khác nhau trong cùng một tuần.', 3, 0, 75, NULL, NULL)
        ON CONFLICT DO NOTHING
    """)
    op.execute("""
        INSERT INTO public.levels_config (level, xp_required, rewards_config)
        SELECT level,
               CASE WHEN level <= 7 THEN (ARRAY[0, 100, 200, 300, 500, 750, 1000])[level]
                    ELSE 1100 + (level - 8) * 50 END,
               CASE WHEN level = 1 THEN '{}'::jsonb
                    ELSE jsonb_build_object('reward_peak', (level - 1) * 25) END
        FROM generate_series(1, 20) AS levels(level)
        ON CONFLICT (level) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_constraint("fk_reward_instances_source_mission", "reward_instances",
                       type_="foreignkey", schema=SCHEMA)
    for name in ("source_mission_id", "max_percent", "code_masked"):
        op.drop_column("reward_instances", name, schema=SCHEMA)
    op.drop_table("reward_grants", schema=SCHEMA)
    op.execute("DELETE FROM public.user_missions WHERE mission_id IS NULL")
    op.alter_column("user_missions", "mission_id", existing_type=sa.Uuid(), nullable=False, schema=SCHEMA)
    op.drop_constraint("chk_user_missions_scope", "user_missions", type_="check", schema=SCHEMA)
    op.drop_constraint("fk_user_missions_template", "user_missions", type_="foreignkey", schema=SCHEMA)
    for name in ("claim_result", "coupon_valid_days", "coupon_max_percent", "quiz_pass_percent",
                 "section_id", "course_id", "template_key", "template", "scope"):
        op.drop_column("user_missions", name, schema=SCHEMA)
    op.drop_table("mission_templates", schema=SCHEMA)
    # Preserve configured levels and already posted XP/Peak ledger entries.
