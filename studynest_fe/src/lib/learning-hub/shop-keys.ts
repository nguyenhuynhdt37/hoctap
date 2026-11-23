import { getHubDataSource } from "./data-source";
import { hubEndpoints } from "./endpoints";
import { itemKinds } from "./shop-logic";
import type { ItemKind } from "./shop-types";

export const shopItemsKey = (userId: string, kind: ItemKind) => [hubEndpoints.shopItems, userId, getHubDataSource(), kind] as const;
export const shopCatalogKeys = (userId: string) => itemKinds.map((kind) => shopItemsKey(userId, kind));
export const shopInventoryKey = (userId: string) => [hubEndpoints.shopInventory, userId, getHubDataSource()] as const;
export const levelsKey = (userId: string) => [hubEndpoints.levels, userId, getHubDataSource()] as const;
export const coinBalancesKey = (userId: string) => [hubEndpoints.coins, userId] as const;
