"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  Library,
  Plus,
  RotateCcw,
} from "pulsoicon-react";
import { Button } from "@/components/ui";

interface StudioHeroProps {
  fullname?: string | null;
  pendingRefundCount: number;
  holdCount: number;
}

export function StudioHero({
  fullname,
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

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/70 p-6 shadow-sm sm:p-8">
      {/* Họa tiết Guilloché pastel nhẹ */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 text-primary/10"
        viewBox="0 0 260 260"
        fill="none"
      >
        <circle
          cx="130"
          cy="130"
          r="108"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="6 6"
        />
        <circle cx="130" cy="130" r="76" stroke="currentColor" strokeWidth="1.2" />
        <circle
          cx="130"
          cy="130"
          r="44"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="3 5"
        />
      </svg>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-xs">
              <span>Lecturer Command Atelier</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-3 py-1 text-xs font-medium text-muted-foreground capitalize">
              <Calendar animated={false} className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {dateLabel}
            </span>
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {greeting}, {displayName}
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Toàn cảnh hiệu suất giảng dạy, nhịp tăng trưởng doanh thu và các đầu
            việc cần xử lý ngay trong ngày.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link href="/lecturer/dashboard">
            <Button
              variant="outline"
              size="md"
              className="rounded-full bg-surface/90"
              leftIcon={<BarChart3 className="h-4 w-4" />}
            >
              Báo cáo sâu
            </Button>
          </Link>
          <Link href="/lecturer/combos/create">
            <Button
              variant="pastel"
              size="md"
              className="rounded-full"
              leftIcon={<Library className="h-4 w-4" />}
            >
              Tạo combo
            </Button>
          </Link>
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
        </div>
      </div>

      {/* Action Radar Strip: 2 đầu việc vận hành nổi bật */}
      <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/lecturer/refund"
          className={`group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 backdrop-blur-xs transition-all ${
            pendingRefundCount > 0
              ? "border-warning-border bg-accent-vanilla/85 hover:border-primary-pastel hover:bg-surface"
              : "border-border/80 bg-surface/85 hover:border-primary-pastel hover:bg-surface"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                pendingRefundCount > 0
                  ? "border-warning-border bg-warning-bg text-warning-foreground"
                  : "border-primary-pastel bg-primary-light text-primary"
              }`}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  Yêu cầu hoàn tiền chờ duyệt
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                    pendingRefundCount > 0
                      ? "bg-warning-bg text-warning-foreground border border-warning-border"
                      : "bg-primary-light text-primary"
                  }`}
                >
                  {pendingRefundCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {pendingRefundCount > 0
                  ? "Cần phản hồi sớm để đảm bảo trải nghiệm học viên"
                  : "Tuyệt vời — chưa có hồ sơ hoàn tiền nào đang chờ"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        <Link
          href="/lecturer/hold"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/85 px-4 py-3.5 backdrop-blur-xs transition-all hover:border-primary-pastel hover:bg-surface"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  Khoản tiền đang tạm giữ (Hold)
                </p>
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                  {holdCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {holdCount > 0
                  ? "Theo dõi lịch giải ngân tự động về ví giảng viên"
                  : "Hiện chưa có giao dịch nào đang trong kỳ giữ quỹ"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      </div>
    </section>
  );
}
