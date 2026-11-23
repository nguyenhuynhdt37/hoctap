"use client";

import { useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { levelsKey } from "./shop-keys";
import { getShopClient, useShopUserId } from "./shop-hooks";
import { mergeLevelRewards } from "./shop-logic";
import type { LevelsOverview } from "./shop-types";

type LevelPage = LevelsOverview & { nextFrom: number };

/** Cấp đầu tiên trong hệ thống (backend chỉ nhận `from >= 1`): trang /levels luôn bắt đầu từ đây. */
export const FIRST_LEVEL = 1;
/** Mỗi lần tải 25 cấp (backend cho phép tối đa 50) để lộ trình đủ dài mà không nặng. */
export const LEVELS_PER_LOAD = 25;

export function useLevelsOverview() {
  const userId = useShopUserId();
  const requesting = useRef(false);
  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite(
    (index: number, previous: LevelPage | null) => {
      if (!userId || (index > 0 && !previous)) return null;
      return [...levelsKey(userId), previous?.nextFrom ?? FIRST_LEVEL] as const;
    },
    async ([, id, , from]): Promise<LevelPage> => {
      const start = typeof from === "number" && from >= FIRST_LEVEL ? from : FIRST_LEVEL;
      const page = await (await getShopClient(id)).getLevels({ from: start, count: LEVELS_PER_LOAD });
      return { ...page, nextFrom: start + LEVELS_PER_LOAD };
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
