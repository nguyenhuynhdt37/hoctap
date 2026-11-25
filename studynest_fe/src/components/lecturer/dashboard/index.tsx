"use client";

import { memo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  BarChart3,
  Coins,
  Printer,
  RefreshCw,
  TrendingUp,
  Users,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import {
  LecturerOverview,
  StudentAnalyticsResponse,
} from "@/types/lecturer/statistics";
import CoursePerformance from "./course-performance";
import OverviewStats from "./overview-stats";
import RevenueChart from "./revenue-chart";
import StudentAnalytics from "./student-analytics";

const MemoizedOverviewStats = memo(OverviewStats);
const MemoizedRevenueChart = memo(RevenueChart);
const MemoizedStudentAnalytics = memo(StudentAnalytics);
const MemoizedCoursePerformance = memo(CoursePerformance);

export default function LecturerStatsDashboard() {
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview } = useSWR<LecturerOverview>(
    "/lecturer/statistics/overview",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const { data: studentStats } = useSWR<StudentAnalyticsResponse>(
    "/lecturer/statistics/students",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        mutate("/lecturer/statistics/overview"),
        mutate("/lecturer/statistics/revenue-chart?period=month"),
        mutate("/lecturer/statistics/revenue-chart?period=year"),
        mutate("/lecturer/statistics/students"),
        mutate("/lecturer/statistics/courses"),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const growth = overview?.revenue_growth ?? 0;
  const arpu =
    overview && overview.total_students > 0
      ? overview.total_revenue / overview.total_students
      : 0;
  const activeCount = studentStats?.active_students ?? 0;
  const newCount = studentStats?.total_new_students ?? 0;

  return (
    <div className="min-h-screen bg-background px-4 py-7 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Observatory Panoramic Hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light via-surface to-accent-vanilla/75 p-6 shadow-sm sm:p-8">
          {/* Quầng mây & họa tiết SVG */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-primary-pastel/45 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-secondary-pastel/45 blur-3xl"
          />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-2 h-44 w-44 text-primary/12"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle
              cx="100"
              cy="100"
              r="84"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />
            <circle cx="100" cy="100" r="54" stroke="currentColor" strokeWidth="1.2" />
            <circle
              cx="100"
              cy="100"
              r="28"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="3 5"
            />
          </svg>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-2xs backdrop-blur-xs">
                <BarChart3 animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Phân tích chuyên sâu</span>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Đài Quan Sát Hiệu Suất &amp; Doanh Thu
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Tổng hợp chính xác theo thời gian thực toàn bộ chỉ số doanh thu
                Coin, tốc độ tăng trưởng học viên và hiệu suất từng khóa học của
                bạn.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface/90"
                disabled={refreshing}
                onClick={() => void handleRefreshAll()}
                leftIcon={
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                }
              >
                Làm mới số liệu
              </Button>
              <Button
                type="button"
                variant="pastel"
                size="sm"
                className="rounded-full border border-primary-pastel/80"
                onClick={() => window.print()}
                leftIcon={<Printer className="h-4 w-4" />}
              >
                In báo cáo
              </Button>
            </div>
          </div>

          {/* Smart Executive Insight Strip */}
          <div className="relative mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-surface bg-surface/85 px-4 py-3 backdrop-blur-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-success-border bg-success-bg text-success-foreground">
                <TrendingUp animated={false} className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Nhịp tăng trưởng tháng
                </p>
                <p className="truncate text-sm font-bold text-foreground tabular-nums">
                  {growth >= 0 ? "+" : ""}
                  {growth.toFixed(1)}% so với tháng trước
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-surface bg-surface/85 px-4 py-3 backdrop-blur-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                <Coins animated={false} className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Giá trị trung bình / học viên
                </p>
                <p className="truncate font-display text-sm font-bold text-primary tabular-nums">
                  {formatVndAsCoin(arpu)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-surface bg-surface/85 px-4 py-3 backdrop-blur-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-secondary-pastel bg-secondary-light text-secondary-foreground">
                <Users animated={false} className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Sức sống cộng đồng học viên
                </p>
                <p className="truncate text-sm font-bold text-foreground tabular-nums">
                  {activeCount} đang học · {newCount} học viên mới
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Thẻ KPI Đa Sắc Mây */}
        <MemoizedOverviewStats />

        {/* Biểu đồ kép (8/12) + Phân bổ học viên (4/12) */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <MemoizedRevenueChart />
          </div>
          <div className="xl:col-span-4">
            <MemoizedStudentAnalytics />
          </div>
        </div>

        {/* Ma trận Hiệu suất Khóa học + Xuất CSV */}
        <MemoizedCoursePerformance />
      </div>
    </div>
  );
}
