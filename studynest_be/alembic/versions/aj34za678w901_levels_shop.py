"""Add the Mây shop, equipment, and per-level reward grants."""

from uuid import UUID, uuid5

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision = "aj34za678w901"
down_revision = "ai23yz567v890"
branch_labels = None
depends_on = None

SCHEMA = "public"
GRANT_INDEX = "uq_reward_grants_user_level_kind"
ITEM_NAMESPACE = UUID("b73300e1-cf6c-4a21-8789-cf2e03ff0591")
SHOP_CATALOG = (
    ("sky-gradient", "avatar_frame", "Viền Trời Trong", "Viền chuyển màu dịu như trời sớm.", "common", 180, None),
    ("soft-cloud", "avatar_frame", "Viền Mây Ôm", "Những cụm mây mềm bao quanh ảnh đại diện.", "common", 280, None),
    ("aurora-ring", "avatar_frame", "Vòng Cực Quang", "Dải sáng xanh tím lướt theo đường viền.", "rare", 1000, None),
    ("moon-ring", "avatar_frame", "Vòng Ánh Trăng", "Viền bạc trên nền trời thanh vắng.", "epic", 2400, 10),
    ("gold-laurel", "avatar_frame", "Nguyệt Quế Vàng", "Hai nhành nguyệt quế màu mật ong nâng đường viền.", "legendary", 5200, 20),
    ("early-reader", "title", "Người Gieo Chữ", "Dành cho những buổi mở sách cùng Mây Mây.", "common", 150, None),
    ("cloud-guide", "title", "Người Dệt Mây", "Một danh hiệu cho những người tìm đường qua tầng mây.", "rare", 750, None),
    ("blue-breeze", "emblem", "Gió Lam", "Dải gió nhỏ bên cạnh tên hiển thị.", "epic", 2100, 15),
)
TEN_THEMES = ("Bình Minh", "Trăng Non", "Cực Quang", "Nguyệt Quế", "Chân Trời")
FIVE_TITLES = ("Bạn Của Mây", "Người Đón Gió", "Bạn Của Trăng", "Người Dẫn Mây", "Người Giữ Trời")


