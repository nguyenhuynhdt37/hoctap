"""Separate bundle moderation from immutable commercial versions."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "j67e90f12a34"
down_revision = "i56d89e01f23"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "bundle_version_reviews",
        sa.Column(
            "version_id",
            sa.Uuid(),
            sa.ForeignKey("public.course_bundle_versions.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "reviewed_by",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
        ),
        sa.Column(
            "published_by",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
        ),
        sa.Column("review_note", sa.Text()),
        sa.CheckConstraint(
            "status IN ('draft','pending','changes_requested','approved','published')",
            name="ck_bundle_review_status",
        ),
        schema="public",
    )
    op.create_index(
        "ix_bundle_review_status",
        "bundle_version_reviews",
        ["status", "submitted_at"],
        schema="public",
    )
    op.create_table(
        "bundle_audit_events",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "bundle_id",
            sa.Uuid(),
            sa.ForeignKey("public.course_bundles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "version_id",
            sa.Uuid(),
            sa.ForeignKey("public.course_bundle_versions.id", ondelete="RESTRICT"),
        ),
        sa.Column(
            "actor_id",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column(
            "details", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        schema="public",
    )
    op.create_index(
        "ix_bundle_audit_product_time",
        "bundle_audit_events",
        ["bundle_id", "created_at"],
        schema="public",
    )
    op.execute(
        "CREATE TRIGGER immutable_bundle_audit BEFORE UPDATE OR DELETE ON public.bundle_audit_events FOR EACH ROW EXECUTE FUNCTION public.guard_commerce_snapshot()"
    )


def downgrade():
    if op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM public.bundle_audit_events) OR EXISTS(SELECT 1 FROM public.bundle_version_reviews)"
        )
    ):
        raise RuntimeError(
            "Export operational bundle review/audit data before downgrade"
        )
    op.drop_table("bundle_audit_events", schema="public")
    op.drop_table("bundle_version_reviews", schema="public")
