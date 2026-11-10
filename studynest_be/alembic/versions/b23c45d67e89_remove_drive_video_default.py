"""Remove the obsolete Drive upload source marker."""

import sqlalchemy as sa

from alembic import op

revision = 'b23c45d67e89'
down_revision = 'a12b34c56d78'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('lesson_videos', 'source_type', server_default=sa.text("'youtube_upload'"), schema='public')
    op.execute("UPDATE public.lesson_videos SET source_type='youtube_upload' WHERE source_type='upload_drive' AND video_url LIKE '%youtu%'")


def downgrade():
    op.alter_column('lesson_videos', 'source_type', server_default=sa.text("'upload_drive'"), schema='public')
