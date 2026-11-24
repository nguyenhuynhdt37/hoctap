import type { Notification } from "@/types/user/notification";
import {
  Bell,
  BookOpen,
  Coins,
  GraduationCap,
  RotateCcw,
  Settings,
  ShieldAlert,
} from "pulsoicon-react";
import type { ComponentType } from "react";

export type NotificationChannelKey =
  | ""
  | "learning"
  | "course"
  | "wallet"
  | "refund"
  | "security"
  | "system";

export interface NotificationChannelConfig {
  key: NotificationChannelKey;
  label: string;
  shortLabel: string;
  description: string;
  Icon: ComponentType<{
    className?: string;
    animated?: boolean;
    solid?: boolean;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  iconBoxClass: string;
  badgeClass: string;
  accentBarClass: string;
}

export const NOTIFICATION_CHANNELS: NotificationChannelConfig[] = [
  {
    key: "",
    label: "Tất cả thông báo",
    shortLabel: "Tất cả",
    description: "Toàn bộ tín hiệu từ học tập, ví Coin và bảo mật",
    Icon: Bell,
    iconBoxClass: "border-primary-pastel bg-primary-light text-primary",
    badgeClass: "border-primary-pastel bg-primary-light text-primary",
    accentBarClass: "bg-primary",
  },
  {
    key: "learning",
    label: "Học tập & Hỏi đáp",
    shortLabel: "Học tập",
    description: "Phản hồi hỏi đáp, tiến độ bài học và nhắc ôn tập",
    Icon: GraduationCap,
    iconBoxClass: "border-primary-pastel bg-primary-light text-primary",
    badgeClass: "border-primary-pastel bg-primary-light text-primary",
    accentBarClass: "bg-primary",
  },
  {
    key: "course",
    label: "Khóa học & Quà tặng",
    shortLabel: "Khóa học",
    description: "Ghi danh mới, quà tặng khóa học và cập nhật bài giảng",
    Icon: BookOpen,
    iconBoxClass: "border-accent-border bg-accent/65 text-accent-foreground",
    badgeClass: "border-accent-border bg-accent/55 text-accent-foreground",
    accentBarClass: "bg-accent-foreground/70",
  },
  {
    key: "wallet",
    label: "Ví & Coin",
    shortLabel: "Ví & Coin",
    description: "Biến động Coin vàng, Coin trắng và thanh toán đơn hàng",
    Icon: Coins,
    iconBoxClass:
      "border-warning-border bg-accent-vanilla/75 text-warning-foreground",
    badgeClass:
      "border-warning-border bg-accent-vanilla/65 text-warning-foreground",
    accentBarClass: "bg-warning-foreground/75",
  },
  {
    key: "refund",
    label: "Hoàn tiền",
    shortLabel: "Hoàn tiền",
    description: "Tiến trình duyệt và hoàn trả học phí về ví",
    Icon: RotateCcw,
    iconBoxClass:
      "border-success-border bg-success-bg text-success-foreground",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
    accentBarClass: "bg-success-foreground/75",
  },
  {
    key: "security",
    label: "Bảo mật & Đăng nhập",
    shortLabel: "Bảo mật",
    description: "Cảnh báo phiên đăng nhập mới và hoạt động tài khoản",
    Icon: ShieldAlert,
    iconBoxClass:
      "border-secondary-pastel bg-secondary-light text-secondary-foreground",
    badgeClass:
      "border-secondary-pastel bg-secondary-light text-secondary-foreground",
    accentBarClass: "bg-secondary-foreground/75",
  },
  {
    key: "system",
    label: "Tài khoản & Hệ thống",
    shortLabel: "Hệ thống",
    description: "Thông báo nền tảng, thiết bị và cập nhật tài khoản",
    Icon: Settings,
    iconBoxClass: "border-border bg-background text-muted-foreground",
    badgeClass: "border-border bg-background text-muted-foreground",
    accentBarClass: "bg-muted-foreground",
  },
];

export function normalizeChannelKey(rawType?: string | null): NotificationChannelKey {
  const t = (rawType || "").toLowerCase();
  if (t === "learning") return "learning";
  if (t === "course" || t === "lecturer") return "course";
  if (t === "wallet" || t === "platform_wallet") return "wallet";
  if (t === "refund") return "refund";
  if (t === "security") return "security";
  if (t === "system" || t === "account" || t === "provider") return "system";
  return "system";
}

export function getNotificationChannel(rawType?: string | null): NotificationChannelConfig {
  const normalized = normalizeChannelKey(rawType);
  return (
    NOTIFICATION_CHANNELS.find((c) => c.key === normalized) ??
    NOTIFICATION_CHANNELS[NOTIFICATION_CHANNELS.length - 1]
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatRelativeTimeVn(dateString?: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatExactTimeVn(dateString?: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function getNotificationDayKey(dateString?: string | null): string {
  if (!dateString) return "unknown";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatNotificationDayHeader(dateString?: string | null): string {
  if (!dateString) return "Không rõ ngày";
  const d = new Date(dateString);
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

export interface ParsedSessionInfo {
  deviceLabel: string;
  isMobile: boolean;
  browserLabel: string | null;
  ipAddress: string | null;
  methodLabel: string | null;
}

export function parseSecuritySession(
  notification: Notification,
): ParsedSessionInfo | null {
  const meta = notification.metadata ?? notification.metadata_;
  if (!meta || typeof meta !== "object") return null;
  const session = (meta as Record<string, unknown>).session;
  if (!session || typeof session !== "object") return null;

  const s = session as Record<string, unknown>;
  const deviceType = String(s.device_type || "").toUpperCase();
  const ua = String(s.user_agent || "");
  const ipAddress = s.ip_address ? String(s.ip_address) : null;
  const loginMethod = s.login_method ? String(s.login_method).toLowerCase() : null;

  let browserLabel: string | null = null;
  if (ua.includes("Edg/")) browserLabel = "Edge";
  else if (ua.includes("Chrome/")) browserLabel = "Chrome";
  else if (ua.includes("Firefox/")) browserLabel = "Firefox";
  else if (ua.includes("Safari/")) browserLabel = "Safari";

  const isMobile =
    deviceType === "MOBILE" ||
    deviceType === "IOS" ||
    deviceType === "ANDROID" ||
    /Mobile|Android|iPhone|iPad/i.test(ua);

  const deviceLabel = isMobile
    ? "Thiết bị di động"
    : ua.includes("Macintosh")
      ? "macOS · Trình duyệt"
      : ua.includes("Windows")
        ? "Windows · Trình duyệt"
        : "Trình duyệt web";

  const methodMap: Record<string, string> = {
    password: "Mật khẩu",
    google: "Google",
    oauth: "Đăng nhập nhanh",
  };

  return {
    deviceLabel,
    isMobile,
    browserLabel,
    ipAddress,
    methodLabel: loginMethod ? methodMap[loginMethod] || loginMethod : null,
  };
}

export function getNotificationActionLabel(notification: Notification): string | null {
  if (!notification.url || notification.action !== "open_url") return null;
  const url = notification.url;
  if (url.startsWith("/learning/")) return "Mở bài học";
  if (url.startsWith("/wallets")) return "Xem giao dịch";
  if (url.startsWith("/my-learning")) return "Vào khóa học của tôi";
  if (url.startsWith("/combo")) return "Xem lộ trình combo";
  if (url.startsWith("/courses")) return "Xem khóa học";
  if (url.startsWith("/vouchers")) return "Mở kho ưu đãi";
  return "Xem chi tiết";
}
