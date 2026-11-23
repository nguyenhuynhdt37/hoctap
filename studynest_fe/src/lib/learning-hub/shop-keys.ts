import { getHubDataSource } from "./data-source";
import { hubEndpoints } from "./endpoints";

export const shopItemsKey = (userId: string) => [hubEndpoints.shopItems, userId, getHubDataSource()] as const;
export const shopInventoryKey = (userId: string) => [hubEndpoints.shopInventory, userId, getHubDataSource()] as const;
export const levelsKey = (userId: string) => [hubEndpoints.levels, userId, getHubDataSource()] as const;
