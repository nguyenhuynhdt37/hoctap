import { safeUUID } from "@/lib/utils/uuid";
import type { Equipment, ItemKind, LevelReward, ShopItem } from "./shop-types";

export const itemKinds = ["avatar_frame", "title", "emblem"] as const;
export const itemKindLabels: Record<ItemKind, string> = {
  avatar_frame: "Khung avatar",
  title: "Danh hiệu",
  emblem: "Biểu tượng",
};

export const emptyEquipment: Equipment = { avatar_frame: null, title: null, emblem: null };
export const shopInventoryHref = "/shop?tab=mine";

const number = new Intl.NumberFormat("vi-VN");
export const formatCoin = (value: number) => `${number.format(value)} Coin`;

// Older service deployments can still return the previous display label in free text.
export const coinCopy = (text: string) => text.replace(/\bpeak\b/gi, "Coin");

export function shopItemState(item: ShopItem, balance?: number, equipment?: Equipment) {
  const equipped = equipment ? equipment[item.kind]?.id === item.id : item.equipped;
  const reason = item.reason ? coinCopy(item.reason) : null;

  if (equipped) return { kind: "equipped", label: "Đang dùng" } as const;
  if (item.owned) return { kind: "owned", label: "Đã sở hữu" } as const;
  if (item.unlock_level !== null && (item.price === null || (!item.purchasable && reason && /(?:đạt|lên|mở ở) cấp /i.test(reason)))) {
    return { kind: "locked", label: `Mở ở cấp ${number.format(item.unlock_level)}`, reason } as const;
  }
  const missing = item.price !== null && balance !== undefined ? item.price - balance : 0;
  const coinBlock = !item.purchasable && reason && /(?:đủ|thiếu|thêm) (?:[\d.,]+ )?Coin\b/i.test(reason);
  if (coinBlock || ((item.purchasable || !reason) && missing > 0)) {
    return {
      kind: "blocked", label: "Chưa đủ Coin",
      reason: reason ?? `Cần thêm ${formatCoin(missing)} để đổi.`,
    } as const;
  }
  if (item.price === null || !item.purchasable) {
    return { kind: "blocked", label: "Chưa thể đổi", reason } as const;
  }
  return { kind: "available", label: "Có thể đổi" } as const;
}

export function createPurchaseConfirmation(itemId: string, createKey = safeUUID) {
  const idempotencyKey = createKey();
  return {
    itemId,
    submit: <T>(purchase: (id: string, key: string) => Promise<T>) => purchase(itemId, idempotencyKey),
  };
}

export const levelPageSize = 12;

export function initialLevelFrom(currentLevel: number) {
  return Math.max(1, currentLevel - 2);
}

export function nextMilestone(currentLevel: number) {
  return (Math.floor(currentLevel / 10) + 1) * 10;
}

export function nextLevelFrom(currentLevel: number, requestedFrom?: number) {
  // A page may also include a milestone outside its requested interval.
  return (requestedFrom ?? initialLevelFrom(currentLevel)) + levelPageSize;
}

export function mergeLevelRewards(pages: readonly { rewards: LevelReward[] }[]) {
  const rewards = new Map<number, LevelReward>();
  for (const page of pages) {
    for (const reward of page.rewards) rewards.set(reward.level, reward);
  }
  return [...rewards.values()].sort((a, b) => a.level - b.level);
}
