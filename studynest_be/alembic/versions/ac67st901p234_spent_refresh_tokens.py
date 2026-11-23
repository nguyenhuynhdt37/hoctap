"""Track spent DPoP refresh tokens until their session is removed."""

import sqlalchemy as sa
from alembic import op

revision = "ac67st901p234"
down_revision = "ab56rs890n123"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout = '2s'")
    op.create_table(
        "spent_refresh_tokens",
        sa.Column("token_hash", sa.Text(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("public.sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("operation_id", sa.Uuid()),
        sa.Column("encrypted_result", sa.Text()),
        schema="public",
    )
    # This is a new, empty table.
    op.create_index("ix_spent_refresh_tokens_session_id", "spent_refresh_tokens", ["session_id"], schema="public")


def downgrade() -> None:
    op.drop_table("spent_refresh_tokens", schema="public")
