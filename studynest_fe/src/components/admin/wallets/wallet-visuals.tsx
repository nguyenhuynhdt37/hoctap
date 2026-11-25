"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Lock,
  Percent,
  Receipt,
  RotateCcw,
  Unlock,
  Wallet,
} from "pulsoicon-react";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";

export const formatWalletCoin = (value: number) =>
  formatVndAsCoin(Math.round(value || 0));

export const formatWalletDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

export const formatShortDay = (isoDate: string) => {
  try {
    const parts = isoDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return isoDate;
  } catch {
    return isoDate;
  }
};

export interface WalletTypeMeta {
  code: string;
  label: string;
  shortLabel: string;
  direction: "in" | "out" | "neutral";
  badgeClass: string;
  barClass: string;
  textClass: string;
  iconBgClass: string;
}

export const WALLET_TYPE_META: Record<string, WalletTypeMeta> = {
  in: {
    code: "in",
    label: "Tiền vào",
    shortLabel: "Thu vào",
    direction: "in",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
    barClass: "bg-success-border",
    textClass: "text-success-foreground",
    iconBgClass: "bg-success-bg text-success-foreground border-success-border",
  },
  out: {
    code: "out",
    label: "Tiền ra",
    shortLabel: "Chi ra",
    direction: "out",
    badgeClass:
      "border-destructive-border bg-destructive-bg text-destructive-foreground",
    barClass: "bg-destructive-border",
    textClass: "text-destructive-foreground",
    iconBgClass:
      "bg-destructive-bg text-destructive-foreground border-destructive-border",
  },
  hold: {
    code: "hold",
    label: "Tạm giữ Escrow",
    shortLabel: "Tạm giữ",
    direction: "neutral",
    badgeClass:
      "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    barClass: "bg-accent-vanilla-border",
    textClass: "text-accent-vanilla-foreground",
    iconBgClass:
      "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  },
  release: {
    code: "release",
    label: "Giải ngân",
    shortLabel: "Giải ngân",
    direction: "neutral",
    badgeClass: "border-info-border bg-info-bg text-info-foreground",
    barClass: "bg-info-border",
    textClass: "text-info-foreground",
    iconBgClass: "bg-info-bg text-info-foreground border-info-border",
  },
  fee: {
    code: "fee",
    label: "Phí nền tảng",
    shortLabel: "Phí sàn",
    direction: "in",
    badgeClass: "border-accent-border bg-accent text-accent-foreground",
    barClass: "bg-accent-border",
    textClass: "text-accent-foreground",
    iconBgClass: "bg-accent text-accent-foreground border-accent-border",
  },
  refund: {
    code: "refund",
    label: "Hoàn tiền",
    shortLabel: "Hoàn tiền",
    direction: "out",
    badgeClass:
      "border-secondary-pastel bg-secondary-light text-secondary-foreground",
    barClass: "bg-secondary-pastel",
    textClass: "text-secondary-foreground",
    iconBgClass:
      "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
};

export const WALLET_TYPE_ORDER = [
  "in",
  "out",
  "hold",
  "release",
  "fee",
  "refund",
] as const;

export function getWalletTypeMeta(type: string): WalletTypeMeta {
  return (
    WALLET_TYPE_META[type] ?? {
      code: type,
      label: type,
      shortLabel: type,
      direction: "neutral",
      badgeClass: "border-border bg-background text-foreground",
      barClass: "bg-primary-pastel",
      textClass: "text-foreground",
      iconBgClass: "bg-primary-light text-primary border-primary-pastel",
    }
  );
}

export function WalletTypeIcon({
  type,
  size = 15,
  animated = false,
}: {
  type: string;
  size?: number;
  animated?: boolean;
}) {
  switch (type) {
    case "in":
      return <ArrowDownLeft size={size} animated={animated} aria-hidden="true" />;
    case "out":
      return <ArrowUpRight size={size} animated={animated} aria-hidden="true" />;
    case "hold":
      return <Lock size={size} animated={animated} aria-hidden="true" />;
    case "release":
      return <Unlock size={size} animated={animated} aria-hidden="true" />;
    case "fee":
      return <Percent size={size} animated={animated} aria-hidden="true" />;
    case "refund":
      return <RotateCcw size={size} animated={animated} aria-hidden="true" />;
    default:
      return <Coins size={size} animated={animated} aria-hidden="true" />;
  }
}

export function WalletAdminNav({ totalLogs }: { totalLogs?: number }) {
  const pathname = usePathname();
  const isOverview = pathname === "/admin/wallets";
  const isLedger = pathname.startsWith("/admin/wallets/transactions");

  return (
    <nav
      aria-label="Điều hướng Ví nền tảng"
      className="grid grid-cols-1 gap-2.5 rounded-3xl border border-border bg-surface/90 p-2 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] sm:grid-cols-2"
    >
      <Link
        href="/admin/wallets"
        aria-current={isOverview ? "page" : undefined}
        className={`group flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
          isOverview
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-foreground hover:bg-primary-light/70 hover:text-primary"
        }`}
      >
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isOverview
              ? "bg-white/20 text-primary-foreground"
              : "bg-primary-light text-primary group-hover:bg-surface"
          }`}
        >
          <Wallet size={18} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">Kho bạc Tổng quan</span>
          <span
            className={`mt-0.5 block text-xs ${
              isOverview ? "text-primary-foreground/85" : "text-muted-foreground"
            }`}
          >
            Số dư khả dụng, dòng tiền 14 ngày, tạm giữ Escrow &amp; đối soát
          </span>
        </span>
      </Link>

      <Link
        href="/admin/wallets/transactions"
        aria-current={isLedger ? "page" : undefined}
        className={`group flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
          isLedger
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-foreground hover:bg-primary-light/70 hover:text-primary"
        }`}
      >
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isLedger
              ? "bg-white/20 text-primary-foreground"
              : "bg-primary-light text-primary group-hover:bg-surface"
          }`}
        >
          <Receipt size={18} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-semibold">
            <span>Sổ cái Giao dịch</span>
            {typeof totalLogs === "number" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  isLedger
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-primary-light text-primary"
                }`}
              >
                {totalLogs}
              </span>
            )}
          </span>
          <span
            className={`mt-0.5 block text-xs ${
              isLedger ? "text-primary-foreground/85" : "text-muted-foreground"
            }`}
          >
            Tra cứu lịch sử toàn hệ thống, lọc theo loại, khoảng ngày &amp; xuất CSV
          </span>
        </span>
      </Link>
    </nav>
  );
}

export function exportWalletHistoryCsv(
  rows: {
    id: string;
    type: string;
    amount: number;
    note: string | null;
    related_transaction_id?: string | null;
    created_at: string;
  }[],
) {
  const header = [
    "History ID",
    "Loại giao dịch",
    "Số tiền (VND/Coin)",
    "Ghi chú",
    "Mã giao dịch liên quan",
    "Thời gian",
  ];
  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const lines = [
    header.map(escapeCsv).join(","),
    ...rows.map((r) =>
      [
        r.id,
        getWalletTypeMeta(r.type).label,
        String(r.amount),
        r.note ?? "",
        r.related_transaction_id ?? "",
        formatWalletDateTime(r.created_at),
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `may-may-wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
