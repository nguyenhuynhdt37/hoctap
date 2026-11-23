"""Snapshot coupon settlement, record platform expense, and configure refund quota."""

import sqlalchemy as sa

from alembic import op

revision = "ak45ab789x012"
down_revision = "aj34za678w901"
branch_labels = None
depends_on = None

SCHEMA = "public"
INDEXES = (
    ("uq_instructor_earnings_purchase_item", "instructor_earnings", "purchase_item_id"),
    ("uq_reward_instances_discount", "reward_instances", "discount_id"),
)
COLUMNS = (
    ("platform_settings", "refund_max_courses_per_month integer NOT NULL DEFAULT 3 CHECK (refund_max_courses_per_month >= 0)"),
    ("platform_settings", "monthly_platform_coupon_budget numeric(14,2) CHECK (monthly_platform_coupon_budget >= 0)"),
    ("purchase_items", "settlement_base_price numeric(12,2)"),
    ("purchase_items", "settlement_platform_fee numeric(5,4)"),
    ("purchase_items", "coupon_sponsor varchar(10) CHECK (coupon_sponsor IN ('platform', 'instructor'))"),
    ("instructor_earnings", "purchase_item_id uuid"),
    ("bundle_orders", "reward_discount_id uuid"),
    ("bundle_coupons", "sponsor varchar(10) CHECK (sponsor IN ('platform', 'instructor'))"),
    ("reward_instances", "discount_id uuid"),
    ("reward_instances", "source_course_id uuid"),
)
FOREIGN_KEYS = (
    ("instructor_earnings", "purchase_item_id", "purchase_items", "fk_instructor_earnings_purchase_item", " ON DELETE CASCADE"),
    ("bundle_orders", "reward_discount_id", "discounts", "fk_bundle_orders_reward_discount", ""),
    ("reward_instances", "discount_id", "discounts", "fk_reward_instances_discount", ""),
    ("reward_instances", "source_course_id", "courses", "fk_reward_instances_source_course", " ON DELETE SET NULL"),
)


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout = '3s'")
    for table, column in COLUMNS:
        op.execute(f"ALTER TABLE public.{table} ADD COLUMN IF NOT EXISTS {column}")
    with op.get_context().autocommit_block():
        for name, table, column in INDEXES:
            if not op.get_context().as_sql:
                valid = op.get_bind().scalar(sa.text(
                    "SELECT indisvalid FROM pg_catalog.pg_index WHERE indexrelid = to_regclass(:name)"
                ), {"name": f"{SCHEMA}.{name}"})
                if valid is False:
                    op.drop_index(name, schema=SCHEMA, postgresql_concurrently=True)
            op.create_index(
                name, table, [column], unique=True, schema=SCHEMA,
                postgresql_where=sa.text(f"{column} IS NOT NULL"),
                postgresql_concurrently=True, if_not_exists=True,
            )
    op.execute("SET LOCAL lock_timeout = '3s'")
    for table, column, target, name, on_delete in FOREIGN_KEYS:
        op.execute(
            f"ALTER TABLE public.{table} ADD CONSTRAINT {name} FOREIGN KEY ({column}) "
            f"REFERENCES public.{target}(id){on_delete} NOT VALID"
        )
    op.create_table(
        "platform_coupon_costs",
        sa.Column("purchase_item_id", sa.Uuid(), sa.ForeignKey("public.purchase_items.id"), primary_key=True),
        sa.Column("discount_id", sa.Uuid(), sa.ForeignKey("public.discounts.id")),
        sa.Column("bundle_coupon_id", sa.Uuid(), sa.ForeignKey("public.bundle_coupons.id")),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("reversed_at", sa.DateTime(timezone=True)),
        sa.Column("refund_transaction_id", sa.Uuid(), sa.ForeignKey("public.transactions.id")),
        sa.CheckConstraint("amount > 0", name="ck_platform_coupon_cost_amount"),
        sa.CheckConstraint("(discount_id IS NOT NULL) <> (bundle_coupon_id IS NOT NULL)", name="ck_platform_coupon_cost_source"),
        schema=SCHEMA,
    )
    op.create_index("ix_platform_coupon_costs_created_at", "platform_coupon_costs", ["created_at"], schema=SCHEMA)


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, _, _ in reversed(INDEXES):
            op.drop_index(name, schema=SCHEMA, postgresql_concurrently=True, if_exists=True)
    op.execute("SET LOCAL lock_timeout = '3s'")
    op.drop_table("platform_coupon_costs", schema=SCHEMA)
    for table, _, _, name, _ in reversed(FOREIGN_KEYS):
        op.drop_constraint(name, table, schema=SCHEMA, type_="foreignkey")
    for table, column in reversed(COLUMNS):
        op.drop_column(table, column.split()[0], schema=SCHEMA)
