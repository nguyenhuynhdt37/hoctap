"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Coins,
  Library,
  Plus,
  RotateCcw,
  Star,
  TrendingDown,
  TrendingUp,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { LecturerOverview } from "@/types/lecturer/statistics";

interface StudioHeroProps {
  fullname?: string | null;
  overview?: LecturerOverview;
  pendingRefundCount: number;
  holdCount: number;
}

export function StudioHero({
  fullname,
  overview,
  pendingRefundCount,
  holdCount,
}: StudioHeroProps) {
  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const g =
      hour < 12
        ? "Chào buổi sáng"
        : hour < 18
          ? "Chào buổi chiều"
          : "Chào buổi tối";
    const formattedDate = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now);
    return { greeting: g, dateLabel: formattedDate };
  }, []);

  const displayName = fullname?.trim() || "thầy/cô";
  const avgRating = overview?.average_rating ?? 0;
  const ratingPct = Math.min(100, Math.max(0, (avgRating / 5) * 100));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ratingDashOffset = circumference * (1 - ratingPct / 100);

  const revenueGrowth = overview?.revenue_growth ?? 0;
  const isGrowthPositive = revenueGrowth >= 0;
  const totalCourses = overview?.total_courses ?? 0;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light via-surface to-accent-vanilla/75 p-6 shadow-sm sm:p-8 lg:p-9">
      {/* Bầu trời mây tầng hữu cơ SVG + quầng sáng pastel dịu */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-primary-pastel/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-secondary-pastel/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-accent-vanilla/70 blur-3xl"
      />

      {/* Hình đám mây mềm trôi ở nền phải */}
      <svg
        aria-hidden="true"
        viewBox="0 0 420 180"
        fill="none"
        className="pointer-events-none absolute right-0 top-0 h-44 w-auto text-surface/70"
      >
        <path
          d="M36 140C16 140 0 124 0 104C0 86 13 71 31 68C39 40 65 20 96 20C125 20 150 37 160 62C169 57 180 54 191 54C224 54 251 80 252 113C270 116 284 131 284 150C284 166 271 180 254 180H36V140Z"
          fill="currentColor"
          fillOpacity="0.65"
        />
        <circle
          cx="340"
          cy="56"
          r="46"
          stroke="var(--color-primary)"
          strokeOpacity="0.12"
          strokeWidth="1.2"
          strokeDasharray="5 6"
        />
        <circle
          cx="340"
          cy="56"
          r="26"
          stroke="var(--color-primary)"
          strokeOpacity="0.16"
          strokeWidth="1.2"
        />
      </svg>

      {/* Hàng chính: Lời chào & CTA bên trái + 2 Vòng đo Sky Gauges bên phải */}
      <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-2xs backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Không gian giảng viên · Bảng điều hành</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-3 py-1 text-xs font-medium capitalize text-muted-foreground backdrop-blur-xs">
              <Calendar
                animated={false}
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              {dateLabel}
            </span>
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[42px] lg:leading-[1.12]">
            {greeting}, <span className="text-primary">{displayName}</span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Bầu trời sáng tạo của riêng bạn — theo dõi nhịp doanh thu, sức hút
            từng khóa học và xử lý nhanh mọi yêu cầu từ học viên.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link href="/lecturer/courses/create">
              <Button
                variant="primary"
                size="md"
                className="rounded-full shadow-sm"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Tạo khóa học mới
              </Button>
            </Link>
            <Link href="/lecturer/combos/create">
              <Button
                variant="pastel"
                size="md"
                className="rounded-full border border-primary-pastel/80"
                leftIcon={<Library className="h-4 w-4" />}
              >
                Tạo combo lộ trình
              </Button>
            </Link>
            <Link href="/lecturer/dashboard">
              <Button
                variant="outline"
                size="md"
                className="rounded-full bg-surface/90"
                leftIcon={<BarChart3 className="h-4 w-4" />}
              >
                Báo cáo chuyên sâu
              </Button>
            </Link>
          </div>
        </div>

        {/* 2 Vòng đo Sky Gauges nổi bật */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:w-[440px] shrink-0">
          {/* Gauge 1: Uy tín giảng viên */}
          <div className="flex items-center gap-4 rounded-[24px] border border-surface bg-surface/85 p-4 shadow-xs backdrop-blur-md">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="var(--color-primary-light)"
                  strokeWidth="7"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={ratingDashOffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-lg font-bold leading-none text-foreground tabular-nums">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  / 5.0
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Uy tín giảng dạy
              </p>
              <div className="mt-1 flex items-center gap-0.5 text-accent-vanilla-foreground">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    animated={false}
                    className={`h-3.5 w-3.5 ${
                      n <= Math.round(avgRating)
                        ? "fill-current"
                        : "text-border"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                Từ{" "}
                <strong className="text-foreground">
                  {overview?.total_reviews ?? 0}
                </strong>{" "}
                đánh giá
              </p>
            </div>
          </div>

          {/* Gauge 2: Tổng doanh thu tích lũy & nhịp tăng trưởng */}
          <div className="flex flex-col justify-between rounded-[24px] border border-surface bg-gradient-to-br from-surface/90 to-secondary-light/65 p-4 shadow-xs backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
                Tổng doanh thu
              </span>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                  isGrowthPositive
                    ? "bg-success-bg text-success-foreground border border-success-border"
                    : "bg-destructive-bg text-destructive-foreground border border-destructive-border"
                }`}
              >
                {isGrowthPositive ? (
                  <TrendingUp animated={false} className="h-3 w-3" />
                ) : (
                  <TrendingDown animated={false} className="h-3 w-3" />
                )}
                {isGrowthPositive ? "+" : ""}
                {revenueGrowth.toFixed(1)}%
              </span>
            </div>
            <div className="my-2 flex items-center gap-1.5 font-display text-2xl font-bold text-warning-foreground tabular-nums">
              <Coins
                animated={false}
                className="h-5 w-5 shrink-0 text-[#C98A2C]"
                aria-hidden="true"
              />
              <span className="truncate">
                {formatVndAsCoin(overview?.total_revenue ?? 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate tabular-nums">
              Tháng này: {formatVndAsCoin(overview?.this_month_revenue ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Floating Glass Action Strip: 3 radar pill tương tác */}
      <div className="relative mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link
          href="/lecturer/refund"
          className={`group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-xs ${
            pendingRefundCount > 0
              ? "border-warning-border bg-accent-vanilla/90"
              : "border-surface bg-surface/80 hover:bg-surface"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                pendingRefundCount > 0
                  ? "border-warning-border bg-warning-bg text-warning-foreground"
                  : "border-primary-pastel bg-primary-light text-primary"
              }`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                Hoàn tiền chờ duyệt
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                <strong className="text-foreground">{pendingRefundCount}</strong>{" "}
                hồ sơ cần phản hồi
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        <Link
          href="/lecturer/hold"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-surface bg-surface/80 px-4 py-3 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-surface hover:shadow-xs"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-secondary-pastel bg-secondary-light text-secondary-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                Khoản đang tạm giữ
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                <strong className="text-foreground">{holdCount}</strong> khoản
                chờ giải ngân
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        <Link
          href="/lecturer/courses"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-surface bg-surface/80 px-4 py-3 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-surface hover:shadow-xs"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                Danh mục khóa học
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                <strong className="text-foreground">{totalCourses}</strong> khóa
                đang quản lý
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      </div>
    </section>
  );
}
