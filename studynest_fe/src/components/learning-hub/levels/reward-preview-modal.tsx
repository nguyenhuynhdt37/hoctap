"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Cloud, Crown, Gift, Lock, Ticket } from "pulsoicon-react";
import { Badge, Button, CoinBadge, Modal } from "@/components/ui";
import { coinCopy } from "@/lib/learning-hub/shop-logic";
import type { Equipment, LevelReward, ShopItem } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user";
import { EmblemIcon, FramedAvatar, RarityBadge, TitleBadge } from "../shop/item-art";
import { getRealmTheme } from "./realm-themes";

const number = new Intl.NumberFormat("vi-VN");

const KIND_LABELS: Record<ShopItem["kind"], string> = {
  avatar_frame: "Khung avatar",
  title: "Danh hiệu",
  emblem: "Huy hiệu",
};

interface RewardPreviewModalProps {
  reward: LevelReward | null;
  initialItemId?: string | null;
  currentLevel: number;
  totalXp: number;
  onClose: () => void;
}

export function RewardPreviewModal({
  reward,
  initialItemId,
  currentLevel,
  totalXp,
  onClose,
}: RewardPreviewModalProps) {
  const user = useUserStore((state) => state.user);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId ?? null);

  useEffect(() => {
    if (!reward) {
      setSelectedItemId(null);
      return;
    }
    if (initialItemId && reward.items.some((item) => item.id === initialItemId)) {
      setSelectedItemId(initialItemId);
    } else {
      setSelectedItemId(reward.items[0]?.id ?? null);
    }
  }, [reward, initialItemId]);

  if (!reward) return null;

  const reached = reward.reached || reward.level <= currentLevel;
  const xpRemaining = Math.max(0, reward.xp_required - totalXp);
  const realm = getRealmTheme(Math.floor((reward.level - 1) / 10));

  const selectedItem =
    reward.items.find((item) => item.id === selectedItemId) ?? reward.items[0] ?? null;

  // Tự động ướm thử toàn bộ vật phẩm của cấp này lên hồ sơ học viên
  const previewEquipment: Equipment = {
    avatar_frame:
      reward.items.find((i) => i.kind === "avatar_frame") ?? user?.equipment?.avatar_frame ?? null,
    title: reward.items.find((i) => i.kind === "title") ?? user?.equipment?.title ?? null,
    emblem: reward.items.find((i) => i.kind === "emblem") ?? user?.equipment?.emblem ?? null,
  };

  const displayName = user?.fullname?.trim() || "Học viên Mây Mây";

  return (
    <Modal
      open={Boolean(reward)}
      onClose={onClose}
      size="lg"
      title={`Ướm thử quà Cấp ${number.format(reward.level)}`}
      description={`${realm.name} · Mốc ${number.format(reward.xp_required)} XP`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="min-h-11 rounded-full px-5">
            Đóng lại
          </Button>
          <Link
            href="/shop"
            onClick={onClose}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Gift aria-hidden="true" animated={false} className="size-4" />
            <span>Mở Cửa hàng Mây</span>
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {/* Sân khấu ướm thử trên Hộ chiếu cá nhân */}
        <div
          className={cn(
            "relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br p-5 sm:p-6",
            realm.sanctuaryBg,
            realm.sanctuaryBorder,
          )}
        >
          <Cloud
            aria-hidden="true"
            animated={false}
            strokeWidth={0.7}
            className="pointer-events-none absolute -right-8 -bottom-10 -z-10 size-44 text-surface/80"
          />

          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="relative grid size-24 shrink-0 place-items-center rounded-full bg-surface/90 p-1 shadow-md ring-1 ring-primary-pastel/70">
              <FramedAvatar
                equipment={previewEquipment}
                src={user?.avatar}
                name={displayName}
                className="size-20 text-xl"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="text-lg font-extrabold text-foreground">{displayName}</span>
                {previewEquipment.emblem && (
                  <EmblemIcon item={previewEquipment.emblem} className="size-7" />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {previewEquipment.title ? (
                  <TitleBadge item={previewEquipment.title} />
                ) : (
                  <Badge variant="primary">Cấp {number.format(reward.level)}</Badge>
                )}
                <CoinBadge
                  kind="white"
                  amount={`+${number.format(reward.coins)}`}
                  surface="light"
                  size="sm"
                />
              </div>

              <p className="text-xs font-medium text-muted-foreground">
                {reached ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-success-foreground">
                    <Check aria-hidden="true" animated={false} className="size-3.5" />
                    Bạn đã mở khóa chặng này{reward.granted ? " và nhận trọn bộ quà." : "."}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Lock aria-hidden="true" animated={false} className="size-3.5 text-primary" />
                    Còn thiếu{" "}
                    <strong className="font-bold text-primary tabular-nums">
                      {number.format(xpRemaining)} XP
                    </strong>{" "}
                    để sở hữu bộ quà này.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Danh sách các vật phẩm trong cấp để chọn xem chi tiết */}
        {reward.items.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Vật phẩm nhận được ({reward.items.length})
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {reward.items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary-light/70 shadow-xs ring-1 ring-primary/30"
                        : "border-border bg-surface hover:border-primary-pastel hover:bg-background",
                    )}
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface">
                      {item.kind === "emblem" ? (
                        <EmblemIcon item={item} decorative className="size-8" />
                      ) : item.kind === "avatar_frame" ? (
                        <FramedAvatar
                          name={displayName}
                          equipment={{ avatar_frame: item }}
                          className="size-9 text-xs"
                        />
                      ) : (
                        <Crown
                          aria-hidden="true"
                          animated={false}
                          className="size-5 text-primary"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {coinCopy(item.name)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {KIND_LABELS[item.kind]}
                        </span>
                        <RarityBadge rarity={item.rarity} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedItem && (
              <div className="rounded-2xl border border-border bg-background/80 p-3.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-foreground">{coinCopy(selectedItem.name)}</span>
                  <RarityBadge rarity={selectedItem.rarity} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {selectedItem.description?.trim()
                    ? coinCopy(selectedItem.description)
                    : `Phần thưởng đặc biệt dành cho học viên chinh phục Cấp ${number.format(reward.level)} tại ${realm.name}.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vé ưu đãi kiểu Boarding Pass nếu có */}
        {(reward.coupon || reward.milestone === "ten") && (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-accent-border bg-accent/45 p-3.5 text-accent-foreground">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-accent-foreground shadow-xs">
              <Ticket aria-hidden="true" animated={false} className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wider uppercase">Vé ưu đãi Đảo Mây Lớn</p>
              <p className="mt-0.5 text-sm font-semibold">
                {reward.coupon
                  ? `Mã giảm đến ${reward.coupon.max_percent}% · Hiệu lực ${reward.coupon.valid_days} ngày kể từ lúc nhận`
                  : "Mã giảm giá đặc biệt đang được cập nhật"}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
