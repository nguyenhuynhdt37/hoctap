"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { getHubDataSource } from "./data-source";
import { useHubAuthStatus } from "./hooks";
import {
  DEFAULT_COIN_VND_RATE,
  parseCoinBalances,
  type CoinBalancesResponse,
  type CoinRateResponse,
} from "./coin-logic";
import { hubEndpoints } from "./endpoints";
import { apiShopClient } from "./shop-api";
import { coinBalancesKey, shopCatalogKeys, shopInventoryKey, shopItemsKey } from "./shop-keys";
import type { InventoryResponse, ItemKind, ShopItemsResponse } from "./shop-types";

const queryOptions = { shouldRetryOnError: false };
const pendingAccounts = new Set<string>();

export async function getShopClient(userId: string) {
  if (getHubDataSource() === "mock") {
    const { getMockShopAccount } = await import("./shop-mock");
    return getMockShopAccount(userId).client;
  }
  return apiShopClient;
}

export function useShopUserId() {
  const status = useHubAuthStatus();
  const userId = useUserStore((state) => state.user?.id);
  return status === "ready" ? userId : undefined;
}

export function useShopInventory(enabled = true) {
  const id = useShopUserId();
  return useSWR<InventoryResponse>(enabled && id ? shopInventoryKey(id) : null, async () =>
    (await getShopClient(id!)).getInventory(), queryOptions);
}

export function useCoinBalances() {
  const id = useShopUserId();
  return useSWR(id ? coinBalancesKey(id) : null, async () =>
    parseCoinBalances((await api.get<CoinBalancesResponse>(hubEndpoints.coins)).data), queryOptions);
}

export function useCoinRate(): number {
  const { data } = useSWR<CoinRateResponse>(
    hubEndpoints.coinRate,
    async (url: string) => (await api.get<CoinRateResponse>(url)).data,
    { ...queryOptions, dedupingInterval: 300_000, revalidateOnFocus: false },
  );
  return data?.rate_vnd && data.rate_vnd > 0 ? data.rate_vnd : DEFAULT_COIN_VND_RATE;
}

export function useShopItems(kind?: ItemKind) {
  const id = useShopUserId();
  return useSWR(id && kind ? shopItemsKey(id, kind) : null, async ([, userId, , itemKind]) =>
    (await getShopClient(userId)).getItems(itemKind), queryOptions);
}

export function useLearnerEquipment(profileId?: string) {
  const currentId = useShopUserId();
  const current = Boolean(currentId && (!profileId || profileId === currentId));
  const fromAuth = useUserStore((state) => current ? state.user?.equipment : undefined);
  const inventory = useShopInventory(current);
  return inventory.data?.equipment ?? fromAuth;
}

export function useShopActions() {
  const userId = useShopUserId();
  const { mutate } = useSWRConfig();
  const [pending, setPending] = useState(false);

  async function run<T>(action: (id: string) => Promise<T>) {
    if (!userId || pendingAccounts.has(userId)) return;
    pendingAccounts.add(userId);
    setPending(true);
    try {
      return await action(userId);
    } finally {
      pendingAccounts.delete(userId);
      setPending(false);
    }
  }

  async function purchase(itemId: string, key: string) {
    return run(async (id) => {
      const result = await (await getShopClient(id)).purchase(itemId, key);
      const { item, balance } = result;
      const catalogKeys = shopCatalogKeys(id);
      const inventoryKey = shopInventoryKey(id);
      await Promise.all([
        ...catalogKeys.map((key) => mutate<ShopItemsResponse>(key, (data) => data && ({
          balance, items: data.items.map((entry) => entry.id === item.id ? item : entry),
        }), { revalidate: false })),
        mutate<InventoryResponse>(inventoryKey, (data) => data && ({
          ...data, balance, items: [...data.items.filter((entry) => entry.id !== item.id), item],
        }), { revalidate: false }),
      ]);
      for (const cacheKey of [inventoryKey, ...catalogKeys]) {
        void mutate(cacheKey).catch(() => undefined);
      }
      return result;
    });
  }

  async function equip(slot: ItemKind, itemId: string | null) {
    return run(async (id) => {
      const equipment = await (await getShopClient(id)).setEquipment(slot, itemId);
      const { user, setUser } = useUserStore.getState();
      if (user?.id === id) setUser({ ...user, equipment });
      const markEquipped = <T extends ShopItemsResponse>(data?: T): T | undefined => data && ({
        ...data,
        items: data.items.map((entry) => ({ ...entry, equipped: equipment[entry.kind]?.id === entry.id })),
      });
      await Promise.all([
        ...shopCatalogKeys(id).map((key) => mutate<ShopItemsResponse>(key, markEquipped, { revalidate: false })),
        mutate<InventoryResponse>(shopInventoryKey(id), (data) => data && ({
          ...markEquipped(data)!, equipment,
        }), { revalidate: false }),
      ]);
      void mutate(shopInventoryKey(id)).catch(() => undefined);
      return equipment;
    });
  }

  return { pending, purchase, equip };
}
