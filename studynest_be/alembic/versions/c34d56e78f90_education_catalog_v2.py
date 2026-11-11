"""Add academic catalog and providers without touching legacy identities."""

import sqlalchemy as sa
from alembic import op

revision = "c34d56e78f90"
down_revision = "b23c45d67e89"
branch_labels = None
depends_on = None

TAXONOMY = ("education_levels", "grades", "subjects", "learning_goals", "exams")
TABLES = (
    *TAXONOMY,
    "providers",
    "provider_members",
    "grade_subjects",
    "course_grades",
    "course_learning_goals",
    "course_exams",
)


def upgrade():
    # Frozen migration definitions: future model edits cannot alter replay behavior.
    for name in TAXONOMY:
        extra = []
        if name == "grades":
            extra = [
                sa.Column(
                    "education_level_id",
                    sa.Uuid(),
                    sa.ForeignKey("public.education_levels.id"),
                    nullable=False,
                ),
                sa.Column("grade_number", sa.Integer(), nullable=False, unique=True),
                sa.Column("slug", sa.String(100), nullable=False, unique=True),
                sa.CheckConstraint(
                    "grade_number BETWEEN 1 AND 12", name="ck_grade_number"
                ),
            ]
        if name == "subjects":
            extra = [sa.Column("slug", sa.String(100), nullable=False, unique=True)]
        if name in ("subjects", "learning_goals", "exams"):
            extra += [sa.Column("description", sa.Text())]
        if name == "exams":
            extra += [
                sa.Column(
                    "exam_type",
                    sa.String(60),
                    nullable=False,
                    server_default="entrance",
                )
            ]
        op.create_table(
            name,
            sa.Column(
                "id",
                sa.Uuid(),
                primary_key=True,
                server_default=sa.text("uuid_generate_v4()"),
            ),
            sa.Column("code", sa.String(80), unique=True, nullable=False),
            sa.Column("name", sa.String(160), nullable=False),
            sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            *extra,
            schema="public",
        )
    op.create_index(
        "ix_public_grades_education_level_id",
        "grades",
        ["education_level_id"],
        schema="public",
    )
    op.create_table(
        "providers",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("slug", sa.String(180), nullable=False, unique=True),
        sa.Column(
            "provider_type", sa.String(30), nullable=False, server_default="individual"
        ),
        sa.Column("description", sa.Text()),
        sa.Column("logo_url", sa.Text()),
        sa.Column("banner_url", sa.Text()),
        sa.Column(
            "verification_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "provider_type IN ('individual','center','exam_center','organization')",
            name="ck_provider_type",
        ),
        sa.CheckConstraint(
            "verification_status IN ('pending','verified','rejected')",
            name="ck_provider_verification",
        ),
        schema="public",
    )
    op.create_table(
        "provider_members",
        sa.Column(
            "provider_id",
            sa.Uuid(),
            sa.ForeignKey("public.providers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "role IN ('owner','manager','instructor','editor')",
            name="ck_provider_member_role",
        ),
        sa.CheckConstraint(
            "status IN ('active','inactive')", name="ck_provider_member_status"
        ),
        schema="public",
    )
    op.create_index(
        "ix_public_provider_members_user_id",
        "provider_members",
        ["user_id"],
        schema="public",
    )
    for name, left, target, right, reference in (
        ("grade_subjects", "grade_id", "grades", "subject_id", "subjects"),
        ("course_grades", "course_id", "courses", "grade_id", "grades"),
        (
            "course_learning_goals",
            "course_id",
            "courses",
            "learning_goal_id",
            "learning_goals",
        ),
        ("course_exams", "course_id", "courses", "exam_id", "exams"),
    ):
        op.create_table(
            name,
            sa.Column(
                left,
                sa.Uuid(),
                sa.ForeignKey(f"public.{target}.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column(
                right,
                sa.Uuid(),
                sa.ForeignKey(f"public.{reference}.id"),
                primary_key=True,
            ),
            schema="public",
        )
        op.create_index(f"ix_public_{name}_{right}", name, [right], schema="public")
    for column, table in (("subject_id", "subjects"), ("provider_id", "providers")):
        op.add_column(
            "courses",
            sa.Column(
                column,
                sa.Uuid(),
                sa.ForeignKey(f"public.{table}.id", name=f"fk_courses_{column}"),
            ),
            schema="public",
        )
        op.create_index(f"ix_courses_{column}", "courses", [column], schema="public")
    op.add_column(
        "courses",
        sa.Column(
            "delivery_type",
            sa.String(30),
            nullable=False,
            server_default="recorded_video",
        ),
        schema="public",
    )
    op.create_check_constraint(
        "ck_courses_delivery",
        "courses",
        "delivery_type IN ('recorded_video','live_online','hybrid','small_group','one_to_one')",
        schema="public",
    )
    op.execute(
        "CREATE INDEX ix_courses_public_catalog ON public.courses (created_at DESC, id DESC) WHERE is_published=true AND approval_status='approved' AND deleted_at IS NULL"
    )


def downgrade():
    op.drop_index("ix_courses_public_catalog", table_name="courses", schema="public")
    op.drop_constraint("ck_courses_delivery", "courses", schema="public", type_="check")
    for column in ("delivery_type", "provider_id", "subject_id"):
        op.drop_column("courses", column, schema="public")
    for table in reversed(TABLES):
        op.drop_table(table, schema="public")
