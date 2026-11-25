"use client";

import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { AdminWithdrawItem } from "@/types/admin/withdraw";

export interface AdminWithdrawStats {
  total: number;
  pending_count: number;
  pending_amount: number;
  paid_count: number;
  paid_amount: number;
  rejected_count: number;
  by_status: Record<string, { count: number; amount: number }>;
}

export const formatWithdrawCoin = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "—";
  return formatVndAsCoin(Math.round(val));
};

export const formatWithdrawDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

export const WITHDRAW_STATUS_ORDER = [
  "pending",
  "payout_pending",
  "approved",
  "paid",
  "rejected",
  "failed",
] as const;

export const WITHDRAW_STATUS_META: Record<
  string,
  { label: string; shortLabel: string; badgeClass: string; accentBorder: string }
> = {
  pending: {
    label: "Chờ duyệt",
    shortLabel: "Chờ duyệt",
    badgeClass:
      "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    accentBorder: "border-accent-vanilla-border",
  },
  payout_pending: {
    label: "Đang chi trả PayPal",
    shortLabel: "PayPal chờ",
    badgeClass: "border-warning-border bg-warning-bg text-warning-foreground",
    accentBorder: "border-warning-border",
  },
  approved: {
    label: "Đã phê duyệt",
    shortLabel: "Đã duyệt",
    badgeClass: "border-info-border bg-info-bg text-info-foreground",
    accentBorder: "border-info-border",
  },
  paid: {
    label: "Đã chi trả thành công",
    shortLabel: "Đã chi trả",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
    accentBorder: "border-success-border",
  },
  rejected: {
    label: "Đã từ chối",
    shortLabel: "Từ chối",
    badgeClass:
      "border-destructive-border bg-destructive-bg text-destructive-foreground",
    accentBorder: "border-destructive-border",
  },
  failed: {
    label: "Chi trả thất bại",
    shortLabel: "Thất bại",
    badgeClass:
      "border-secondary-pastel bg-secondary-light text-secondary-foreground",
    accentBorder: "border-secondary-pastel",
  },
};

export function getWithdrawStatusMeta(status: string) {
  return (
    WITHDRAW_STATUS_META[status] ?? {
      label: status,
      shortLabel: status,
      badgeClass: "border-border bg-background text-muted-foreground",
      accentBorder: "border-border",
    }
  );
}

export function exportWithdrawsCsv(items: AdminWithdrawItem[]) {
  const header = [
    "Withdraw ID",
    "Giảng viên",
    "Email",
    "Số tiền rút",
    "Trạng thái",
    "Thời gian yêu cầu",
    "Lý do (nếu từ chối)",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map((w) =>
      [
        w.id,
        w.fullname,
        w.email,
        String(w.amount),
        getWithdrawStatusMeta(w.status).label,
        formatWithdrawDateTime(w.requested_at),
        w.reason ?? "",
      ]
        .map(esc)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `may-may-withdraws-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
