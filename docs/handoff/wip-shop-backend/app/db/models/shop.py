from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer,
    String, Text, UniqueConstraint, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class ShopItems(Base):
    __tablename__ = "shop_items"
    __table_args__ = (
        UniqueConstraint("key", name="uq_shop_items_key"),
        UniqueConstraint("id", "kind", name="uq_shop_items_id_kind"),
        CheckConstraint("kind IN ('avatar_frame', 'title', 'emblem')", name="chk_shop_items_kind"),
        CheckConstraint("rarity IN ('common', 'rare', 'epic', 'legendary')", name="chk_shop_items_rarity"),
        CheckConstraint("unlock_level IS NULL OR unlock_level >= 2", name="chk_shop_items_unlock_level"),
        CheckConstraint(
            "(source = 'shop' AND price IS NOT NULL AND price > 0) OR "
            "(source = 'level_reward' AND price IS NULL AND unlock_level IS NOT NULL)",
            name="chk_shop_items_source_price",
        ),
        {"schema": "public"},
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    key: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    rarity: Mapped[str] = mapped_column(String(12))
    price: Mapped[int | None] = mapped_column(Integer)
    unlock_level: Mapped[int | None] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20))
    asset_key: Mapped[str] = mapped_column(String(100))
    asset_palette: Mapped[list[str] | None] = mapped_column(JSONB(none_as_null=True))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class UserItems(Base):
    __tablename__ = "user_items"
    __table_args__ = (
        Index("uq_user_items_purchase_key", "user_id", "purchase_key", unique=True,
              postgresql_where=text("purchase_key IS NOT NULL")),
        Index("ix_user_items_item", "item_id"),
        CheckConstraint(
            "(purchase_key IS NULL AND purchase_result IS NULL) OR "
            "(purchase_key IS NOT NULL AND purchase_result IS NOT NULL)",
            name="chk_user_items_purchase",
        ),
        {"schema": "public"},
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True)
    item_id: Mapped[UUID] = mapped_column(ForeignKey("public.shop_items.id"), primary_key=True)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    purchase_key: Mapped[str | None] = mapped_column(String(128))
    purchase_result: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))


class UserEquipment(Base):
    __tablename__ = "user_equipment"
    __table_args__ = (
        ForeignKeyConstraint(
            ("user_id", "item_id"), ("public.user_items.user_id", "public.user_items.item_id"),
            ondelete="CASCADE", name="fk_user_equipment_owned_item",
        ),
        ForeignKeyConstraint(
            ("item_id", "slot"), ("public.shop_items.id", "public.shop_items.kind"),
            name="fk_user_equipment_item_slot",
        ),
        Index("ix_user_equipment_item_slot", "item_id", "slot"),
        {"schema": "public"},
    )

    user_id: Mapped[UUID] = mapped_column(primary_key=True)
    slot: Mapped[str] = mapped_column(String(20), primary_key=True)
    item_id: Mapped[UUID]
