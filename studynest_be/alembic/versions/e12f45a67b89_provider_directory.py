"""Provider school directory identity and source provenance."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "e12f45a67b89"
down_revision = "d01e34f56a78"
branch_labels = None
depends_on = None


def upgrade():
    for table, constraint in [
        ("providers", "ck_provider_type"),
        ("provider_creation_requests", "ck_provider_request_type"),
    ]:
        op.drop_constraint(constraint, table, schema="public")
        op.create_check_constraint(
            constraint,
            table,
            "provider_type IN ('individual','center','exam_center','organization','school')",
            schema="public",
        )
    for name, kind in [
        ("province", sa.String(160)),
        ("province_code", sa.String(20)),
        ("school_code", sa.String(40)),
        ("address", sa.Text()),
        ("website_url", sa.Text()),
        ("source_url", sa.Text()),
        ("source_key", sa.String(240)),
        ("source_checked_at", sa.DateTime(timezone=True)),
        ("source_snapshot", JSONB()),
    ]:
        op.add_column(
            "providers", sa.Column(name, kind, nullable=True), schema="public"
        )
    op.create_unique_constraint(
        "uq_providers_source_key", "providers", ["source_key"], schema="public"
    )


def downgrade():
    # Do not silently destroy imported data or reclassify schools.
    connection = op.get_bind()
    if connection.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM public.providers WHERE source_key IS NOT NULL OR provider_type='school') OR EXISTS(SELECT 1 FROM public.provider_creation_requests WHERE provider_type='school')"
        )
    ):
        raise RuntimeError(
            "Export/remove imported directory records and school requests before downgrade"
        )
    op.drop_constraint("uq_providers_source_key", "providers", schema="public")
    for name in [
        "province",
        "province_code",
        "school_code",
        "address",
        "website_url",
        "source_url",
        "source_key",
        "source_checked_at",
        "source_snapshot",
    ]:
        op.drop_column("providers", name, schema="public")
    for table, constraint in [
        ("providers", "ck_provider_type"),
        ("provider_creation_requests", "ck_provider_request_type"),
    ]:
        op.drop_constraint(constraint, table, schema="public")
        op.create_check_constraint(
            constraint,
            table,
            "provider_type IN ('individual','center','exam_center','organization')",
            schema="public",
        )
