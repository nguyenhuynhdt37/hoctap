import {
  DEFAULT_COIN_VND_RATE,
  formatVnd,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import type { WalletDatePreset, WalletTransaction } from "@/types/user/wallet";

const numberFormatter = new Intl.NumberFormat("vi-VN");

export function formatCoinNumber(
  vnd?: number | null,
  rateVnd = DEFAULT_COIN_VND_RATE,
): string {
  const coin = Math.abs(vndToCoin(vnd ?? 0, rateVnd));
  return numberFormatter.format(coin);
}

export function formatCoinWithUnit(
  vnd?: number | null,
  rateVnd = DEFAULT_COIN_VND_RATE,
): string {
  return `${formatCoinNumber(vnd, rateVnd)} Coin`;
}

export function formatVndCompact(vnd?: number | null): string {
  return formatVnd(Math.round(Math.abs(vnd ?? 0)));
}

export function isIncomingTransaction(
  t: Pick<WalletTransaction, "direction" | "type">,
): boolean {
  if (t.direction === "in") return true;
  if (t.direction === "out") return false;
  return ["deposit", "income", "refund", "withdraw_reject_refund"].includes(
    t.type,
  );
}

export function getTransactionTypeLabel(type?: string | null): string {
  const labels: Record<string, string> = {
    deposit: "Nạp Coin vào ví",
    purchase: "Mua khóa học & Combo",
    refund: "Hoàn tiền học phí",
    income: "Thu nhập giảng dạy",
    withdraw: "Rút tiền về tài khoản",
    withdraw_hold: "Tạm giữ rút tiền",
    withdraw_reject_refund: "Hoàn lại lệnh rút tiền",
    fee: "Phí dịch vụ nền tảng",
    other: "Giao dịch khác",
  };
  return labels[type || ""] || "Giao dịch ví";
}

export function getTransactionMethodLabel(
  method?: string | null,
  gateway?: string | null,
): string {
  const m = (method || "").toLowerCase();
  const g = (gateway || "").toLowerCase();
  if (m === "paypal" || g === "paypal") return "PayPal";
  if (m === "momo" || g === "momo") return "MoMo";
  if (m === "wallet" || g === "internal_wallet" || g === "wallet")
    return "Ví nội bộ";
  if (m === "internal" || g === "internal") return "Hệ thống Mây Mây";
  return "Ví Mây Mây";
}

export interface StatusMeta {
  label: string;
  badgeVariant: "success" | "warning" | "destructive" | "info" | "secondary";
}

export function getTransactionStatusMeta(status?: string | null): StatusMeta {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return { label: "Thành công", badgeVariant: "success" };
    case "pending":
      return { label: "Chờ xử lý", badgeVariant: "warning" };
    case "refunded":
      return { label: "Đã hoàn tiền", badgeVariant: "info" };
    case "canceled":
      return { label: "Đã hủy", badgeVariant: "destructive" };
    case "failed":
      return { label: "Thất bại", badgeVariant: "destructive" };
    default:
      return { label: status || "Không rõ", badgeVariant: "secondary" };
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatVnDateTime(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatVnTimeOnly(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function getDayGroupKey(val?: string | null): string {
  if (!val) return "unknown";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatDayGroupLabel(val?: string | null): string {
  if (!val) return "Không rõ ngày";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "Không rõ ngày";

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${pad2(yesterday.getMonth() + 1)}-${pad2(yesterday.getDate())}`;
  const targetKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const dateText = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (targetKey === todayKey) return `Hôm nay · ${dateText}`;
  if (targetKey === yesterdayKey) return `Hôm qua · ${dateText}`;

  const weekdays = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  return `${weekdays[d.getDay()]} · ${dateText}`;
}

export function resolveDatePresetRange(preset: WalletDatePreset): {
  dateFrom: string | null;
  dateTo: string | null;
} {
  if (preset === "all") return { dateFrom: null, dateTo: null };
  const now = new Date();
  const start = new Date(now);
  if (preset === "7d") {
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "30d") {
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "90d") {
    start.setDate(now.getDate() - 90);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return {
    dateFrom: start.toISOString(),
    dateTo: now.toISOString(),
  };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsCsv(
  transactions: WalletTransaction[],
  rateVnd = DEFAULT_COIN_VND_RATE,
): void {
  const headers = [
    "Thời gian",
    "Loại giao dịch",
    "Chiều dòng tiền",
    "Số Coin",
    "Giá trị quy đổi (VND)",
    "Trạng thái",
    "Phương thức",
    "Mã giao dịch",
    "Mã đơn hàng",
    "Nội dung",
  ];

  const rows = transactions.map((t) => {
    const incoming = isIncomingTransaction(t);
    const coinVal = Math.abs(vndToCoin(t.amount, rateVnd));
    const statusLabel = getTransactionStatusMeta(t.status).label;
    return [
      formatVnDateTime(t.created_at),
      getTransactionTypeLabel(t.type),
      incoming ? "Tiền vào (+)" : "Tiền ra (-)",
      `${incoming ? "+" : "-"}${coinVal}`,
      Math.round(t.amount),
      statusLabel,
      getTransactionMethodLabel(t.method, t.gateway),
      t.transaction_code || t.id,
      t.order_id || "",
      t.description || "",
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  const csvContent = "\uFEFF" + [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  link.href = url;
  link.download = `sao-ke-may-may-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
