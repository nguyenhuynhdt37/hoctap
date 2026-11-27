"use client";

import { Badge, Button, Skeleton } from "@/components/ui";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { useLearningBadges } from "@/lib/learning-hub/hooks";
import { useRewardInventory } from "@/lib/learning-hub/mission-hooks";
import type { Mission, MissionStatus } from "@/lib/learning-hub/mission-types";
import { cn } from "@/lib/utils";
import { playSound, triggerPerfectConfetti } from "@/lib/utils/helpers/effects";
import { showToast } from "@/lib/utils/helpers/toast";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  Code2,
  Coins,
  Copy,
  Gift,
  Medal,
  Ticket,
  Trophy,
  Zap,
} from "pulsoicon-react";
import { number, vietnamTimeZone } from "../home/section";
import { useDailyLearningState } from "../home/use-daily-learning-state";
import { HubLoadError } from "../hub-page-state";
import { QuestArenaHero } from "./quest-arena-hero";

const expiryDate = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: vietnamTimeZone,
});

const STATUS_META: Record<
  MissionStatus,
  {
    label: string;
    variant: "outline" | "info" | "vanilla" | "success";
  }
> = {
  assigned: { label: "Chưa bắt đầu", variant: "outline" },
  in_progress: { label: "Đang thực hiện", variant: "info" },
  completed: { label: "Chờ nhận thưởng", variant: "vanilla" },
  claimed: { label: "Đã nhận thưởng", variant: "success" },
  expired: { label: "Hết hạn", variant: "outline" },
};

function getMissionArt(template: Mission["template"]) {
  switch (template) {
    case "daily_checkin.completed":
      return {
        Icon: CalendarDays,
        boxClass:
          "border-accent-vanilla-border bg-accent-vanilla/70 text-accent-vanilla-foreground",
      };
    case "quiz.completed":
    case "chapter.quiz_pass":
      return {
        Icon: ClipboardList,
        boxClass:
          "border-secondary-pastel bg-secondary-light text-secondary-foreground",
      };
    case "code.completed":
    case "course.weekly_streak":
      return {
        Icon: Code2,
        boxClass: "border-accent-border bg-accent/65 text-accent-foreground",
      };
    case "course.complete":
      return {
        Icon: Trophy,
        boxClass:
          "border-accent-vanilla-border bg-accent-vanilla/70 text-accent-vanilla-foreground",
      };
    default:
      return {
        Icon: BookOpen,
        boxClass: "border-primary-pastel bg-primary-light text-primary",
      };
  }
}

