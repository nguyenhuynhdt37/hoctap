"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { PieChart, UserCircle2, UserPlus, Users } from "pulsoicon-react";
import { LoadError } from "@/components/learning-paths/shared";
import { Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { StudentAnalyticsResponse } from "@/types/lecturer/statistics";

ChartJS.register(ArcElement, Tooltip, Legend);

const CLOUD_PALETTE = [
  "#356FA7",
  "#7BAFD4",
  "#A995DC",
  "#E8A8C0",
  "#D9B468",
  "#84B8A8",
];

export default function StudentAnalytics() {
  const { data, isLoading, error, mutate } = useSWR<StudentAnalyticsResponse>(
    "/lecturer/statistics/students",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const breakdown = useMemo(() => {
    const raw = Array.isArray(data?.students_by_course)
      ? [...data.students_by_course]
      : [];
    raw.sort((a, b) => (b.count || 0) - (a.count || 0));
    const totalInCourses = raw.reduce((sum, item) => sum + (item.count || 0), 0);
    return {
      items: raw.slice(0, 6),
      totalInCourses,
    };
  }, [data]);

  const chartData = {
    labels: breakdown.items.map((item) => item.course_title),
    datasets: [
      {
        data: breakdown.items.map((item) => item.count),
        backgroundColor: breakdown.items.map(
          (_, idx) => CLOUD_PALETTE[idx % CLOUD_PALETTE.length],
        ),
        borderColor: "#ffffff",
        borderWidth: 2.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#3D4A5A",
        padding: 10,
        borderRadius: 10,
        callbacks: {
          label: (ctx: { parsed: number; label: string }) => {
            const pct =
              breakdown.totalInCourses > 0
                ? Math.round((ctx.parsed / breakdown.totalInCourses) * 100)
                : 0;
            return ` ${ctx.parsed} học viên (${pct}%)`;
          },
        },
      },
    },
    cutout: "74%",
  };

  if (error) return <LoadError error={error} retry={() => mutate()} />;

  return (
    <Card
      variant="surface"
      density="none"
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-secondary-pastel/80 shadow-xs"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-secondary-light/55 via-surface to-primary-light/35 px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-secondary-pastel bg-surface text-secondary-foreground shadow-2xs">
          <Users animated={false} className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Phân bổ Học viên
          </h2>
          <p className="text-xs text-muted-foreground">
            Tăng trưởng &amp; tỷ trọng theo từng khóa học
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* 2 ô chỉ số học viên */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-primary-pastel/70 bg-primary-light/50 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <UserPlus
                animated={false}
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold text-primary">
                Học viên mới
              </span>
            </div>
            <p className="font-display text-2xl font-bold tabular-nums text-foreground">
              {data ? data.total_new_students.toLocaleString("vi-VN") : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-secondary-pastel/70 bg-secondary-light/50 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <UserCircle2
                animated={false}
                className="h-3.5 w-3.5 text-secondary-foreground"
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold text-secondary-foreground">
                Đang hoạt động
              </span>
            </div>
            <p className="font-display text-2xl font-bold tabular-nums text-foreground">
              {data ? data.active_students.toLocaleString("vi-VN") : "—"}
            </p>
          </div>
        </div>

        {/* Biểu đồ Doughnut với chỉ số trung tâm + Legend thanh tỷ trọng */}
        {isLoading ? (
          <Skeleton variant="rect" className="h-56 w-full rounded-2xl" />
        ) : breakdown.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-secondary-pastel bg-secondary-light/20 py-10 text-center text-muted-foreground">
            <PieChart
              animated={false}
              className="mb-2 h-10 w-10 text-primary/50"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              Chưa có dữ liệu phân bố
            </p>
            <p className="mt-0.5 text-xs">
              Dữ liệu sẽ xuất hiện khi có học viên đăng ký khóa học.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="relative mx-auto h-44 w-44">
              <Doughnut data={chartData} options={options} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {breakdown.totalInCourses.toLocaleString("vi-VN")}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lượt ghi danh
                </span>
              </div>
            </div>

            {/* Danh sách thanh tỷ trọng rõ chữ, không bị cắt */}
            <div className="space-y-2.5">
              {breakdown.items.map((item, idx) => {
                const pct =
                  breakdown.totalInCourses > 0
                    ? Math.round((item.count / breakdown.totalInCourses) * 100)
                    : 0;
                const color = CLOUD_PALETTE[idx % CLOUD_PALETTE.length];
                return (
                  <div key={item.course_id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="truncate font-medium text-foreground"
                          title={item.course_title}
                        >
                          {item.course_title}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, pct)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
