"use client";

import useSWR from "swr";
import {
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
import { LecturerOverview } from "@/types/lecturer/statistics";

const formatVndApprox = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(value ?? 0)) + " đ";

export default function OverviewStats() {
  const { data, isLoading } = useSWR<LecturerOverview>(
    "/lecturer/statistics/overview",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-40 rounded-[24px]" />
        ))}
      </div>
    );
  }

  const totalRevenue = data?.total_revenue ?? 0;
  const thisMonth = data?.this_month_revenue ?? 0;
  const lastMonth = data?.last_month_revenue ?? 0;
  const growthValue = data?.revenue_growth ?? 0;
  const isGrowthPositive = growthValue >= 0;

  const totalStudents = data?.total_students ?? 0;
  const totalCourses = data?.total_courses ?? 0;
  const avgRating = data?.average_rating ?? 0;
  const totalReviews = data?.total_reviews ?? 0;

  const arpuVnd = totalStudents > 0 ? totalRevenue / totalStudents : 0;
  const avgRevPerCourseVnd = totalCourses > 0 ? totalRevenue / totalCourses : 0;
  const avgStudentsPerCourse =
    totalCourses > 0 ? Math.round(totalStudents / totalCourses) : 0;

  const monthComparePct =
    thisMonth + lastMonth > 0
      ? Math.min(100, Math.round((thisMonth / (thisMonth + lastMonth)) * 100))
      : 50;

  return (
    <section
      aria-label="Chỉ số thống kê cốt lõi"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* 1. Mint / Success Pastel — Tổng doanh thu */}
      <Card className="rounded-[24px] border-success-border bg-gradient-to-br from-success-bg/90 via-surface to-surface p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-3.5 flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-success-border bg-surface text-success-foreground shadow-2xs">
            <Coins className="h-5 w-5" />
          </div>
          <Badge
            variant={isGrowthPositive ? "success" : "destructive"}
            size="sm"
            className="gap-1 text-[11px]"
          >
            {isGrowthPositive ? (
              <TrendingUp animated={false} className="h-3 w-3" />
            ) : (
              <TrendingDown animated={false} className="h-3 w-3" />
            )}
            {isGrowthPositive ? "+" : ""}
            {growthValue.toFixed(1)}%
          </Badge>
        </div>

        <p className="text-xs font-medium text-muted-foreground">
          Tổng doanh thu tích lũy
        </p>
        <h3 className="mt-0.5 truncate font-display text-2xl font-bold tracking-tight tabular-nums text-primary sm:text-3xl">
          {formatVndAsCoin(totalRevenue)}
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          ≈ {formatVndApprox(totalRevenue)}
        </p>

        {/* Thanh đối chiếu Tháng này vs Tháng trước */}
        <div className="mt-3 space-y-1 border-t border-border/70 pt-2.5">
          <div className="flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-muted-foreground">
              Tháng này: <strong className="text-foreground">{formatVndAsCoin(thisMonth)}</strong>
            </span>
            <span className="text-muted-foreground">
              Trước: {formatVndAsCoin(lastMonth)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${monthComparePct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 2. Sky Blue — Cộng đồng học viên */}
      <Card className="rounded-[24px] border-primary-pastel bg-gradient-to-br from-primary-light/90 via-surface to-surface p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-3.5 flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
            ~{avgStudentsPerCourse} HV/khóa
          </span>
        </div>

        <p className="text-xs font-medium text-muted-foreground">
          Tổng học viên ghi danh
        </p>
        <h3 className="mt-0.5 font-display text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
          {totalStudents.toLocaleString("vi-VN")}
        </h3>

        <div className="mt-3 border-t border-border/70 pt-2.5 text-[11px] text-muted-foreground tabular-nums">
          Giá trị TB/học viên:{" "}
          <strong className="text-primary">{formatVndAsCoin(arpuVnd)}</strong>
        </div>
      </Card>

      {/* 3. Lavender / Secondary — Danh mục khóa học */}
      <Card className="rounded-[24px] border-secondary-pastel bg-gradient-to-br from-secondary-light/90 via-surface to-surface p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-3.5 flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-secondary-pastel bg-surface text-secondary-foreground shadow-2xs">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
            Danh mục
          </span>
        </div>

        <p className="text-xs font-medium text-muted-foreground">
          Khóa học giảng dạy
        </p>
        <h3 className="mt-0.5 font-display text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
          {totalCourses.toLocaleString("vi-VN")}
        </h3>

        <div className="mt-3 border-t border-border/70 pt-2.5 text-[11px] text-muted-foreground tabular-nums">
          Doanh thu TB/khóa:{" "}
          <strong className="text-foreground">
            {formatVndAsCoin(avgRevPerCourseVnd)}
          </strong>
        </div>
      </Card>

      {/* 4. Vanilla Sunlight — Uy tín đánh giá */}
      <Card className="rounded-[24px] border-accent-vanilla-border bg-gradient-to-br from-accent-vanilla/95 via-surface to-surface p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-3.5 flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-surface text-accent-vanilla-foreground shadow-2xs">
            <Star className="h-5 w-5 fill-current" />
          </div>
          <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-accent-vanilla-foreground tabular-nums">
            {totalReviews.toLocaleString("vi-VN")} đánh giá
          </span>
        </div>

        <p className="text-xs font-medium text-muted-foreground">
          Điểm uy tín trung bình
        </p>
        <h3 className="mt-0.5 font-display text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
          {avgRating.toFixed(1)}{" "}
          <span className="font-sans text-sm font-normal text-muted-foreground">
            / 5.0
          </span>
        </h3>

        <div
          className="mt-3 flex items-center gap-1 border-t border-border/70 pt-2.5"
          aria-hidden="true"
        >
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
      </Card>
    </section>
  );
}
