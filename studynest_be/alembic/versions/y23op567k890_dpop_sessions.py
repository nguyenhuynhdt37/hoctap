"""Add DPoP binding and previous refresh state to sessions."""

import sqlalchemy as sa
from alembic import op


revision = "y23op567k890"
down_revision = "x12no456j789"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("dpop_jkt", sa.String(), nullable=True), schema="public")
    op.add_column("sessions", sa.Column("previous_refresh_hash", sa.Text(), nullable=True), schema="public")
    op.add_column(
        "sessions", sa.Column("previous_rotated_at", sa.DateTime(timezone=True), nullable=True), schema="public",
    )
    op.create_index("ix_sessions_dpop_jkt", "sessions", ["dpop_jkt"], schema="public")
    op.create_index("idx_sessions_previous_refresh_hash", "sessions", ["previous_refresh_hash"], schema="public")


def downgrade() -> None:
    # Dropping the binding must not turn DPoP sessions into legacy refresh sessions.
    op.execute("UPDATE public.sessions SET is_revoked = true WHERE dpop_jkt IS NOT NULL")
    op.drop_index("idx_sessions_previous_refresh_hash", table_name="sessions", schema="public")
    op.drop_index("ix_sessions_dpop_jkt", table_name="sessions", schema="public")
    op.drop_column("sessions", "previous_rotated_at", schema="public")
    op.drop_column("sessions", "previous_refresh_hash", schema="public")
    op.drop_column("sessions", "dpop_jkt", schema="public")
