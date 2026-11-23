import { create } from "zustand";
import type { ClaimLevelUp } from "./shop-types";

export type LevelUpMoment = {
  userId: string;
  levelUp: ClaimLevelUp & { rewards: NonNullable<ClaimLevelUp["rewards"]> };
};

export const useLevelUpMoment = create<{ moment: LevelUpMoment | null }>(() => ({ moment: null }));

export function celebrateLevelUp(userId: string, levelUp: ClaimLevelUp | null) {
  if (!levelUp?.rewards?.length) return;
  useLevelUpMoment.setState({ moment: { userId, levelUp: { ...levelUp, rewards: levelUp.rewards } } });
}
