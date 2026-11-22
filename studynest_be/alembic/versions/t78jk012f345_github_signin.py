"""Stable GitHub login identities and rotating repository credentials."""
from alembic import op
import sqlalchemy as sa

revision = 't78jk012f345'
down_revision = 's67ij901e234'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('github_auth_identities',
        sa.Column('github_user_id', sa.BigInteger(), primary_key=True),
        sa.Column('user_id', sa.UUID(), sa.ForeignKey('public.user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema='public')
    op.create_index('ix_github_identity_user', 'github_auth_identities', ['user_id'], schema='public')
    op.add_column('assistant_github_connections', sa.Column('encrypted_refresh_token', sa.Text(), nullable=True), schema='public')
    op.add_column('assistant_github_connections', sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True), schema='public')


def downgrade():
    op.drop_column('assistant_github_connections', 'token_expires_at', schema='public')
    op.drop_column('assistant_github_connections', 'encrypted_refresh_token', schema='public')
    op.drop_table('github_auth_identities', schema='public')
