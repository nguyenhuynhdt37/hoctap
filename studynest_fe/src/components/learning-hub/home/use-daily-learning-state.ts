"use client";

import { useDailyCheckIn } from "@/lib/learning-hub/home-api";
import { useMissionBoard } from "@/lib/learning-hub/mission-hooks";
import { useEffect, useState } from "react";
import { getDailyMissionState } from "./journey-state";

export function useDailyLearningState() {
  const [now, setNow] = useState(Date.now);
  const board = useMissionBoard();
  const checkIn = useDailyCheckIn();
  const overview = board.overview.data;
  const missions = getDailyMissionState(overview, Boolean(board.overview.error), now, board.pendingId, {
    checkedToday: checkIn.data?.checked_today,
    closed: checkIn.closed,
    failed: Boolean(checkIn.error),
  });
  const resetAt = missions.daily && overview ? Date.parse(overview.daily_resets_at) : Infinity;
  const nextExpiry = missions.daily?.reduce((next, { expires_at }) => expires_at ? Math.min(next, Date.parse(expires_at)) : next, resetAt) ?? resetAt;

  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setTimeout(update, Math.max(0, Math.min(15_000, nextExpiry - Date.now())));
    window.addEventListener("focus", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", update);
    };
  }, [now, nextExpiry]);

  return { now, board, checkIn, missions, xp: board.xp, streak: board.streak, source: board.source };
}
