"use client";

import { useUserStore } from "@/stores/user";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { getHubDataSource } from "./data-source";
import { useHubAuthStatus } from "./hooks";
import { apiShopClient } from "./shop-api";
import { shopInventoryKey, shopItemsKey } from "./shop-keys";
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

export function useShopItems() {
  const id = useShopUserId();
  return useSWR<ShopItemsResponse>(id ? shopItemsKey(id) : null, async () =>
    (await getShopClient(id!)).getItems(), queryOptions);
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
      await Promise.all([
        mutate<ShopItemsResponse>(shopItemsKey(id), (data) => data && ({
          balance, items: data.items.map((entry) => entry.id === item.id ? item : entry),
        }), { revalidate: false }),
        mutate<InventoryResponse>(shopInventoryKey(id), (data) => data && ({
          ...data, balance, items: [...data.items.filter((entry) => entry.id !== item.id), item],
        }), { revalidate: false }),
      ]);
      for (const cacheKey of [shopInventoryKey(id), shopItemsKey(id)]) {
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
        mutate<ShopItemsResponse>(shopItemsKey(id), markEquipped, { revalidate: false }),
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
