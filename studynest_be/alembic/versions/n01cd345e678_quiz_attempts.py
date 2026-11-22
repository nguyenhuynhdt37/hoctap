"""Add authorized server-graded quiz evidence without replacing practice content."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision='n01cd345e678'
down_revision='m90bc234d567'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('quiz_attempts',
        sa.Column('id',sa.Uuid(),primary_key=True),
        sa.Column('user_id',sa.Uuid(),sa.ForeignKey('public.user.id',ondelete='CASCADE'),nullable=False),
        sa.Column('lesson_id',sa.Uuid(),sa.ForeignKey('public.lessons.id',ondelete='CASCADE'),nullable=False),
        sa.Column('idempotency_key',sa.Uuid(),nullable=False),
        sa.Column('request_hash',sa.String(64),nullable=False),
        sa.Column('content_hash',sa.String(64),nullable=False),
        sa.Column('correct',sa.Integer(),nullable=False),
        sa.Column('total',sa.Integer(),nullable=False),
        sa.Column('details',postgresql.JSONB(),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.UniqueConstraint('user_id','idempotency_key',name='uq_quiz_attempt_user_key'),schema='public')
    op.create_index('ix_quiz_attempts_user_lesson_time','quiz_attempts',['user_id','lesson_id','created_at'],schema='public')


def downgrade():
    op.drop_table('quiz_attempts',schema='public')
