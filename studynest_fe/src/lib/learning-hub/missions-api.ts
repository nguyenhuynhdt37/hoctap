import api from "@/lib/utils/fetcher/client/axios";
import { hubEndpoints } from "./endpoints";
import type { ClaimResult, MissionsClient, MissionsOverview, RewardInventory } from "./mission-types";

export const apiMissionsClient: MissionsClient = {
  getOverview: async () => (await api.get<MissionsOverview>(hubEndpoints.missions)).data,
  claim: async (id) => (await api.post<ClaimResult>(hubEndpoints.missionClaim(id))).data,
  getInventory: async () => (await api.get<RewardInventory>(hubEndpoints.inventory)).data,
};
