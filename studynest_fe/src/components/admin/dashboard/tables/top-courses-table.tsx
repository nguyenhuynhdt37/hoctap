"use client";

import { useState } from "react";
import useSWR from "swr";
import { BookOpen, Trophy } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  TopCoursesResponse,
  TopCoursesSortBy,
} from "@/types/admin/statistics";

const SORTS: { key: TopCoursesSortBy; label: string }[] = [
  { key: "revenue", label: "Doanh thu" },
  { key: "enrollments", label: "Ghi danh" },
  { key: "views", label: "Lượt xem" },
];

const RANK_STYLE = [
  "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
  "border-primary-pastel bg-primary-light text-primary",
  "border-secondary-pastel bg-secondary-light text-secondary-foreground",
];

export default function TopCoursesTable() {
  const [sortBy, setSortBy] = useState<TopCoursesSortBy>("revenue");

  const { data, isLoading } = useSWR<TopCoursesResponse>(
    `/admin/statistics/courses/top?sort_by=${sortBy}&limit=8`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const items = data?.data ?? [];

  return (
    <section className="flex h-full flex-col rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-vanilla px-2.5 py-0.5 text-[11px] font-semibold text-accent-vanilla-foreground">
            <Trophy size={12} animated={false} />
            Bảng vàng học liệu
          </span>
          <h2 className="mt-1.5 text-lg font-bold text-foreground">
            Top Khóa học Nổi bật
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-border bg-background p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSortBy(s.key)}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                sortBy === s.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-2xl bg-background"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border p-10 text-xs text-muted-foreground">
          Chưa có dữ liệu xếp hạng khóa học.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.course_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/45 p-3 transition-colors hover:border-primary-pastel hover:bg-surface"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${
                    RANK_STYLE[idx] ??
                    "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </span>
                {item.thumbnail ? (
                  <img
                    src={getImageUrl(item.thumbnail)}
                    alt={item.title}
                    className="h-10 w-14 shrink-0 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <BookOpen size={15} animated={false} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.instructor_name}
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-xl bg-primary-light/70 px-2.5 py-1 text-xs font-bold text-primary">
                {sortBy === "revenue"
                  ? formatVndAsCoin(Math.round(item.value || 0))
                  : `${Number(item.value || 0).toLocaleString("vi-VN")} ${
                      sortBy === "enrollments" ? "HV" : "lượt"
                    }`}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
