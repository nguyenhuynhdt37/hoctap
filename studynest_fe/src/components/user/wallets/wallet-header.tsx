"use client";

import { CoinBadge } from "@/components/ui";
import {
  BONUS_COINS_PER_GOLD,
  BONUS_MAX_COINS_SHARE,
  DEFAULT_COIN_VND_RATE,
  formatVnd,
  PURCHASE_CASHBACK_RATE,
} from "@/lib/learning-hub/coin-logic";
import { ArrowRight, Coins, Gift, Percent, ShieldCheck } from "pulsoicon-react";

interface WalletHeaderProps {
  rateVnd?: number;
}

export default function WalletHeader({
  rateVnd = DEFAULT_COIN_VND_RATE,
}: WalletHeaderProps) {
  const maxBonusPct = Math.round(BONUS_MAX_COINS_SHARE * 100);
  const cashbackPct = Math.round(PURCHASE_CASHBACK_RATE * 100);

  return (
    <header className="relative isolate overflow-hidden rounded-[32px] border border-primary-pastel/80 bg-gradient-to-br from-surface via-primary-light/55 to-accent/35 p-6 shadow-ambient-sm sm:p-8">
      {/* Các mảng mây trang trí nhẹ chuẩn Cloudy Blue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-primary-pastel/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 left-1/3 -z-10 h-48 w-64 rounded-full bg-accent-vanilla/70 blur-3xl"
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E2B545]/70 bg-gradient-to-r from-[#FFF7DB] to-[#FCEBB2] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#784705] shadow-2xs">
            <Coins solid aria-hidden="true" className="size-3.5 text-[#C47E0A]" />
            <span>Kho Coin Mây Mây</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
            Kho tài khoản
          </h1>
          <p className="flex flex-wrap items-center gap-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <span>Quản lý tách bạch</span>
            <CoinBadge kind="gold" size="sm" />
            <span>và</span>
            <CoinBadge kind="white" size="sm" />
            <span>, quy đổi nạp PayPal minh bạch theo thời gian thực.</span>
          </p>
        </div>

        <a
          href="#deposit-studio"
          className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Coins solid aria-hidden="true" className="size-4 text-[#FFE89E]" />
          <span>Nạp ngay</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>

      {/* Dải 3 quy ước chuẩn — hiển thị bằng biểu tượng đồng xu */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-[#E2B545]/55 bg-surface/90 p-3.5 shadow-2xs backdrop-blur-sm">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#E2B545]/60 bg-gradient-to-b from-[#FFF7DB] to-[#F7DE8C] text-[#C47E0A]">
            <Coins solid aria-hidden="true" animated={false} className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#784705]">
              Tỷ giá quy đổi
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-bold text-foreground tabular-nums">
              <CoinBadge kind="gold" amount={1} size="sm" />
              <span>= {formatVnd(rateVnd)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-[#CBD5E1] bg-surface/90 p-3.5 shadow-2xs backdrop-blur-sm">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#CBD5E1] bg-gradient-to-b from-[#FFFFFF] to-[#EDF2F7] text-[#475569]">
            <Percent aria-hidden="true" animated={false} className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Chiết khấu tự động (tối đa {maxBonusPct}%)
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-bold text-foreground">
              <CoinBadge kind="white" amount={BONUS_COINS_PER_GOLD} size="sm" />
              <span>=</span>
              <CoinBadge kind="gold" amount={1} size="sm" />
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-primary-pastel bg-surface/90 p-3.5 shadow-2xs backdrop-blur-sm">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
            <Gift aria-hidden="true" animated={false} className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Hoàn sau khi mua
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-bold text-foreground">
              <CoinBadge kind="white" amount={`+${cashbackPct}%`} size="sm" />
              <span className="text-xs font-medium text-muted-foreground">cho lần sau</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-primary">
          <ShieldCheck aria-hidden="true" animated={false} className="size-4" />
          Thanh toán PayPal bảo mật 256-bit
        </span>
        <span>•</span>
        <span>Tiền lẻ VND chưa đủ 1 Coin vàng luôn được giữ nguyên, không bị mất.</span>
      </div>
    </header>
  );
}
