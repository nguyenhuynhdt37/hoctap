"use client";

import { CoinBadge } from "@/components/ui";
import {
  BONUS_COINS_PER_GOLD,
  coinToVnd,
  DEFAULT_COIN_VND_RATE,
  formatVnd,
  type CoinBalances,
} from "@/lib/learning-hub/coin-logic";
import { WalletSummary } from "@/types/user/wallet";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleCheck,
  Clock,
  Coins,
  Lock,
  Store,
} from "pulsoicon-react";

interface Props {
  wallet: WalletSummary | null;
  coins?: CoinBalances;
  rateVnd?: number;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

const formatDateTime = (val?: string | null) => {
  if (!val) return "Chưa có giao dịch";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "Chưa có giao dịch";
  }
};

export function WalletSummaryCard({
  wallet,
  coins,
  rateVnd = DEFAULT_COIN_VND_RATE,
}: Props) {
  const isLocked = wallet?.is_locked ?? false;
  const vndLeft = Number(wallet?.balance ?? 0);
  const goldBalance = coins?.paid;
  const whiteBalance = coins?.bonus;
  const whiteDiscountPower =
    whiteBalance !== undefined ? Math.floor(whiteBalance / BONUS_COINS_PER_GOLD) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {/* KHO 1: COIN VÀNG (THẬT) — Cloudy Blue & Vanilla Pastel */}
      <section
        aria-label="Kho Coin vàng"
        className="relative isolate flex flex-col justify-between overflow-hidden rounded-[30px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/50 p-6 text-foreground shadow-[0_20px_44px_-14px_rgba(53,111,167,0.16)] sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 -z-10 h-52 w-52 rounded-full bg-white/80 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-12 -z-10 h-52 w-52 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CoinBadge kind="gold" size="sm" />
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  isLocked
                    ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                    : "border-success-border bg-success-bg text-success-foreground"
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock aria-hidden="true" animated={false} className="size-3" />
                    <span>Đã khóa</span>
                  </>
                ) : (
                  <>
                    <CircleCheck solid aria-hidden="true" animated={false} className="size-3" />
                    <span>Sẵn sàng</span>
                  </>
                )}
              </span>
            </div>

            <div className="pt-2">
              <p className="inline-flex items-center gap-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl tabular-nums">
                <Coins solid aria-hidden="true" animated={false} className="size-9 shrink-0 text-warning-foreground sm:size-10" />
                <span>{goldBalance !== undefined ? numberFormat.format(goldBalance) : "…"}</span>
              </p>
              {goldBalance !== undefined && (
                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                  Giá trị quy đổi tương đương{" "}
                  <strong className="font-semibold text-foreground">
                    {formatVnd(coinToVnd(goldBalance, rateVnd))}
                  </strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/80 text-accent-vanilla-foreground shadow-2xs">
            <Coins solid aria-hidden="true" animated={false} className="size-6" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-2xs backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Clock aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              <span>Giao dịch gần nhất</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
              {formatDateTime(wallet?.last_transaction_at)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-2xs backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Công dụng chính
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Mua khóa học &amp; Combo
            </p>
          </div>

          {vndLeft > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/50 px-4 py-2.5 sm:col-span-2">
              <span className="text-xs text-accent-vanilla-foreground">
                Phần dư VND lẻ (chưa đủ 1 Coin vàng)
              </span>
              <strong className="text-sm font-bold text-accent-vanilla-foreground tabular-nums">
                {formatVnd(vndLeft)}
              </strong>
            </div>
          )}
        </div>
      </section>

      {/* KHO 2: COIN TRẮNG (ẢO / THƯỞNG) — Porcelain Cloud & Silver */}
      <section
        aria-label="Kho Coin trắng"
        className="relative isolate flex flex-col justify-between overflow-hidden rounded-[30px] border border-[#CBD5E1] bg-gradient-to-br from-[#FFFFFF] via-[#F8FAFC] to-[#EDF2F7] p-6 text-foreground shadow-ambient-sm sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -bottom-12 -z-10 h-44 w-44 rounded-full bg-primary-light/80 blur-2xl"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CoinBadge kind="white" size="sm" />
            <div className="pt-1">
              <p className="inline-flex items-center gap-3 font-display text-4xl font-bold tracking-tight text-[#1E293B] sm:text-5xl tabular-nums">
                <Coins aria-hidden="true" animated={false} className="size-9 shrink-0 text-[#64748B] sm:size-10" />
                <span>{whiteBalance !== undefined ? numberFormat.format(whiteBalance) : "…"}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Sức chiết khấu hiện tại:</span>
                <CoinBadge kind="gold" amount={`-${whiteDiscountPower}`} size="sm" />
              </div>
            </div>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white text-[#64748B] shadow-2xs">
            <Coins aria-hidden="true" animated={false} className="size-6" />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-[#CBD5E1]/80 bg-white/85 px-4 py-3 text-xs leading-relaxed text-[#475569]">
            Kiếm từ điểm danh, nhiệm vụ và <strong className="text-foreground">hoàn +20% sau mỗi lần mua khóa học</strong>. Tự động trừ chẵn bội số 10 khi thanh toán.
          </div>

          <Link
            href="/shop"
            className="inline-flex min-h-11 w-full items-center justify-between rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
          >
            <span className="inline-flex items-center gap-2">
              <Store aria-hidden="true" className="size-4 text-primary" />
              <span>Đổi quà tại Cửa hàng Mây</span>
            </span>
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
