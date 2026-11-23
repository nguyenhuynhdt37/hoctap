import { emptyEquipment, initialLevelFrom, levelPageSize, nextMilestone } from "./shop-logic";
import type { Equipment, ItemKind, LevelReward, PurchaseResponse, Rarity, ShopClient, ShopItem } from "./shop-types";
import type { XpState } from "./mission-types";

function item(kind: ItemKind, key: string, name: string, rarity: Rarity, price: number | null, unlock_level: number | null = null): ShopItem {
  return {
    id: key, key, kind, name, rarity, price, unlock_level, description: name,
    owned: false, equipped: false, purchasable: false, reason: null,
    source: price === null ? "level_reward" : "shop", asset: { key: key.replace(/-\d+$/, ""), palette: null },
  };
}

const catalog = [
  item("avatar_frame", "frame_sky", "Viền trời trong", "common", 120),
  item("avatar_frame", "frame_cloud", "Mây ôm vai", "common", 180),
  item("avatar_frame", "frame_dawn", "Nắng đầu ngày", "common", 260),
  item("avatar_frame", "frame_rain", "Mưa đầu mùa", "rare", 600),
  item("avatar_frame", "frame_rose", "Bầu trời hồng", "rare", 720),
  item("avatar_frame", "frame_moon", "Trăng đầu tháng", "rare", 950),
  item("avatar_frame", "frame_aurora", "Dải cực quang", "epic", 2200),
  item("avatar_frame", "frame_kite", "Diều qua mây", "epic", 2600),
  item("avatar_frame", "frame_laurel", "Vòng nguyệt quế", "legendary", 5400),
  item("title", "title_wind", "Bạn của gió", "common", 120),
  item("title", "title_horizon", "Người tìm chân trời", "epic", 2000),
  item("title", "title_crown", "Người dẫn đường", "legendary", 5000),
  item("emblem", "emblem_cloud", "Mây nhỏ", "common", 100),
  item("emblem", "emblem_kite", "Cánh diều", "common", 230),
  item("emblem", "emblem_moon", "Trăng non", "rare", 700),
  item("emblem", "emblem_balloon", "Khinh khí cầu", "rare", 900),
  item("emblem", "emblem_aurora", "Cực quang", "epic", 2100),
  item("emblem", "emblem_laurel", "Nhành nguyệt quế", "legendary", 5300),
];

const xpCurve = [100, 200, 300, 500, 750, 1000, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550, 1580, 1620, 1660, 1700];
export const mockXpRequired = (level: number) => xpCurve[level - 1] ?? 1700 + (level - 20) * 50;

function rewardItems(level: number) {
  if (level % 10 === 0) {
    const frame = level === 10 ? "frame_horizon" : level === 20 ? "frame_orbit" : "frame_cloud_crown";
    return [
      item("avatar_frame", `${frame}-${level}`, `Viền đảo mây cấp ${level}`, "legendary", null, level),
      item("title", `title_pilot-${level}`, `Phi công cấp ${level}`, "epic", null, level),
      item("emblem", `emblem_island-${level}`, `Đảo mây cấp ${level}`, "epic", null, level),
    ];
  }
  return level % 5 === 0
    ? [item("title", `title_wind-${level}`, `Bạn của gió cấp ${level}`, "rare", null, level)]
    : [];
}

export function mockLevelReward(level: number, current: number): LevelReward {
  const milestone = level % 10 === 0 ? "ten" : level % 5 === 0 ? "five" : "none";
  const reached = level <= current;
  return {
    level, milestone, reached, granted: reached, coupon: null,
    xp_required: mockXpRequired(Math.max(1, level - 1)),
    coins: Math.min(25 * (level - 1), 500) + (milestone === "ten" ? level * 50 : milestone === "five" ? level * 20 : 0),
    items: rewardItems(level).map((reward) => ({
      ...reward, owned: reached, reason: reached ? null : `Nhận khi lên cấp ${level}.`,
    })),
  };
}

const accounts = new Map<string, { xp: XpState; client: ShopClient }>();

export function getMockShopAccount(userId: string) {
  const existing = accounts.get(userId);
  if (existing) return existing;

  const account = {
    xp: { level: 3, current_xp: 285, required_xp: 300, total_xp: 585, peak_balance: 180 },
    client: {} as ShopClient,
  };
  const bought = new Set(["frame_sky"]);
  const replay = new Map<string, PurchaseResponse>();
  let equipment: Equipment = { ...emptyEquipment, avatar_frame: { ...catalog[0], owned: true, equipped: true } };

  const annotate = (entry: ShopItem): ShopItem => {
    const owned = bought.has(entry.id) || Boolean(entry.unlock_level && entry.unlock_level <= account.xp.level);
    const equipped = equipment[entry.kind]?.id === entry.id;
    const affordable = entry.price !== null && entry.price <= account.xp.peak_balance;
    const reason = owned ? null : entry.price === null ? `Nhận khi lên cấp ${entry.unlock_level}.` : affordable ? null : "Bạn cần thêm Coin để đổi vật phẩm này.";
    return { ...entry, owned, equipped, purchasable: !owned && affordable, reason };
  };
  const all = () => [
    ...catalog,
    ...Array.from({ length: Math.max(3, Math.floor(nextMilestone(account.xp.level) / 5)) }, (_, i) => (i + 1) * 5).flatMap(rewardItems),
  ].map(annotate);

  account.client = {
    async getLevels(params) {
      const from = params?.from ?? initialLevelFrom(account.xp.level);
      const count = params?.count ?? levelPageSize;
      const levels = new Set(Array.from({ length: count }, (_, index) => from + index));
      levels.add(nextMilestone(account.xp.level));
      return {
        current: account.xp, max_level: null,
        rewards: [...levels].sort((a, b) => a - b).map((level) => mockLevelReward(level, account.xp.level)),
      };
    },
    async getItems(kind) {
      return { balance: account.xp.peak_balance, items: all().filter((entry) => !kind || entry.kind === kind) };
    },
    async getInventory() {
      return { balance: account.xp.peak_balance, items: all().filter((entry) => entry.owned), equipment };
    },
    async purchase(id, key) {
      const previous = replay.get(key);
      if (previous) return previous;
      const entry = all().find((candidate) => candidate.id === id);
      if (!entry?.purchasable || entry.price === null) throw new Error(entry?.reason ?? "Vật phẩm này hiện chưa thể đổi.");
      bought.add(id);
      account.xp = { ...account.xp, peak_balance: account.xp.peak_balance - entry.price };
      const result = { balance: account.xp.peak_balance, item: annotate(entry) };
      replay.set(key, result);
      return result;
    },
    async setEquipment(slot, id) {
      const entry = id === null ? null : all().find((candidate) => candidate.id === id && candidate.kind === slot && candidate.owned);
      if (id !== null && !entry) throw new Error("Bạn chưa sở hữu vật phẩm này.");
      equipment = { ...equipment, [slot]: entry ? { ...entry, equipped: true } : null };
      return equipment;
    },
  };
  accounts.set(userId, account);
  return account;
}
