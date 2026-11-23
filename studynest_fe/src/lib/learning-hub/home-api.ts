"use client";

import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import api from "@/lib/utils/fetcher/client/axios";
import type { BundleReceipt, LearningPath } from "@/types/learning-paths";
import type { ActiveLessonResponse } from "@/types/user/activeLesson";
import type { CoursesMeResponse } from "@/types/user/courses-me";
import type { CurriculumResponse } from "@/types/user/curriculum";
import { isAxiosError } from "axios";
import { useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useUserStore } from "@/stores/user";
import { useHubAuthStatus } from "./hooks";
import { hubEndpoints } from "./endpoints";
import { missionsOverviewKey, rewardInventoryKey, streakKey } from "./mission-hooks";

const queryOptions = { shouldRetryOnError: false };
const { checkIn: checkInPath, activity: activityPath } = hubEndpoints;

interface Reward {
  day_number: number;
  reward_type: string;
  reward_amount: number | null;
}

interface CheckInDay {
  day_number: number;
  calendar_date?: string | null;
  checkin_date: string | null;
  is_checked: boolean;
  is_today?: boolean;
  is_missed?: boolean;
  reward: Reward | null;
}

interface CheckInStatus {
  checked_today: boolean;
  cycle_days: number;
  current_day_in_cycle: number;
  today_reward: Reward | null;
  next_reward: Reward | null;
  calendar: CheckInDay[];
}

interface CheckInClaim {
  calendar: CheckInDay[];
  current_day: number;
  current_streak: number;
  best_streak: number;
}

export function useCheckInStatus() {
  const query = useAuthedSWR<CheckInStatus>(checkInPath, queryOptions);
  const closed = isAxiosError(query.error)
    && query.error.response?.status === 404
    && query.error.response.data?.detail?.code === "NO_ACTIVE_EVENT";
  return { ...query, closed };
}

