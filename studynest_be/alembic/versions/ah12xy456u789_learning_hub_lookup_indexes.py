"""Build learning hub lookup indexes on existing tables concurrently."""

import sqlalchemy as sa
from alembic import op

revision = "ah12xy456u789"
down_revision = "ag01wx345t678"
branch_labels = None
depends_on = None

INDEXES = (
    ("ix_lesson_quizzes_lesson", "lesson_quizzes", ["lesson_id"], None),
    ("ix_lesson_quiz_options_quiz", "lesson_quiz_options", ["quiz_id"], None),
    ("ix_lesson_progress_user_completed_at", "lesson_progress", ["user_id", "completed_at"], "is_completed IS TRUE"),
    ("ix_quiz_attempts_user_created_at", "quiz_attempts", ["user_id", "created_at"], None),
)


def upgrade() -> None:
    context = op.get_context()
    with context.autocommit_block():
        for name, table, columns, predicate in INDEXES:
            if not context.as_sql:
                valid = op.get_bind().scalar(sa.text("""
                    SELECT indisvalid FROM pg_catalog.pg_index WHERE indexrelid = to_regclass(:name)
                """), {"name": f"public.{name}"})
                if valid is False:
                    op.drop_index(name, schema="public", postgresql_concurrently=True)
            op.create_index(
                name, table, columns, schema="public", postgresql_where=sa.text(predicate) if predicate else None,
                if_not_exists=True, postgresql_concurrently=True,
            )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, *_ in reversed(INDEXES):
            op.drop_index(name, schema="public", if_exists=True, postgresql_concurrently=True)
