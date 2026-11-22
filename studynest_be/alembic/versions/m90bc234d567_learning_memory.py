"""Learner-owned memory consent and evidence; additive, no legacy row rewrite."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'm90bc234d567'
down_revision = 'l89ab123c456'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('learning_memory_consent',
        sa.Column('user_id', sa.Uuid(), sa.ForeignKey('public.user.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('retention_days', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('policy_version', sa.String(20), nullable=False, server_default='1'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint('retention_days BETWEEN 1 AND 365', name='ck_memory_retention'), schema='public')
    op.create_table('learning_memory_items',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('user_id', sa.Uuid(), sa.ForeignKey('public.user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.Uuid(), sa.ForeignKey('public.courses.id', ondelete='CASCADE')),
        sa.Column('lesson_id', sa.Uuid(), sa.ForeignKey('public.lessons.id', ondelete='CASCADE')),
        sa.Column('scope', sa.String(20), nullable=False), sa.Column('kind', sa.String(40), nullable=False),
        sa.Column('content', sa.Text(), nullable=False), sa.Column('fingerprint', sa.String(64), nullable=False),
        sa.Column('status', sa.String(20), nullable=False), sa.Column('confidence', sa.Integer(), nullable=False),
        sa.Column('evidence', postgresql.JSONB(), nullable=False), sa.Column('source_type', sa.String(30), nullable=False),
        sa.Column('supersedes_id', sa.Uuid(), sa.ForeignKey('public.learning_memory_items.id', ondelete='SET NULL')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False), sa.Column('confirmed_at', sa.DateTime(timezone=True)),
        sa.CheckConstraint("scope IN ('lesson','course','profile')", name='ck_memory_scope'),
        sa.CheckConstraint("status IN ('proposed','confirmed','superseded','deleted')", name='ck_memory_status'),
        sa.CheckConstraint("kind IN ('learning_goal','review_topic','explanation_preference','current_task','hint_used','unresolved_question')", name='ck_memory_kind'),
        sa.CheckConstraint('confidence >= 0 AND confidence <= 100', name='ck_memory_confidence'),
        sa.UniqueConstraint('user_id','fingerprint',name='uq_memory_owner_fingerprint'), schema='public')
    op.create_index('ix_memory_owner_scope','learning_memory_items',['user_id','scope','course_id','lesson_id','status'],schema='public')
    op.create_index('ix_memory_expiration','learning_memory_items',['expires_at'],schema='public')
    op.create_table('agent_thread_summaries',
        sa.Column('thread_id', sa.Uuid(), sa.ForeignKey('public.tutor_chat_threads.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.Uuid(), sa.ForeignKey('public.user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False), sa.Column('message_ids', postgresql.JSONB(), nullable=False),
        sa.Column('through_message_id', sa.Uuid(), sa.ForeignKey('public.tutor_chat_messages.id', ondelete='SET NULL')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()), schema='public')
    op.create_index('ix_public_agent_thread_summaries_user_id','agent_thread_summaries',['user_id'],schema='public')


def downgrade():
    op.drop_table('agent_thread_summaries',schema='public')
    op.drop_table('learning_memory_items',schema='public')
    op.drop_table('learning_memory_consent',schema='public')
