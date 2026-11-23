"""Index the course-scoped lesson lookup used by the combo catalog."""

from alembic import op

revision = "z34pq678l901"
down_revision = "y23op567k890"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_lessons_course_id",
            "lessons",
            ["course_id"],
            schema="public",
            postgresql_concurrently=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_lessons_course_id",
            table_name="lessons",
            schema="public",
            postgresql_concurrently=True,
        )
