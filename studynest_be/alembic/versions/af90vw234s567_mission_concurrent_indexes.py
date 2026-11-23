"""Build mission and entitlement lookup indexes without blocking writes."""

import sqlalchemy as sa
from alembic import op

revision = "af90vw234s567"
down_revision = "ae89uv123r456"
branch_labels = None
depends_on = None

INDEXES = (
    ("uq_user_missions_daily_template", "user_missions", ("user_id", "cycle_date", "template_key"),
     "scope = 'daily'"),
    ("uq_user_missions_course_template", "user_missions", ("user_id", "course_id", "template"),
     "scope = 'course' AND section_id IS NULL"),
    ("uq_user_missions_chapter_template", "user_missions", ("user_id", "course_id", "section_id", "template"),
     "scope = 'course' AND section_id IS NOT NULL"),
    ("ix_enrollments_active_user_course", "course_enrollments", ("user_id", "course_id"),
     "status = 'active'"),
    ("ix_user_reward_inventory_coupons", "user_reward_inventory", ("user_id",),
     "reward_type = 'coupon' AND reward_instance_id IS NOT NULL"),
    ("uq_user_reward_inventory_coupon_instance", "user_reward_inventory", ("reward_instance_id",),
     "reward_type = 'coupon' AND reward_instance_id IS NOT NULL"),
    ("ix_reward_instances_source_mission", "reward_instances", ("source_mission_id",),
     "source_mission_id IS NOT NULL"),
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for name, table, columns, predicate in INDEXES:
            if not op.get_context().as_sql:
                valid = op.get_bind().scalar(sa.text("""
                    SELECT i.indisvalid
                    FROM pg_catalog.pg_index AS i
                    WHERE i.indexrelid = to_regclass(:index_name)
                """), {"index_name": f"public.{name}"})
                if valid is False:
                    op.drop_index(name, schema="public", postgresql_concurrently=True)
            op.create_index(
                name, table, list(columns), schema="public", unique=name.startswith("uq_"),
                postgresql_where=sa.text(predicate), if_not_exists=True, postgresql_concurrently=True,
            )
        op.execute("ALTER TABLE public.user_missions VALIDATE CONSTRAINT fk_user_missions_template")
        op.execute("ALTER TABLE public.user_missions VALIDATE CONSTRAINT chk_user_missions_scope")
        op.execute("ALTER TABLE public.reward_instances VALIDATE CONSTRAINT fk_reward_instances_source_mission")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, *_ in reversed(INDEXES):
            op.drop_index(name, schema="public", if_exists=True, postgresql_concurrently=True)
