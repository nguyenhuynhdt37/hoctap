"use client";

import toast from "react-hot-toast";
import {
  Calendar,
  Coins,
  Copy,
  EyeOff,
  Globe,
  GraduationCap,
  Layers,
  Percent,
  ShieldCheck,
  Tag,
} from "pulsoicon-react";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { DiscountCreator } from "@/types/admin/discount";

export interface AdminDiscountCreatorStat extends DiscountCreator {
  discount_count: number;
  running_count: number;
}

export interface AdminDiscountStats {
  total: number;
  running: number;
  upcoming: number;
  expired: number;
  inactive: number;
  admin_count: number;
  lecturer_count: number;
  lecturer_running: number;
  lecturer_inactive: number;
  creators: AdminDiscountCreatorStat[];
  total_redemptions: number;
  history_records: number;
  total_discounted_amount: number;
  top_codes: {
    id: string;
    name: string;
    code: string;
    created_role?: string;
    usage_count: number;
    usage_limit: number | null;
  }[];
}

export const formatDiscountCoin = (value: number) =>
  formatVndAsCoin(Math.round(value || 0));

export const formatDiscountDateTime = (value?: string | null) => {
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

export interface DiscountLifecycle {
  key: "running" | "upcoming" | "expired" | "inactive";
  label: string;
  badgeClass: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  countdownText: string | null;
}

export function getDiscountLifecycle(input: {
  is_active: boolean;
  start_at?: string | null;
  end_at?: string | null;
}): DiscountLifecycle {
  if (!input.is_active) {
    return {
      key: "inactive",
      label: "Đã tạm tắt",
      badgeClass: "border-border bg-background text-muted-foreground",
      accentBg: "bg-background",
      accentBorder: "border-border",
      accentText: "text-muted-foreground",
      countdownText: null,
    };
  }
  const now = Date.now();
  const startMs = input.start_at ? new Date(input.start_at).getTime() : NaN;
  const endMs = input.end_at ? new Date(input.end_at).getTime() : NaN;

  if (!Number.isNaN(startMs) && now < startMs) {
    const days = Math.ceil((startMs - now) / (1000 * 60 * 60 * 24));
    return {
      key: "upcoming",
      label: "Sắp diễn ra",
      badgeClass:
        "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
      accentBg: "bg-accent-vanilla/70",
      accentBorder: "border-accent-vanilla-border",
      accentText: "text-accent-vanilla-foreground",
      countdownText: `Bắt đầu sau ${days} ngày`,
    };
  }
  if (!Number.isNaN(endMs) && now > endMs) {
    return {
      key: "expired",
      label: "Đã hết hạn",
      badgeClass:
        "border-secondary-pastel bg-secondary-light text-secondary-foreground",
      accentBg: "bg-secondary-light/60",
      accentBorder: "border-secondary-pastel",
      accentText: "text-secondary-foreground",
      countdownText: "Chiến dịch đã kết thúc",
    };
  }
  const leftDays = !Number.isNaN(endMs)
    ? Math.max(0, Math.ceil((endMs - now) / (1000 * 60 * 60 * 24)))
    : null;
  return {
    key: "running",
    label: "Đang chạy",
    badgeClass: "border-success-border bg-success-bg text-success-foreground",
    accentBg: "bg-primary-light/85",
    accentBorder: "border-primary-pastel",
    accentText: "text-primary",
    countdownText: leftDays !== null ? `Còn ${leftDays} ngày` : null,
  };
}

export function getAppliesToLabel(appliesTo: string) {
  if (appliesTo === "global") return "Toàn hệ thống";
  if (appliesTo === "category") return "Theo danh mục";
  return "Khóa học chỉ định";
}

export function generatePromoCode(prefix = "MAYMAY"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${suffix}`;
}

export function VoucherTicketPreview({
  name,
  code,
  discountType,
  percentValue,
  fixedValue,
  appliesTo,
  isActive,
  isHidden,
  startAt,
  endAt,
  usageCount = 0,
  usageLimit = null,
  createdRole,
  creator,
  targetCount,
  compact = false,
}: {
  name: string;
  code: string;
  discountType: "percent" | "fixed";
  percentValue: number | null;
  fixedValue: number | null;
  appliesTo: "course" | "global" | "category";
  isActive: boolean;
  isHidden?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  usageCount?: number;
  usageLimit?: number | null;
  createdRole?: string;
  creator?: DiscountCreator | null;
  targetCount?: number;
  compact?: boolean;
}) {
  const lifecycle = getDiscountLifecycle({
    is_active: isActive,
    start_at: startAt,
    end_at: endAt,
  });

  const valueDisplay =
    discountType === "percent"
      ? `${percentValue ?? 0}%`
      : formatDiscountCoin(fixedValue ?? 0);

  const usagePct =
    usageLimit && usageLimit > 0
      ? Math.min(100, Math.round((usageCount / usageLimit) * 100))
      : null;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-surface shadow-[0_14px_34px_-14px_rgba(53,111,167,0.16)] ${lifecycle.accentBorder}`}
    >
      {/* Top Stub (Value Banner) */}
      <div className={`relative px-5 py-4 ${lifecycle.accentBg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface/90 text-primary shadow-2xs">
              {discountType === "percent" ? (
                <Percent size={17} animated={false} />
              ) : (
                <Coins size={17} animated={false} />
              )}
            </span>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ưu đãi {discountType === "percent" ? "phần trăm" : "trực tiếp"}
              </span>
              <span
                className={`block font-bold leading-tight ${compact ? "text-xl" : "text-2xl"} ${lifecycle.accentText}`}
              >
                Giảm {valueDisplay}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${lifecycle.badgeClass}`}
            >
              {lifecycle.label}
            </span>
            {isHidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <EyeOff size={10} animated={false} />
                Mã ẩn
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Perforated Ticket Divider with Side Notches */}
      <div className="relative flex items-center bg-surface">
        <span
          aria-hidden="true"
          className="h-5 w-2.5 rounded-r-full border-y border-r border-border bg-background"
        />
        <div className="mx-2 flex-1 border-t border-dashed border-border" />
        <span
          aria-hidden="true"
          className="h-5 w-2.5 rounded-l-full border-y border-l border-border bg-background"
        />
      </div>

      {/* Bottom Body */}
      <div className="space-y-3 px-5 pb-4 pt-2">
        <div>
          {createdRole && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {createdRole === "LECTURER" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent-border bg-accent/80 px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  <GraduationCap size={11} animated={false} />
                  GV: {creator?.fullname || "Giảng viên"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light/85 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck size={11} animated={false} />
                  Nền tảng Mây Mây
                </span>
              )}
              {typeof targetCount === "number" && targetCount > 0 && appliesTo !== "global" && (
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {targetCount} {appliesTo === "category" ? "danh mục" : "khóa học"}
                </span>
              )}
            </div>
          )}
          <p className="truncate text-sm font-bold text-foreground">
            {name || "Tên chiến dịch khuyến mãi..."}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!code) return;
                navigator.clipboard.writeText(code);
                toast.success(`Đã sao chép mã ${code}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary-pastel bg-primary-light/70 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Tag size={12} animated={false} />
              <span>{code || "MAYMAY2026"}</span>
              <Copy size={11} animated={false} />
            </button>
            <span className="inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {appliesTo === "global" ? (
                <Globe size={11} animated={false} />
              ) : (
                <Layers size={11} animated={false} />
              )}
              {getAppliesToLabel(appliesTo)}
            </span>
          </div>
        </div>

        {/* Usage Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Đã dùng:{" "}
              <strong className="text-foreground">
                {usageCount}
                {usageLimit ? ` / ${usageLimit}` : " (Không giới hạn)"}
              </strong>
            </span>
            {lifecycle.countdownText && (
              <span className="font-medium text-primary">
                {lifecycle.countdownText}
              </span>
            )}
          </div>
          {usagePct !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar size={12} animated={false} />
          <span className="truncate">
            {formatDiscountDateTime(startAt)} → {formatDiscountDateTime(endAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
