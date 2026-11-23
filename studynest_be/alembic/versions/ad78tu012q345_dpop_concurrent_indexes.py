"""Create any missing DPoP session indexes without blocking writes."""

from alembic import op

revision = "ad78tu012q345"
down_revision = "ac67st901p234"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # These indexes belong to y23op567k890 on existing installs. This also
    # supports the staged production rollout documented in dpop-backend-notes.
    with op.get_context().autocommit_block():
        for index, column in (
            ("ix_sessions_dpop_jkt", "dpop_jkt"),
            ("idx_sessions_previous_refresh_hash", "previous_refresh_hash"),
        ):
            op.create_index(index, "sessions", [column], schema="public",
                            if_not_exists=True, postgresql_concurrently=True)


def downgrade() -> None:
    # The original revision still owns both indexes.
    pass
