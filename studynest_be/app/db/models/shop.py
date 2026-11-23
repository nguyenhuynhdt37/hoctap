from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class ShopItemRow(Base):
    __tablename__ = "shop_items"
    __table_args__ = (
        UniqueConstraint("id", "kind", name="uq_shop_items_id_kind"),
        CheckConstraint("kind IN ('avatar_frame', 'title', 'emblem')", name="ck_shop_items_kind"),
        CheckConstraint("rarity IN ('common', 'rare', 'epic', 'legendary')", name="ck_shop_items_rarity"),
        CheckConstraint(
            "(source = 'shop' AND price IS NOT NULL AND price > 0) OR "
            "(source = 'level_reward' AND price IS NULL AND unlock_level IS NOT NULL)",
            name="ck_shop_items_source_price",
        ),
        CheckConstraint("unlock_level >= 2", name="ck_shop_items_unlock_level"),
        Index("ix_shop_items_kind", "kind"),
        {"schema": "public"},
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    key: Mapped[str] = mapped_column(String(80), unique=True)
    kind: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    rarity: Mapped[str] = mapped_column(String(12))
    price: Mapped[int | None]
    unlock_level: Mapped[int | None]
    source: Mapped[str] = mapped_column(String(16))
    asset_key: Mapped[str] = mapped_column(String(80))
    asset_palette: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    is_active: Mapped[bool] = mapped_column(server_default=text("true"))


class UserItem(Base):
    __tablename__ = "user_items"
    __table_args__ = (
        UniqueConstraint("user_id", "purchase_key", name="uq_user_items_purchase_key"),
        CheckConstraint(
            "(purchase_key IS NULL) = (purchase_result IS NULL)",
            name="ck_user_items_purchase_result",
        ),
        Index("ix_user_items_item", "item_id"),
        {"schema": "public"},
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True)
    item_id: Mapped[UUID] = mapped_column(ForeignKey("public.shop_items.id"), primary_key=True)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    purchase_key: Mapped[str | None] = mapped_column(String(128))
    purchase_result: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))


class UserEquipment(Base):
    __tablename__ = "user_equipment"
    __table_args__ = (
        ForeignKeyConstraint(
            ("user_id", "item_id"), ("public.user_items.user_id", "public.user_items.item_id"),
            name="fk_user_equipment_owned", ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ("item_id", "slot"), ("public.shop_items.id", "public.shop_items.kind"),
            name="fk_user_equipment_kind",
        ),
        Index("ix_user_equipment_item", "item_id"),
        {"schema": "public"},
    )

    user_id: Mapped[UUID] = mapped_column(primary_key=True)
    slot: Mapped[str] = mapped_column(String(20), primary_key=True)
    item_id: Mapped[UUID]
