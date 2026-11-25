"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronRight, ShieldCheck, Users } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  RevenuePeriod,
  UserStatsResponse,
} from "@/types/admin/statistics";

const PERIODS: { key: RevenuePeriod; label: string }[] = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
];

export default function UserGrowthChart() {
  const [period, setPeriod] = useState<RevenuePeriod>("month");

  const { data, isLoading } = useSWR<UserStatsResponse>(
    `/admin/statistics/users?period=${period}`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const growth = data?.growth ?? [];
  const maxUserVal = useMemo(
    () =>
      Math.max(
        1,
        ...growth.map((g) => Math.max(g.new_users || 0, g.active_users || 0)),
      ),
    [growth],
  );

  const total = data?.total ?? 0;
  const verified = data?.verified ?? 0;
  const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;

  return (
    <section className="flex h-full flex-col justify-between rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-0.5 text-[11px] font-semibold text-info-foreground">
            <Users size={12} animated={false} />
            Tăng trưởng cộng đồng
          </span>
          <h2 className="mt-1.5 text-lg font-bold text-foreground">
            Người dùng Mới &amp; Hoạt động
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-background p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  period === p.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light/50"
          >
            Chi tiết
            <ChevronRight size={13} animated={false} />
          </Link>
        </div>
      </div>

      {/* Verification Progress Bar */}
      <div className="mt-4 rounded-2xl border border-border/80 bg-background/60 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldCheck size={14} className="text-primary" />
            Xác thực Email: {verified}/{total} thành viên
          </span>
          <span className="font-bold text-primary">{verifiedPct}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${verifiedPct}%` }}
          />
        </div>
      </div>

      {/* Dual Bars */}
      <div className="mt-4">
        {isLoading ? (
          <div className="h-44 animate-pulse rounded-2xl bg-background" />
        ) : growth.length === 0 ? (
          <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
            Chưa có dữ liệu tăng trưởng trong chu kỳ này.
          </div>
        ) : (
          <div className="flex h-44 items-end gap-2 overflow-x-auto pb-1 pt-3">
            {growth.slice(-12).map((pt) => {
              const newH = Math.max(
                6,
                Math.round(((pt.new_users || 0) / maxUserVal) * 100),
              );
              const actH = Math.max(
                6,
                Math.round(((pt.active_users || 0) / maxUserVal) * 100),
              );
              return (
                <div
                  key={pt.date}
                  className="flex min-w-[36px] flex-1 flex-col items-center gap-1.5"
                >
                  <div className="flex h-28 w-full items-end justify-center gap-1">
                    <div
                      title={`Mới: ${pt.new_users}`}
                      className="w-3 rounded-t-lg bg-primary"
                      style={{ height: `${newH}%` }}
                    />
                    <div
                      title={`Hoạt động: ${pt.active_users}`}
                      className="w-3 rounded-t-lg bg-accent-border"
                      style={{ height: `${actH}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {pt.date.length > 7 ? pt.date.slice(5) : pt.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              Người dùng mới
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-border" />
              Đang hoạt động
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(data?.by_role ?? []).map((r) => (
              <span
                key={r.role}
                className="rounded-full bg-primary-light/70 px-2 py-0.5 font-semibold text-primary"
              >
                {r.role}: {r.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
