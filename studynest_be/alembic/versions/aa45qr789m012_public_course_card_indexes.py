"""Support batched public course lesson and coupon lookups."""

import sqlalchemy as sa

from alembic import op

revision = "aa45qr789m012"
down_revision = "z34pq678l901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_lessons_legacy_section_id",
            "lessons",
            ["section_id"],
            schema="public",
            postgresql_where=sa.text("course_id IS NULL"),
            postgresql_concurrently=True,
        )
        op.create_index(
            "ix_course_sections_course_id",
            "course_sections",
            ["course_id"],
            schema="public",
            postgresql_concurrently=True,
        )
        op.create_index(
            "ix_discount_targets_discount_id",
            "discount_targets",
            ["discount_id"],
            schema="public",
            postgresql_concurrently=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for table, index in (
            ("discount_targets", "ix_discount_targets_discount_id"),
            ("course_sections", "ix_course_sections_course_id"),
            ("lessons", "ix_lessons_legacy_section_id"),
        ):
            op.drop_index(
                index, table_name=table, schema="public", postgresql_concurrently=True
            )
