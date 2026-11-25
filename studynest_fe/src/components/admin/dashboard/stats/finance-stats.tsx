"use client";

import Link from "next/link";
import useSWR from "swr";
import { ChevronRight, Wallet } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { FinanceStatsResponse } from "@/types/admin/statistics";

export default function FinanceStats() {
  const { data, isLoading } = useSWR<FinanceStatsResponse>(
    "/admin/statistics/finance",
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  return (
    <section className="flex h-full flex-col justify-between rounded-[2rem] border border-primary-pastel/60 bg-surface/90 p-6 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
            <Wallet size={12} animated={false} />
            Dòng tiền kho bạc
          </span>
          <h3 className="mt-1.5 text-base font-bold text-foreground">
            Tài chính &amp; Thanh khoản
          </h3>
        </div>
        <Link
          href="/admin/wallets"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
        >
          Mở ví
          <ChevronRight size={13} animated={false} />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-background" />
      ) : (
        <div className="mt-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between rounded-2xl bg-primary-light/55 px-4 py-3">
            <span className="font-medium text-muted-foreground">
              Số dư ví nền tảng
            </span>
            <span className="text-sm font-bold text-primary">
              {formatVndAsCoin(Math.round(data?.platform_balance || 0))}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-background/70 px-4 py-2.5">
            <span className="text-muted-foreground">Tổng tiền nạp vào</span>
            <span className="font-bold text-success-foreground">
              +{formatVndAsCoin(Math.round(data?.total_deposits || 0))}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-background/70 px-4 py-2.5">
            <span className="text-muted-foreground">Tổng đã rút ra</span>
            <span className="font-bold text-destructive-foreground">
              -{formatVndAsCoin(Math.round(data?.total_withdrawals || 0))}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-secondary-light/45 px-4 py-2.5">
            <span className="text-secondary-foreground">
              Tổng đã hoàn tiền ({data?.refunds?.approved ?? 0} duyệt)
            </span>
            <span className="font-bold text-secondary-foreground">
              {formatVndAsCoin(Math.round(data?.refunds?.total_refunded || 0))}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
