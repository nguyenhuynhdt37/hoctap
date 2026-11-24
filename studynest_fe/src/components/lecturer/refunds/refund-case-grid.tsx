"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  CircleX,
  Clock,
  Coins,
  Copy,
  ShieldCheck,
} from "pulsoicon-react";
import { Badge, Button } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { LecturerRefundRequestItem } from "@/types/lecturer/refund";
import { cn } from "@/lib/utils";

interface RefundCaseGridProps {
  data: LecturerRefundRequestItem[];
  onQuickReview: (item: LecturerRefundRequestItem, initialAction?: "approve" | "reject") => void;
  onContextMenu?: (
    event: React.MouseEvent,
    refundId: string,
    refund: LecturerRefundRequestItem,
  ) => void;
}

function getStatusMeta(status: LecturerRefundRequestItem["status"]): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "requested":
      return { label: "Chờ bạn phản hồi", variant: "warning" };
    case "instructor_approved":
      return { label: "GV đã duyệt", variant: "info" };
    case "instructor_rejected":
      return { label: "GV đã từ chối", variant: "destructive" };
    case "admin_approved":
      return { label: "Admin đã duyệt", variant: "success" };
    case "admin_rejected":
      return { label: "Admin đã từ chối", variant: "destructive" };
    case "refunded":
      return { label: "Đã hoàn Coin", variant: "success" };
    default:
      return { label: status, variant: "secondary" };
  }
}

function formatDateTime(value?: string | null): string {
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

function stripHtml(raw?: string | null): string {
  if (!raw) return "Không có mô tả lý do chi tiết.";
  const cleaned = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Không có mô tả lý do chi tiết.";
}

export function RefundCaseGrid({
  data,
  onQuickReview,
  onContextMenu,
}: RefundCaseGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback((id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(id)
        .then(() => {
          setCopiedId(id);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setCopiedId(null), 1800);
        })
        .catch(() => undefined);
    }
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data.map((item) => {
        const statusMeta = getStatusMeta(item.status);
        const isPending = item.status === "requested";
        const courseThumb = item.course?.thumbnail ? getImageUrl(item.course.thumbnail) : "";
        const studentAvatar = item.student?.avatar ? getImageUrl(item.student.avatar) : "";
        const studentInitials = (item.student?.fullname || "HV")
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <article
            key={item.refund_id}
            onContextMenu={(e) => onContextMenu?.(e, item.refund_id, item)}
            className={cn(
              "group flex flex-col justify-between overflow-hidden rounded-[24px] border bg-surface shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(53,111,167,0.14)] motion-reduce:hover:translate-y-0",
              isPending
                ? "border-accent-vanilla-border ring-1 ring-accent-vanilla-border/60"
                : "border-border hover:border-primary-pastel",
            )}
          >
            {/* Header hồ sơ: Trạng thái + Mã đối chiếu + Ngày gửi */}
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3",
                isPending
                  ? "border-accent-vanilla-border/70 bg-accent-vanilla/45"
                  : "border-border/70 bg-primary-light/35",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusMeta.variant} size="sm">
                  {statusMeta.label}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleCopy(item.refund_id)}
                  title="Sao chép mã hồ sơ"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
                >
                  <span>#{item.refund_id.slice(0, 8).toUpperCase()}</span>
                  {copiedId === item.refund_id ? (
                    <Check aria-hidden="true" animated={false} className="size-3 text-success-foreground" />
                  ) : (
                    <Copy aria-hidden="true" animated={false} className="size-3" />
                  )}
                </button>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
                <Calendar aria-hidden="true" animated={false} className="size-3 text-primary" />
                {formatDateTime(item.created_at)}
              </span>
            </div>

            {/* Thân hồ sơ */}
            <div className="space-y-4 p-5">
              {/* Khóa học + Học viên */}
              <div className="flex items-start gap-3.5">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/40">
                  {courseThumb ? (
                    <Image
                      src={courseThumb}
                      alt={item.course?.title || "Khóa học"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-primary">
                      <BookOpen aria-hidden="true" animated={false} className="size-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <Link
                    href={`/lecturer/refunds/${item.refund_id}`}
                    className="line-clamp-2 font-display text-base font-bold leading-snug text-foreground transition-colors hover:text-primary"
                  >
                    {item.course?.title || "Khóa học"}
                  </Link>

                  <div className="flex items-center gap-2">
                    {studentAvatar ? (
                      <Image
                        src={studentAvatar}
                        alt={item.student?.fullname || "Học viên"}
                        width={22}
                        height={22}
                        className="aspect-square rounded-full border border-primary-pastel object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="grid size-5.5 place-items-center rounded-full border border-primary-pastel bg-primary-light text-[10px] font-bold text-primary">
                        {studentInitials}
                      </span>
                    )}
                    <span className="truncate text-xs font-semibold text-muted-foreground">
                      {item.student?.fullname || "Học viên"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 ô số liệu tài chính */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-primary-pastel/75 bg-primary-light/50 p-2.5">
                  <p className="text-[10px] font-bold tracking-wider text-primary uppercase">
                    Coin hoàn
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 font-display text-sm font-bold text-primary tabular-nums">
                    <Coins aria-hidden="true" animated={false} className="size-3.5 text-accent-vanilla-foreground" />
                    <span>{formatVndAsCoin(item.refund_amount)}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-background/65 p-2.5">
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Phần thù lao
                  </p>
                  <p className="mt-1 font-display text-sm font-bold text-foreground tabular-nums">
                    {item.earnings?.amount_instructor != null
                      ? formatVndAsCoin(item.earnings.amount_instructor)
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-background/65 p-2.5">
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Tạm giữ đến
                  </p>
                  <p className="mt-1 truncate text-[11px] font-bold text-foreground tabular-nums">
                    {item.earnings?.hold_until
                      ? formatDateTime(item.earnings.hold_until).split(" ")[0]
                      : "Đã đối soát"}
                  </p>
                </div>
              </div>

              {/* Lý do của học viên */}
              <div className="rounded-2xl border border-border/80 bg-background/70 p-3.5">
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Lý do học viên gửi
                </p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground/90">
                  {stripHtml(item.reason)}
                </p>
              </div>
            </div>

            {/* Footer hành động */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-background/60 px-5 py-3">
              {isPending ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onQuickReview(item, "approve")}
                    className="min-h-9 rounded-full px-3.5 text-xs font-bold"
                  >
                    <CheckCircle2 aria-hidden="true" animated={false} className="size-3.5" />
                    <span>Chấp thuận</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickReview(item, "reject")}
                    className="min-h-9 rounded-full border-destructive-border bg-destructive-bg/50 px-3.5 text-xs font-bold text-destructive-foreground hover:bg-destructive-bg"
                  >
                    <CircleX aria-hidden="true" animated={false} className="size-3.5" />
                    <span>Từ chối</span>
                  </Button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {item.status === "refunded" || item.status === "admin_approved" ? (
                    <ShieldCheck aria-hidden="true" animated={false} className="size-4 text-success-foreground" />
                  ) : (
                    <Clock aria-hidden="true" animated={false} className="size-4 text-primary" />
                  )}
                  <span>Đã qua bước xét duyệt của giảng viên</span>
                </span>
              )}

              <Link
                href={`/lecturer/refunds/${item.refund_id}`}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-surface px-3.5 text-xs font-bold text-primary transition-colors hover:border-primary-pastel hover:bg-primary-light"
              >
                <span>Hồ sơ chi tiết</span>
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
