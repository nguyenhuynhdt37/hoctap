"""Add review scheduling, answer receipts and study goals."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "ag01wx345t678"
down_revision = "af90vw234s567"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), sa.ForeignKey("public.lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quiz_id", sa.Uuid(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("repetitions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("interval_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ease_factor", sa.Numeric(3, 2), server_default="2.50", nullable=False),
        sa.Column("invalidated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("id", "user_id", name="uq_review_item_owner"),
        sa.CheckConstraint(
            "interval_days >= 0 AND repetitions >= 0 AND ease_factor BETWEEN 1.3 AND 3.0",
            name="ck_review_item_schedule",
        ),
        schema="public",
    )
    # These indexes are on empty tables in the same transaction as CREATE TABLE.
    op.create_index(
        "uq_review_items_current_question", "review_items", ["user_id", "quiz_id"], schema="public",
        unique=True, postgresql_where=sa.text("invalidated_at IS NULL"),
    )
    op.create_index("ix_review_items_lesson", "review_items", ["lesson_id"], schema="public")
    op.create_table(
        "review_answers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column("idempotency_key", sa.Uuid(), nullable=False),
        sa.Column("option_id", sa.Uuid(), nullable=False),
        sa.Column("self_rating", sa.String(10), nullable=False),
        sa.Column("result", postgresql.JSONB(), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["item_id", "user_id"], ["public.review_items.id", "public.review_items.user_id"],
            name="fk_review_answer_item_owner", ondelete="CASCADE",
        ),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_review_answer_user_key"),
        sa.CheckConstraint("self_rating IN ('remembered', 'forgot')", name="ck_review_answer_rating"),
        schema="public",
    )
    op.create_index("ix_review_answers_user_time", "review_answers", ["user_id", "answered_at"], schema="public")
    op.create_index("ix_review_answers_item", "review_answers", ["item_id"], schema="public")
    op.create_table(
        "study_goals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_type", sa.String(6), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("sessions_per_week", sa.Integer(), nullable=False),
        sa.Column("plan_start_date", sa.Date(), nullable=False),
        sa.Column("baseline_completed_ids", postgresql.ARRAY(sa.Uuid()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("target_type IN ('course', 'path')", name="ck_study_goal_target_type"),
        sa.CheckConstraint("sessions_per_week BETWEEN 1 AND 7", name="ck_study_goal_sessions"),
        sa.CheckConstraint("target_date >= plan_start_date", name="ck_study_goal_dates"),
        schema="public",
    )
    op.create_index("ix_study_goals_user_date", "study_goals", ["user_id", "target_date"], schema="public")


def downgrade() -> None:
    op.drop_table("study_goals", schema="public")
    op.drop_table("review_answers", schema="public")
    op.drop_table("review_items", schema="public")
