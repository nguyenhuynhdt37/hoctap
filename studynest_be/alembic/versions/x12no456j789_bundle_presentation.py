"""Add a cover and learning metadata to combo versions."""

from alembic import op
import sqlalchemy as sa

revision = "x12no456j789"
down_revision = "w01mn345i678"
branch_labels = None
depends_on = None


def upgrade():
    columns = (
        sa.Column("thumbnail_url", sa.Text()),
        sa.Column("subtitle", sa.String(240)),
        sa.Column("outcomes", sa.ARRAY(sa.Text())),
        sa.Column("requirements", sa.ARRAY(sa.Text())),
        sa.Column("target_audience", sa.ARRAY(sa.Text())),
    )
    for column in columns:
        op.add_column("course_bundle_versions", column, schema="public")


def downgrade():
    for name in ("target_audience", "requirements", "outcomes", "subtitle", "thumbnail_url"):
        op.drop_column("course_bundle_versions", name, schema="public")
