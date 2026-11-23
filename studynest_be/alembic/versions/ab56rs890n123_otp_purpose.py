"""Isolate login OTPs from registration challenges."""

import sqlalchemy as sa
from alembic import op

revision = "ab56rs890n123"
down_revision = "aa45qr789m012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing codes have no trustworthy purpose and are deliberately ignored.
    op.execute("SET LOCAL lock_timeout = '2s'")
    op.add_column("email_verifications", sa.Column("purpose", sa.String(24)), schema="public")
    op.add_column("email_verifications", sa.Column("pending_password_hash", sa.String()), schema="public")


def downgrade() -> None:
    # Older workers look up codes without checking purpose.
    op.execute("DELETE FROM public.email_verifications")
    op.drop_column("email_verifications", "pending_password_hash", schema="public")
    op.drop_column("email_verifications", "purpose", schema="public")
