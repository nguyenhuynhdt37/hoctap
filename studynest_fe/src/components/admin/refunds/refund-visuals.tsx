"use client";

import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { AdminRefundRequestItem } from "@/types/admin/refund";

export type RefundStatusKey = AdminRefundRequestItem["status"];

export interface AdminRefundStats {
  total: number;
  total_amount: number;
  needs_admin_action: number;
  approved_total: number;
  refunded_count: number;
  rejected_count: number;
  by_status: Record<string, { count: number; amount: number }>;
}

export const formatRefundCoin = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return formatVndAsCoin(Math.round(value));
};

export const formatRefundDateTime = (value?: string | null) => {
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

export const REFUND_STATUS_ORDER: RefundStatusKey[] = [
  "requested",
  "instructor_rejected",
  "instructor_approved",
  "admin_approved",
  "admin_rejected",
  "refunded",
];

export const REFUND_STATUS_META: Record<
  RefundStatusKey,
  {
    label: string;
    shortLabel: string;
    description: string;
    badgeClass: string;
    accentBorder: string;
  }
> = {
  requested: {
    label: "Chờ xử lý",
    shortLabel: "Chờ xử lý",
    description: "Học viên vừa gửi yêu cầu hoàn tiền",
    badgeClass:
      "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    accentBorder: "border-accent-vanilla-border",
  },
  instructor_rejected: {
    label: "GV từ chối · Chờ Admin",
    shortLabel: "GV từ chối",
    description: "Giảng viên từ chối — cần Admin xem xét phân xử cuối cùng",
    badgeClass: "border-warning-border bg-warning-bg text-warning-foreground",
    accentBorder: "border-warning-border",
  },
  instructor_approved: {
    label: "GV đã duyệt",
    shortLabel: "GV duyệt",
    description: "Giảng viên đã chấp thuận hoàn tiền",
    badgeClass: "border-info-border bg-info-bg text-info-foreground",
    accentBorder: "border-info-border",
  },
  admin_approved: {
    label: "Admin đã duyệt",
    shortLabel: "Admin duyệt",
    description: "Admin đã phê duyệt hoàn tiền cho học viên",
    badgeClass: "border-primary-pastel bg-primary-light text-primary",
    accentBorder: "border-primary-pastel",
  },
  admin_rejected: {
    label: "Admin từ chối",
    shortLabel: "Admin từ chối",
    description: "Yêu cầu hoàn tiền bị từ chối ở cấp Admin",
    badgeClass:
      "border-destructive-border bg-destructive-bg text-destructive-foreground",
    accentBorder: "border-destructive-border",
  },
  refunded: {
    label: "Đã hoàn tiền",
    shortLabel: "Đã hoàn",
    description: "Tiền đã được hoàn thành công về ví học viên",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
    accentBorder: "border-success-border",
  },
};

export function getRefundStatusMeta(status: string) {
  return (
    REFUND_STATUS_META[status as RefundStatusKey] ?? {
      label: status,
      shortLabel: status,
      description: "",
      badgeClass: "border-border bg-background text-muted-foreground",
      accentBorder: "border-border",
    }
  );
}

export function exportRefundRequestsCsv(items: AdminRefundRequestItem[]) {
  const header = [
    "Refund ID",
    "Trạng thái",
    "Số tiền hoàn",
    "Học viên",
    "Khóa học",
    "Giảng viên",
    "Lý do",
    "Ngày gửi",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map((r) =>
      [
        r.refund_id,
        getRefundStatusMeta(r.status).label,
        String(r.refund_amount),
        r.student?.fullname ?? "",
        r.course?.title ?? "",
        r.instructor?.fullname ?? "",
        r.reason ?? "",
        formatRefundDateTime(r.created_at),
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
  a.download = `may-may-refunds-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
