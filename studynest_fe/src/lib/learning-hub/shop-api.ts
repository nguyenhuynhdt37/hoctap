import api from "@/lib/utils/fetcher/client/axios";
import { hubEndpoints } from "./endpoints";
import type { Equipment, InventoryResponse, LevelsOverview, PurchaseResponse, ShopClient, ShopItemsResponse } from "./shop-types";

export const apiShopClient: ShopClient = {
  getLevels: async (params) => (await api.get<LevelsOverview>(hubEndpoints.levels, {
    params: { from: params?.from, count: params?.count },
  })).data,
  getItems: async (kind) => (await api.get<ShopItemsResponse>(hubEndpoints.shopItems, { params: { kind } })).data,
  purchase: async (itemId, idempotencyKey) =>
    (await api.post<PurchaseResponse>(hubEndpoints.shopPurchase(itemId), { idempotency_key: idempotencyKey })).data,
  getInventory: async () => (await api.get<InventoryResponse>(hubEndpoints.shopInventory)).data,
  setEquipment: async (slot, itemId) =>
    (await api.put<Equipment>(hubEndpoints.equipment, { slot, item_id: itemId })).data,
};
