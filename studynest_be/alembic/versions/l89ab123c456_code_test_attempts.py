"""Add durable version-bound code execution evidence; preserve legacy student files."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision = 'l89ab123c456'
down_revision = 'k78fa012b345'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('code_test_attempts',
        sa.Column('id',sa.Uuid(),primary_key=True),
        sa.Column('user_id',sa.Uuid(),sa.ForeignKey('public.user.id',ondelete='CASCADE'),nullable=False),
        sa.Column('exercise_id',sa.Uuid(),sa.ForeignKey('public.lesson_codes.id',ondelete='CASCADE'),nullable=False),
        sa.Column('content_hash',sa.String(64),nullable=False),
        sa.Column('suite_hash',sa.String(64),nullable=False),
        sa.Column('buffer_revision',sa.Integer()),
        sa.Column('mode',sa.String(16),nullable=False),
        sa.Column('status',sa.String(24),nullable=False),
        sa.Column('files_manifest',postgresql.JSONB(),nullable=False),
        sa.Column('result',postgresql.JSONB(),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        schema='public')
    op.create_index('ix_code_attempts_user_exercise_time','code_test_attempts',['user_id','exercise_id','created_at'],schema='public')


def downgrade():
    op.drop_table('code_test_attempts',schema='public')
