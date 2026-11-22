"""Distributed agent worker leases; stale work expires without mutation replay."""
from alembic import op
import sqlalchemy as sa
revision='p23ef567a890'
down_revision='o12de456f789'
branch_labels=None
depends_on=None

def upgrade():
    op.add_column('agent_runs',sa.Column('worker_id',sa.String(100)),schema='public')
    op.add_column('agent_runs',sa.Column('heartbeat_at',sa.DateTime(timezone=True)),schema='public')
    op.create_index('ix_agent_runs_heartbeat','agent_runs',['heartbeat_at'],schema='public',postgresql_where=sa.text("state IN ('created','resolving_context','planning','awaiting_approval','executing','verifying')"))

def downgrade():
    op.drop_index('ix_agent_runs_heartbeat',table_name='agent_runs',schema='public')
    op.drop_column('agent_runs','heartbeat_at',schema='public')
    op.drop_column('agent_runs','worker_id',schema='public')
