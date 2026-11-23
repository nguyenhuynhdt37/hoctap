"use client";

import { useCookieUserStatus } from "@/components/shared/user-loader";
import { useAuthBootstrapStatus } from "@/hooks/auth/useAuthedSWR";
import { isDpopMode } from "@/lib/auth/mode";
import { useUserStore } from "@/stores/user";
import useSWR from "swr";
import { apiLearningHubClient } from "./api-client";
import { hubEndpoints } from "./endpoints";
import { getHubDataSource } from "./data-source";
import type { HubDataSource, LearningHubApi, ReviewQueueParams } from "./types";

/**
 * Non-sensitive localStorage flag indicating the browser previously had a logged-in user.
 * Never stores tokens, user IDs, or personal data. All accesses are wrapped in try/catch.
 */
const LOGGED_IN_HINT_KEY = "maymay_hub_logged_in_hint";

export function readLoggedInHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LOGGED_IN_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLoggedInHint(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOGGED_IN_HINT_KEY, "1");
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
}

export async function getLearningHubApi(userId?: string): Promise<LearningHubApi> {
  if (getHubDataSource() === "mock") {
    const { getMockLearningHubClient } = await import("./mock-client");
    return getMockLearningHubClient(userId);
  }
  return apiLearningHubClient;
}

export function useHubAuthStatus() {
  const dpopStatus = useAuthBootstrapStatus((state) => state.status);
  const cookieStatus = useCookieUserStatus();
  return isDpopMode ? dpopStatus : cookieStatus;
}

export interface UseLearningHubQueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  retry: () => void;
  source: HubDataSource;
}

export function useLearningHubQuery<T>(
  key: string | null,
  fetcher: (client: LearningHubApi) => Promise<T>,
): UseLearningHubQueryResult<T> {
  const authStatus = useHubAuthStatus();
  const userId = useUserStore((state) => state.user?.id);
  const source = getHubDataSource();
  const { data, error, isValidating, mutate } = useSWR<T, Error>(
    authStatus === "ready" && userId && key ? [key, userId, source] : null,
    async () => fetcher(await getLearningHubApi(userId)),
    { shouldRetryOnError: false },
  );

  return {
    data,
    error,
    isLoading: Boolean(key && !data && !error),
    isValidating,
    retry: () => void mutate().catch(() => undefined),
    source,
  };
}

export const reviewQueuePrefix = "hub:review-queue:";
export const reviewQueueKey = (params?: ReviewQueueParams) =>
  `${reviewQueuePrefix}${params?.course_id ?? ""}:${params?.limit ?? ""}`;

export function useHubReviewQueue(params?: ReviewQueueParams) {
  return useLearningHubQuery(
    reviewQueueKey(params),
    (client) => client.getReviewQueue(params),
  );
}

export function useHubMasteryCourses() {
  return useLearningHubQuery("hub:mastery-courses", (client) => client.getMasteryCourses());
}

export function useHubCourseMastery(courseId: string | null) {
  return useLearningHubQuery(courseId ? `hub:mastery:${courseId}` : null, (client) => client.getCourseMastery(courseId!));
}

export const goalsKey = "hub:goals";
export const goalKey = (id: string) => `hub:goal:${id}`;
export const goalPlanKey = (id: string) => `hub:goal-plan:${id}`;

export function useHubGoals() {
  return useLearningHubQuery(goalsKey, (client) => client.getGoals());
}

export function useHubGoal(goalId?: string) {
  return useLearningHubQuery(goalId ? goalKey(goalId) : null, (client) => client.getGoal(goalId!));
}

export function useHubGoalPlan(goalId?: string) {
  return useLearningHubQuery(goalId ? goalPlanKey(goalId) : null, (client) => client.getGoalPlan(goalId!));
}

export function useWeeklyReport() {
  return useLearningHubQuery(hubEndpoints.weeklyReport, (client) => client.getWeeklyReport());
}

export function useLearningBadges() {
  return useLearningHubQuery(hubEndpoints.badges, (client) => client.getBadges());
}
