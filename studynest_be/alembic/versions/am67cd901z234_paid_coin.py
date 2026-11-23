"""Add paid Coin balances, Coin settings, and convert learner wallet balances to Coin."""

import sqlalchemy as sa

from alembic import op

revision = "am67cd901z234"
down_revision = "al56bc890y123"
branch_labels = None
depends_on = None

SCHEMA = "public"
DEFAULT_RATE = 10000
MIGRATION_SOURCE = "wallet_migration"

CONVERT_SQL = """
WITH todo AS (
    SELECT w.user_id, floor(w.balance / :rate)::int AS coin
    FROM public.wallets w
    WHERE w.currency = 'VND'
      AND COALESCE(w.is_locked, false) = false
      AND w.balance >= :rate
      AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur JOIN public.role r ON r.id = ur.role_id
          WHERE ur.user_id = w.user_id AND r.role_name = 'LECTURER')
      AND NOT EXISTS (
          SELECT 1 FROM public.peak_transactions p
          WHERE p.user_id = w.user_id AND p.source = :source)
),
debited AS (
    UPDATE public.wallets w
    SET balance = w.balance - t.coin * :rate, updated_at = now()
    FROM todo t WHERE w.user_id = t.user_id
    RETURNING w.user_id
),
credited AS (
    INSERT INTO public.user_paid_coin_balances (user_id, balance)
    SELECT user_id, coin FROM todo
    ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_paid_coin_balances.balance + EXCLUDED.balance,
            updated_at = now()
    RETURNING user_id
)
INSERT INTO public.peak_transactions
    (user_id, amount, type, before_balance, after_balance, source, coin_kind, metadata)
SELECT user_id, coin, 'credit', 0, coin, :source, 'paid',
       jsonb_build_object('rate_vnd', CAST(:rate AS int))
FROM todo
"""


def convert_wallets(conn, rate: int) -> None:
    """Đổi số dư ví VND của học viên sang Coin thật; chạy lại không cộng thêm lần nữa."""
    conn.execute(sa.text(CONVERT_SQL), {"rate": rate, "source": MIGRATION_SOURCE})


def upgrade() -> None:
    op.create_table(
        "user_paid_coin_balances",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("balance >= 0", name="chk_user_paid_coin_balances_positive"),
        schema=SCHEMA,
    )
    op.add_column("platform_settings", sa.Column(
        "coin_vnd_rate", sa.Integer(), nullable=False, server_default=str(DEFAULT_RATE)), schema=SCHEMA)
    op.add_column("platform_settings", sa.Column(
        "bonus_coin_max_share", sa.Numeric(4, 3), nullable=False, server_default="0.300"), schema=SCHEMA)
    op.create_check_constraint(
        "chk_platform_settings_coin_vnd_rate", "platform_settings", "coin_vnd_rate > 0", schema=SCHEMA)
    op.create_check_constraint(
        "chk_platform_settings_bonus_coin_max_share", "platform_settings",
        "bonus_coin_max_share >= 0 AND bonus_coin_max_share <= 1", schema=SCHEMA)
    op.add_column("purchase_items", sa.Column("coin_bonus_used", sa.Integer()), schema=SCHEMA)
    op.add_column("purchase_items", sa.Column("coin_paid_used", sa.Integer()), schema=SCHEMA)
    op.create_check_constraint(
        "chk_purchase_items_coin_nonneg", "purchase_items",
        "(coin_bonus_used IS NULL OR coin_bonus_used >= 0) AND (coin_paid_used IS NULL OR coin_paid_used >= 0)",
        schema=SCHEMA)
    op.add_column("peak_transactions", sa.Column(
        "coin_kind", sa.String(10), nullable=False, server_default="bonus"), schema=SCHEMA)
    op.create_check_constraint(
        "chk_peak_transactions_coin_kind", "peak_transactions", "coin_kind IN ('bonus', 'paid')", schema=SCHEMA)
    op.create_index(
        "uq_peak_transactions_paid_ref", "peak_transactions", ["user_id", "source", "event_id"],
        unique=True, schema=SCHEMA, postgresql_where=sa.text("coin_kind = 'paid' AND event_id IS NOT NULL"))

    rate = op.get_bind().execute(sa.text("SELECT coin_vnd_rate FROM public.platform_settings LIMIT 1")).scalar()
    convert_wallets(op.get_bind(), int(rate or DEFAULT_RATE))


def downgrade() -> None:
    conn = op.get_bind()
    rate = conn.execute(sa.text("SELECT coin_vnd_rate FROM public.platform_settings LIMIT 1")).scalar() or DEFAULT_RATE
    # Trả giá trị Coin thật về ví VND (1 Coin = rate đồng) trước khi gỡ bảng, để không mất tiền.
    conn.execute(sa.text("""
        UPDATE public.wallets w
        SET balance = w.balance + p.balance * :rate, updated_at = now()
        FROM public.user_paid_coin_balances p
        WHERE p.user_id = w.user_id AND p.balance > 0
    """), {"rate": int(rate)})
    op.drop_index("uq_peak_transactions_paid_ref", table_name="peak_transactions", schema=SCHEMA)
    op.drop_constraint("chk_peak_transactions_coin_kind", "peak_transactions", schema=SCHEMA)
    op.drop_column("peak_transactions", "coin_kind", schema=SCHEMA)
    op.drop_constraint("chk_purchase_items_coin_nonneg", "purchase_items", schema=SCHEMA)
    op.drop_column("purchase_items", "coin_paid_used", schema=SCHEMA)
    op.drop_column("purchase_items", "coin_bonus_used", schema=SCHEMA)
    op.drop_constraint("chk_platform_settings_bonus_coin_max_share", "platform_settings", schema=SCHEMA)
    op.drop_constraint("chk_platform_settings_coin_vnd_rate", "platform_settings", schema=SCHEMA)
    op.drop_column("platform_settings", "bonus_coin_max_share", schema=SCHEMA)
    op.drop_column("platform_settings", "coin_vnd_rate", schema=SCHEMA)
    op.drop_table("user_paid_coin_balances", schema=SCHEMA)
