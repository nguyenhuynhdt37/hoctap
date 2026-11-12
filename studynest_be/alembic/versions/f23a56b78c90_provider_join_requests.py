"""Admin-reviewed claims of current teaching employment."""

import sqlalchemy as sa

from alembic import op

revision = "f23a56b78c90"
down_revision = "e12f45a67b89"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "provider_join_requests",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "provider_id",
            sa.Uuid(),
            sa.ForeignKey("public.providers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "requester_id",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("position", sa.String(160), nullable=False),
        sa.Column("work_email", sa.String(254)),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("review_note", sa.Text()),
        sa.Column(
            "reviewed_by",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "status IN ('pending','approved','rejected','cancelled')",
            name="ck_provider_join_status",
        ),
        sa.CheckConstraint(
            "(status='pending' AND reviewed_by IS NULL AND decided_at IS NULL) OR (status='cancelled' AND reviewed_by IS NULL AND decided_at IS NOT NULL) OR (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND decided_at IS NOT NULL AND length(trim(review_note)) >= 10)",
            name="ck_provider_join_decision",
        ),
        schema="public",
    )
    op.create_index(
        "uq_provider_join_pending",
        "provider_join_requests",
        ["provider_id", "requester_id"],
        unique=True,
        postgresql_where=sa.text("status='pending'"),
        schema="public",
    )
    for column in ["provider_id", "requester_id"]:
        op.create_index(
            f"ix_provider_join_requests_{column}",
            "provider_join_requests",
            [column],
            schema="public",
        )


def downgrade():
    if op.get_bind().scalar(
        sa.text("SELECT EXISTS(SELECT 1 FROM public.provider_join_requests)")
    ):
        raise RuntimeError("Export provider employment requests before downgrade")
    op.drop_table("provider_join_requests", schema="public")
