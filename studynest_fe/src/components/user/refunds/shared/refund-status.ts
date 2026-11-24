import { formatVndAsCoin, formatVnd, vndToCoin } from "@/lib/learning-hub/coin-logic";

const numberFormatter = new Intl.NumberFormat("vi-VN");

export interface RefundStatusMeta {
  label: string;
  description: string;
  badgeVariant: "warning" | "info" | "success" | "destructive" | "secondary";
  stampText: string;
}

export const REFUND_STATUS_META: Record<string, RefundStatusMeta> = {
  requested: {
    label: "Đã yêu cầu",
    description: "Hồ sơ đang chờ giảng viên xem xét",
    badgeVariant: "warning",
    stampText: "ĐANG XEM XÉT",
  },
  instructor_approved: {
    label: "GV đã duyệt",
    description: "Giảng viên đã chấp thuận, chờ Kho Bạc hoàn Coin",
    badgeVariant: "info",
    stampText: "GV ĐÃ DUYỆT",
  },
  instructor_rejected: {
    label: "GV đã từ chối",
    description: "Giảng viên chưa chấp thuận yêu cầu hoàn tiền",
    badgeVariant: "destructive",
    stampText: "ĐÃ TỪ CHỐI",
  },
  admin_approved: {
    label: "Admin đã duyệt",
    description: "Quản trị viên đã phê duyệt lệnh hoàn Coin",
    badgeVariant: "success",
    stampText: "ĐÃ PHÊ DUYỆT",
  },
  admin_rejected: {
    label: "Admin đã từ chối",
    description: "Quản trị viên đã từ chối yêu cầu hoàn tiền",
    badgeVariant: "destructive",
    stampText: "ĐÃ TỪ CHỐI",
  },
  refunded: {
    label: "Đã hoàn Coin",
    description: "Coin đã được bảo toàn và cộng lại vào ví của bạn",
    badgeVariant: "success",
    stampText: "ĐÃ HOÀN COIN",
  },
};

export function getRefundStatusMeta(status?: string | null): RefundStatusMeta {
  if (!status) return REFUND_STATUS_META.requested;
  return (
    REFUND_STATUS_META[status] ?? {
      label: status,
      description: "Đang cập nhật trạng thái hồ sơ",
      badgeVariant: "secondary",
      stampText: "ĐANG XỬ LÝ",
    }
  );
}

export function formatRefundCoin(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return formatVndAsCoin(value);
}

export function formatRefundCoinNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return numberFormatter.format(Math.abs(vndToCoin(value)));
}

export function formatRefundVnd(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return formatVnd(Math.round(Math.abs(value)));
}

export function formatRefundDateTime(value?: string | null): string {
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
}
