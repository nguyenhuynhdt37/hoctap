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
      {/* KHO 1: COIN VÀNG (THẬT) — Obsidian Sky & Gold Foil */}
      <section
        aria-label="Kho Coin vàng"
        className="relative isolate flex flex-col justify-between overflow-hidden rounded-[30px] border border-[#E2B545]/45 bg-gradient-to-br from-[#13263A] via-[#1E3F63] to-[#2C5B8B] p-6 text-white shadow-lg sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 -z-10 h-52 w-52 rounded-full bg-[#F5C542]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-12 -z-10 h-52 w-52 rounded-full bg-[#BFD7ED]/15 blur-3xl"
        />
        {/* Đường kẻ lưới trang trí tinh tế */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-6 -z-10 h-28 w-28 rounded-full border border-[#F5C542]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-10 -z-10 h-20 w-20 rounded-full border border-[#F5C542]/15"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CoinBadge kind="gold" surface="dark" size="sm" />
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  isLocked
                    ? "border-red-300/45 bg-red-500/25 text-red-100"
                    : "border-white/25 bg-white/10 text-white/90"
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock aria-hidden="true" animated={false} className="size-3 text-red-200" />
                    <span>Đã khóa</span>
                  </>
                ) : (
                  <>
                    <CircleCheck solid aria-hidden="true" animated={false} className="size-3 text-[#FFE89E]" />
                    <span>Sẵn sàng</span>
                  </>
                )}
              </span>
            </div>

            <div className="pt-2">
              <p className="inline-flex items-center gap-3 font-display text-4xl font-bold tracking-tight text-[#FFE89E] sm:text-5xl tabular-nums">
                <Coins solid aria-hidden="true" animated={false} className="size-9 shrink-0 text-[#FFD55A] sm:size-10" />
                <span>{goldBalance !== undefined ? numberFormat.format(goldBalance) : "…"}</span>
              </p>
              {goldBalance !== undefined && (
                <p className="mt-1.5 text-xs text-white/75 tabular-nums">
                  Giá trị quy đổi tương đương{" "}
                  <strong className="font-semibold text-white">
                    {formatVnd(coinToVnd(goldBalance, rateVnd))}
                  </strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#F5C542]/45 bg-[#F5C542]/15 text-[#FFD55A] backdrop-blur-md">
            <Coins solid aria-hidden="true" animated={false} className="size-6" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/70">
              <Clock aria-hidden="true" animated={false} className="size-3.5 text-[#FFE89E]" />
              <span>Giao dịch gần nhất</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-white tabular-nums">
              {formatDateTime(wallet?.last_transaction_at)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">
              Công dụng chính
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Mua khóa học & Combo
            </p>
          </div>

          {vndLeft > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F5C542]/35 bg-[#F5C542]/10 px-4 py-2.5 sm:col-span-2">
              <span className="text-xs text-[#FFE89E]/90">
                Phần dư VND lẻ (chưa đủ 1 Coin vàng)
              </span>
              <strong className="text-sm font-bold text-[#FFE89E] tabular-nums">
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
