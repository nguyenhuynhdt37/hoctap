import type { ClaimLevelUp } from "./shop-types";

export type MissionScope = "daily" | "course";

export type MissionTemplate =
  | "lesson.completed" | "quiz.completed" | "code.completed" | "daily_checkin.completed"
  | "chapter.complete" | "chapter.quiz_pass" | "course.complete" | "course.weekly_streak";

export type MissionStatus = "assigned" | "in_progress" | "completed" | "claimed" | "expired";

interface MissionCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

export interface MissionReward {
  xp: number;
  peak: number;
  coupon: null | { max_percent: number; valid_days: number; target: "next_course_or_combo" };
}

export interface Mission {
  id: string;
  scope: MissionScope;
  template: MissionTemplate;
  title: string;
  description: string;
  course: MissionCourse | null;
  section: null | { id: string; title: string; position: number };
  progress: { current: number; target: number };
  status: MissionStatus;
  reward: MissionReward;
  expires_at: string | null;
  completed_at: string | null;
  claimed_at: string | null;
  href: string | null;
}

export interface XpState {
  level: number;
  current_xp: number;
  required_xp: number;
  total_xp: number;
  peak_balance: number;
}

export interface MissionsOverview {
  xp: XpState;
  daily: Mission[];
  daily_resets_at: string;
  long_term: Array<{ course: MissionCourse; progress_percent: number; missions: Mission[] }>;
}

export interface ClaimResult {
  mission: Mission;
  granted: { xp: number; peak: number; coupon: null | { id: string; code_masked: string; expires_at: string } };
  xp: XpState;
  level_up: ClaimLevelUp | null;
}

export interface RewardInventory {
  peak_balance: number;
  coupons: Array<{
    id: string;
    title: string;
    code_masked: string;
    max_percent: number;
    expires_at: string;
    status: "available" | "used" | "expired" | "revoked";
  }>;
}

export interface MissionsClient {
  getOverview: () => Promise<MissionsOverview>;
  claim: (missionId: string) => Promise<ClaimResult>;
  getInventory: () => Promise<RewardInventory>;
}
