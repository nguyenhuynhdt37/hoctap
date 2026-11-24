"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Coins,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "pulsoicon-react";
import { Badge, Card, Skeleton } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import {
  LecturerOverview,
  RevenueChartItem,
} from "@/types/lecturer/statistics";

interface RevenuePulseProps {
  overview?: LecturerOverview;
  isLoadingOverview: boolean;
}

const formatCoin = (value?: number | null) => formatVndAsCoin(value ?? 0);

const formatShortDate = (raw: string, period: "month" | "year") => {
  if (!raw) return "";
  const parts = raw.split("-");
  if (period === "year" && parts.length >= 2) {
    return `T${Number(parts[1])}`;
  }
  if (parts.length >= 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return raw;
};

export function RevenuePulse({
  overview,
  isLoadingOverview,
}: RevenuePulseProps) {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { data: chartItems, isLoading: isLoadingChart } = useSWR<
    RevenueChartItem[]
  >(
    `/lecturer/statistics/revenue-chart?period=${period}`,
    async (url) => {
      try {
        const res = await api.get(url);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false },
  );

  const revenueGrowth = overview?.revenue_growth ?? 0;
  const isGrowthPositive = revenueGrowth >= 0;
  const avgRating = overview?.average_rating ?? 0;

  const series = useMemo(() => {
    const raw = Array.isArray(chartItems) ? chartItems : [];
    // Lấy tối đa 16 điểm gần nhất khi xem theo tháng để cột thoáng đẹp
    const sliced = period === "month" && raw.length > 16 ? raw.slice(-16) : raw;
    const maxRevenue = Math.max(1, ...sliced.map((item) => item.revenue || 0));
    const totalPeriodRevenue = sliced.reduce(
      (sum, item) => sum + (item.revenue || 0),
      0,
    );
    const totalCoursesSold = sliced.reduce(
      (sum, item) => sum + (item.courses_sold || 0),
      0,
    );
    return {
      items: sliced,
      maxRevenue,
      totalPeriodRevenue,
      totalCoursesSold,
    };
  }, [chartItems, period]);

  const activePoint =
    hoveredIdx !== null && series.items[hoveredIdx]
      ? series.items[hoveredIdx]
      : series.items.length > 0
        ? series.items[series.items.length - 1]
        : null;

  return (
    <div className="space-y-6">
      {/* Hàng 4 Thẻ KPI Editorial */}
      <section
        aria-label="Chỉ số tổng quan giảng dạy"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* KPI 1: Tổng khóa học */}
        <Link href="/lecturer/courses" className="group block">
          <Card
            interactive
            className="h-full rounded-[22px] border-border bg-surface p-5 shadow-2xs transition-all group-hover:-translate-y-0.5 group-hover:border-primary-pastel"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-pastel/70 bg-primary-light text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-subtle-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Tổng khóa học
              </p>
              {isLoadingOverview ? (
                <Skeleton variant="text" className="mt-1 h-8 w-16" />
              ) : (
                <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {(overview?.total_courses ?? 0).toLocaleString("vi-VN")}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Quản lý giáo trình &amp; xuất bản
              </p>
            </div>
          </Card>
        </Link>

        {/* KPI 2: Tổng học viên */}
        <Link href="/lecturer/dashboard" className="group block">
          <Card
            interactive
            className="h-full rounded-[22px] border-border bg-surface p-5 shadow-2xs transition-all group-hover:-translate-y-0.5 group-hover:border-secondary-pastel"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-secondary-pastel/70 bg-secondary-light text-secondary-foreground">
                <Users className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-subtle-foreground transition-all group-hover:translate-x-0.5 group-hover:text-secondary-foreground" />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Tổng học viên
              </p>
              {isLoadingOverview ? (
                <Skeleton variant="text" className="mt-1 h-8 w-20" />
              ) : (
                <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {(overview?.total_students ?? 0).toLocaleString("vi-VN")}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Đã đăng ký các khóa học của bạn
              </p>
            </div>
          </Card>
        </Link>

        {/* KPI 3: Đánh giá trung bình */}
        <Link href="/lecturer/dashboard" className="group block">
          <Card
            interactive
            className="h-full rounded-[22px] border-border bg-surface p-5 shadow-2xs transition-all group-hover:-translate-y-0.5 group-hover:border-accent-vanilla-border"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-vanilla-border/70 bg-accent-vanilla text-accent-vanilla-foreground">
                <Star className="h-5 w-5 fill-current" />
              </div>
              <span className="rounded-full bg-accent-vanilla/70 px-2 py-0.5 text-[11px] font-semibold text-accent-vanilla-foreground">
                {overview?.total_reviews ?? 0} đánh giá
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Đánh giá trung bình
              </p>
              {isLoadingOverview ? (
                <Skeleton variant="text" className="mt-1 h-8 w-16" />
              ) : (
                <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {avgRating.toFixed(1)}{" "}
                  <span className="font-sans text-sm font-normal text-subtle-foreground">
                    / 5.0
                  </span>
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    animated={false}
                    className={`h-3.5 w-3.5 ${
                      n <= Math.round(avgRating)
                        ? "fill-current text-accent-vanilla-foreground"
                        : "text-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          </Card>
        </Link>

        {/* KPI 4: Doanh thu tháng này */}
        <Link href="/lecturer/wallets" className="group block">
          <Card
            interactive
            className="h-full rounded-[22px] border-primary-pastel/70 bg-gradient-to-br from-primary-light/50 via-surface to-surface p-5 shadow-2xs transition-all group-hover:-translate-y-0.5 group-hover:border-primary"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-surface text-primary">
                <Coins className="h-5 w-5" />
              </div>
              {!isLoadingOverview && (
                <Badge
                  variant={isGrowthPositive ? "success" : "destructive"}
                  size="sm"
                  className="gap-1 text-[11px]"
                >
                  {isGrowthPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isGrowthPositive ? "+" : ""}
                  {revenueGrowth.toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Doanh thu tháng này
              </p>
              {isLoadingOverview ? (
                <Skeleton variant="text" className="mt-1 h-8 w-28" />
              ) : (
                <p className="mt-0.5 truncate font-display text-2xl font-semibold tabular-nums text-primary">
                  {formatCoin(overview?.this_month_revenue)}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground truncate">
                Tháng trước: {formatCoin(overview?.last_month_revenue)}
              </p>
            </div>
          </Card>
        </Link>
      </section>

      {/* Biểu đồ Nhịp Doanh Thu tương tác */}
      <Card
        variant="surface"
        density="none"
        className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
      >
        <div className="flex flex-col gap-3 border-b border-border bg-primary-light/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-surface text-primary">
              <BarChart3 animated={false} className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Nhịp tăng trưởng doanh thu
              </h2>
              <p className="text-xs text-muted-foreground">
                Di chuột vào từng cột để xem doanh thu Coin &amp; số khóa bán ra
              </p>
            </div>
          </div>

          <div
            className="inline-flex items-center rounded-full border border-border bg-surface p-1 self-start sm:self-auto"
            role="group"
            aria-label="Chọn chu kỳ biểu đồ"
          >
            <button
              type="button"
              onClick={() => {
                setPeriod("month");
                setHoveredIdx(null);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                period === "month"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Gần đây
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod("year");
                setHoveredIdx(null);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                period === "year"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Theo năm
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Thanh thông số điểm đang chọn / tổng kỳ */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Tổng kỳ hiển thị: </span>
                <strong className="font-display text-sm font-semibold text-primary tabular-nums">
                  {formatCoin(series.totalPeriodRevenue)}
                </strong>
              </div>
              <div className="hidden h-4 w-px bg-border sm:block" />
              <div>
                <span className="text-muted-foreground">Khóa bán ra: </span>
                <strong className="font-semibold text-foreground tabular-nums">
                  {series.totalCoursesSold} lượt
                </strong>
              </div>
            </div>

            {activePoint && (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-primary-light/60 px-3 py-1 text-xs">
                <span className="font-medium text-muted-foreground">
                  {formatShortDate(activePoint.date, period)}:
                </span>
                <strong className="font-semibold text-primary tabular-nums">
                  {formatCoin(activePoint.revenue)}
                </strong>
                <span className="text-muted-foreground">
                  ({activePoint.courses_sold} khóa)
                </span>
              </div>
            )}
          </div>

          {isLoadingChart ? (
            <Skeleton variant="rect" className="h-44 w-full rounded-2xl" />
          ) : series.items.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 text-center">
              <p className="text-sm font-medium text-foreground">
                Chưa có dữ liệu doanh thu trong chu kỳ này
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Khi học viên đăng ký khóa học hoặc combo, nhịp doanh thu sẽ hiển
                thị tại đây.
              </p>
            </div>
          ) : (
            <div className="flex h-44 items-end gap-1.5 sm:gap-2.5 pt-2">
              {series.items.map((item, idx) => {
                const heightPct = Math.max(
                  8,
                  Math.round(((item.revenue || 0) / series.maxRevenue) * 100),
                );
                const isActive =
                  hoveredIdx === idx ||
                  (hoveredIdx === null && idx === series.items.length - 1);

                return (
                  <button
                    key={`${item.date}-${idx}`}
                    type="button"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onFocus={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                    aria-label={`${item.date}: ${formatCoin(item.revenue)}, ${item.courses_sold} khóa`}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 cursor-pointer focus:outline-none"
                  >
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className={`w-full max-w-9 rounded-t-xl transition-all duration-200 ${
                          isActive
                            ? "bg-primary shadow-xs"
                            : "bg-primary-pastel/80 group-hover:bg-primary/70"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`truncate text-[10px] tabular-nums transition-colors ${
                        isActive
                          ? "font-semibold text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatShortDate(item.date, period)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
