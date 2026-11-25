"use client";

import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { AdminTransactionItem } from "@/types/admin/transaction";

export const formatTxCoin = (value: number) =>
  formatVndAsCoin(Math.round(value || 0));

export const formatTxDateTime = (value?: string | null) => {
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

export const TX_STATUS_ORDER = [
  "completed",
  "pending",
  "refunded",
  "canceled",
  "failed",
] as const;

export const TX_STATUS_META: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  completed: {
    label: "Hoàn tất",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
    dotClass: "bg-success-border",
  },
  pending: {
    label: "Đang chờ",
    badgeClass: "border-warning-border bg-warning-bg text-warning-foreground",
    dotClass: "bg-warning-border",
  },
  refunded: {
    label: "Đã hoàn tiền",
    badgeClass: "border-info-border bg-info-bg text-info-foreground",
    dotClass: "bg-info-border",
  },
  canceled: {
    label: "Đã hủy",
    badgeClass: "border-border bg-background text-muted-foreground",
    dotClass: "bg-border",
  },
  failed: {
    label: "Thất bại",
    badgeClass:
      "border-destructive-border bg-destructive-bg text-destructive-foreground",
    dotClass: "bg-destructive-border",
  },
};

export function getTxStatusMeta(status?: string | null) {
  if (!status) {
    return {
      label: "Không rõ",
      badgeClass: "border-border bg-background text-muted-foreground",
      dotClass: "bg-border",
    };
  }
  return (
    TX_STATUS_META[status] ?? {
      label: status,
      badgeClass: "border-border bg-background text-foreground",
      dotClass: "bg-primary-pastel",
    }
  );
}

export const TX_TYPE_OPTIONS = [
  { value: "deposit", label: "Nạp tiền" },
  { value: "purchase", label: "Mua khóa học" },
  { value: "income", label: "Thu nhập giảng viên" },
  { value: "refund", label: "Hoàn tiền" },
  { value: "withdraw_hold", label: "Tạm giữ rút tiền" },
  { value: "fee", label: "Phí nền tảng" },
  { value: "withdraw_reject_refund", label: "Hoàn từ chối rút" },
] as const;

export const TX_TYPE_META: Record<string, { label: string; badgeClass: string }> = {
  deposit: {
    label: "Nạp tiền",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
  },
  topup: {
    label: "Nạp tiền",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
  },
  purchase: {
    label: "Mua khóa học",
    badgeClass: "border-primary-pastel bg-primary-light text-primary",
  },
  income: {
    label: "Thu nhập GV",
    badgeClass: "border-info-border bg-info-bg text-info-foreground",
  },
  refund: {
    label: "Hoàn tiền",
    badgeClass:
      "border-secondary-pastel bg-secondary-light text-secondary-foreground",
  },
  withdraw_hold: {
    label: "Tạm giữ rút",
    badgeClass:
      "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
  },
  withdraw: {
    label: "Rút tiền",
    badgeClass:
      "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
  },
  withdraw_reject_refund: {
    label: "Hoàn từ chối rút",
    badgeClass: "border-info-border bg-info-bg text-info-foreground",
  },
  fee: {
    label: "Phí nền tảng",
    badgeClass: "border-accent-border bg-accent text-accent-foreground",
  },
};

export function getTxTypeMeta(type?: string | null) {
  if (!type) {
    return {
      label: "Khác",
      badgeClass: "border-border bg-background text-muted-foreground",
    };
  }
  return (
    TX_TYPE_META[type] ?? {
      label: type,
      badgeClass: "border-border bg-background text-foreground",
    }
  );
}

export function getGatewayLabel(gateway?: string | null, method?: string | null) {
  const g = (gateway || "").toLowerCase();
  const m = (method || "").toLowerCase();
  if (g === "paypal" || m === "paypal") return "PayPal";
  if (g === "internal_wallet" || g === "wallet" || g === "internal" || m === "wallet") {
    return "Ví nội bộ";
  }
  if (g === "momo" || m === "momo") return "MoMo";
  if (g === "vnpay" || m === "vnpay") return "VNPay";
  if (g === "stripe") return "Stripe";
  if (m === "bank_transfer") return "Chuyển khoản";
  return gateway || method || "Hệ thống";
}

export function exportAdminTransactionsCsv(items: AdminTransactionItem[]) {
  const header = [
    "Transaction ID",
    "Người dùng",
    "Email",
    "Loại",
    "Hướng",
    "Trạng thái",
    "Số tiền",
    "Cổng thanh toán",
    "Mã đơn hàng",
    "Thời gian tạo",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map(({ transaction: t, user }) =>
      [
        t.id,
        user?.fullname ?? "Hệ thống",
        user?.email ?? "",
        getTxTypeMeta(t.type).label,
        t.direction === "in" ? "Vào" : "Ra",
        getTxStatusMeta(t.status).label,
        String(t.amount),
        getGatewayLabel(t.gateway, t.method),
        t.order_id || t.transaction_code || "",
        formatTxDateTime(t.created_at),
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
  a.download = `may-may-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
