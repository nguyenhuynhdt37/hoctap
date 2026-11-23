"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { getHubDataSource } from "./data-source";
import { hubEndpoints } from "./endpoints";
import { useHubAuthStatus } from "./hooks";
import { celebrateLevelUp } from "./level-up-state";
import { shopCatalogKeys, shopInventoryKey } from "./shop-keys";
import { apiMissionsClient } from "./missions-api";
import type { ClaimResult, Mission, MissionsOverview } from "./mission-types";

const queryOptions = { shouldRetryOnError: false };
export const missionsOverviewKey = (userId: string) => [hubEndpoints.missions, userId, getHubDataSource()] as const;
export const rewardInventoryKey = (userId: string) => [hubEndpoints.inventory, userId, getHubDataSource()] as const;
export const streakKey = (userId: string) => [hubEndpoints.streak, userId] as const;
const claimingUsers = new Set<string>();

async function getMissionsClient(userId: string) {
  if (getHubDataSource() === "mock") {
    const { getMockMissionsClient } = await import("./missions-mock");
    return getMockMissionsClient(userId);
  }
  return apiMissionsClient;
}

function useMissionUserId() {
  const auth = useHubAuthStatus();
  const userId = useUserStore((state) => state.user?.id);
  return auth === "ready" ? userId : undefined;
}

function useMissionOverview() {
  const userId = useMissionUserId();
  return useSWR(userId ? missionsOverviewKey(userId) : null, async ([, id]) =>
    (await getMissionsClient(id)).getOverview(), {
    ...queryOptions,
    refreshInterval: (value) => {
      if (!value) return 0;
      const remaining = Date.parse(value.daily_resets_at) - Date.now();
      return remaining > 0 ? Math.min(Math.max(remaining, 1000), 2_147_483_647) : 15_000;
    },
  });
}

export function useGamificationStreak() {
  const userId = useMissionUserId();
  return useSWR(userId ? streakKey(userId) : null, async ([path]) =>
    (await api.get<{ current_streak: number; best_streak: number }>(path)).data, queryOptions);
}

export function useGamificationStats() {
  const overview = useMissionOverview();
  const streak = useGamificationStreak();
  return { overview, xp: overview.error ? undefined : overview.data?.xp, streak, source: getHubDataSource() };
}

export function useRewardInventory() {
  const userId = useMissionUserId();
  return useSWR(userId ? rewardInventoryKey(userId) : null, async ([, id]) =>
    (await getMissionsClient(id)).getInventory(), queryOptions);
}

function updateOverview(data: MissionsOverview, mission: Mission, xp = data.xp): MissionsOverview {
  const update = (missions: Mission[]) => missions.map((item) => item.id === mission.id ? mission : item);
  if (mission.scope === "daily") return { ...data, xp, daily: update(data.daily) };
  return {
    ...data, xp,
    long_term: data.long_term.map((group) => group.course.id === mission.course?.id
      ? { ...group, missions: update(group.missions) }
      : group),
  };
}

type ClaimFeedback =
  | { id: string; kind: "success"; result: ClaimResult }
  | { id: string; kind: "error"; error: unknown };

export function useMissionBoard() {
  const userId = useMissionUserId();
  const stats = useGamificationStats();
  const { overview } = stats;
  const { mutate } = useSWRConfig();
  const [pendingId, setPendingId] = useState<string>();
  const [feedback, setFeedback] = useState<ClaimFeedback>();

  async function claim(mission: Mission) {
    const snapshot = overview.data;
    if (!userId || !snapshot || overview.error || claimingUsers.has(userId) || mission.status !== "completed") return;
    const expiresAt = mission.expires_at ?? (mission.scope === "daily" ? snapshot.daily_resets_at : null);
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) return;
    claimingUsers.add(userId);
    setPendingId(mission.id);
    setFeedback(undefined);

    try {
      let result: ClaimResult | undefined;
      await overview.mutate(async (current = snapshot) => {
        result = await (await getMissionsClient(userId)).claim(mission.id);
        // A replay may return the original grant's snapshot. Keep newer XP and refresh from the server.
        const xp = result.xp.total_xp < current.xp.total_xp ? current.xp : result.xp;
        return updateOverview(current, result.mission, xp);
      }, {
        revalidate: false,
        rollbackOnError: true,
        optimisticData: (current) => updateOverview(current ?? snapshot, { ...mission, status: "claimed" }),
      });
      if (result) {
        setFeedback({ id: mission.id, kind: "success", result });
        celebrateLevelUp(userId, result.level_up);
        void overview.mutate().catch(() => undefined);
        for (const key of [rewardInventoryKey(userId), shopInventoryKey(userId), ...shopCatalogKeys(userId)]) {
          void mutate(key).catch(() => undefined);
        }
      }
    } catch (error) {
      setFeedback({ id: mission.id, kind: "error", error });
    } finally {
      setPendingId(undefined);
      claimingUsers.delete(userId);
    }
  }

  return { ...stats, claim, pendingId, feedback };
}