def seed_catalog() -> None:
    items = [
        {"key": key, "kind": kind, "name": name, "description": description, "rarity": rarity,
         "price": price, "unlock_level": level, "source": "shop", "asset_key": key}
        for key, kind, name, description, rarity, price, level in SHOP_CATALOG
    ]
    for level in range(5, 51, 5):
        if level % 10 == 0:
            theme = TEN_THEMES[level // 10 - 1]
            details = (
                ("avatar_frame", f"Khung {theme}", "milestone-frame"),
                ("title", f"Danh hiệu {theme}", "milestone-title"),
                ("emblem", f"Biểu tượng {theme}", "milestone-emblem"),
            )
            rarity = "legendary" if level == 50 else "epic"
        else:
            details = (("title", FIVE_TITLES[level // 10], "milestone-title"),)
            rarity = "common" if level == 5 else "rare"
        items.extend(
            {"key": f"level-{level}-{kind}", "kind": kind, "name": name,
             "description": f"Đặc quyền dành cho người học đạt cấp {level} tại Mây Mây.",
             "rarity": rarity, "price": None, "unlock_level": level, "source": "level_reward", "asset_key": asset_key}
            for kind, name, asset_key in details
        )

    for item in items:
        item["id"] = uuid5(ITEM_NAMESPACE, item["key"])
    table = sa.table(
        "shop_items", sa.column("id", sa.Uuid()), sa.column("price", sa.Integer()),
        sa.column("unlock_level", sa.Integer()),
        *(sa.column(key, sa.String()) for key in
          ("key", "kind", "name", "description", "rarity", "source", "asset_key")),
        schema=SCHEMA,
    )
    insert = pg.insert(table).values(items).on_conflict_do_nothing()
    if op.get_context().as_sql:
        op.execute(str(insert.compile(dialect=pg.dialect(), compile_kwargs={"literal_binds": True})))
    else:
        op.execute(insert)


def prepare_grant_index() -> None:
    # Only the nullable column is committed before the index build. The old app can
    # keep writing mission grants, and a retry can recover an interrupted build.
    op.execute("SET LOCAL lock_timeout = '3s'")
    op.execute("ALTER TABLE public.reward_grants ADD COLUMN IF NOT EXISTS level integer")
    with op.get_context().autocommit_block():
        if not op.get_context().as_sql:
            valid = op.get_bind().scalar(sa.text(
                "SELECT indisvalid FROM pg_catalog.pg_index WHERE indexrelid = to_regclass(:name)"
            ), {"name": f"{SCHEMA}.{GRANT_INDEX}"})
            if valid is False:
                op.drop_index(GRANT_INDEX, schema=SCHEMA, postgresql_concurrently=True)
        op.create_index(
            GRANT_INDEX, "reward_grants", ["user_id", "level", "reward_kind"],
            unique=True, postgresql_where=sa.text("level IS NOT NULL"),
            schema=SCHEMA, postgresql_concurrently=True, if_not_exists=True,
        )


def upgrade() -> None:
    prepare_grant_index()
    op.execute("SET LOCAL lock_timeout = '3s'")
    op.alter_column("reward_grants", "mission_id", nullable=True, schema=SCHEMA)
    op.drop_constraint("chk_reward_grants_kind_amount", "reward_grants", type_="check", schema=SCHEMA)
    op.execute("""
        ALTER TABLE public.reward_grants ADD CONSTRAINT chk_reward_grants_level_or_mission CHECK (
            (level IS NULL AND mission_id IS NOT NULL AND
                reward_kind IN ('xp', 'peak', 'level_up_peak', 'coupon') AND amount > 0) OR
            (level IS NOT NULL AND level >= 2 AND mission_id IS NULL AND reward_kind = 'level' AND amount >= 0)
        ) NOT VALID
    """)
    op.add_column("user_gamification_profiles", sa.Column(
        "levels_rewarded_through", sa.Integer(), nullable=False, server_default="1",
    ), schema=SCHEMA)
    op.create_table(
        "shop_items",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("key", sa.String(80), nullable=False, unique=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("rarity", sa.String(12), nullable=False),
        sa.Column("price", sa.Integer()),
        sa.Column("unlock_level", sa.Integer()),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("asset_key", sa.String(80), nullable=False),
        sa.Column("asset_palette", pg.ARRAY(sa.String())),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.UniqueConstraint("id", "kind", name="uq_shop_items_id_kind"),
        sa.CheckConstraint("kind IN ('avatar_frame', 'title', 'emblem')", name="ck_shop_items_kind"),
        sa.CheckConstraint("rarity IN ('common', 'rare', 'epic', 'legendary')", name="ck_shop_items_rarity"),
        sa.CheckConstraint(
            "(source = 'shop' AND price IS NOT NULL AND price > 0) OR "
            "(source = 'level_reward' AND price IS NULL AND unlock_level IS NOT NULL)",
            name="ck_shop_items_source_price",
        ),
        sa.CheckConstraint("unlock_level >= 2", name="ck_shop_items_unlock_level"),
        schema=SCHEMA,
    )
    op.create_table(
        "user_items",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("item_id", sa.Uuid(), sa.ForeignKey("public.shop_items.id"), primary_key=True),
        sa.Column("acquired_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("purchase_key", sa.String(128)),
        sa.Column("purchase_result", pg.JSONB()),
        sa.UniqueConstraint("user_id", "purchase_key", name="uq_user_items_purchase_key"),
        sa.CheckConstraint("(purchase_key IS NULL) = (purchase_result IS NULL)",
                           name="ck_user_items_purchase_result"),
        schema=SCHEMA,
    )
    op.create_table(
        "user_equipment",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("slot", sa.String(20), primary_key=True),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id", "item_id"], ["public.user_items.user_id", "public.user_items.item_id"],
            name="fk_user_equipment_owned", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["item_id", "slot"], ["public.shop_items.id", "public.shop_items.kind"],
            name="fk_user_equipment_kind",
        ),
        schema=SCHEMA,
    )
    # The tables are new and empty. Keep these indexes transactional.
    op.create_index("ix_shop_items_kind", "shop_items", ["kind"], schema=SCHEMA)
    op.create_index("ix_user_items_item", "user_items", ["item_id"], schema=SCHEMA)
    op.create_index("ix_user_equipment_item", "user_equipment", ["item_id"], schema=SCHEMA)
    seed_catalog()


def downgrade() -> None:
    op.drop_table("user_equipment", schema=SCHEMA)
    op.drop_table("user_items", schema=SCHEMA)
    op.drop_table("shop_items", schema=SCHEMA)
    op.drop_column("user_gamification_profiles", "levels_rewarded_through", schema=SCHEMA)
    op.execute("DELETE FROM public.reward_grants WHERE level IS NOT NULL")
    op.drop_constraint("chk_reward_grants_level_or_mission", "reward_grants", type_="check", schema=SCHEMA)
    op.create_check_constraint(
        "chk_reward_grants_kind_amount", "reward_grants",
        "reward_kind IN ('xp', 'peak', 'level_up_peak', 'coupon') AND amount > 0", schema=SCHEMA,
    )
    op.alter_column("reward_grants", "mission_id", nullable=False, schema=SCHEMA)
    # Dropping the column also drops its partial index. Posted Coin and XP stay in their ledgers.
    op.drop_column("reward_grants", "level", schema=SCHEMA)
