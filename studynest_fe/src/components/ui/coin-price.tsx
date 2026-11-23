"use client";

import { splitCoinPayment, vndToCoin } from "@/lib/learning-hub/coin-logic";
import { useCoinBalances, useCoinRate } from "@/lib/learning-hub/shop-hooks";
import { cn } from "@/lib/utils";
import { Coins } from "pulsoicon-react";
import { CoinBadge } from "./coin-badge";

export interface CoinPriceProps {
  /** Giá sau khi áp voucher tốt nhất (nếu có) hoặc giá bán hiện tại tính theo VND từ API. */
  priceVnd: number | string | null | undefined;
  /** Giá gốc trước khi áp voucher / trước giảm combo (VND). */
  originalPriceVnd?: number | string | null | undefined;
  size?: "sm" | "md" | "lg";
  surface?: "light" | "dark";
  /** Tự động trừ chiết khấu từ số dư đồng trắng của người dùng hiện tại. */
  showWhiteDiscount?: boolean;
  className?: string;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function CoinPrice({
  priceVnd,
  originalPriceVnd,
  size = "md",
  surface = "light",
  showWhiteDiscount = true,
  className,
}: CoinPriceProps) {
  const coins = useCoinBalances().data;
  const publicRate = useCoinRate();
  const rateVnd = coins?.rateVnd ?? publicRate;
  const bonusBalance = coins?.bonus ?? 0;

  const effectiveVnd = toNum(priceVnd);
  if (effectiveVnd <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center font-bold text-primary",
          size === "lg" ? "text-xl" : size === "sm" ? "text-xs" : "text-sm",
          className,
        )}
      >
        Miễn phí
      </span>
    );
  }

  const afterVoucherCoin = vndToCoin(effectiveVnd, rateVnd);
  const rawOriginalVnd = toNum(originalPriceVnd);
  const originalCoin =
    rawOriginalVnd > effectiveVnd ? vndToCoin(rawOriginalVnd, rateVnd) : afterVoucherCoin;

  const split = showWhiteDiscount
    ? splitCoinPayment(afterVoucherCoin, bonusBalance)
    : { bonusUse: 0, bonusGoldDiscount: 0, paidUse: afterVoucherCoin };

  const hasDiscount = split.paidUse < originalCoin;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 tabular-nums", className)}>
      <CoinBadge kind="gold" amount={split.paidUse} size={size} surface={surface} />
      {split.bonusUse > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
          <span>+</span>
          <CoinBadge kind="white" amount={split.bonusUse} size="sm" surface={surface} />
        </span>
      )}
      {hasDiscount && (
        <del
          title={`Giá gốc: ${numberFormat.format(originalCoin)}`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground/80"
        >
          <Coins
            solid
            aria-hidden="true"
            animated={false}
            className="size-3 text-[#C47E0A]/55"
          />
          <span>{numberFormat.format(originalCoin)}</span>
        </del>
      )}
    </span>
  );
}
