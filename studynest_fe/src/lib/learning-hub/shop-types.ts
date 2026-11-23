export type ItemKind = "avatar_frame" | "title" | "emblem";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Milestone = "none" | "five" | "ten";

export interface ShopItem {
  id: string;
  key: string;
  kind: ItemKind;
  name: string;
  description: string;
  rarity: Rarity;
  /** null = không bán, chỉ nhận theo cấp. */
  price: number | null;
  unlock_level: number | null;
  owned: boolean;
  equipped: boolean;
  purchasable: boolean;
  /** Lý do không mua được (tiếng Việt, do máy chủ quyết định). */
  reason: string | null;
  source: "shop" | "level_reward";
  asset: { key: string; palette: string[] | null };
}

export interface Equipment {
  avatar_frame: ShopItem | null;
  title: ShopItem | null;
  emblem: ShopItem | null;
}

export interface LevelReward {
  level: number;
  xp_required: number;
  coins: number;
  milestone: Milestone;
  items: ShopItem[];
  coupon: null | { max_percent: number; valid_days: number };
  reached: boolean;
  granted: boolean;
}

export interface LevelsOverview {
  current: { level: number; current_xp: number; required_xp: number; total_xp: number; peak_balance: number };
  max_level: null;
  rewards: LevelReward[];
}

export interface ClaimLevelUp {
  from: number;
  to: number;
  peak_bonus: number;
  rewards?: Array<{ level: number; coins: number; items: ShopItem[] }>;
}

export interface ShopItemsResponse {
  balance: number;
  items: ShopItem[];
}

export interface PurchaseResponse {
  item: ShopItem;
  balance: number;
}

export interface InventoryResponse {
  items: ShopItem[];
  equipment: Equipment;
  balance: number;
}

export interface LevelsParams {
  from?: number;
  count?: number;
}

export interface ShopClient {
  getLevels: (params?: LevelsParams) => Promise<LevelsOverview>;
  getItems: (kind?: ItemKind) => Promise<ShopItemsResponse>;
  purchase: (itemId: string, idempotencyKey: string) => Promise<PurchaseResponse>;
  getInventory: () => Promise<InventoryResponse>;
  setEquipment: (slot: ItemKind, itemId: string | null) => Promise<Equipment>;
}
