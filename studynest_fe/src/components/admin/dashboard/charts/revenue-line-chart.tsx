"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronRight, Coins, TrendingUp } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type {
  RevenuePeriod,
  RevenueStatsResponse,
} from "@/types/admin/statistics";

const PERIODS: { key: RevenuePeriod; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
];

export default function RevenueLineChart() {
  const [period, setPeriod] = useState<RevenuePeriod>("month");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { data, isLoading } = useSWR<RevenueStatsResponse>(
    `/admin/statistics/revenue?period=${period}`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const points = data?.data ?? [];
  const maxVal = useMemo(
    () => Math.max(1, ...points.map((p) => Number(p.amount || 0))),
    [points],
  );

  const activePoint =
    hoveredIdx !== null
      ? points[hoveredIdx]
      : points[points.length - 1] ?? null;

  const totalRev = Number(data?.total || 0);
  const platformInc = Number(data?.platform_income || 0);
  const instructorPay = Number(data?.instructor_payout || 0);
  const platformPct =
    totalRev > 0 ? Math.round((platformInc / totalRev) * 100) : 0;

  return (
    <section className="flex h-full flex-col justify-between rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <TrendingUp size={12} animated={false} />
            Dòng chảy doanh thu
          </span>
          <h2 className="mt-1.5 text-lg font-bold text-foreground">
            Biểu đồ Doanh thu Nền tảng
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-background p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPeriod(p.key);
                  setHoveredIdx(null);
                }}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  period === p.key
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link
            href="/admin/wallets"
            className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary hover:border-primary-pastel hover:bg-primary-light/50"
          >
            Kho bạc
            <ChevronRight size={13} animated={false} />
          </Link>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary-pastel/60 bg-primary-light/45 p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Tổng doanh thu kỳ này
          </p>
          <p className="mt-0.5 text-lg font-bold text-primary">
            {formatVndAsCoin(Math.round(totalRev))}
          </p>
        </div>
        <div className="rounded-2xl border border-accent-border/70 bg-accent/40 p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Thu nhập sàn ({platformPct}%)
          </p>
          <p className="mt-0.5 text-lg font-bold text-accent-foreground">
            {formatVndAsCoin(Math.round(platformInc))}
          </p>
        </div>
        <div className="rounded-2xl border border-success-border/70 bg-success-bg/50 p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Chi trả giảng viên ({100 - platformPct}%)
          </p>
          <p className="mt-0.5 text-lg font-bold text-success-foreground">
            {formatVndAsCoin(Math.round(instructorPay))}
          </p>
        </div>
      </div>

      {/* Interactive Sky Bars */}
      <div className="mt-5">
        {activePoint && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/80 bg-background/60 px-4 py-2 text-xs">
            <span className="font-semibold text-foreground">
              Mốc {activePoint.date}
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 font-bold text-primary">
                <Coins size={13} animated={false} />
                {formatVndAsCoin(Math.round(activePoint.amount))}
              </span>
              <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary">
                {activePoint.count} đơn
              </span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-background" />
        ) : points.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
            Chưa có phát sinh doanh thu trong chu kỳ này.
          </div>
        ) : (
          <div className="flex h-48 items-end gap-1.5 overflow-x-auto pb-1 pt-4">
            {points.map((pt, idx) => {
              const h = Math.max(
                6,
                Math.round((Number(pt.amount || 0) / maxVal) * 100),
              );
              const selected =
                hoveredIdx === idx ||
                (hoveredIdx === null && idx === points.length - 1);
              return (
                <button
                  key={`${pt.date}-${idx}`}
                  type="button"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(idx)}
                  className={`group flex min-w-[34px] flex-1 flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 transition-colors ${
                    selected ? "bg-primary-light/65" : "hover:bg-background"
                  }`}
                >
                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-[26px] rounded-t-xl transition-all duration-300 ${
                        selected
                          ? "bg-gradient-to-t from-primary to-primary/70 shadow-sm"
                          : "bg-gradient-to-t from-primary-pastel to-primary-light group-hover:from-primary/80 group-hover:to-primary-pastel"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
                    {pt.date.length > 7 ? pt.date.slice(5) : pt.date}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