export function useDailyCheckIn() {
  const query = useCheckInStatus();
  const { mutate } = useSWRConfig();
  const userId = useUserStore((state) => state.user?.id ?? null);
  const inFlight = useRef(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<unknown>();

  async function claim() {
    if (!query.data || query.data.checked_today || inFlight.current) return;
    inFlight.current = true;
    setClaiming(true);
    setClaimError(undefined);
    try {
      const { data } = await api.post<CheckInClaim>(checkInPath);
      await query.mutate({
        ...query.data,
        checked_today: true,
        current_day_in_cycle: data.current_day,
        today_reward: null,
        calendar: data.calendar,
      }, { revalidate: false });
      if (userId) await mutate(streakKey(userId), (streak?: { current_streak: number; best_streak: number }) => ({
        ...streak, current_streak: data.current_streak, best_streak: data.best_streak,
      }), { revalidate: false });
    } catch (error) {
      // A parallel claim may already have checked in from another tab.
      if (!isAxiosError(error) || error.response?.status !== 409) {
        setClaimError(error);
        return;
      }
      await query.mutate({ ...query.data, checked_today: true, today_reward: null }, { revalidate: false });
    } finally {
      inFlight.current = false;
      setClaiming(false);
    }
    await Promise.allSettled([
      query.mutate(),
      userId && mutate(streakKey(userId)),
      mutate([activityPath, userId]),
      userId && mutate(missionsOverviewKey(userId)),
      userId && mutate(rewardInventoryKey(userId)),
      userId && mutate((key) => Array.isArray(key) && key[1] === userId
        && (key[0] === hubEndpoints.badges || key[0] === hubEndpoints.weeklyReport)),
    ]);
  }

  return { ...query, claiming, claimError, claim };
}

export function useLearningActivity() {
  return useAuthedSWR<{ activities: {
    action_type: string;
    created_at: string | null;
    metadata?: { course_id?: string };
  }[] }>(activityPath, queryOptions);
}

export function usePurchasedCourses(page = 1, size = 12) {
  return useAuthedSWR<CoursesMeResponse>(
    `${hubEndpoints.purchases}?page=${page}&size=${size}&sort_by=enrolled_at&order=desc`,
    queryOptions,
  );
}

async function findUnfinishedCourse(firstPage: CoursesMeResponse, preferredId?: string) {
  const unfinished = firstPage.courses.filter((course) => (course.progress_percent ?? 0) < 100);
  const preferred = unfinished.find(({ id }) => id === preferredId);
  if (preferred) return preferred;
  let fallback = unfinished[0];
  // Check later pages when the latest activity belongs to an older enrollment.
  for (let page = 2; (preferredId || !fallback) && (page - 1) * firstPage.size < firstPage.total; page++) {
    const { data } = await api.get<CoursesMeResponse>(hubEndpoints.purchases, {
      params: { page, size: firstPage.size, sort_by: "enrolled_at", order: "desc" },
    });
    const candidates = data.courses.filter((course) => (course.progress_percent ?? 0) < 100);
    const match = candidates.find(({ id }) => id === preferredId);
    if (match) return match;
    fallback ??= candidates[0];
    if (!data.courses.length) break;
  }
  return fallback ?? null;
}

export function useLatestUnfinishedCourse() {
  const purchases = usePurchasedCourses();
  const activity = useLearningActivity();
  const userId = useUserStore((state) => state.user?.id);
  const recentId = activity.data?.activities.find(({ action_type, metadata }) => {
    if (!metadata?.course_id || !["lesson.completed", "quiz.completed", "code.completed"].includes(action_type)) return false;
    const known = purchases.data?.courses.find(({ id }) => id === metadata.course_id);
    return (known?.progress_percent ?? 0) < 100;
  })?.metadata?.course_id;
  const recentPurchased = purchases.data?.courses.find(({ id }) => id === recentId);
  const local = purchases.data?.courses.find((course) => (course.progress_percent ?? 0) < 100);
  const needsLookup = Boolean(purchases.data && purchases.data.total > purchases.data.size
    && (!local || (recentId && !recentPurchased)));
  const lookup = useSWR(
    needsLookup && userId && purchases.data ? ["hub:unfinished", userId, recentId, purchases.data] : null,
    ([, , preferred, firstPage]) => findUnfinishedCourse(firstPage, preferred),
    { ...queryOptions, revalidateOnFocus: false },
  );

  const data = needsLookup ? lookup.data : purchases.data
    ? (recentPurchased && (recentPurchased.progress_percent ?? 0) < 100 ? recentPurchased : local ?? null)
    : undefined;
  return {
    data,
    error: purchases.error || lookup.error,
    isValidating: purchases.isValidating || lookup.isValidating,
    retry: () => void (purchases.error || !needsLookup ? purchases.mutate() : lookup.mutate()).catch(() => undefined),
  };
}

export function useCurrentLesson() {
  const course = useLatestUnfinishedCourse();
  const id = course.data?.id;
  const lesson = useAuthedSWR<ActiveLessonResponse>(
    id ? hubEndpoints.activeLesson(id) : null,
    queryOptions,
  );
  // The existing endpoint wraps this specific 404 in a 500 response.
  const detail = isAxiosError(lesson.error) ? lesson.error.response?.data?.detail : undefined;
  const missingLesson = typeof detail === "string" && detail.includes("Bài học này chưa được active");
  const curriculum = useAuthedSWR<CurriculumResponse>(
    id ? hubEndpoints.curriculum(id) : null,
    queryOptions,
  );
  const sections = curriculum.data?.sections ?? [];
  const active = lesson.data && !lesson.data.is_completed && !lesson.data.is_locked ? lesson.data : undefined;
  const activeLesson = active ?? sections.flatMap((section) => section.lessons).find((item) => !item.is_completed && !item.is_locked);
  const section = sections.find(({ lessons }) => lessons.some((item) => item.id === activeLesson?.id));
  const courseHref = course.data ? `/learning/${encodeURIComponent(course.data.slug)}` : null;
  const href = courseHref && activeLesson ? `${courseHref}?lesson_id=${encodeURIComponent(activeLesson.id)}` : courseHref;

  return {
    course: course.data,
    lesson: activeLesson,
    section,
    href,
    tutorHref: href && activeLesson ? `${href}&tutor=1` : null,
    sectionError: curriculum.error,
    retrySection: () => void curriculum.mutate().catch(() => undefined),
    isSectionLoading: Boolean(id && !curriculum.error && !curriculum.data),
    isSectionValidating: curriculum.isValidating,
    error: course.error || (missingLesson ? undefined : lesson.error),
    isLoading: course.data === undefined || Boolean(id && lesson.data === undefined && !lesson.error)
      || Boolean(id && !active && !curriculum.data && !curriculum.error),
    isValidating: course.isValidating || lesson.isValidating,
    retry: () => {
      if (course.error) course.retry();
      else void lesson.mutate().catch(() => undefined);
    },
  };
}

export function useFollowingPaths() {
  return useAuthedSWR<{ items: (Pick<LearningPath, "slug" | "title"> & { version_id: string })[] }>(
    hubEndpoints.followingPaths,
    queryOptions,
  );
}

export function useFollowingPath() {
  const paths = useFollowingPaths();
  const path = paths.data?.items[0];
  const detail = useAuthedSWR<LearningPath>(
    path ? hubEndpoints.pathVersion(path.version_id) : null,
    queryOptions,
  );

  return {
    path,
    detail: detail.data,
    error: paths.error || detail.error,
    isLoading: !paths.data || Boolean(path && !detail.data),
    isValidating: paths.isValidating || detail.isValidating,
    retry: () => void (paths.error ? paths.mutate() : detail.mutate()).catch(() => undefined),
  };
}

export function useOwnedGoalCourses() {
  const userId = useUserStore((state) => state.user?.id);
  const auth = useHubAuthStatus();
  return useSWR(auth === "ready" && userId ? ["hub:owned-goal-courses", userId] : null, async () => {
    const courses: CoursesMeResponse["courses"] = [];
    for (let page = 1; ; page++) {
      const { data } = await api.get<CoursesMeResponse>(hubEndpoints.purchases, {
        params: { page, size: 50, sort_by: "enrolled_at", order: "desc" },
      });
      courses.push(...data.courses);
      if (!data.courses.length || page * data.size >= data.total) return courses;
    }
  }, queryOptions);
}

export function useOwnedGoalPaths(courses: CoursesMeResponse["courses"] | undefined) {
  const userId = useUserStore((state) => state.user?.id);
  const orders = useAuthedSWR<{ items: Pick<BundleReceipt, "id" | "title">[] }>(hubEndpoints.bundleOrders, queryOptions);
  const ids = orders.data?.items.map(({ id }) => id);
  const receipts = useSWR(userId && ids?.length && courses?.length ? ["hub:goal-orders", userId, ids] as const : null, async ([, , orderIds]) => {
    const orders: BundleReceipt[] = [];
    for (let offset = 0; offset < orderIds.length; offset += 6) {
      const batch = await Promise.all(orderIds.slice(offset, offset + 6).map(async (id) =>
        (await api.get<BundleReceipt>(hubEndpoints.bundleOrder(id))).data));
      orders.push(...batch);
    }
    return orders;
  }, { ...queryOptions, revalidateOnFocus: false });
  const ownedIds = new Set(courses?.map(({ id }) => id));
  // Orders can survive a refund. The goals API accepts an order with at least one accessible course.
  const data = receipts.data?.filter(({ lines }) => lines.some(({ course_id }) => ownedIds.has(course_id)));
  return {
    data,
    error: orders.error || receipts.error,
    isLoading: orders.isLoading || receipts.isLoading,
    isValidating: orders.isValidating || receipts.isValidating,
    retry: () => void (orders.error ? orders.mutate() : receipts.mutate()).catch(() => undefined),
  };
}
