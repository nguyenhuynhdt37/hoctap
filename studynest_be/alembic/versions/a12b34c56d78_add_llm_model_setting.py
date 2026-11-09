"""Persist the admin's 9Router model selection."""

from alembic import op
import sqlalchemy as sa

revision = "a12b34c56d78"
down_revision = "dfcf126dad17"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "platform_settings",
        sa.Column("llm_model", sa.String(200), nullable=False, server_default="auto"),
        schema="public",
    )


def downgrade():
    op.drop_column("platform_settings", "llm_model", schema="public")
