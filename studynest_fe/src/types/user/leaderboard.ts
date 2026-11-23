import type { Equipment } from "@/lib/learning-hub/shop-types";

export type LeaderboardCategory = "xp" | "streak" | "coins" | "lessons" | "quiz";

export interface LeaderboardCategoryMeta {
  id: LeaderboardCategory;
  label: string;
  tagline: string;
  unit: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  fullname: string;
  avatar: string | null;
  level: number;
  score: number;
  secondary_value: number;
  secondary_label: string;
  current_streak: number;
  total_xp: number;
  equipment: Equipment;
  is_me: boolean;
}

export interface MyRankSummary {
  rank: number;
  total_participants: number;
  top_percent: number;
  score: number;
  secondary_value: number;
  secondary_label: string;
  level: number;
  next_rank_gap: number | null;
  next_rank_user_name: string | null;
}

export interface LeaderboardResponse {
  category: LeaderboardCategory;
  meta: LeaderboardCategoryMeta;
  total_participants: number;
  top_score: number;
  entries: LeaderboardEntry[];
  me: MyRankSummary | null;
}
