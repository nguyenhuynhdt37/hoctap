import type { Mission, MissionsOverview } from "@/lib/learning-hub/mission-types";

export const vietnamTimeZone = "Asia/Ho_Chi_Minh";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: vietnamTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type StepId = "study" | "review" | "missions" | "reward" | "grade" | "course" | "trial";
export type StepStatus = "done" | "pending" | "loading" | "error";
export type JourneyStep = { id: StepId; status: StepStatus };

type JourneyInput = {
  enrollment: "new" | "enrolled" | "loading" | "error";
  study: StepStatus;
  review: StepStatus;
  missions: StepStatus;
  reward: StepStatus;
  onboarding: { grade: boolean; course: boolean; trial: boolean };
  daysSinceStudy?: number;
};

export function daysSinceStudy(
  activities: ReadonlyArray<{ action_type: string; created_at: string | null }>,
  now: number,
) {
  const latest = activities.reduce((latest, { action_type, created_at }) => {
    if (!created_at || !["lesson.completed", "quiz.completed", "code.completed"].includes(action_type)) return latest;
    const time = Date.parse(created_at);
    return Number.isFinite(time) && time <= now ? Math.max(latest, time) : latest;
  }, -Infinity);

  if (!Number.isFinite(latest)) return undefined;
  return (Date.parse(dayFormat.format(now)) - Date.parse(dayFormat.format(latest))) / 86_400_000;
}

const checkInLabels = {
  available: "Điểm danh hôm nay",
  reward: "Chờ nhận thưởng",
  claiming: "Đang nhận thưởng",
  checked: "Đã điểm danh hôm nay",
  closed: "Điểm danh chưa mở",
  error: "Chưa tải được lịch điểm danh",
  loading: "Đang tải điểm danh",
} as const;

type CheckInStatus = keyof typeof checkInLabels;
export type DailyCheckInState = { status: CheckInStatus; label: typeof checkInLabels[CheckInStatus]; mission?: Mission };
type CheckInQuery = { checkedToday?: boolean; closed?: boolean; failed?: boolean };

function getCheckInState(checkIn: CheckInQuery, mission?: Mission, pendingId?: string): DailyCheckInState {
  let status: CheckInStatus;
  if (mission && pendingId === mission.id) status = "claiming";
  else if (mission?.status === "completed") status = "reward";
  else if (mission?.status === "claimed" || checkIn.checkedToday) status = "checked";
  else if (checkIn.closed) status = "closed";
  else if (checkIn.checkedToday === false) status = "available";
  else status = checkIn.failed ? "error" : "loading";
  return { status, label: checkInLabels[status], mission };
}

export function getDailyMissionState(
  overview: MissionsOverview | undefined, failed: boolean, now: number, pendingId?: string, checkIn: CheckInQuery = {},
) {
  if (failed) return { missions: "error", reward: "error", checkIn: getCheckInState(checkIn) } as const;
  const reset = overview && Date.parse(overview.daily_resets_at) <= now;
  if (!overview || reset) return { missions: "loading", reward: "loading", checkIn: getCheckInState(reset ? {} : checkIn) } as const;
  const daily = overview.daily.filter(({ status, expires_at }) =>
    status !== "expired" && Date.parse(expires_at ?? overview.daily_resets_at) > now);
  const hasTasks = daily.some(({ status }) => status === "assigned" || status === "in_progress");
  // A claim is optimistic in the board cache. The journey waits for confirmation.
  const waiting = daily.filter(({ id, status }) => id !== pendingId && status === "completed");
  const claiming = daily.find(({ id }) => id === pendingId);
  const claimable = claiming ?? waiting[0];
  const checkInMission = daily.find(({ template }) => template === "daily_checkin.completed");

  return {
    missions: hasTasks ? "pending" : "done",
    reward: hasTasks || claimable ? "pending" : "done",
    claimable,
    claimableCount: waiting.length,
    rewardStatus: claiming ? checkInLabels.claiming : claimable ? checkInLabels.reward : undefined,
    daily,
    checkIn: getCheckInState(checkIn, checkInMission, pendingId),
    hasClaimed: daily.some(({ status }) => status === "claimed"),
  } as const;
}

export function getJourneyState(input: JourneyInput) {
  const isNew = input.enrollment === "new";
  const steps: JourneyStep[] = isNew ? [
    { id: "grade", status: input.onboarding.grade ? "done" : "pending" },
    { id: "course", status: input.onboarding.course ? "done" : "pending" },
    { id: "trial", status: input.onboarding.trial ? "done" : "pending" },
  ] : [
    { id: "study", status: input.enrollment === "loading" || input.enrollment === "error" ? input.enrollment : input.study },
    { id: "review", status: input.review },
    { id: "missions", status: input.missions },
    { id: "reward", status: input.reward },
  ];
  // A loading step may still be first. A failed step leaves known work accessible.
  const next = steps.find(({ status }) => status === "pending" || status === "loading");
  const active = next?.status === "pending" ? next.id : undefined;
  const hasError = steps.some(({ status }) => status === "error");
  const loading = steps.some(({ status }) => status === "loading");
  const remaining = steps.filter(({ status }) => status === "pending").length;
  const complete = steps.every(({ status }) => status === "done");
  const returning = !isNew && !complete && (input.daysSinceStudy ?? 0) >= 3;

  return { steps, active, remaining, complete, returning, isNew, hasError, loading };
}
