"""Deleting course content must not erase account-owned assistant records."""
from alembic import op
import sqlalchemy as sa

revision = 's67ij901e234'
down_revision = 'r56hi890d123'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('learning_memory_consent', 'enabled', server_default=sa.text('true'), schema='public')
    # Existing explicit opt-outs remain opted out.
    for column, target in [('course_id', 'courses'), ('lesson_id', 'lessons')]:
        op.drop_constraint(f'learning_memory_items_{column}_fkey', 'learning_memory_items', schema='public', type_='foreignkey')
        op.create_foreign_key(f'learning_memory_items_{column}_fkey', 'learning_memory_items', target, [column], ['id'], source_schema='public', referent_schema='public', ondelete='SET NULL')
    op.drop_constraint('ck_tutor_threads_account_context', 'tutor_chat_threads', schema='public', type_='check')
    op.create_check_constraint('ck_tutor_threads_account_context', 'tutor_chat_threads', "scope <> 'account' OR (course_id IS NULL AND lesson_id IS NULL)", schema='public')
    for column, target, name in [('course_id', 'courses', 'fk_tutor_threads_course'), ('lesson_id', 'lessons', 'fk_tutor_threads_lesson')]:
        op.drop_constraint(name, 'tutor_chat_threads', schema='public', type_='foreignkey')
        op.create_foreign_key(name, 'tutor_chat_threads', target, [column], ['id'], source_schema='public', referent_schema='public', ondelete='SET NULL')


def downgrade():
    op.alter_column('learning_memory_consent', 'enabled', server_default=sa.text('false'), schema='public')
    # Nullable historical references remain valid; never delete preserved records on rollback.
    for column, target in [('course_id', 'courses'), ('lesson_id', 'lessons')]:
        op.drop_constraint(f'learning_memory_items_{column}_fkey', 'learning_memory_items', schema='public', type_='foreignkey')
        op.create_foreign_key(f'learning_memory_items_{column}_fkey', 'learning_memory_items', target, [column], ['id'], source_schema='public', referent_schema='public', ondelete='CASCADE')
    for column, target, name in [('course_id', 'courses', 'fk_tutor_threads_course'), ('lesson_id', 'lessons', 'fk_tutor_threads_lesson')]:
        op.drop_constraint(name, 'tutor_chat_threads', schema='public', type_='foreignkey')
        op.create_foreign_key(name, 'tutor_chat_threads', target, [column], ['id'], source_schema='public', referent_schema='public', ondelete='CASCADE')
