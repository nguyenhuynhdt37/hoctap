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

const formatCoin = (value?: number | null) => formatVndAsCoin(value ?? 0);

const formatShortDate = (raw: string, period: "month" | "year") => {
  if (!raw) return "";
  const parts = raw.split("-");
  if (period === "year" && parts.length >= 2) return `T${Number(parts[1])}`;
  if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
  return raw;
};

/**
 * Tạo đường cong Bezier mượt (Catmull-Rom -> Cubic Bezier) cho Cloud Wave SVG
 */
function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Tầng 2 Trái: Biểu đồ Sóng Mây Doanh Thu (Cloud Wave Revenue Canvas)
 */
export function CloudWaveChart() {
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

  const chart = useMemo(() => {
    const raw = Array.isArray(chartItems) ? chartItems : [];
    const items = period === "month" && raw.length > 14 ? raw.slice(-14) : raw;
    const maxRev = Math.max(1, ...items.map((item) => item.revenue || 0));
    const peakRev = items.reduce(
      (max, item) => Math.max(max, item.revenue || 0),
      0,
    );
    const totalRev = items.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalSold = items.reduce(
      (sum, item) => sum + (item.courses_sold || 0),
      0,
    );

    const width = 640;
    const height = 210;
    const padX = 24;
    const padTop = 26;
    const padBottom = 26;
    const plotW = width - padX * 2;
    const plotH = height - padTop - padBottom;

    const coords = items.map((item, idx) => {
      const x =
        items.length === 1
          ? padX + plotW / 2
          : padX + (idx / (items.length - 1)) * plotW;
      const y = padTop + plotH - ((item.revenue || 0) / maxRev) * plotH;
      return { x, y, item };
    });

    const linePath = buildSmoothPath(coords);
    const baselineY = padTop + plotH;
    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${baselineY} L ${coords[0].x.toFixed(2)} ${baselineY} Z`
        : "";

    return {
      items,
      coords,
      linePath,
      areaPath,
      width,
      height,
      baselineY,
      padTop,
      totalRev,
      peakRev,
      totalSold,
    };
  }, [chartItems, period]);

  const activeIdx =
    hoveredIdx !== null && chart.items[hoveredIdx]
      ? hoveredIdx
      : chart.items.length > 0
        ? chart.items.length - 1
        : -1;
  const activePoint = activeIdx >= 0 ? chart.items[activeIdx] : null;

  return (
    <Card
      variant="surface"
      density="none"
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-b from-surface via-surface to-primary-light/30 shadow-xs"
    >
      {/* Header sóng mây */}
      <div className="flex flex-col gap-3 border-b border-border/80 bg-gradient-to-r from-primary-light/60 via-surface to-secondary-light/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
            <BarChart3 animated={false} className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Sóng tăng trưởng doanh thu
            </h2>
            <p className="text-xs text-muted-foreground">
              Chạm hoặc di chuột vào các điểm mây để đối chiếu doanh thu Coin
            </p>
          </div>
        </div>

        <div
          className="inline-flex items-center self-start rounded-full border border-primary-pastel/80 bg-surface p-1 sm:self-auto"
          role="group"
          aria-label="Chọn chu kỳ biểu đồ"
        >
          <button
            type="button"
            onClick={() => {
              setPeriod("month");
              setHoveredIdx(null);
            }}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              period === "month"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-primary"
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
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              period === "year"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            Theo năm
          </button>
        </div>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="flex flex-1 flex-col justify-between gap-4 p-6">
        {/* 3 mini-pill tổng hợp + Floating Active Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel/70 bg-primary-light/50 px-3 py-1 text-xs text-foreground">
              <span className="text-muted-foreground">Tổng kỳ:</span>
              <strong className="font-display text-sm font-bold text-primary tabular-nums">
                {formatCoin(chart.totalRev)}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel/70 bg-secondary-light/50 px-3 py-1 text-xs text-foreground">
              <span className="text-muted-foreground">Đỉnh:</span>
              <strong className="font-semibold text-secondary-foreground tabular-nums">
                {formatCoin(chart.peakRev)}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent-vanilla/70 px-3 py-1 text-xs text-foreground">
              <strong className="font-semibold tabular-nums">
                {chart.totalSold}
              </strong>
              <span className="text-muted-foreground">khóa bán ra</span>
            </span>
          </div>

          {activePoint && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface px-3.5 py-1.5 text-xs shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-semibold text-foreground">
                {formatShortDate(activePoint.date, period)}
              </span>
              <span className="text-border">·</span>
              <strong className="font-display text-sm font-bold text-primary tabular-nums">
                {formatCoin(activePoint.revenue)}
              </strong>
              <span className="text-muted-foreground">
                ({activePoint.courses_sold} lượt)
              </span>
            </div>
          )}
        </div>

        {/* SVG Smooth Wave Area */}
        {isLoadingChart ? (
          <Skeleton variant="rect" className="h-52 w-full rounded-2xl" />
        ) : chart.items.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-primary-pastel bg-primary-light/20 text-center">
            <p className="text-sm font-semibold text-foreground">
              Chưa có dữ liệu sóng doanh thu trong chu kỳ này
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Doanh thu từ các lượt đăng ký khóa học và combo sẽ tự động vẽ thành
              sóng mây tại đây.
            </p>
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="h-52 w-full overflow-visible"
              role="img"
              aria-label="Biểu đồ sóng doanh thu giảng viên"
            >
              <defs>
                <linearGradient id="cloudWaveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                    stopOpacity="0.32"
                  />
                  <stop
                    offset="65%"
                    stopColor="var(--color-primary-pastel)"
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-primary-light)"
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>

              {/* 3 đường lưới ngang mờ */}
              {[0.25, 0.55, 0.85].map((ratio) => {
                const y =
                  chart.padTop + (chart.baselineY - chart.padTop) * ratio;
                return (
                  <line
                    key={ratio}
                    x1={16}
                    x2={chart.width - 16}
                    y1={y}
                    y2={y}
                    stroke="var(--color-border)"
                    strokeDasharray="4 6"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Vùng đổ bóng mây */}
              <path d={chart.areaPath} fill="url(#cloudWaveFill)" />

              {/* Đường sóng chính */}
              <path
                d={chart.linePath}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Điểm tương tác & cột dọc highlight */}
              {chart.coords.map((pt, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <g
                    key={`${pt.item.date}-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                  >
                    {isActive && (
                      <line
                        x1={pt.x}
                        x2={pt.x}
                        y1={pt.y}
                        y2={chart.baselineY}
                        stroke="var(--color-primary)"
                        strokeOpacity="0.35"
                        strokeDasharray="3 4"
                        strokeWidth="1.5"
                      />
                    )}
                    {/* Vùng bắt hover rộng */}
                    <rect
                      x={pt.x - 18}
                      y={0}
                      width={36}
                      height={chart.height}
                      fill="transparent"
                    />
                    {isActive && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={10}
                        fill="var(--color-primary)"
                        fillOpacity="0.18"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 5.5 : 3.5}
                      fill={
                        isActive
                          ? "var(--color-primary)"
                          : "var(--color-surface)"
                      }
                      stroke="var(--color-primary)"
                      strokeWidth="2.2"
                    />
                    <text
                      x={pt.x}
                      y={chart.height - 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isActive ? "700" : "500"}
                      fill={
                        isActive
                          ? "var(--color-primary)"
                          : "var(--color-muted-foreground)"
                      }
                    >
                      {formatShortDate(pt.item.date, period)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Tầng 3: 4 Thẻ KPI Đa Sắc Mây (Color-Coded Cloud Tiles)
 */
export function ColorCloudKpis({
  overview,
  isLoadingOverview,
}: {
  overview?: LecturerOverview;
  isLoadingOverview: boolean;
}) {
  const revenueGrowth = overview?.revenue_growth ?? 0;
  const isGrowthPositive = revenueGrowth >= 0;
  const totalCourses = overview?.total_courses ?? 0;
  const totalStudents = overview?.total_students ?? 0;
  const avgPerCourse =
    totalCourses > 0 ? Math.round(totalStudents / totalCourses) : 0;
  const avgRating = overview?.average_rating ?? 0;

  return (
    <section
      aria-label="Chỉ số tổng quan đa sắc mây"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Tile 1: Sky Blue — Tổng khóa học */}
      <Link href="/lecturer/courses" className="group block">
        <Card
          interactive
          className="h-full rounded-[24px] border-primary-pastel bg-gradient-to-br from-primary-light/90 via-surface to-surface p-5 shadow-2xs transition-all group-hover:-translate-y-1 group-hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <span>Giáo trình</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng khóa học
            </p>
            {isLoadingOverview ? (
              <Skeleton variant="text" className="mt-1 h-9 w-16" />
            ) : (
              <p className="mt-0.5 font-display text-3xl font-bold tabular-nums text-foreground">
                {totalCourses.toLocaleString("vi-VN")}
              </p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Quản lý chương bài &amp; tài nguyên
            </p>
          </div>
        </Card>
      </Link>

      {/* Tile 2: Lavender / Secondary — Tổng học viên */}
      <Link href="/lecturer/dashboard" className="group block">
        <Card
          interactive
          className="h-full rounded-[24px] border-secondary-pastel bg-gradient-to-br from-secondary-light/90 via-surface to-surface p-5 shadow-2xs transition-all group-hover:-translate-y-1 group-hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-secondary-pastel bg-surface text-secondary-foreground shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground tabular-nums">
              ~{avgPerCourse} HV/khóa
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng học viên
            </p>
            {isLoadingOverview ? (
              <Skeleton variant="text" className="mt-1 h-9 w-20" />
            ) : (
              <p className="mt-0.5 font-display text-3xl font-bold tabular-nums text-foreground">
                {totalStudents.toLocaleString("vi-VN")}
              </p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Cộng đồng đang đồng hành cùng bạn
            </p>
          </div>
        </Card>
      </Link>

      {/* Tile 3: Vanilla Sunlight — Đánh giá trung bình */}
      <Link href="/lecturer/dashboard" className="group block">
        <Card
          interactive
          className="h-full rounded-[24px] border-accent-vanilla-border bg-gradient-to-br from-accent-vanilla/95 via-surface to-surface p-5 shadow-2xs transition-all group-hover:-translate-y-1 group-hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-surface text-accent-vanilla-foreground shadow-2xs">
              <Star className="h-5 w-5 fill-current" />
            </div>
            <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-accent-vanilla-foreground tabular-nums">
              {overview?.total_reviews ?? 0} lượt
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Điểm chất lượng
            </p>
            {isLoadingOverview ? (
              <Skeleton variant="text" className="mt-1 h-9 w-16" />
            ) : (
              <p className="mt-0.5 font-display text-3xl font-bold tabular-nums text-foreground">
                {avgRating.toFixed(1)}{" "}
                <span className="font-sans text-sm font-normal text-muted-foreground">
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

      {/* Tile 4: Mint / Success Pastel — Doanh thu tháng này */}
      <Link href="/lecturer/wallets" className="group block">
        <Card
          interactive
          className="h-full rounded-[24px] border-success-border bg-gradient-to-br from-success-bg/90 via-surface to-surface p-5 shadow-2xs transition-all group-hover:-translate-y-1 group-hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-success-border bg-surface text-success-foreground shadow-2xs">
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
              <Skeleton variant="text" className="mt-1 h-9 w-28" />
            ) : (
              <p className="mt-0.5 truncate font-display text-3xl font-bold tabular-nums text-primary">
                {formatCoin(overview?.this_month_revenue)}
              </p>
            )}
            <p className="mt-1.5 truncate text-xs text-muted-foreground tabular-nums">
              Tháng trước: {formatCoin(overview?.last_month_revenue)}
            </p>
          </div>
        </Card>
      </Link>
    </section>
  );
}
