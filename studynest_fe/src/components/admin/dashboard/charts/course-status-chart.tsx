"use client";

import Link from "next/link";
import useSWR from "swr";
import { BookOpen, ChevronRight, Star, Users } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import type { CourseStatsResponse } from "@/types/admin/statistics";

export default function CourseStatusChart() {
  const { data, isLoading } = useSWR<CourseStatsResponse>(
    "/admin/statistics/courses",
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const total = data?.total ?? 0;
  const published = data?.by_status?.published ?? 0;
  const draft = data?.by_status?.draft ?? 0;
  const archived = data?.by_status?.archived ?? 0;
  const pubPct = total > 0 ? Math.round((published / total) * 100) : 0;

  const levels = [
    {
      label: "Cơ bản (Beginner)",
      value: data?.by_level?.beginner ?? 0,
      bar: "bg-primary",
    },
    {
      label: "Trung cấp (Intermediate)",
      value: data?.by_level?.intermediate ?? 0,
      bar: "bg-accent-border",
    },
    {
      label: "Nâng cao (Advanced)",
      value: data?.by_level?.advanced ?? 0,
      bar: "bg-secondary-pastel",
    },
    {
      label: "Mọi trình độ (All)",
      value: data?.by_level?.all ?? 0,
      bar: "bg-accent-vanilla-border",
    },
  ];
  const maxLvl = Math.max(1, ...levels.map((l) => l.value));

  return (
    <section className="flex h-full flex-col justify-between rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-light px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
            <BookOpen size={12} animated={false} />
            Hệ sinh thái học liệu
          </span>
          <h2 className="mt-1.5 text-lg font-bold text-foreground">
            Trạng thái &amp; Trình độ Khóa học
          </h2>
        </div>

        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light/50"
        >
          Catalog
          <ChevronRight size={13} animated={false} />
        </Link>
      </div>

      {isLoading ? (
        <div className="my-6 h-48 animate-pulse rounded-2xl bg-background" />
      ) : (
        <div className="mt-4 space-y-5">
          {/* Status Pills + Rating */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-success-border/70 bg-success-bg/50 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Xuất bản</p>
              <p className="mt-0.5 text-lg font-bold text-success-foreground">
                {published}
              </p>
              <p className="text-[10px] font-semibold text-success-foreground">
                {pubPct}%
              </p>
            </div>
            <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/50 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Bản nháp</p>
              <p className="mt-0.5 text-lg font-bold text-accent-vanilla-foreground">
                {draft}
              </p>
              <p className="text-[10px] text-muted-foreground">Đang soạn</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Lưu trữ</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">
                {archived}
              </p>
              <p className="text-[10px] text-muted-foreground">Đã ẩn</p>
            </div>
          </div>

          {/* Level Bars */}
          <div className="space-y-2.5">
            {levels.map((lvl) => (
              <div key={lvl.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {lvl.label}
                  </span>
                  <span className="font-semibold text-muted-foreground">
                    {lvl.value} khóa
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full ${lvl.bar}`}
                    style={{
                      width: `${Math.max(4, Math.round((lvl.value / maxLvl) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Rating & Enrollments Footer */}
          <div className="flex items-center justify-between rounded-2xl border border-primary-pastel/60 bg-primary-light/40 px-4 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <Star
                size={14}
                animated={false}
                className="text-accent-vanilla-foreground"
              />
              Đánh giá TB:{" "}
              <strong className="text-primary">
                {(data?.avg_rating ?? 0).toFixed(2)} / 5
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
              <Users size={14} animated={false} />
              {(data?.total_enrollments ?? 0).toLocaleString("vi-VN")} ghi danh
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
