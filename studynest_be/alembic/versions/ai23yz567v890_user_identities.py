"""Add stable external sign-in identities."""

import sqlalchemy as sa
from alembic import op

revision = "ai23yz567v890"
down_revision = "ah12xy456u789"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Both indexes are built on the new empty table within the migration transaction.
    op.create_table(
        "user_identities",
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("provider_subject", sa.String(255), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("email_at_link", sa.String(254), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("provider", "provider_subject", name="user_identities_pkey"),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_identities_user_provider"),
        sa.ForeignKeyConstraint(["user_id"], ["public.user.id"], name="fk_user_identities_user", ondelete="CASCADE"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("user_identities", schema="public")
