"use client";

import { Badge, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { HoldEarningsItem, HoldEarningsQuery } from "@/types/lecturer/hold";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Coins,
} from "pulsoicon-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getHoldProgressInfo } from "./hold-card-grid";

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

const getStatusLabel = (status: "holding" | "freeze") =>
  status === "holding" ? "Đang chờ trả" : "Đang đóng băng";

const getStatusVariant = (status: "holding" | "freeze"): BadgeVariant =>
  status === "holding" ? "warning" : "destructive";

const getRefundStatusLabel = (status: string | null) => {
  if (!status) return "—";
  switch (status) {
    case "requested":
      return "Chờ GV duyệt";
    case "instructor_approved":
      return "GV đã duyệt";
    case "instructor_rejected":
      return "GV đã từ chối";
    case "admin_approved":
      return "Admin đã duyệt";
    case "admin_rejected":
      return "Admin đã từ chối";
    case "refunded":
      return "Đã hoàn tiền";
    default:
      return status;
  }
};

const getRefundStatusVariant = (status: string | null): BadgeVariant => {
  if (!status) return "neutral";
  switch (status) {
    case "requested":
      return "warning";
    case "instructor_approved":
      return "info";
    case "instructor_rejected":
    case "admin_rejected":
      return "destructive";
    case "admin_approved":
    case "refunded":
      return "success";
    default:
      return "neutral";
  }
};

interface HoldEarningsTableProps {
  data: HoldEarningsItem[];
  sortBy: HoldEarningsQuery["order_by"];
  orderDir: "asc" | "desc";
  onSort: (column: HoldEarningsQuery["order_by"]) => void;
}

type SortableColumn = {
  key: HoldEarningsQuery["order_by"];
  title: string;
  sortable: true;
};

type StaticColumn = {
  key: "course" | "student" | "refund";
  title: string;
  sortable: false;
};

export function HoldEarningsTable({
  data,
  sortBy,
  orderDir,
  onSort,
}: HoldEarningsTableProps) {
  const columns: Array<SortableColumn | StaticColumn> = [
    { key: "course", title: "Khóa học", sortable: false },
    { key: "student", title: "Học viên", sortable: false },
    { key: "amount_instructor", title: "Thù lao", sortable: true },
    { key: "status", title: "Trạng thái", sortable: true },
    { key: "hold_until", title: "Hạn giải ngân", sortable: true },
    { key: "refund", title: "Hồ sơ hoàn tiền", sortable: false },
    { key: "created_at", title: "Ngày tạo", sortable: true },
  ];

  return (
    <Card
      variant="surface"
      density="none"
      className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-primary-light/35">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-primary cursor-pointer"
                    >
                      <span>{column.title}</span>
                      {sortBy === column.key && (
                        <span className="inline-flex text-primary">
                          {orderDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span>{column.title}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {data.map((item) => (
              <HoldEarningsRow key={item.earnings_id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HoldEarningsRow({ item }: { item: HoldEarningsItem }) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const thumbnailSrc = item.course.thumbnail
    ? getImageUrl(item.course.thumbnail)
    : null;
  const avatarSrc = item.student.avatar
    ? getImageUrl(item.student.avatar)
    : null;
  const progress = getHoldProgressInfo(
    item.created_at,
    item.hold_until,
    item.status,
  );
  const cleanReason = stripHtml(item.refund?.reason);

  return (
    <tr className="transition-colors hover:bg-primary-light/15">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
            {thumbnailSrc && !thumbnailError ? (
              <Image
                src={thumbnailSrc}
                alt={item.course.title}
                fill
                className="object-cover"
                onError={() => setThumbnailError(true)}
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-light/50 text-[10px] text-muted-foreground">
                No img
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/lecturer/courses/${item.course.course_id}`}
              className="text-sm font-semibold text-foreground transition-colors hover:text-primary line-clamp-2"
            >
              {item.course.title}
            </Link>
            <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              #{item.earnings_id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          {avatarSrc && !avatarError ? (
            <Image
              src={avatarSrc}
              alt={item.student.fullname}
              width={32}
              height={32}
              className="aspect-square rounded-full border border-border object-cover"
              onError={() => setAvatarError(true)}
              unoptimized
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-primary-light text-xs font-bold text-primary">
              {item.student.fullname
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-medium text-foreground">
              {item.student.fullname}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="inline-flex items-center gap-1 font-display text-base font-bold tabular-nums text-warning-foreground">
          <Coins animated={false} className="h-4 w-4 text-[#C98A2C]" aria-hidden="true" />
          {formatVndAsCoin(item.amount_instructor)}
        </div>
      </td>

      <td className="px-5 py-4">
        <Badge variant={getStatusVariant(item.status)} size="sm" dot>
          {getStatusLabel(item.status)}
        </Badge>
      </td>

      <td className="px-5 py-4">
        <div className="text-sm font-medium tabular-nums text-foreground">
          {formatDateTime(item.hold_until)}
        </div>
        <div
          className={`mt-0.5 text-[11px] font-medium ${
            progress.isFrozen
              ? "text-destructive-foreground"
              : progress.isUrgent
                ? "text-primary"
                : "text-muted-foreground"
          }`}
        >
          {progress.countdownLabel}
        </div>
      </td>

      <td className="px-5 py-4">
        {item.refund && item.refund.refund_id ? (
          <Link
            href={`/lecturer/refunds/${item.refund.refund_id}`}
            className="group inline-block space-y-1 rounded-xl border border-warning-border/70 bg-accent-vanilla/50 px-3 py-2 transition-colors hover:border-primary-pastel hover:bg-accent-vanilla/80"
          >
            <div className="flex items-center gap-1.5">
              <Badge
                variant={getRefundStatusVariant(item.refund.status)}
                size="sm"
                dot
              >
                {getRefundStatusLabel(item.refund.status)}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            {cleanReason && (
              <div className="max-w-xs text-xs text-muted-foreground line-clamp-1">
                {cleanReason}
              </div>
            )}
          </Link>
        ) : (
          <div className="inline-flex items-center gap-1 text-muted-foreground">
            <AlertCircle animated={false} className="h-3.5 w-3.5" />
            <span className="text-xs">Không có</span>
          </div>
        )}
      </td>

      <td className="px-5 py-4">
        <div className="text-xs tabular-nums text-muted-foreground">
          {formatDateTime(item.created_at)}
        </div>
      </td>
    </tr>
  );
}
