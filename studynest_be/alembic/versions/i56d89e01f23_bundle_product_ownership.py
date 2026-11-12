"""Explicit product ownership; legacy bundles are never assigned to an instructor."""

import sqlalchemy as sa

from alembic import op

revision = "i56d89e01f23"
down_revision = "h45c78d90e12"
branch_labels = None
depends_on = None


def upgrade():
    for column in [
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="RESTRICT")
        ),
        sa.Column(
            "origin", sa.String(30), nullable=False, server_default="legacy_admin"
        ),
        sa.Column("code", sa.String(80), server_default=sa.text("'LEGACY-' || replace(uuid_generate_v4()::text, '-', '')")),
        sa.Column("suspended_at", sa.DateTime(timezone=True)),
        sa.Column("suspension_reason", sa.Text()),
        sa.Column(
            "updated_by",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    ]:
        op.add_column("course_bundles", column, schema="public")
    op.execute(
        "UPDATE public.course_bundles SET code='LEGACY-' || replace(id::text, '-', '')"
    )
    op.alter_column("course_bundles", "code", nullable=False, schema="public")
    op.create_unique_constraint(
        "uq_bundle_product_code", "course_bundles", ["code"], schema="public"
    )
    op.create_check_constraint(
        "ck_bundle_product_origin",
        "course_bundles",
        "(origin='legacy_admin' AND owner_id IS NULL) OR (origin='lecturer' AND owner_id IS NOT NULL)",
        schema="public",
    )
    op.create_index(
        "ix_bundle_owner_active",
        "course_bundles",
        ["owner_id", "is_active"],
        schema="public",
    )
    op.execute("""CREATE FUNCTION public.guard_bundle_product_owner() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.origin IS DISTINCT FROM OLD.origin OR NEW.code IS DISTINCT FROM OLD.code THEN
        RAISE EXCEPTION 'Bundle identity and owner are immutable';
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER immutable_bundle_product_owner BEFORE UPDATE ON public.course_bundles FOR EACH ROW EXECUTE FUNCTION public.guard_bundle_product_owner()"
    )


def downgrade():
    if op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM public.course_bundles WHERE origin='lecturer')"
        )
    ):
        raise RuntimeError(
            "Export instructor-owned bundles before removing ownership schema"
        )
    op.execute("DROP TRIGGER immutable_bundle_product_owner ON public.course_bundles")
    op.execute("DROP FUNCTION public.guard_bundle_product_owner()")
    op.drop_index(
        "ix_bundle_owner_active", table_name="course_bundles", schema="public"
    )
    op.drop_constraint("ck_bundle_product_origin", "course_bundles", schema="public")
    op.drop_constraint("uq_bundle_product_code", "course_bundles", schema="public")
    for column in [
        "owner_id",
        "origin",
        "code",
        "suspended_at",
        "suspension_reason",
        "updated_by",
        "created_at",
        "updated_at",
    ]:
        op.drop_column("course_bundles", column, schema="public")
