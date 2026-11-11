"""Retire illustration mode and add coupons scoped to one bundle."""

import sqlalchemy as sa
from alembic import op

revision = "f67a89b01c23"
down_revision = "e56f78a90b12"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "proficiency_frameworks",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        schema="public",
    )
    op.execute(
        "UPDATE public.proficiency_frameworks SET is_active=false WHERE code LIKE 'demo-%' OR code LIKE 'seed-shop-%'"
    )
    for root, versions, fk in (
        ("learning_paths", "learning_path_versions", "path_id"),
        ("course_bundles", "course_bundle_versions", "bundle_id"),
    ):
        op.add_column(
            root, sa.Column("deleted_at", sa.DateTime(timezone=True)), schema="public"
        )
        op.execute(f"""UPDATE public.{root} r SET is_active=false, deleted_at=now()
            WHERE slug LIKE 'demo-%' OR slug LIKE 'seed-shop-%'
            OR EXISTS (SELECT 1 FROM public.{versions} v WHERE v.{fk}=r.id AND v.is_demo)""")
        op.drop_column(versions, "is_demo", schema="public")
    op.create_table(
        "bundle_coupons",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "bundle_id",
            sa.Uuid(),
            sa.ForeignKey("public.course_bundles.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("code", sa.String(40), nullable=False, unique=True),
        sa.Column("discount_type", sa.String(10), nullable=False),
        sa.Column("value", sa.Numeric(12, 2), nullable=False),
        sa.Column("min_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("max_discount", sa.Numeric(12, 2)),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_uses", sa.Integer()),
        sa.Column("per_user_limit", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_by", sa.Uuid(), sa.ForeignKey("public.user.id"), nullable=False
        ),
        sa.CheckConstraint(
            "discount_type IN ('percent','fixed')", name="ck_bundle_coupon_type"
        ),
        sa.CheckConstraint(
            "value > 0 AND (discount_type <> 'percent' OR value <= 100)",
            name="ck_bundle_coupon_value",
        ),
        sa.CheckConstraint(
            "min_total >= 0 AND (max_discount IS NULL OR max_discount > 0)",
            name="ck_bundle_coupon_amount",
        ),
        sa.CheckConstraint(
            "(max_uses IS NULL OR max_uses > 0) AND per_user_limit > 0",
            name="ck_bundle_coupon_limits",
        ),
        sa.CheckConstraint("ends_at > starts_at", name="ck_bundle_coupon_dates"),
        schema="public",
    )
    op.add_column(
        "bundle_orders",
        sa.Column("coupon_id", sa.Uuid(), sa.ForeignKey("public.bundle_coupons.id")),
        schema="public",
    )
    op.add_column(
        "bundle_orders", sa.Column("coupon_code", sa.String(40)), schema="public"
    )
    op.add_column(
        "bundle_orders",
        sa.Column(
            "discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        schema="public",
    )
    op.create_index(
        "ix_bundle_orders_coupon_user",
        "bundle_orders",
        ["coupon_id", "user_id"],
        schema="public",
    )


def downgrade():
    op.drop_column("proficiency_frameworks", "is_active", schema="public")
    op.drop_index(
        "ix_bundle_orders_coupon_user", table_name="bundle_orders", schema="public"
    )
    for column in ("coupon_id", "coupon_code", "discount_amount"):
        op.drop_column("bundle_orders", column, schema="public")
    op.drop_table("bundle_coupons", schema="public")
    for root, versions in (
        ("learning_paths", "learning_path_versions"),
        ("course_bundles", "course_bundle_versions"),
    ):
        op.add_column(
            versions,
            sa.Column("is_demo", sa.Boolean(), nullable=False, server_default="false"),
            schema="public",
        )
        op.drop_column(root, "deleted_at", schema="public")
