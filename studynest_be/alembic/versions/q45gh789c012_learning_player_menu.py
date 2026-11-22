"""Learning-player archive, email preferences, and course gifts."""

import sqlalchemy as sa
from alembic import op

revision = "q45gh789c012"
down_revision = "p23ef567a890"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "course_enrollments",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        schema="public",
    )
    op.add_column(
        "user",
        sa.Column(
            "promotional_email_opt_in",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        schema="public",
    )
    op.create_table(
        "course_announcement_preferences",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["public.user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["course_id"], ["public.courses.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("user_id", "course_id"),
        schema="public",
    )
    op.create_table(
        "course_gifts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sender_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("recipient_email", sa.String(320), nullable=False),
        sa.Column("recipient_user_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("claim_token", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["sender_id"], ["public.user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["course_id"], ["public.courses.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["recipient_user_id"], ["public.user.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("claim_token"),
        sa.CheckConstraint(
            "status IN ('unpaid', 'claimable', 'fulfilled', 'claimed')",
            name="course_gifts_status_check",
        ),
        schema="public",
    )
    op.create_index(
        "ix_course_gifts_sender_id",
        "course_gifts",
        ["sender_id"],
        schema="public",
    )
    op.create_index(
        "ix_course_gifts_course_id",
        "course_gifts",
        ["course_id"],
        schema="public",
    )


def downgrade():
    op.drop_index("ix_course_gifts_course_id", table_name="course_gifts", schema="public")
    op.drop_index("ix_course_gifts_sender_id", table_name="course_gifts", schema="public")
    op.drop_table("course_gifts", schema="public")
    op.drop_table("course_announcement_preferences", schema="public")
    op.drop_column("user", "promotional_email_opt_in", schema="public")
    op.drop_column("course_enrollments", "archived_at", schema="public")
