"use client";

import { Button, CoinBadge, Skeleton } from "@/components/ui";
import type { ReactNode } from "react";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { cn } from "@/lib/utils";
import { CalendarCheck, Check, Coins, Gift, Medal, X, Zap } from "pulsoicon-react";
import { HubLoadError } from "../hub-page-state";
import { number } from "./section";
import type { useDailyLearningState } from "./use-daily-learning-state";

const rewardIcons = { peak_wallet: Coins, peak: Coins, badge: Medal, xp: Zap };
const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
const WEEKDAY_FULL = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"] as const;

function Frame({ children }: { children: ReactNode }) {
  return (
    <section id="diem-danh-hom-nay" tabIndex={-1} aria-labelledby="checkin-title" className="relative isolate scroll-mt-24 focus-visible:outline-2 focus-visible:outline-ring">
      <div aria-hidden="true" className="absolute inset-0 -z-10 rotate-[1.5deg] rounded-[2rem] border-2 border-primary-pastel bg-primary-light" />
      <div className="p-5 sm:p-6">
        <h2 id="checkin-title" className="mb-3 text-2xl font-extrabold tracking-tight">Điểm danh</h2>
        {children}
      </div>
    </section>
  );
}

export function CheckInCard({ daily, onClaimReward, onCheckIn, inPrimary }: {
  daily: ReturnType<typeof useDailyLearningState>;
  onClaimReward: () => void;
  onCheckIn: () => void;
  inPrimary: boolean;
}) {
  const { checkIn, board, missions } = daily;
  const state = missions.checkIn;
  const data = checkIn.data;
  if (state.status === "closed") return <Frame><p className="text-sm font-medium">{state.label}. Mây sẽ báo khi có đợt điểm danh mới.</p></Frame>;
  if (state.status === "error") {
    return <Frame><HubLoadError error={checkIn.error} title={state.label} message="Tải lại để kiểm tra lượt điểm danh hôm nay." onRetry={() => void checkIn.mutate().catch(() => undefined)} isRetrying={checkIn.isValidating} /></Frame>;
  }
  if (state.status === "loading") {
    return <Frame><div role="status" aria-label={state.label} className="space-y-3 [&_.animate-pulse]:motion-reduce:animate-none"><Skeleton className="h-12 w-full rounded-full" /><Skeleton className="h-10 w-40 rounded-full" /></div></Frame>;
  }

  const checkedToday = state.status !== "available";
  const isWeekly = data?.cycle_days === 7;
  const start = data ? (isWeekly ? 1 : Math.min(Math.max(1, data.current_day_in_cycle - 3), Math.max(1, data.cycle_days - 6))) : 1;
  const days = data?.calendar.filter((day) => day.day_number >= start && day.day_number < start + 7);
  const reward = checkedToday ? data?.next_reward : data?.today_reward;
  const isCoinReward = reward?.reward_type === "peak_wallet" || reward?.reward_type === "peak";
  const rewardName = reward?.reward_type === "badge"
    ? "Huy hiệu"
    : reward?.reward_type === "xp"
      ? `${number.format(reward.reward_amount ?? 0)} XP`
      : "Quà điểm danh";

  return (
    <Frame>
      {days && days.length > 0 && (
        <ol
          aria-label={
            isWeekly
              ? `Lịch điểm danh tuần này, hôm nay là ${WEEKDAY_FULL[(data?.current_day_in_cycle ?? 1) - 1] ?? `Ngày ${data?.current_day_in_cycle}`}`
              : `Lịch điểm danh, ngày ${data?.current_day_in_cycle} trong chu kỳ ${data?.cycle_days} ngày`
          }
          className="mb-4 flex flex-wrap gap-2.5"
        >
          {days.map((day) => {
            const today = day.is_today ?? day.day_number === data?.current_day_in_cycle;
            const checked = day.is_checked || (today && checkedToday);
            const missed = !checked && !today && (day.is_missed ?? day.day_number < (data?.current_day_in_cycle ?? 1));
            const shortLabel = isWeekly ? WEEKDAY_SHORT[day.day_number - 1] ?? `N${day.day_number}` : `N${day.day_number}`;
            const fullLabel = isWeekly ? WEEKDAY_FULL[day.day_number - 1] ?? `Ngày ${day.day_number}` : `Ngày ${day.day_number}`;
            const RewardIcon = day.reward ? rewardIcons[day.reward.reward_type as keyof typeof rewardIcons] ?? Gift : null;
            return (
              <li
                key={day.day_number}
                aria-current={today ? "date" : undefined}
                title={`${fullLabel}: ${checked ? "Đã điểm danh" : missed ? "Bỏ lỡ" : today ? "Hôm nay" : "Sắp tới"}`}
                className="flex flex-col items-center gap-1"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative grid size-11 place-items-center rounded-full border-2 text-xs font-bold transition-colors",
                    checked
                      ? "border-success-border bg-success-bg text-success-foreground"
                      : today
                        ? "border-primary bg-surface text-primary ring-4 ring-primary-pastel/70"
                        : missed
                          ? "border-dashed border-border bg-surface/40 text-[color:var(--sn-neutral-500)] opacity-65"
                          : "border-dashed border-primary-pastel bg-surface/70 text-foreground",
                  )}
                >
                  {checked ? (
                    <Check animated={false} className="size-5" strokeWidth={3} />
                  ) : missed ? (
                    <X animated={false} className="size-4" strokeWidth={2.5} />
                  ) : RewardIcon && !today ? (
                    <RewardIcon animated={false} className="size-4" />
                  ) : (
                    shortLabel
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-[11px] font-bold leading-none",
                    today
                      ? "text-primary"
                      : checked
                        ? "text-success-foreground"
                        : missed
                          ? "text-[color:var(--sn-neutral-500)] line-through"
                          : "text-[color:var(--sn-neutral-600)]",
                  )}
                >
                  {shortLabel}
                </span>
                <span className="sr-only">
                  {fullLabel}: {checked ? "đã điểm danh" : missed ? "bỏ lỡ" : today ? "hôm nay, chưa điểm danh" : "chưa tới"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {checkedToday ? (
          <span role="status" className={cn("inline-flex min-h-10 items-center gap-1.5 text-sm font-bold", state.status === "checked" ? "text-success-foreground" : "text-info-foreground")}>
            {state.status === "checked" ? <Check aria-hidden="true" className="size-4" /> : <Gift aria-hidden="true" className="size-4" />}
            {state.label}
          </span>
        ) : !inPrimary && (
          <Button variant="primary" className="min-h-11 rounded-full px-5 motion-reduce:transition-none" leftIcon={<CalendarCheck aria-hidden="true" className="size-4" />}
            disabled={isHubUnavailable(checkIn.claimError)} isLoading={checkIn.claiming} loadingText="Đang điểm danh…" onClick={onCheckIn}>
            {checkIn.claimError && !isHubUnavailable(checkIn.claimError) ? "Thử lại" : state.label}
          </Button>
        )}
        {(state.status === "reward" || state.status === "claiming") && !inPrimary && (
          <Button variant="primary" aria-disabled={Boolean(board.pendingId)} aria-busy={state.status === "claiming" || undefined}
            onClick={onClaimReward} className="min-h-11 rounded-full px-5 motion-reduce:transition-none">
            {state.status === "claiming" ? "Đang nhận thưởng…" : "Nhận thưởng"}<span className="sr-only"> điểm danh</span>
          </Button>
        )}
        {reward && (
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-vanilla-foreground">
            <span>{checkedToday ? "Quà tiếp theo" : "Quà hôm nay"}:</span>
            {isCoinReward ? (
              <CoinBadge kind="white" amount={reward.reward_amount ?? 0} size="sm" />
            ) : (
              <span>{rewardName}</span>
            )}
          </p>
        )}
      </div>
      {state.status === "available" && Boolean(checkIn.claimError) && <p role="alert" className="mt-2 text-sm text-destructive-foreground">{hubErrorMessage(checkIn.claimError, "Lượt điểm danh chưa được ghi nhận. Bấm Thử lại để ghi nhận lượt hôm nay.")}</p>}
    </Frame>
  );
}
