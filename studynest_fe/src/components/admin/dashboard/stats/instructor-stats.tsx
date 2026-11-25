"use client";

import Link from "next/link";
import useSWR from "swr";
import { ChevronRight, GraduationCap } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { InstructorStatsResponse } from "@/types/admin/statistics";

export default function InstructorStats() {
  const { data, isLoading } = useSWR<InstructorStatsResponse>(
    "/admin/statistics/instructors",
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const totalEarn = Number(data?.total_earnings || 0);
  const paidOut = Number(data?.paid_out || 0);
  const paidPct =
    totalEarn > 0 ? Math.min(100, Math.round((paidOut / totalEarn) * 100)) : 0;

  return (
    <section className="flex h-full flex-col justify-between rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-vanilla px-2.5 py-0.5 text-[11px] font-semibold text-accent-vanilla-foreground">
            <GraduationCap size={12} animated={false} />
            Hệ sinh thái giảng dạy
          </span>
          <h3 className="mt-1.5 text-base font-bold text-foreground">
            Doanh thu &amp; Chi trả GV
          </h3>
        </div>
        <Link
          href="/admin/withdraws"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
        >
          Chi trả
          <ChevronRight size={13} animated={false} />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-background" />
      ) : (
        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-center justify-between rounded-2xl bg-accent-vanilla/50 px-4 py-3">
            <span className="font-medium text-accent-vanilla-foreground">
              Tổng doanh thu giảng viên
            </span>
            <span className="text-sm font-bold text-accent-vanilla-foreground">
              {formatVndAsCoin(Math.round(totalEarn))}
            </span>
          </div>

          <div className="space-y-1.5 rounded-2xl bg-background/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tỉ lệ đã giải ngân</span>
              <span className="font-bold text-primary">{paidPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-success-bg/55 p-3">
              <p className="text-[11px] text-muted-foreground">Đã chi trả</p>
              <p className="mt-0.5 font-bold text-success-foreground">
                {formatVndAsCoin(Math.round(paidOut))}
              </p>
            </div>
            <div className="rounded-2xl bg-warning-bg/60 p-3">
              <p className="text-[11px] text-muted-foreground">Chờ chi trả</p>
              <p className="mt-0.5 font-bold text-warning-foreground">
                {formatVndAsCoin(Math.round(data?.pending_payout || 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
