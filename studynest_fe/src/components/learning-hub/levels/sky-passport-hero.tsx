"use client";

import Link from "next/link";
import { useId } from "react";
import {
  ArrowDown,
  ArrowRight,
  Cloud,
  Compass,
  Crown,
  Gift,
  Plane,
  Trophy,
} from "pulsoicon-react";
import { Button, CoinBadge } from "@/components/ui";
import { getHubDataSource } from "@/lib/learning-hub/data-source";
import type { LevelReward, LevelsOverview } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { MockDataChip } from "../mock-data-chip";
import { getRealmTheme } from "./realm-themes";

const number = new Intl.NumberFormat("vi-VN");

interface SkyPassportHeroProps {
  current: LevelsOverview["current"];
  milestone: number;
  hasMilestone: boolean;
  rewards: LevelReward[];
  onJumpToMyLevel: () => void;
  onJumpToMilestone: (level: number) => void;
}

export function SkyPassportHero({
  current,
  milestone,
  hasMilestone,
  rewards,
  onJumpToMyLevel,
  onJumpToMilestone,
}: SkyPassportHeroProps) {
  const ringGradId = useId();
  const pct =
    current.required_xp > 0
      ? Math.min(100, Math.max(0, Math.round((current.current_xp / current.required_xp) * 100)))
      : 100;
  const xpLeft = Math.max(0, current.required_xp - current.current_xp);
  const reachedCount = rewards.filter((r) => r.reached || r.level <= current.level).length;
  const islandsUnlocked = rewards.filter(
    (r) => r.milestone === "ten" && (r.reached || r.level <= current.level),
  ).length;
  const totalIslands = rewards.filter((r) => r.milestone === "ten").length;

  const currentChapterIndex = Math.max(0, Math.floor((current.level - 1) / 10));
  const currentRealm = getRealmTheme(currentChapterIndex);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <section
      aria-label="Hộ chiếu bầu trời và tổng quan cấp độ hiện tại"
      className="relative isolate overflow-hidden rounded-[2rem] border border-primary-pastel/90 bg-gradient-to-br from-surface-muted via-primary-light/70 to-background p-5 shadow-[0_24px_48px_-12px_rgba(53,111,167,0.14)] sm:p-8"
    >
      {/* Lớp mây mờ pastel bay bổng đồng bộ Trang chủ */}
      <div
        aria-hidden="true"
        className="sky-drift pointer-events-none absolute -top-24 -left-16 -z-10 h-72 w-96 rounded-full bg-surface/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="sky-drift pointer-events-none absolute -right-24 -bottom-24 -z-10 h-80 w-[26rem] rounded-full bg-primary-pastel/45 blur-3xl"
        style={{ ["--drift" as string]: "110s" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -z-10 size-64 -translate-x-1/2 rounded-full bg-secondary-light/60 blur-3xl"
      />

      {/* Họa tiết đường bay mây SVG tinh tế trên nền */}
      <svg
        aria-hidden="true"
        viewBox="0 0 800 260"
        fill="none"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full w-full opacity-55"
        preserveAspectRatio="none"
      >
        <path
          d="M-20 210 C 140 120, 260 250, 420 150 C 560 65, 680 140, 820 42"
          stroke="var(--color-primary-pastel)"
          strokeWidth="2"
          strokeDasharray="6 8"
          strokeLinecap="round"
        />
        <circle cx="420" cy="150" r="4.5" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2" />
        <circle cx="660" cy="95" r="3.5" fill="var(--color-secondary-pastel)" />
      </svg>

      <Cloud
        aria-hidden="true"
        animated={false}
        strokeWidth={0.7}
        className="pointer-events-none absolute -right-8 -bottom-14 -z-10 size-60 -rotate-6 text-surface/80"
      />

      {/* Dải đầu hộ chiếu kiểu boarding pass */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-primary-pastel/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase",
              currentRealm.pill,
            )}
          >
            <Compass aria-hidden="true" animated={false} className="size-3.5" />
            Hộ chiếu bầu trời · {currentRealm.code}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {currentRealm.altitude}
          </span>
          <MockDataChip source={getHubDataSource()} />
        </div>

        {/* Con dấu đóng mực phong cách bưu thiếp */}
        <div
          aria-hidden="true"
          className={cn(
            "stamp-down hidden items-center gap-1.5 rounded-full border-2 border-dashed px-3 py-1 text-[11px] font-extrabold tracking-[0.14em] uppercase sm:inline-flex",
            currentRealm.stampClass,
          )}
        >
          <Crown animated={false} className="size-3.5" />
          <span>{currentRealm.name}</span>
        </div>
      </div>

      {/* Thân Hero 3 vùng: Đồng hồ độ cao + Đường bay XP + Bento 4 chỉ số */}
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.92fr)] lg:items-center lg:gap-8">
        {/* 1. Đồng hồ Độ cao Cấp độ (Altitude Crest) */}
        <div className="flex items-center gap-5 lg:flex-col lg:justify-center">
          <div className="relative grid size-40 shrink-0 place-items-center rounded-full bg-surface/90 p-1.5 shadow-[0_14px_32px_-8px_rgba(53,111,167,0.18)] ring-1 ring-primary-pastel/80">
            <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--sn-blue-300)" />
                  <stop offset="55%" stopColor="var(--sn-blue-500)" />
                  <stop offset="100%" stopColor="var(--sn-blue-600)" />
                </linearGradient>
              </defs>
              {/* Vòng la bàn nét đứt bên ngoài */}
              <circle
                cx="70"
                cy="70"
                r="66"
                fill="none"
                stroke="var(--color-primary-pastel)"
                strokeWidth="1.5"
                strokeDasharray="3 5"
              />
              {/* Rãnh nền vòng tiến độ */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="var(--color-primary-light)"
                strokeWidth="10"
              />
              {/* Cung tiến độ XP */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={`url(#${ringGradId})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 motion-reduce:transition-none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                Cấp độ
              </span>
              <span className="font-display text-4xl font-bold tracking-tight text-primary tabular-nums">
                {number.format(current.level)}
              </span>
              <span className="mt-0.5 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                {pct}% chặng
              </span>
            </div>
          </div>

          {/* Tóm tắt nhanh trên mobile */}
          <div className="min-w-0 lg:hidden">
            <p className="text-xs font-bold tracking-wider text-primary uppercase">
              {currentRealm.name}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">
              {number.format(current.total_xp)} XP
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Đã qua {reachedCount}/{rewards.length} chặng bay
            </p>
          </div>
        </div>

        {/* 2. Chặng kế tiếp & Thanh Đường bay XP */}
        <div className="min-w-0 space-y-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {current.required_xp > 0
                ? `Cất cánh lên Cấp ${number.format(current.level + 1)}`
                : "Bạn đã chạm Đỉnh Trời Mây Bạc!"}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {current.required_xp > 0 ? (
                <>
                  Chỉ còn{" "}
                  <strong className="font-bold text-primary tabular-nums">
                    {number.format(xpLeft)} XP
                  </strong>{" "}
                  nữa để mở khóa phần thưởng ở chặng kế tiếp.
                </>
              ) : (
                "Toàn bộ các tầng mây rực rỡ của Mây Mây đang mở ra dưới đôi cánh của bạn."
              )}
            </p>
          </div>

          {current.required_xp > 0 && (
            <div className="rounded-2xl border border-border bg-surface/90 p-3.5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                <span className="text-muted-foreground">Đường bay lên cấp {number.format(current.level + 1)}</span>
                <span className="font-bold text-primary tabular-nums">
                  {number.format(current.current_xp)} / {number.format(current.required_xp)} XP
                </span>
              </div>

              <div className="relative mt-3 pb-1">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={current.required_xp}
                  aria-valuenow={current.current_xp}
                  aria-label={`${number.format(current.current_xp)} trên ${number.format(current.required_xp)} XP để lên cấp ${number.format(current.level + 1)}`}
                  className="h-3 w-full overflow-hidden rounded-full bg-primary-light p-0.5"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-pastel via-[color:var(--sn-blue-400)] to-primary transition-all duration-500 motion-reduce:transition-none"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                {/* Biểu tượng máy bay giấy trượt theo % đường bay */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-full border border-primary-pastel bg-surface text-primary shadow-sm transition-all duration-500 motion-reduce:transition-none"
                  style={{ left: `clamp(14px, ${pct}%, calc(100% - 14px))` }}
                >
                  <Plane animated={false} className="size-3.5" />
                </span>
              </div>
            </div>
          )}

          {/* Nhóm nút hành động chuẩn Cloudy Blue */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onJumpToMyLevel}
              className="min-h-11 rounded-full px-5 font-bold shadow-sm"
            >
              <ArrowDown aria-hidden="true" className="size-4" />
              <span>Tới vị trí của tôi</span>
            </Button>
            <Link
              href="/shop"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/95 px-4 text-xs font-bold text-primary shadow-xs transition-colors hover:bg-primary-light"
            >
              <Gift aria-hidden="true" animated={false} className="size-4" />
              <span>Cửa hàng Mây</span>
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface/90 px-4 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
            >
              <Trophy aria-hidden="true" animated={false} className="size-4 text-accent-vanilla-foreground" />
              <span>Bảng xếp hạng</span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. Lưới Bento 4 chỉ số bằng thẻ kính pastel sáng */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface/92 p-3.5 shadow-sm backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Kho Coin trắng
            </p>
            <div className="mt-2">
              <CoinBadge kind="white" amount={current.peak_balance} surface="light" size="md" />
            </div>
          </div>

          <div className="rounded-2xl border border-primary-pastel/70 bg-primary-light/65 p-3.5 shadow-sm backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-primary uppercase">
              Tổng XP tích lũy
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-foreground tabular-nums">
              {number.format(current.total_xp)}
            </p>
          </div>

          <div className="rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/55 p-3.5 shadow-sm backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
              Đảo lớn đã mở
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-foreground tabular-nums">
              {islandsUnlocked}
              <span className="font-sans text-xs font-semibold text-muted-foreground">
                {" "}
                / {totalIslands}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-secondary-pastel/80 bg-secondary-light/65 p-3.5 shadow-sm backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-secondary-foreground uppercase">
              Đảo kế tiếp
            </p>
            {hasMilestone ? (
              <button
                type="button"
                onClick={() => onJumpToMilestone(milestone)}
                className="mt-1.5 inline-flex items-center gap-1 font-display text-2xl font-bold text-secondary-foreground underline decoration-secondary-foreground/35 underline-offset-4 transition-colors hover:decoration-secondary-foreground cursor-pointer tabular-nums"
              >
                Cấp {number.format(milestone)}
              </button>
            ) : (
              <p className="mt-1.5 font-display text-2xl font-bold text-foreground tabular-nums">
                {reachedCount}/{rewards.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
