"use client";

import { useState } from "react";
import useSWR from "swr";
import { Award } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  TopInstructorsResponse,
  TopInstructorsSortBy,
} from "@/types/admin/statistics";

const SORTS: { key: TopInstructorsSortBy; label: string }[] = [
  { key: "revenue", label: "Doanh thu" },
  { key: "students", label: "Học viên" },
  { key: "courses", label: "Khóa học" },
];

const RANK_STYLE = [
  "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
  "border-primary-pastel bg-primary-light text-primary",
  "border-secondary-pastel bg-secondary-light text-secondary-foreground",
];

export default function TopInstructorsTable() {
  const [sortBy, setSortBy] = useState<TopInstructorsSortBy>("revenue");

  const { data, isLoading } = useSWR<TopInstructorsResponse>(
    `/admin/statistics/instructors/top?sort_by=${sortBy}&limit=8`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const items = data?.data ?? [];

  return (
    <section className="flex h-full flex-col rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
            <Award size={12} animated={false} />
            Đội ngũ tiêu biểu
          </span>
          <h2 className="mt-1.5 text-lg font-bold text-foreground">
            Top Giảng viên Dẫn đầu
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
          Chưa có dữ liệu xếp hạng giảng viên.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.instructor_id}
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
                {item.avatar ? (
                  <img
                    src={getImageUrl(item.avatar)}
                    alt={item.name}
                    className="h-10 w-10 shrink-0 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light font-bold text-primary">
                    {item.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.courses_count} khóa · {item.students_count} học viên
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-xl bg-accent/70 px-2.5 py-1 text-xs font-bold text-accent-foreground">
                {sortBy === "revenue"
                  ? formatVndAsCoin(Math.round(item.value || 0))
                  : `${Number(item.value || 0).toLocaleString("vi-VN")} ${
                      sortBy === "students" ? "HV" : "khóa"
                    }`}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
