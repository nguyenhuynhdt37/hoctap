"""Add source provenance without promoting unknown legacy timestamps to verified."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
revision='o12de456f789'
down_revision='n01cd345e678'
branch_labels=None
depends_on=None


def upgrade():
    op.add_column('lesson_chunks',sa.Column('source_kind',sa.String(32),nullable=False,server_default='unknown'),schema='public')
    op.add_column('lesson_chunks',sa.Column('source_reference',sa.Text()),schema='public')
    op.add_column('lesson_chunks',sa.Column('source_content_hash',sa.String(64)),schema='public')
    op.add_column('lesson_chunks',sa.Column('timestamps_verified',sa.Boolean(),nullable=False,server_default=sa.false()),schema='public')
    op.add_column('lesson_chunks',sa.Column('timestamp_anchors',JSONB(),nullable=False,server_default=sa.text("'[]'::jsonb")),schema='public')


def downgrade():
    for column in ['timestamp_anchors','timestamps_verified','source_content_hash','source_reference','source_kind']:
        op.drop_column('lesson_chunks',column,schema='public')
