"""Admin-owned providers and auditable lecturer creation requests."""

import sqlalchemy as sa
from alembic import op

revision = "c90d23e45f67"
down_revision = "b89c12d34e56"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "provider_creation_requests",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "requester_id",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("normalized_name", sa.String(160), nullable=False),
        sa.Column("provider_type", sa.String(30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("contact_email", sa.String(320), nullable=False),
        sa.Column("website_url", sa.String(2048)),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column(
            "reviewed_by",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("review_note", sa.Text()),
        sa.Column(
            "provider_id",
            sa.Uuid(),
            sa.ForeignKey("public.providers.id", ondelete="RESTRICT"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "status IN ('pending','approved','rejected','cancelled')",
            name="ck_provider_request_status",
        ),
        sa.CheckConstraint(
            "provider_type IN ('individual','center','exam_center','organization')",
            name="ck_provider_request_type",
        ),
        sa.CheckConstraint(
            "(status = 'pending' AND decided_at IS NULL AND reviewed_by IS NULL AND provider_id IS NULL) OR "
            "(status = 'approved' AND decided_at IS NOT NULL AND reviewed_by IS NOT NULL AND provider_id IS NOT NULL) OR "
            "(status = 'rejected' AND decided_at IS NOT NULL AND reviewed_by IS NOT NULL AND review_note IS NOT NULL AND length(trim(review_note)) > 0 AND provider_id IS NULL) OR "
            "(status = 'cancelled' AND decided_at IS NOT NULL AND reviewed_by IS NULL AND provider_id IS NULL)",
            name="ck_provider_request_decision",
        ),
        schema="public",
    )
    op.create_index(
        "uq_provider_request_pending_name",
        "provider_creation_requests",
        ["normalized_name"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_index(
        "ix_provider_requests_requester_created",
        "provider_creation_requests",
        ["requester_id", "created_at", "id"],
        schema="public",
    )
    op.create_index(
        "ix_provider_requests_status_created",
        "provider_creation_requests",
        ["status", "created_at", "id"],
        schema="public",
    )


def downgrade():
    op.drop_table("provider_creation_requests", schema="public")
