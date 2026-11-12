"""SQL CHECK must reject null review evidence as well as empty text."""

from alembic import op

revision = "g34b67c89d01"
down_revision = "f23a56b78c90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_check_constraint(
        "ck_provider_join_review_not_null",
        "provider_join_requests",
        "status NOT IN ('approved','rejected') OR review_note IS NOT NULL",
        schema="public",
    )


def downgrade():
    op.drop_constraint(
        "ck_provider_join_review_not_null", "provider_join_requests", schema="public"
    )
