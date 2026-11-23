"use client";

import { cn } from "@/lib/utils";
import { Coins } from "pulsoicon-react";

export type CoinKind = "gold" | "white";

export interface CoinBadgeProps {
  kind: CoinKind;
  amount?: number | string;
  label?: string;
  surface?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  /** Mặc định true: chỉ hiển thị biểu tượng đồng xu + con số, phân biệt bằng màu sắc. */
  compact?: boolean;
  animated?: boolean;
  className?: string;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

const kindStyles: Record<CoinKind, Record<"light" | "dark", string>> = {
  gold: {
    light:
      "border-[#E2B545] bg-gradient-to-b from-[#FFF7DB] via-[#FCEBB2] to-[#F7DE8C] text-[#784705] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_2px_rgba(180,120,10,0.14)]",
    dark:
      "border-[#F5C542]/70 bg-[#F5C542]/20 text-[#FFE89E] shadow-[inset_0_1px_0_rgba(255,235,160,0.2)]",
  },
  white: {
    light:
      "border-[#CBD5E1] bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#EDF2F7] text-[#334155] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.06)]",
    dark:
      "border-white/40 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
  },
};

const iconStyles: Record<CoinKind, Record<"light" | "dark", string>> = {
  gold: {
    light: "text-[#C47E0A]",
    dark: "text-[#FFD55A]",
  },
  white: {
    light: "text-[#64748B]",
    dark: "text-slate-200",
  },
};

const sizeStyles: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-xs sm:text-sm gap-1.5",
  lg: "px-3.5 py-1.5 text-base sm:text-lg gap-2",
};

const iconSizes: Record<"sm" | "md" | "lg", string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

export function CoinBadge({
  kind,
  amount,
  label,
  surface = "light",
  size = "md",
  compact = true,
  animated = false,
  className,
}: CoinBadgeProps) {
  const defaultTitle = kind === "gold" ? "Đồng vàng (thật)" : "Đồng trắng (ảo)";
  const formattedAmount =
    amount === undefined
      ? null
      : typeof amount === "number"
        ? numberFormat.format(Math.round(amount))
        : amount;
  const accessibleText =
    formattedAmount !== null
      ? `${formattedAmount} ${label ?? defaultTitle}`
      : label ?? defaultTitle;

  return (
    <span
      title={accessibleText}
      aria-label={accessibleText}
      className={cn(
        "inline-flex items-center rounded-full border font-bold tabular-nums leading-none whitespace-nowrap",
        kindStyles[kind][surface],
        sizeStyles[size],
        className,
      )}
    >
      <Coins
        aria-hidden="true"
        animated={animated}
        solid={kind === "gold"}
        className={cn("shrink-0", iconSizes[size], iconStyles[kind][surface])}
      />
      {formattedAmount !== null && <span>{formattedAmount}</span>}
      {!compact && label && <span className="font-semibold">{label}</span>}
    </span>
  );
}
