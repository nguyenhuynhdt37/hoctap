"use client";

import useSWR from "swr";
import { Zap } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import type { ActivityStatsResponse } from "@/types/admin/statistics";

export default function ActivityStats() {
  const { data, isLoading } = useSWR<ActivityStatsResponse>(
    "/admin/statistics/activity?period=month",
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const metrics = [
    {
      label: "Lượt xem bài giảng",
      value: data?.lesson_views ?? 0,
      bar: "bg-primary",
    },
    {
      label: "Bài học hoàn thành",
      value: data?.lesson_completions ?? 0,
      bar: "bg-success-border",
    },
    {
      label: "Lượt làm bài kiểm tra",
      value: data?.quiz_attempts ?? 0,
      bar: "bg-accent-border",
    },
    {
      label: "Bình luận & Hỏi đáp",
      value: data?.comments ?? 0,
      bar: "bg-secondary-pastel",
    },
    {
      label: "Ghi chú học tập mới",
      value: data?.notes_created ?? 0,
      bar: "bg-accent-vanilla-border",
    },
  ];
  const maxVal = Math.max(1, ...metrics.map((m) => m.value));

  return (
    <section className="flex h-full flex-col justify-between rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-0.5 text-[11px] font-semibold text-info-foreground">
          <Zap size={12} animated={false} />
          Nhịp học tập 30 ngày
        </span>
        <h3 className="mt-1.5 text-base font-bold text-foreground">
          Tương tác Học viên
        </h3>
      </div>

      {isLoading ? (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-background" />
      ) : (
        <div className="mt-4 space-y-3">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{m.label}</span>
                <span className="font-bold text-primary">
                  {m.value.toLocaleString("vi-VN")}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                <div
                  className={`h-full rounded-full ${m.bar}`}
                  style={{
                    width: `${Math.max(4, Math.round((m.value / maxVal) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
