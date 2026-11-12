"""Providers are verified by default; membership requests still require admin approval."""

from alembic import op

revision = 'h45c78d90e12'
down_revision = 'g34b67c89d01'
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column('providers', 'verification_status', server_default='verified', schema='public')
    op.execute("UPDATE public.providers SET verification_status='verified' WHERE verification_status != 'verified'")

def downgrade():
    # Previously changed statuses cannot be reconstructed safely.
    op.alter_column('providers', 'verification_status', server_default='pending', schema='public')
