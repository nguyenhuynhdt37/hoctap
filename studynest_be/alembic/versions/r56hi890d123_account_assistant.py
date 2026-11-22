"""Account-wide assistant conversations and lifetime memory."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'r56hi890d123'
down_revision = 'q45gh789c012'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('learning_memory_consent', sa.Column('voice_settings', JSONB(), nullable=False, server_default='{}'), schema='public')
    op.create_table('assistant_github_connections',
        sa.Column('user_id', sa.Uuid(), sa.ForeignKey('public.user.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('github_user_id', sa.BigInteger(), nullable=False),
        sa.Column('login', sa.String(100), nullable=False),
        sa.Column('encrypted_token', sa.Text(), nullable=False),
        sa.Column('scopes', sa.Text(), nullable=False), schema='public')
    op.alter_column('tutor_chat_threads', 'course_id', nullable=True, schema='public')
    op.alter_column('tutor_chat_threads', 'lesson_id', nullable=True, schema='public')
    op.drop_constraint('ck_tutor_threads_scope', 'tutor_chat_threads', schema='public', type_='check')
    op.create_check_constraint('ck_tutor_threads_scope', 'tutor_chat_threads', "scope IN ('lesson','section','course','account')", schema='public')
    op.create_check_constraint('ck_tutor_threads_account_context', 'tutor_chat_threads', "(scope = 'account' AND course_id IS NULL AND lesson_id IS NULL) OR (scope <> 'account' AND course_id IS NOT NULL AND lesson_id IS NOT NULL)", schema='public')
    op.create_index('uq_tutor_account_active', 'tutor_chat_threads', ['user_id'], unique=True, schema='public', postgresql_where=sa.text("scope = 'account' AND is_active = true AND is_deleted = false"))
    op.alter_column('learning_memory_consent', 'retention_days', nullable=True, server_default=None, schema='public')
    op.drop_constraint('ck_memory_retention', 'learning_memory_consent', schema='public', type_='check')
    op.create_check_constraint('ck_memory_retention', 'learning_memory_consent', 'retention_days IS NULL OR retention_days BETWEEN 1 AND 365', schema='public')
    op.alter_column('learning_memory_items', 'expires_at', nullable=True, schema='public')
    # Preserve existing live memories; tombstones stay deleted and are never revived.
    op.execute("UPDATE public.learning_memory_consent SET retention_days = NULL, policy_version = '2'")
    op.execute("UPDATE public.learning_memory_items SET expires_at = NULL WHERE status IN ('proposed','confirmed')")


def downgrade():
    op.drop_column('learning_memory_consent', 'voice_settings', schema='public')
    op.drop_table("assistant_github_connections", schema="public")
    # Refuse lossy rollback: account conversations must first be exported/migrated.
    if op.get_bind().scalar(sa.text("SELECT EXISTS(SELECT 1 FROM public.tutor_chat_threads WHERE scope='account')")):
        raise RuntimeError('Export or migrate account threads before downgrading')
    op.execute("UPDATE public.learning_memory_consent SET retention_days=365 WHERE retention_days IS NULL")
    op.execute("UPDATE public.learning_memory_items SET expires_at=now()+interval '365 days' WHERE expires_at IS NULL")
    op.drop_constraint('ck_memory_retention', 'learning_memory_consent', schema='public', type_='check')
    op.create_check_constraint('ck_memory_retention', 'learning_memory_consent', 'retention_days BETWEEN 1 AND 365', schema='public')
    op.alter_column('learning_memory_consent', 'retention_days', nullable=False, server_default='90', schema='public')
    op.alter_column('learning_memory_items', 'expires_at', nullable=False, schema='public')
    op.drop_index('uq_tutor_account_active', table_name='tutor_chat_threads', schema='public')
    op.drop_constraint('ck_tutor_threads_account_context', 'tutor_chat_threads', schema='public', type_='check')
    op.drop_constraint('ck_tutor_threads_scope', 'tutor_chat_threads', schema='public', type_='check')
    op.create_check_constraint('ck_tutor_threads_scope', 'tutor_chat_threads', "scope IN ('lesson','section','course')", schema='public')
    op.alter_column('tutor_chat_threads', 'course_id', nullable=False, schema='public')
    op.alter_column('tutor_chat_threads', 'lesson_id', nullable=False, schema='public')
