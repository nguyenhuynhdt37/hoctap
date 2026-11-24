"use client";

import { Badge, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { HoldEarningsItem } from "@/types/lecturer/hold";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Coins,
  Copy,
  Lock,
  RotateCcw,
} from "pulsoicon-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const stripHtml = (input?: string | null) => {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatDateTime = (value?: string | null) => {
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

export function getHoldProgressInfo(
  createdAt?: string | null,
  holdUntil?: string | null,
  status?: "holding" | "freeze",
) {
  if (status === "freeze") {
    return {
      percent: 100,
      countdownLabel: "Đang tạm khóa do yêu cầu hoàn tiền",
      isUrgent: false,
      isFrozen: true,
    };
  }

  const startMs = createdAt ? new Date(createdAt).getTime() : Number.NaN;
  const endMs = holdUntil ? new Date(holdUntil).getTime() : Number.NaN;
  const nowMs = Date.now();

  if (Number.isNaN(endMs)) {
    return {
      percent: 0,
      countdownLabel: "Chưa có mốc giải ngân",
      isUrgent: false,
      isFrozen: false,
    };
  }

  const remainMs = endMs - nowMs;
  let percent = 50;
  if (!Number.isNaN(startMs) && endMs > startMs) {
    const raw = ((nowMs - startMs) / (endMs - startMs)) * 100;
    percent = Math.max(4, Math.min(100, Math.round(raw)));
  } else if (remainMs <= 0) {
    percent = 100;
  }

  if (remainMs <= 0) {
    return {
      percent: 100,
      countdownLabel: "Đã đến mốc giải ngân",
      isUrgent: true,
      isFrozen: false,
    };
  }

  const totalHours = Math.floor(remainMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  const countdownLabel =
    days > 0
      ? `Còn ${days} ngày ${hours > 0 ? `${hours} giờ` : ""}`.trim()
      : totalHours > 0
        ? `Sắp giải ngân · còn ${totalHours} giờ`
        : "Sắp giải ngân trong ít phút";

  return {
    percent,
    countdownLabel,
    isUrgent: days === 0,
    isFrozen: false,
  };
}

const getRefundStatusMeta = (
  status: string | null,
): { label: string; variant: BadgeVariant } => {
  switch (status) {
    case "requested":
      return { label: "Chờ giảng viên duyệt", variant: "warning" };
    case "instructor_approved":
      return { label: "GV đã duyệt", variant: "info" };
    case "instructor_rejected":
      return { label: "GV đã từ chối", variant: "destructive" };
    case "admin_approved":
      return { label: "Admin đã duyệt", variant: "success" };
    case "admin_rejected":
      return { label: "Admin đã từ chối", variant: "destructive" };
    case "refunded":
      return { label: "Đã hoàn tiền", variant: "success" };
    default:
      return { label: status || "Đang xử lý", variant: "neutral" };
  }
};

export function HoldCardGrid({ data }: { data: HoldEarningsItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {data.map((item) => (
        <HoldVaultCard key={item.earnings_id} item={item} />
      ))}
    </div>
  );
}

function HoldVaultCard({ item }: { item: HoldEarningsItem }) {
  const [thumbError, setThumbError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [copied, setCopied] = useState(false);

  const isFreeze = item.status === "freeze";
  const progress = getHoldProgressInfo(
    item.created_at,
    item.hold_until,
    item.status,
  );
  const thumbnailSrc = item.course.thumbnail
    ? getImageUrl(item.course.thumbnail)
    : null;
  const avatarSrc = item.student.avatar
    ? getImageUrl(item.student.avatar)
    : null;
  const refundMeta = item.refund?.refund_id
    ? getRefundStatusMeta(item.refund.status)
    : null;
  const cleanRefundReason = stripHtml(item.refund?.reason);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(item.earnings_id);
    setCopied(true);
    showToast.success("Đã sao chép mã giao dịch");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card
      variant="surface"
      density="none"
      className={`group flex flex-col overflow-hidden rounded-[24px] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isFreeze
          ? "border-destructive-border/80 hover:border-destructive-border"
          : "border-border hover:border-primary-pastel"
      }`}
    >
      {/* Header dải màu pastel phân biệt holding vs freeze */}
      <div
        className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${
          isFreeze
            ? "border-destructive-border/60 bg-destructive-bg/50"
            : "border-border/80 bg-gradient-to-r from-primary-light/55 via-surface to-accent-vanilla/50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-surface shadow-2xs ${
              isFreeze
                ? "border-destructive-border text-destructive-foreground"
                : "border-primary-pastel text-primary"
            }`}
          >
            {isFreeze ? (
              <Lock animated={false} className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Clock animated={false} className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <div>
            <Badge
              variant={isFreeze ? "destructive" : "warning"}
              size="sm"
              dot
            >
              {isFreeze ? "Đang đóng băng" : "Đang chờ giải ngân"}
            </Badge>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              Tạo ngày {formatDateTime(item.created_at)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium text-muted-foreground">
            Thù lao giảng viên
          </p>
          <p className="inline-flex items-center gap-1 font-display text-xl font-bold tabular-nums text-primary">
            <Coins animated={false} className="h-4 w-4" aria-hidden="true" />
            {formatVndAsCoin(item.amount_instructor)}
          </p>
        </div>
      </div>

      {/* Thân thẻ */}
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div className="space-y-4">
          {/* Thanh tiến độ đếm ngược giải ngân */}
          <div className="space-y-1.5 rounded-2xl border border-border/70 bg-background/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span
                className={`font-semibold ${
                  progress.isFrozen
                    ? "text-destructive-foreground"
                    : progress.isUrgent
                      ? "text-primary"
                      : "text-foreground"
                }`}
              >
                {progress.countdownLabel}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                Hạn: {formatDateTime(item.hold_until)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.isFrozen ? "bg-destructive-foreground/70" : "bg-primary"
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          {/* Thông tin Khóa học & Học viên */}
          <div className="flex items-start gap-3">
            <div className="relative h-14 w-22 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/40">
              {thumbnailSrc && !thumbError ? (
                <Image
                  src={thumbnailSrc}
                  alt={item.course.title}
                  fill
                  className="object-cover"
                  onError={() => setThumbError(true)}
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <BookOpen
                    animated={false}
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <Link
                href={`/lecturer/courses/${item.course.course_id}`}
                className="block text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary line-clamp-2"
              >
                {item.course.title}
              </Link>

              <div className="flex items-center gap-2">
                {avatarSrc && !avatarError ? (
                  <Image
                    src={avatarSrc}
                    alt={item.student.fullname}
                    width={24}
                    height={24}
                    className="aspect-square rounded-full border border-border object-cover"
                    onError={() => setAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-primary-light text-[10px] font-bold text-primary">
                    {item.student.fullname
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <span className="truncate text-xs font-medium text-muted-foreground">
                  Học viên:{" "}
                  <strong className="text-foreground">
                    {item.student.fullname}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Hộp liên kết Hồ sơ hoàn tiền nếu có */}
          {item.refund?.refund_id && refundMeta && (
            <Link
              href={`/lecturer/refunds/${item.refund.refund_id}`}
              className="group/refund block rounded-2xl border border-warning-border/80 bg-accent-vanilla/55 p-3.5 transition-colors hover:border-primary-pastel hover:bg-accent-vanilla/85"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RotateCcw
                    animated={false}
                    className="h-3.5 w-3.5 text-warning-foreground"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Hồ sơ hoàn tiền đính kèm
                  </span>
                  <Badge variant={refundMeta.variant} size="sm" dot>
                    {refundMeta.label}
                  </Badge>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover/refund:translate-x-0.5 group-hover/refund:text-primary" />
              </div>
              {cleanRefundReason && (
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                  &ldquo;{cleanRefundReason}&rdquo;
                </p>
              )}
            </Link>
          )}
        </div>

        {/* Footer: Mã giao dịch copy 1 chạm */}
        <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
          >
            <span>#{item.earnings_id.slice(0, 8).toUpperCase()}</span>
            {copied ? (
              <Check animated={false} className="h-3 w-3 text-primary" />
            ) : (
              <Copy animated={false} className="h-3 w-3" />
            )}
          </button>

          {item.refund?.refund_id ? (
            <Link
              href={`/lecturer/refunds/${item.refund.refund_id}`}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <span>Xử lý hoàn tiền</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Không có tranh chấp
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
