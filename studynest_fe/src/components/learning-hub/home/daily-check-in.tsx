"use client";

import { Button, Skeleton } from "@/components/ui";
import type { ReactNode } from "react";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { cn } from "@/lib/utils";
import { CalendarCheck, Check, Gift, Medal, Coins, Zap } from "pulsoicon-react";
import { HubLoadError } from "../hub-page-state";
import { number } from "./section";
import type { useDailyLearningState } from "./use-daily-learning-state";

const rewardIcons = { peak_wallet: Coins, peak: Coins, badge: Medal, xp: Zap };

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
  const start = data ? Math.min(Math.max(1, data.current_day_in_cycle - 3), Math.max(1, data.cycle_days - 6)) : 1;
  const days = data?.calendar.filter((day) => day.day_number >= start && day.day_number < start + 7);
  const reward = checkedToday ? data?.next_reward : data?.today_reward;
  const rewardName = reward?.reward_type === "peak_wallet" || reward?.reward_type === "peak"
    ? `${number.format(reward.reward_amount ?? 0)} điểm ví`
    : reward?.reward_type === "badge" ? "Huy hiệu" : reward?.reward_type === "xp" ? `${number.format(reward.reward_amount ?? 0)} XP` : "Quà điểm danh";

  return (
    <Frame>
      {days && days.length > 0 && (
        <ol aria-label={`Lịch điểm danh, ngày ${data?.current_day_in_cycle} trong chu kỳ ${data?.cycle_days} ngày`} className="mb-4 flex flex-wrap gap-2">
          {days.map((day) => {
            const today = day.day_number === data?.current_day_in_cycle;
            const checked = day.is_checked || (today && checkedToday);
            const RewardIcon = day.reward ? rewardIcons[day.reward.reward_type as keyof typeof rewardIcons] ?? Gift : null;
            return (
              <li key={day.day_number} aria-current={today ? "date" : undefined} className={cn(
                "relative grid size-11 place-items-center rounded-full border-2 text-xs font-bold",
                checked ? "border-success-border bg-success-bg text-success-foreground" : today ? "border-primary bg-surface text-primary ring-4 ring-primary-pastel/70" : "border-dashed border-primary-pastel bg-surface/70 text-foreground",
              )}>
                <span aria-hidden="true">{checked ? <Check animated={false} className="size-5" strokeWidth={3} /> : RewardIcon && !today ? <RewardIcon className="size-4" /> : day.day_number}</span>
                <span className="sr-only">Ngày {day.day_number}: {checked ? "đã điểm danh" : "chưa điểm danh"}</span>
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
        {reward && <p className="text-sm font-semibold text-accent-vanilla-foreground">{checkedToday ? "Quà tiếp theo" : "Quà hôm nay"}: {rewardName}</p>}
      </div>
      {state.status === "available" && Boolean(checkIn.claimError) && <p role="alert" className="mt-2 text-sm text-destructive-foreground">{hubErrorMessage(checkIn.claimError, "Lượt điểm danh chưa được ghi nhận. Bấm Thử lại để ghi nhận lượt hôm nay.")}</p>}
    </Frame>
  );
}
