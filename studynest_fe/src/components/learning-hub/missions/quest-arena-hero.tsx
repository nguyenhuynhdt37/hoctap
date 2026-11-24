"use client";

import { Button, CoinBadge, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  Check,
  Clock,
  Coins,
  Flame,
  Gift,
  Medal,
  Store,
  Trophy,
  X,
  Zap,
} from "pulsoicon-react";
import { number } from "../home/section";
import type { useDailyLearningState } from "../home/use-daily-learning-state";

const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
const WEEKDAY_FULL = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
] as const;

const rewardIcons = {
  peak_wallet: Coins,
  peak: Coins,
  badge: Medal,
  xp: Zap,
};

function formatCountdown(targetIso?: string | null): string {
  if (!targetIso) return "—";
  const diff = Math.max(0, Date.parse(targetIso) - Date.now());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface QuestArenaHeroProps {
  daily: ReturnType<typeof useDailyLearningState>;
  claimableCount: number;
  claimingAll: boolean;
  dailyDoneCount: number;
  dailyTotalCount: number;
  onClaimAll: () => void;
}

export function QuestArenaHero({
  daily,
  claimableCount,
  claimingAll,
  dailyDoneCount,
  dailyTotalCount,
  onClaimAll,
}: QuestArenaHeroProps) {
  const { board, checkIn, missions, xp, streak } = daily;
  const resetAt = board.overview.data?.daily_resets_at;
  const [countdown, setCountdown] = useState(() => formatCountdown(resetAt));

  useEffect(() => {
    setCountdown(formatCountdown(resetAt));
    if (!resetAt) return;
    const id = window.setInterval(() => {
      setCountdown(formatCountdown(resetAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resetAt]);

  const xpPercent =
    xp && xp.required_xp > 0
      ? Math.min(100, Math.round((xp.current_xp / xp.required_xp) * 100))
      : 0;
  const xpRemaining = xp ? Math.max(0, xp.required_xp - xp.current_xp) : 0;

  // Vòng tròn SVG cấp độ
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (xpPercent / 100) * circumference;

  // Dữ liệu điểm danh 7 ngày
  const checkInState = missions.checkIn;
  const checkInData = checkIn.data;
  const checkedToday = checkInState.status !== "available";
  const isWeekly = checkInData?.cycle_days === 7;
  const start = checkInData
    ? isWeekly
      ? 1
      : Math.min(
          Math.max(1, checkInData.current_day_in_cycle - 3),
          Math.max(1, checkInData.cycle_days - 6),
        )
    : 1;
  const days = checkInData?.calendar.filter(
    (day) => day.day_number >= start && day.day_number < start + 7,
  );
  const reward = checkedToday
    ? checkInData?.next_reward
    : checkInData?.today_reward;
  const isCoinReward =
    reward?.reward_type === "peak_wallet" || reward?.reward_type === "peak";
  const rewardLabel =
    reward?.reward_type === "badge"
      ? "Huy hiệu đặc biệt"
      : reward?.reward_type === "xp"
        ? `+${number.format(reward.reward_amount ?? 0)} XP`
        : "Quà điểm danh";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {/* TRÁI: TRẠM SĂN THƯỞNG & VÒNG TRÒN CẤP ĐỘ (CLOUDY BLUE PASTEL SÁNG) */}
      <section
        aria-label="Tổng quan nhiệm vụ và cấp độ"
        className="relative isolate flex flex-col justify-between overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent/45 p-6 text-foreground shadow-[0_24px_48px_-14px_rgba(53,111,167,0.16)] sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 -z-10 size-60 rounded-full bg-white/80 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/4 -z-10 size-56 rounded-full bg-secondary-light/60 blur-3xl"
        />

        {/* Dải trên: Nhãn + Đồng hồ reset + Vòng cấp độ */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary shadow-2xs">
                <Trophy
                  aria-hidden="true"
                  animated={false}
                  className="size-3.5 text-primary"
                />
                <span>Trạm săn thưởng Mây</span>
              </span>
              {resetAt && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
                  <Clock
                    aria-hidden="true"
                    animated={false}
                    className="size-3 text-primary"
                  />
                  <span>Làm mới sau {countdown}</span>
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Nhiệm vụ &amp; Cấp độ
            </h1>
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Hoàn thành nhịp học mỗi ngày, chinh phục cột mốc khóa học để tích lũy XP, Coin trắng và mã giảm giá độc quyền.
            </p>
          </div>

          {/* Vòng tròn tiến độ Cấp độ SVG */}
          {xp && (
            <Link
              href="/levels"
              className="group flex shrink-0 items-center gap-3.5 rounded-[24px] border border-primary-pastel bg-surface/95 px-4 py-3 shadow-2xs transition hover:border-primary hover:shadow-sm"
            >
              <div className="relative flex size-20 items-center justify-center">
                <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="var(--sn-blue-100)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="var(--sn-blue-600)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Cấp
                  </span>
                  <span className="font-display text-xl leading-none font-bold text-primary tabular-nums">
                    {xp.level}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground group-hover:text-primary">
                  {number.format(xp.total_xp)} XP
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                  Còn {number.format(xpRemaining)} XP
                </p>
                <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
                  <span>Xem lộ trình cấp</span>
                  <ArrowUpRight aria-hidden="true" className="size-3" />
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* 4 Ô Chỉ Số Sống */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface/90 p-3.5 shadow-2xs">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Flame
                aria-hidden="true"
                animated={false}
                className="size-3.5 text-warning-foreground"
              />
              <span>Chuỗi ngày</span>
            </p>
            <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {streak.data ? `${streak.data.current_streak} ngày` : "—"}
            </p>
            {streak.data && (
              <p className="text-[10px] text-subtle-foreground tabular-nums">
                Kỷ lục: {streak.data.best_streak} ngày
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/45 p-3.5 shadow-2xs">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-vanilla-foreground">
              <Coins
                aria-hidden="true"
                animated={false}
                className="size-3.5"
              />
              <span>Số dư Coin</span>
            </p>
            <p className="mt-1 text-xl font-bold text-accent-vanilla-foreground tabular-nums">
              {xp ? number.format(xp.peak_balance) : "—"}
            </p>
            <Link
              href="/shop"
              className="text-[10px] font-bold text-accent-vanilla-foreground underline-offset-2 hover:underline"
            >
              Đổi quà ngay →
            </Link>
          </div>

          <div
            className={cn(
              "rounded-2xl border p-3.5 shadow-2xs",
              claimableCount > 0
                ? "border-primary-pastel bg-primary-light/85"
                : "border-border bg-surface/90",
            )}
          >
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Gift
                aria-hidden="true"
                animated={false}
                className="size-3.5 text-primary"
              />
              <span>Chờ nhận</span>
            </p>
            <p
              className={cn(
                "mt-1 text-xl font-bold tabular-nums",
                claimableCount > 0 ? "text-primary" : "text-foreground",
              )}
            >
              {claimableCount} thưởng
            </p>
            <p className="text-[10px] text-subtle-foreground">
              {claimableCount > 0 ? "Sẵn sàng bấm nhận" : "Chưa có thưởng chờ"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface/90 p-3.5 shadow-2xs">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Zap
                aria-hidden="true"
                animated={false}
                className="size-3.5 text-success-foreground"
              />
              <span>Hôm nay</span>
            </p>
            <p className="mt-1 text-xl font-bold text-success-foreground tabular-nums">
              {dailyDoneCount}/{dailyTotalCount}
            </p>
            <p className="text-[10px] text-subtle-foreground">
              Nhiệm vụ ngày
            </p>
          </div>
        </div>

        {/* Thanh hành động nhanh */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {claimableCount > 0 && (
            <button
              type="button"
              onClick={onClaimAll}
              disabled={claimingAll}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
            >
              <span className="inline-flex items-center">
                <Gift aria-hidden="true" animated={false} className="size-4" />
              </span>
              <span>
                {claimingAll
                  ? "Đang nhận phần thưởng..."
                  : `Nhận tất cả thưởng đang chờ (${claimableCount})`}
              </span>
            </button>
          )}

          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-bold text-foreground shadow-2xs transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
          >
            <Trophy aria-hidden="true" animated={false} className="size-3.5 text-primary" />
            <span>Bảng xếp hạng</span>
          </Link>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-bold text-foreground shadow-2xs transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
          >
            <Store aria-hidden="true" animated={false} className="size-3.5 text-primary" />
            <span>Cửa hàng Mây</span>
          </Link>
        </div>
      </section>

      {/* PHẢI: LỊCH ĐIỂM DANH 7 NGÀY T2 → CN TƯƠNG TÁC TRỰC TIẾP */}
      <section
        aria-label="Điểm danh 7 ngày trong tuần"
        className="relative isolate flex flex-col justify-between overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-surface via-primary-light/40 to-accent-vanilla/40 p-6 shadow-xs sm:p-7"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla/70 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-vanilla-foreground">
                <CalendarCheck
                  aria-hidden="true"
                  animated={false}
                  className="size-3.5"
                />
                <span>Điểm danh tuần này</span>
              </span>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground">
                Giữ nhịp học T2 → CN
              </h2>
            </div>

            {checkedToday && checkInState.status !== "loading" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-[11px] font-bold text-success-foreground">
                <Check aria-hidden="true" animated={false} className="size-3" />
                <span>Đã điểm danh</span>
              </span>
            )}
          </div>

          {checkInState.status === "loading" ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          ) : checkInState.status === "closed" ? (
            <p className="rounded-2xl border border-border bg-surface/85 p-4 text-xs text-muted-foreground">
              {checkInState.label}. Mây sẽ thông báo khi có chu kỳ điểm danh mới.
            </p>
          ) : checkInState.status === "error" ? (
            <p className="rounded-2xl border border-destructive-border bg-destructive-bg/60 p-4 text-xs text-destructive-foreground">
              Không thể tải lịch điểm danh. Vui lòng thử tải lại trang.
            </p>
          ) : (
            <>
              {days && days.length > 0 && (
                <ol className="grid grid-cols-7 gap-1.5">
                  {days.map((day) => {
                    const today =
                      day.is_today ??
                      day.day_number === checkInData?.current_day_in_cycle;
                    const checked = day.is_checked || (today && checkedToday);
                    const missed =
                      !checked &&
                      !today &&
                      (day.is_missed ??
                        day.day_number < (checkInData?.current_day_in_cycle ?? 1));
                    const shortLabel = isWeekly
                      ? WEEKDAY_SHORT[day.day_number - 1] ?? `N${day.day_number}`
                      : `N${day.day_number}`;
                    const fullLabel = isWeekly
                      ? WEEKDAY_FULL[day.day_number - 1] ?? `Ngày ${day.day_number}`
                      : `Ngày ${day.day_number}`;
                    const RewardIcon = day.reward
                      ? rewardIcons[
                          day.reward.reward_type as keyof typeof rewardIcons
                        ] ?? Gift
                      : null;

                    return (
                      <li
                        key={day.day_number}
                        title={`${fullLabel}: ${checked ? "Đã điểm danh" : missed ? "Bỏ lỡ" : today ? "Hôm nay" : "Sắp tới"}`}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-2xl border-2 text-xs font-bold transition-all sm:size-11",
                            checked
                              ? "border-success-border bg-success-bg text-success-foreground"
                              : today
                                ? "border-primary bg-surface text-primary ring-4 ring-primary-pastel/60"
                                : missed
                                  ? "border-dashed border-border bg-background/70 text-subtle-foreground opacity-65"
                                  : "border-dashed border-primary-pastel bg-surface/80 text-foreground",
                          )}
                        >
                          {checked ? (
                            <Check
                              aria-hidden="true"
                              animated={false}
                              className="size-4"
                              strokeWidth={3}
                            />
                          ) : missed ? (
                            <X
                              aria-hidden="true"
                              animated={false}
                              className="size-3.5"
                            />
                          ) : RewardIcon && !today ? (
                            <RewardIcon
                              aria-hidden="true"
                              animated={false}
                              className="size-4 text-primary"
                            />
                          ) : (
                            <span>{shortLabel}</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-bold leading-none",
                            today
                              ? "text-primary"
                              : checked
                                ? "text-success-foreground"
                                : missed
                                  ? "text-subtle-foreground line-through"
                                  : "text-muted-foreground",
                          )}
                        >
                          {shortLabel}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* Phần thưởng hôm nay / ngày kế tiếp */}
              {reward && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 text-xs shadow-2xs">
                  <span className="font-semibold text-muted-foreground">
                    {checkedToday ? "Quà ngày tiếp theo" : "Quà hôm nay"}
                  </span>
                  {isCoinReward ? (
                    <CoinBadge
                      kind="white"
                      amount={`+${reward.reward_amount ?? 0}`}
                      size="sm"
                    />
                  ) : (
                    <span className="font-bold text-primary">{rewardLabel}</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Nút Điểm danh 1 chạm */}
        {checkInState.status === "available" ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            isLoading={checkIn.claiming}
            loadingText="Đang điểm danh..."
            onClick={() => void checkIn.claim()}
            className="mt-5 rounded-full font-bold shadow-sm"
            leftIcon={<CalendarCheck aria-hidden="true" className="size-4" />}
          >
            Điểm danh nhận thưởng hôm nay
          </Button>
        ) : checkInState.status !== "loading" &&
          checkInState.status !== "closed" &&
          checkInState.status !== "error" ? (
          <div className="mt-5 rounded-2xl border border-success-border bg-success-bg/70 px-4 py-2.5 text-center text-xs font-bold text-success-foreground">
            Bạn đã điểm danh hôm nay! Quay lại vào ngày mai để nối dài chuỗi.
          </div>
        ) : null}
      </section>
    </div>
  );
}
