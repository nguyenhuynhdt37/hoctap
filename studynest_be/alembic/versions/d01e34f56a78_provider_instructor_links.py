"""Replace organization roles with audited admin-granted lecturer links."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d01e34f56a78"
down_revision = "c90d23e45f67"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "provider_membership_events",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "provider_id",
            sa.Uuid(),
            sa.ForeignKey("public.providers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("public.user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "actor_id", sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="RESTRICT")
        ),
        sa.Column("action", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column(
            "details",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "action IN ('legacy_imported','granted','revoked')",
            name="ck_provider_membership_event_action",
        ),
        sa.CheckConstraint(
            "status IN ('active','inactive')",
            name="ck_provider_membership_event_status",
        ),
        sa.CheckConstraint(
            "action = 'legacy_imported' OR actor_id IS NOT NULL",
            name="ck_provider_membership_event_actor",
        ),
        sa.CheckConstraint(
            "action != 'revoked' OR (reason IS NOT NULL AND length(trim(reason)) > 0)",
            name="ck_provider_membership_event_reason",
        ),
        schema="public",
    )
    op.create_index(
        "ix_provider_membership_events_provider_time",
        "provider_membership_events",
        ["provider_id", "occurred_at", "id"],
        schema="public",
    )
    # Preserve every legacy record before removing its role. Unknown historical
    # actors/times remain unknown; migration does not invent an admin decision.
    op.execute("""
        INSERT INTO public.provider_membership_events(provider_id,user_id,action,status,reason,details)
        SELECT m.provider_id,m.user_id,'legacy_imported',m.status,
          'Chuyển đổi quan hệ cũ sang mô hình ba tác nhân',
          jsonb_build_object('legacy_role',m.role,'legacy_status',m.status,'legacy_joined_at',m.joined_at)
        FROM public.provider_members m
    """)
    # A provider relation is now exclusively a lecturer link. Archive above is
    # retained for non-lecturer accounts; no provider data or account is deleted.
    op.execute("""
        DELETE FROM public.provider_members m WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles ur JOIN public.role r ON r.id=ur.role_id
          WHERE ur.user_id=m.user_id AND r.role_name='LECTURER'
        )
    """)
    op.execute("""
        UPDATE public.provider_members m SET status='inactive' FROM public."user" u
        WHERE u.id=m.user_id AND (u.is_banned IS TRUE OR u.deleted_at IS NOT NULL)
    """)
    for column in ["granted_by", "revoked_by"]:
        op.add_column(
            "provider_members",
            sa.Column(
                column, sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="RESTRICT")
            ),
            schema="public",
        )
    for column in ["granted_at", "revoked_at"]:
        op.add_column(
            "provider_members",
            sa.Column(column, sa.DateTime(timezone=True)),
            schema="public",
        )
    op.add_column(
        "provider_members", sa.Column("revocation_reason", sa.Text()), schema="public"
    )
    op.drop_constraint(
        "ck_provider_member_role", "provider_members", schema="public", type_="check"
    )
    op.drop_column("provider_members", "role", schema="public")


def downgrade():
    # Downgrade is only valid before operational events after the migration.
    # Otherwise restoring old roles would silently reinterpret new permissions.
    connection = op.get_bind()
    if connection.scalar(
        sa.text(
            "SELECT count(*) FROM public.provider_membership_events WHERE action <> 'legacy_imported'"
        )
    ):
        raise RuntimeError(
            "Cannot downgrade after link decisions; restore from an audited backup instead"
        )
    op.add_column(
        "provider_members",
        sa.Column("role", sa.String(20), server_default="instructor", nullable=False),
        schema="public",
    )
    op.execute("""
        INSERT INTO public.provider_members(provider_id,user_id,role,status,joined_at)
        SELECT provider_id,user_id,details->>'legacy_role',details->>'legacy_status',
          (details->>'legacy_joined_at')::timestamptz
        FROM public.provider_membership_events WHERE action='legacy_imported'
        ON CONFLICT(provider_id,user_id) DO UPDATE SET role=excluded.role,status=excluded.status,joined_at=excluded.joined_at
    """)
    op.alter_column("provider_members", "role", server_default=None, schema="public")
    op.create_check_constraint(
        "ck_provider_member_role",
        "provider_members",
        "role IN ('owner','manager','instructor','editor')",
        schema="public",
    )
    for column in [
        "granted_by",
        "revoked_by",
        "granted_at",
        "revoked_at",
        "revocation_reason",
    ]:
        op.drop_column("provider_members", column, schema="public")
    op.drop_table("provider_membership_events", schema="public")
