"""Indexes for public teaching eligibility, course pages and truthful aggregates."""

import sqlalchemy as sa

from alembic import op

revision = "b89c12d34e56"
down_revision = "a78b90c12d34"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_courses_public_instructor",
        "courses",
        ["instructor_id", sa.text("created_at DESC"), sa.text("id DESC")],
        schema="public",
        postgresql_where=sa.text(
            "is_published=true AND approval_status='approved' AND deleted_at IS NULL"
        ),
    )
    op.create_index(
        "ix_user_roles_user_role", "user_roles", ["user_id", "role_id"], schema="public"
    )
    op.create_index(
        "ix_enrollments_active_course_user",
        "course_enrollments",
        ["course_id", "user_id"],
        schema="public",
        postgresql_where=sa.text("status='active'"),
    )
    op.create_index(
        "ix_reviews_course_user",
        "course_reviews",
        ["course_id", "user_id"],
        schema="public",
    )


def downgrade():
    for table, name in [
        ("course_reviews", "ix_reviews_course_user"),
        ("course_enrollments", "ix_enrollments_active_course_user"),
        ("user_roles", "ix_user_roles_user_role"),
        ("courses", "ix_courses_public_instructor"),
    ]:
        op.drop_index(name, table_name=table, schema="public")
