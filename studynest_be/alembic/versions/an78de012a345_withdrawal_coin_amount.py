"""Add withdrawal_requests.coin_amount so lecturers withdraw in Coin."""

import sqlalchemy as sa

from alembic import op

revision = "an78de012a345"
down_revision = "am67cd901z234"
branch_labels = None
depends_on = None

SCHEMA = "public"


def upgrade() -> None:
    op.add_column("withdrawal_requests", sa.Column("coin_amount", sa.Integer()), schema=SCHEMA)
    op.create_check_constraint(
        "chk_withdrawal_requests_coin_amount", "withdrawal_requests",
        "coin_amount IS NULL OR coin_amount > 0", schema=SCHEMA)


def downgrade() -> None:
    op.drop_constraint("chk_withdrawal_requests_coin_amount", "withdrawal_requests", schema=SCHEMA)
    op.drop_column("withdrawal_requests", "coin_amount", schema=SCHEMA)
