"use client";

import { useState } from "react";
import useSWR from "swr";
import { Layers } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { RevenueByCategoryResponse } from "@/types/admin/statistics";

const CLOUDY_SLICE_COLORS = [
  "#356FA7",
  "#6FA3D6",
  "#9F85D9",
  "#E58EA9",
  "#E3B166",
  "#67B287",
];

export default function CategoryPieChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data, isLoading } = useSWR<RevenueByCategoryResponse>(
    "/admin/statistics/revenue/by-category",
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const items = (data?.data ?? []).slice(0, 6);
  const totalRevenue = items.reduce((sum, i) => sum + Number(i.revenue || 0), 0);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  let cumulativePct = 0;
  const segments = items.map((item, idx) => {
    const pct =
      totalRevenue > 0 ? (Number(item.revenue || 0) / totalRevenue) * 100 : 0;
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePct / 100) * circumference);
    cumulativePct += pct;
    return {
      ...item,
      pct: Math.round(pct * 10) / 10,
      color: CLOUDY_SLICE_COLORS[idx % CLOUDY_SLICE_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const focused =
    activeIndex !== null ? segments[activeIndex] : segments[0] ?? null;

  return (
    <section className="flex h-full flex-col justify-between rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
          <Layers size={12} animated={false} />
          Phân bổ doanh thu
        </span>
        <h2 className="mt-1.5 text-lg font-bold text-foreground">
          Cơ cấu theo Danh mục
        </h2>
      </div>

      {isLoading ? (
        <div className="my-6 h-48 animate-pulse rounded-2xl bg-background" />
      ) : segments.length === 0 ? (
        <div className="my-6 flex h-48 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
          Chưa có doanh thu theo danh mục.
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5">
          {/* Interactive SVG Donut */}
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg
              viewBox="0 0 150 150"
              className="h-full w-full -rotate-90"
              aria-label="Biểu đồ cơ cấu doanh thu theo danh mục"
            >
              <circle
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke="#E8F2FA"
                strokeWidth="18"
              />
              {segments.map((seg, idx) => (
                <circle
                  key={seg.category_id}
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={activeIndex === idx ? "22" : "18"}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <span className="text-lg font-bold text-foreground">
                {focused ? `${focused.pct}%` : "0%"}
              </span>
              <span className="line-clamp-1 text-[10px] font-medium text-muted-foreground">
                {focused?.category_name || "Tổng"}
              </span>
            </div>
          </div>

          {/* Legend List */}
          <div className="w-full space-y-2">
            {segments.map((seg, idx) => (
              <div
                key={seg.category_id}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                  activeIndex === idx ? "bg-primary-light/60" : "hover:bg-background"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate font-medium text-foreground">
                    {seg.category_name}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-primary">
                  {formatVndAsCoin(Math.round(seg.revenue))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