function MissionQuestCard({
  mission,
  pending,
  blocked,
  onClaim,
  onQuickCheckIn,
  checkingIn,
}: {
  mission: Mission;
  pending: boolean;
  blocked: boolean;
  onClaim: () => void;
  onQuickCheckIn?: () => void;
  checkingIn?: boolean;
}) {
  const { Icon, boxClass } = getMissionArt(mission.template);
  const statusInfo = STATUS_META[mission.status];
  const target = Math.max(1, mission.progress.target);
  const current = Math.min(target, mission.progress.current);
  const pct = Math.round((current / target) * 100);
  const canClaim = mission.status === "completed";
  const isClaimed = mission.status === "claimed";
  const safeHref = mission.href ? sanitizeRedirect(mission.href, "/my-learning") : null;
  const isCheckInMission = mission.template === "daily_checkin.completed";

  return (
    <article
      className={cn(
        "flex h-full flex-col justify-between rounded-[24px] border p-4 transition-all duration-200 sm:p-5",
        canClaim
          ? "border-primary bg-gradient-to-br from-primary-light/60 via-surface to-accent-vanilla/35 shadow-sm"
          : isClaimed
            ? "border-success-border/70 bg-success-bg/25"
            : "border-border bg-surface hover:border-primary-pastel hover:shadow-xs",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-2xs",
                boxClass,
              )}
            >
              <Icon aria-hidden="true" animated={false} className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold leading-snug text-foreground">
                  {mission.title}
                </h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {mission.description}
              </p>
            </div>
          </div>

          <Badge variant={statusInfo.variant} size="sm" className="shrink-0">
            {statusInfo.label}
          </Badge>
        </div>

        {/* Thanh tiến độ */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-muted-foreground">Tiến độ thực hiện</span>
            <span className="text-foreground tabular-nums">
              {current}/{target} ({pct}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary-light">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isClaimed ? "bg-success-foreground" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: Chip phần thưởng + Hành động */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-border/60 pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          {mission.reward.xp > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-border bg-accent/55 px-2.5 py-0.5 text-accent-foreground tabular-nums">
              <Zap aria-hidden="true" animated={false} className="size-3" />
              <span>+{number.format(mission.reward.xp)} XP</span>
            </span>
          )}
          {mission.reward.peak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/70 px-2.5 py-0.5 text-accent-vanilla-foreground tabular-nums">
              <Coins aria-hidden="true" animated={false} className="size-3" />
              <span>+{number.format(mission.reward.peak)} Coin</span>
            </span>
          )}
          {mission.reward.coupon && (
            <span className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary-light px-2.5 py-0.5 text-secondary-foreground tabular-nums">
              <Ticket aria-hidden="true" animated={false} className="size-3" />
              <span>Mã -{mission.reward.coupon.max_percent}%</span>
            </span>
          )}
        </div>

        <div>
          {canClaim ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={pending}
              disabled={blocked && !pending}
              loadingText="Đang nhận..."
              onClick={onClaim}
              className="rounded-full px-4 text-xs font-bold shadow-2xs"
              leftIcon={<Gift aria-hidden="true" className="size-3.5" />}
            >
              Nhận thưởng
            </Button>
          ) : isClaimed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-bold text-success-foreground">
              <Check aria-hidden="true" animated={false} className="size-3.5" />
              <span>Đã nhận</span>
            </span>
          ) : isCheckInMission && onQuickCheckIn ? (
            <Button
              type="button"
              variant="pastel"
              size="sm"
              isLoading={checkingIn}
              onClick={onQuickCheckIn}
              className="rounded-full px-3.5 text-xs font-bold"
            >
              Điểm danh ngay
            </Button>
          ) : safeHref ? (
            <Link
              href={safeHref}
              className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light px-3.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <span>Thực hiện ngay</span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function QuestArenaView() {
  const daily = useDailyLearningState();
  const { board, checkIn } = daily;
  const inventory = useRewardInventory();
  const badges = useLearningBadges();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [badgeFilter, setBadgeFilter] = useState<"all" | "earned">("all");
  const [claimingAll, setClaimingAll] = useState(false);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  const overview = board.overview.data;
  const dailyMissions = overview?.daily ?? [];
  const courseGroups = overview?.long_term ?? [];

  const claimableMissions = useMemo(() => {
    const list: Mission[] = [];
    for (const m of dailyMissions) {
      if (m.status === "completed") list.push(m);
    }
    for (const g of courseGroups) {
      for (const m of g.missions) {
        if (m.status === "completed") list.push(m);
      }
    }
    return list;
  }, [dailyMissions, courseGroups]);

  const dailyDoneCount = useMemo(
    () =>
      dailyMissions.filter(
        (m) => m.status === "completed" || m.status === "claimed",
      ).length,
    [dailyMissions],
  );

  const dailyPotential = useMemo(() => {
    let xp = 0;
    let coin = 0;
    for (const m of dailyMissions) {
      xp += m.reward.xp;
      coin += m.reward.peak;
    }
    return { xp, coin };
  }, [dailyMissions]);

  const handleClaimSingle = async (mission: Mission) => {
    await board.claim(mission);
    triggerPerfectConfetti();
    playSound("perfect");
  };

  const handleClaimAll = async () => {
    if (claimingAll || claimableMissions.length === 0) return;
    setClaimingAll(true);
    try {
      for (const m of claimableMissions) {
        await board.claim(m);
      }
      triggerPerfectConfetti();
      playSound("perfect");
      showToast.success(
        `Đã nhận xong ${claimableMissions.length} phần thưởng nhiệm vụ!`,
      );
    } finally {
      setClaimingAll(false);
    }
  };

  const visibleCourseGroups = useMemo(() => {
    if (selectedCourseId === "all") return courseGroups;
    return courseGroups.filter((g) => g.course.id === selectedCourseId);
  }, [courseGroups, selectedCourseId]);

  const badgeList = badges.data?.badges ?? [];
  const earnedBadgeCount = badgeList.filter((b) => b.earned).length;
  const filteredBadges =
    badgeFilter === "earned"
      ? badgeList.filter((b) => b.earned)
      : badgeList;

  const coupons = inventory.data?.coupons ?? [];

  const handleCopyCoupon = (id: string, code: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCouponId(id);
    showToast.success("Đã sao chép mã ưu đãi.");
    window.setTimeout(() => {
      setCopiedCouponId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  if (board.overview.error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <HubLoadError
          error={board.overview.error}
          title="Chưa tải được bảng nhiệm vụ"
          message="Vui lòng tải lại để xem tiến độ nhiệm vụ và phần thưởng đang chờ."
          onRetry={() => void board.overview.mutate().catch(() => undefined)}
          isRetrying={board.overview.isValidating}
        />
      </main>
    );
  }

  if (!overview) {
    return (
      <main
        role="status"
        aria-label="Đang tải trạm nhiệm vụ"
        className="mx-auto max-w-7xl space-y-6 px-4 py-8 animate-pulse"
      >
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <Skeleton className="h-72 rounded-[32px]" />
          <Skeleton className="h-72 rounded-[32px]" />
        </div>
        <Skeleton className="h-64 rounded-[30px]" />
      </main>
    );
  }

  const dailyPct =
    dailyMissions.length > 0
      ? Math.round((dailyDoneCount / dailyMissions.length) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 sm:py-9">
        {/* TẦNG 1: HERO NHỊP HỌC & ĐIỂM DANH 7 NGÀY */}
        <QuestArenaHero
          daily={daily}
          claimableCount={claimableMissions.length}
          claimingAll={claimingAll}
          dailyDoneCount={dailyDoneCount}
          dailyTotalCount={dailyMissions.length}
          onClaimAll={() => void handleClaimAll()}
        />

        {/* TẦNG 2: TRẠM NHIỆM VỤ HẰNG NGÀY */}
        <section
          aria-label="Nhiệm vụ hằng ngày"
          className="rounded-[32px] border border-border bg-surface p-5 shadow-xs sm:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                <CalendarDays
                  aria-hidden="true"
                  animated={false}
                  className="size-3.5"
                />
                <span>Nhịp học hằng ngày</span>
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                Nhiệm vụ hôm nay
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Tổng quỹ thưởng hôm nay:{" "}
                <strong className="font-bold text-accent-foreground tabular-nums">
                  +{number.format(dailyPotential.xp)} XP
                </strong>{" "}
                &amp;{" "}
                <strong className="font-bold text-accent-vanilla-foreground tabular-nums">
                  +{number.format(dailyPotential.coin)} Coin
                </strong>
                .
              </p>
            </div>

            {/* Thanh tiến độ Mốc Ngày */}
            <div className="w-full max-w-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Hoàn thành hôm nay</span>
                <span className="text-primary tabular-nums">{dailyPct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-light">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
            </div>
          </div>

          {dailyMissions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Chưa có nhiệm vụ hằng ngày nào được giao.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {dailyMissions.map((mission) => (
                <MissionQuestCard
                  key={mission.id}
                  mission={mission}
                  pending={board.pendingId === mission.id}
                  blocked={Boolean(board.pendingId) || claimingAll}
                  onClaim={() => void handleClaimSingle(mission)}
                  onQuickCheckIn={
                    daily.missions.checkIn.status === "available"
                      ? () => void checkIn.claim()
                      : undefined
                  }
                  checkingIn={checkIn.claiming}
                />
              ))}
            </div>
          )}
        </section>

        {/* TẦNG 3: CỘT MỐC KHÓA HỌC DÀI HẠN */}
        <section
          aria-label="Cột mốc khóa học dài hạn"
          className="space-y-5 rounded-[32px] border border-accent-border/70 bg-gradient-to-br from-accent/25 via-surface to-primary-light/25 p-5 shadow-xs sm:p-7"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent/65 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
                <Trophy
                  aria-hidden="true"
                  animated={false}
                  className="size-3.5"
                />
                <span>Chinh phục dài hạn</span>
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                Cột mốc theo khóa học
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Hoàn thành chương học, vượt bài kiểm tra và cán đích khóa học để nhận thưởng XP, Coin lớn và mã giảm giá.
              </p>
            </div>

            <Link
              href="/my-learning"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <span>Vào khóa học của tôi</span>
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          {/* Chip chọn khóa học */}
          {courseGroups.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCourseId("all")}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer",
                  selectedCourseId === "all"
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
                )}
              >
                <span>Tất cả khóa học ({courseGroups.length})</span>
              </button>
              {courseGroups.map((g) => {
                const active = selectedCourseId === g.course.id;
                return (
                  <button
                    key={g.course.id}
                    type="button"
                    onClick={() => setSelectedCourseId(g.course.id)}
                    className={cn(
                      "max-w-[240px] truncate rounded-full border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                        : "border-border bg-surface text-foreground hover:border-primary-pastel hover:text-primary",
                    )}
                    title={g.course.title}
                  >
                    <span>{g.course.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {visibleCourseGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/90 p-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                Bạn chưa có cột mốc khóa học dài hạn nào
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ghi danh một khóa học để hệ thống tự động mở khóa chuỗi nhiệm vụ chương &amp; cột mốc thưởng lớn.
              </p>
              <Link
                href="/courses"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover"
              >
                <span>Khám phá khóa học</span>
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {visibleCourseGroups.map((group) => (
                <div
                  key={group.course.id}
                  className="overflow-hidden rounded-[26px] border border-border bg-surface p-4 shadow-2xs sm:p-5"
                >
                  {/* Header nhóm khóa học với ảnh 16:9 đồng đều */}
                  <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/50 sm:w-36">
                        {group.course.thumbnail_url ? (
                          <img
                            src={group.course.thumbnail_url}
                            alt={group.course.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-primary/40">
                            <BookOpen
                              aria-hidden="true"
                              animated={false}
                              className="size-6"
                            />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-base font-bold text-foreground">
                          {group.course.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                          Tiến độ khóa học:{" "}
                          <strong className="font-bold text-primary">
                            {group.progress_percent}%
                          </strong>{" "}
                          · {group.missions.length} cột mốc
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-44">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-primary-light">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${group.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    {group.missions.map((mission) => (
                      <MissionQuestCard
                        key={mission.id}
                        mission={mission}
                        pending={board.pendingId === mission.id}
                        blocked={Boolean(board.pendingId) || claimingAll}
                        onClaim={() => void handleClaimSingle(mission)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* TẦNG 4: KHO CHIẾN LỢI PHẨM (HUY HIỆU + MÃ GIẢM GIÁ SĂN ĐƯỢC) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cột Trái: Bộ sưu tập Huy hiệu */}
          <section
            aria-label="Bộ sưu tập huy hiệu"
            className="flex flex-col rounded-[30px] border border-border bg-surface p-5 shadow-xs sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-2xl border border-accent-border bg-accent/65 text-accent-foreground">
                  <Medal
                    aria-hidden="true"
                    animated={false}
                    className="size-5"
                  />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Bộ sưu tập huy hiệu
                  </h2>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Đã mở khóa {earnedBadgeCount}/{badgeList.length} huy hiệu
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBadgeFilter("all")}
                  className={cn(
                    "rounded-full px-3 py-1 font-semibold transition cursor-pointer",
                    badgeFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Tất cả</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeFilter("earned")}
                  className={cn(
                    "rounded-full px-3 py-1 font-semibold transition cursor-pointer",
                    badgeFilter === "earned"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Đã đạt</span>
                </button>
              </div>
            </div>

            {filteredBadges.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-xs text-muted-foreground">
                {badgeFilter === "earned"
                  ? "Bạn chưa mở khóa huy hiệu nào. Hoàn thành nhiệm vụ để thu thập huy hiệu đầu tiên!"
                  : "Chưa có huy hiệu trong bộ sưu tập."}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredBadges.map((badge) => (
                  <li
                    key={badge.id}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center transition",
                      badge.earned
                        ? "border-primary-pastel bg-primary-light/35"
                        : "border-border bg-background/60 opacity-70",
                    )}
                  >
                    <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface p-1.5">
                      {badge.image_url ? (
                        <img
                          src={badge.image_url}
                          alt={badge.name}
                          className={cn(
                            "size-full object-contain",
                            !badge.earned && "grayscale opacity-60",
                          )}
                        />
                      ) : (
                        <Medal
                          aria-hidden="true"
                          animated={false}
                          className="size-7 text-accent-foreground"
                        />
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs font-bold text-foreground">
                      {badge.name}
                    </p>
                    <Badge
                      variant={badge.earned ? "success" : "outline"}
                      size="sm"
                    >
                      {badge.earned ? "Đã đạt" : "Chưa mở"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Cột Phải: Mã giảm giá săn được */}
          <section
            aria-label="Mã giảm giá từ nhiệm vụ"
            className="flex flex-col rounded-[30px] border border-border bg-surface p-5 shadow-xs sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-2xl border border-secondary-pastel bg-secondary-light text-secondary-foreground">
                  <Ticket
                    aria-hidden="true"
                    animated={false}
                    className="size-5"
                  />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Mã ưu đãi săn được
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tự động áp dụng khi thanh toán khóa học &amp; Combo
                  </p>
                </div>
              </div>

              <Link
                href="/vouchers"
                className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                <span>Kho mã</span>
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>

            {coupons.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-secondary-pastel bg-secondary-light/25 p-8 text-center">
                <Ticket
                  aria-hidden="true"
                  animated={false}
                  className="size-8 text-secondary-foreground/60"
                />
                <p className="mt-2 text-sm font-bold text-foreground">
                  Chưa có mã thưởng nào
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Hoàn thành các cột mốc khóa học phía trên để mở khóa mã giảm giá lên tới 30%.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {coupons.slice(0, 4).map((coupon) => {
                  const isAvailable =
                    coupon.status === "available" &&
                    Date.parse(coupon.expires_at) > Date.now();
                  const isCopied = copiedCouponId === coupon.id;
                  return (
                    <li
                      key={coupon.id}
                      className="flex overflow-hidden rounded-2xl border border-secondary-pastel/80 bg-surface shadow-2xs"
                    >
                      <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-gradient-to-br from-secondary-light to-primary-light/60 p-3 text-center text-secondary-foreground">
                        <span className="text-[10px] font-bold uppercase">
                          Giảm tới
                        </span>
                        <span className="font-display text-2xl font-bold tabular-nums">
                          {coupon.max_percent}%
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between border-l border-dashed border-secondary-pastel p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                            {coupon.title}
                          </p>
                          <Badge
                            variant={isAvailable ? "success" : "outline"}
                            size="sm"
                          >
                            {isAvailable ? "Khả dụng" : "Hết hạn"}
                          </Badge>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                          <code className="rounded-lg bg-primary-light px-2.5 py-1 font-mono text-xs font-bold text-primary">
                            {coupon.code_masked}
                          </code>
                          {isAvailable && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyCoupon(coupon.id, coupon.code_masked)
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
                            >
                              <span className="inline-flex items-center">
                                {isCopied ? (
                                  <Check
                                    aria-hidden="true"
                                    animated={false}
                                    className="size-3"
                                  />
                                ) : (
                                  <Copy
                                    aria-hidden="true"
                                    animated={false}
                                    className="size-3"
                                  />
                                )}
                              </span>
                              <span>{isCopied ? "Đã chép" : "Sao chép"}</span>
                            </button>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-subtle-foreground">
                          HSD: {expiryDate.format(new Date(coupon.expires_at))}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
