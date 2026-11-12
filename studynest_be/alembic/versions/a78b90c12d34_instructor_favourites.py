"""Private instructor bookmarks; reuse existing catalog and user tables."""

import sqlalchemy as sa

from alembic import op

revision = "a78b90c12d34"
down_revision = "f67a89b01c23"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "instructor_favourites",
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "instructor_id",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="CASCADE"),
            primary_key=True,
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
        "ix_public_instructor_favourites_instructor_id",
        "instructor_favourites",
        ["instructor_id"],
        schema="public",
    )


def downgrade():
    op.drop_table("instructor_favourites", schema="public")
