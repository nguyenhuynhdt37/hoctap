"""Add persisted learning agent sessions, runs, events, tools and approvals."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg
revision = 'k78fa012b345'
down_revision = 'j67e90f12a34'
branch_labels = None
depends_on = None


def uid(name, target=None, nullable=False, **kw):
    constraints=[sa.ForeignKey('public.'+target, ondelete='CASCADE')] if target else []
    return sa.Column(name,sa.Uuid(),*constraints,nullable=nullable,**kw)


def stamp(name,nullable=False):
    return sa.Column(name,sa.DateTime(timezone=True),nullable=nullable,server_default=sa.func.now() if name in {'created_at','updated_at'} else None)


def upgrade():
    op.create_table('agent_sessions',uid('id',primary_key=True),uid('user_id','user.id'),
        sa.Column('auth_session_id',sa.String(100),nullable=False),sa.Column('page_instance_id',sa.String(100),nullable=False),
        sa.Column('route',sa.String(500),nullable=False),uid('course_id','courses.id',nullable=True),uid('lesson_id','lessons.id',nullable=True),
        sa.Column('capabilities',pg.JSONB(),nullable=False),sa.Column('snapshot',pg.JSONB(),nullable=False),sa.Column('context_revision',sa.Integer(),nullable=False),
        stamp('created_at'),stamp('updated_at'),stamp('expires_at'),schema='public')
    op.create_index('ix_agent_sessions_owner_page','agent_sessions',['user_id','page_instance_id'],schema='public')
    op.create_table('agent_runs',uid('id',primary_key=True),uid('user_id','user.id'),uid('session_id','agent_sessions.id'),
        sa.Column('thread_id',sa.Uuid(),sa.ForeignKey('public.tutor_chat_threads.id',ondelete='SET NULL'),nullable=True),
        sa.Column('state',sa.String(30),nullable=False),sa.Column('channel',sa.String(20),nullable=False),sa.Column('idempotency_key',sa.String(100),nullable=False),
        sa.Column('request_hash',sa.String(64),nullable=False),sa.Column('message',sa.Text(),nullable=False),sa.Column('response',sa.Text(),nullable=False),
        sa.Column('plan',pg.JSONB(),nullable=False),sa.Column('plan_version',sa.Integer(),nullable=False),sa.Column('current_step',sa.Integer(),nullable=False),
        sa.Column('next_sequence',sa.Integer(),nullable=False),sa.Column('usage',pg.JSONB(),nullable=False),sa.Column('context_revision',sa.Integer(),nullable=False),
        stamp('created_at'),stamp('updated_at'),stamp('deadline'),stamp('cancelled_at',True),sa.Column('last_error',sa.String(500)),
        sa.UniqueConstraint('user_id','idempotency_key',name='uq_agent_run_owner_key'),schema='public')
    op.create_index('ix_agent_runs_session_time','agent_runs',['session_id','created_at'],schema='public')
    op.create_index('uq_agent_run_active_owner','agent_runs',['user_id'],unique=True,postgresql_where=sa.text("state IN ('created','resolving_context','planning','awaiting_approval','executing','verifying')"),schema='public')
    op.create_table('agent_events',uid('id',primary_key=True),uid('run_id','agent_runs.id'),sa.Column('sequence',sa.Integer(),nullable=False),
        sa.Column('type',sa.String(60),nullable=False),sa.Column('payload',pg.JSONB(),nullable=False),stamp('created_at'),sa.UniqueConstraint('run_id','sequence',name='uq_agent_event_sequence'),schema='public')
    op.create_table('agent_tool_calls',uid('id',primary_key=True),uid('run_id','agent_runs.id'),sa.Column('name',sa.String(100),nullable=False),
        sa.Column('arguments',pg.JSONB(),nullable=False),sa.Column('arguments_hash',sa.String(64),nullable=False),sa.Column('status',sa.String(30),nullable=False),
        sa.Column('risk',sa.String(20),nullable=False),sa.Column('result',pg.JSONB()),sa.Column('error',sa.String(500)),uid('approval_id',nullable=True),
        uid('action_id',nullable=True,unique=True),sa.Column('receipt',pg.JSONB()),sa.Column('expected_page_instance_id',sa.String(100)),
        sa.Column('expected_context_revision',sa.Integer()),uid('expected_lesson_id',nullable=True),stamp('expires_at',True),stamp('created_at'),stamp('completed_at',True),schema='public')
    op.create_index('ix_agent_tool_run','agent_tool_calls',['run_id','created_at'],schema='public')
    op.create_table('agent_approvals',uid('id',primary_key=True),uid('run_id','agent_runs.id'),uid('tool_call_id','agent_tool_calls.id',unique=True),
        uid('user_id','user.id'),sa.Column('arguments_hash',sa.String(64),nullable=False),sa.Column('status',sa.String(20),nullable=False),
        sa.Column('page_instance_id',sa.String(100),nullable=False),sa.Column('context_revision',sa.Integer(),nullable=False),stamp('expires_at'),stamp('decided_at',True),schema='public')


def downgrade():
    for name in ['agent_approvals','agent_tool_calls','agent_events','agent_runs','agent_sessions']:
        op.drop_table(name,schema='public')
