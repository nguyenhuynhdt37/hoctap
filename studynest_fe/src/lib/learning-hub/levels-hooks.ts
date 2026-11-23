"use client";

import { useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { levelsKey } from "./shop-keys";
import { getShopClient, useShopUserId } from "./shop-hooks";
import { levelPageSize, mergeLevelRewards, nextLevelFrom } from "./shop-logic";
import type { LevelsOverview } from "./shop-types";

type LevelPage = LevelsOverview & { nextFrom: number };

export function useLevelsOverview() {
  const userId = useShopUserId();
  const requesting = useRef(false);
  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite(
    (index: number, previous: LevelPage | null) => {
      if (!userId || (index > 0 && !previous)) return null;
      return [...levelsKey(userId), previous?.nextFrom] as const;
    },
    async ([, id, , from]): Promise<LevelPage> => {
      const page = await (await getShopClient(id)).getLevels({ from, count: levelPageSize });
      return { ...page, nextFrom: nextLevelFrom(page.current.level, from) };
    },
    {
      shouldRetryOnError: false,
      revalidateOnMount: true,
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  async function loadMore() {
    if (requesting.current || isValidating) return;
    requesting.current = true;
    try {
      await setSize(size + 1);
    } catch {
      // The query exposes the error alongside any already loaded levels.
    } finally {
      requesting.current = false;
    }
  }

  return {
    current: data?.[0]?.current,
    rewards: mergeLevelRewards(data ?? []),
    error, isValidating, loadMore,
    retry: () => void mutate().catch(() => undefined),
  };
}
