"""Bind agent runs to the user message carrying private image attachments."""
from alembic import op
import sqlalchemy as sa
revision = 'u89kl123g456'
down_revision = 't78jk012f345'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('agent_runs', sa.Column('input_message_id', sa.UUID(), nullable=True), schema='public')
    op.create_foreign_key('fk_agent_run_input_message', 'agent_runs', 'tutor_chat_messages', ['input_message_id'], ['id'], source_schema='public', referent_schema='public', ondelete='SET NULL')


def downgrade():
    op.drop_constraint('fk_agent_run_input_message', 'agent_runs', schema='public', type_='foreignkey')
    op.drop_column('agent_runs', 'input_message_id', schema='public')
