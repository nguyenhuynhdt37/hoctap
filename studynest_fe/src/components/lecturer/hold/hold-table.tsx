"use client";

import { Badge, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { HoldEarningsItem, HoldEarningsQuery } from "@/types/lecturer/hold";
import { AlertCircle, ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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

const getStatusLabel = (status: "holding" | "freeze") => {
  switch (status) {
    case "holding":
      return "Đang chờ trả";
    case "freeze":
      return "Đang đóng băng";
    default:
      return status;
  }
};

const getStatusVariant = (status: "holding" | "freeze"): BadgeVariant => {
  switch (status) {
    case "holding":
      return "warning";
    case "freeze":
      return "destructive";
    default:
      return "neutral";
  }
};

const getRefundStatusLabel = (status: string | null) => {
  if (!status) return "—";
  switch (status) {
    case "requested":
      return "Đã yêu cầu";
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
      return "destructive";
    case "admin_approved":
      return "success";
    case "admin_rejected":
      return "destructive";
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
  const handleSort = (column: HoldEarningsQuery["order_by"]) => {
    onSort(column);
  };

  const columns: Array<SortableColumn | StaticColumn> = [
    { key: "course" as const, title: "Khóa học", sortable: false },
    { key: "student" as const, title: "Học viên", sortable: false },
    { key: "amount_instructor" as const, title: "Số tiền", sortable: true },
    { key: "status" as const, title: "Trạng thái", sortable: true },
    { key: "hold_until" as const, title: "Hạn hold", sortable: true },
    { key: "refund" as const, title: "Yêu cầu hoàn tiền", sortable: false },
    { key: "created_at" as const, title: "Ngày tạo", sortable: true },
  ];

  return (
    <Card variant="surface" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <span>{column.title}</span>
                      {sortBy === column.key && (
                        <span className="text-primary inline-flex">
                          {orderDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
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
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <HoldEarningsRow key={item.earnings_id} item={item} />
              ))
            )}
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

  return (
    <tr className="hover:bg-background/70 transition-colors">
      {/* Course */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-12 shrink-0 rounded-xl overflow-hidden bg-background border border-border">
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
              <div className="w-full h-full flex items-center justify-center bg-primary-light/50">
                <span className="text-muted-foreground text-xs">No image</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/lecturer/courses/${item.course.course_id}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {item.course.title}
            </Link>
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
              {item.course.course_id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>

      {/* Student */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2.5">
          {avatarSrc && !avatarError ? (
            <Image
              src={avatarSrc}
              alt={item.student.fullname}
              width={32}
              height={32}
              className="rounded-full object-cover object-center aspect-square border border-border"
              onError={() => setAvatarError(true)}
              unoptimized
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-light text-primary text-xs font-bold flex items-center justify-center border border-primary-pastel">
              {item.student.fullname
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground line-clamp-1">
              {item.student.fullname}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {item.student.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>

      {/* Amount */}
      <td className="px-6 py-4">
        <div className="text-base font-bold text-primary tabular-nums">
          {formatCurrency(item.amount_instructor)}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <Badge variant={getStatusVariant(item.status)} size="sm" dot>
          {getStatusLabel(item.status)}
        </Badge>
      </td>

      {/* Hold Until */}
      <td className="px-6 py-4">
        <div className="text-sm text-foreground">
          {formatDateTime(item.hold_until)}
        </div>
      </td>

      {/* Refund */}
      <td className="px-6 py-4">
        {item.refund && item.refund.refund_id ? (
          <div className="space-y-1.5">
            <Badge
              variant={getRefundStatusVariant(item.refund.status)}
              size="sm"
              dot
            >
              {getRefundStatusLabel(item.refund.status)}
            </Badge>
            {item.refund.reason && (
              <div className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
                {item.refund.reason}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">Không có</span>
          </div>
        )}
      </td>

      {/* Created At */}
      <td className="px-6 py-4">
        <div className="text-sm text-muted-foreground">
          {formatDateTime(item.created_at)}
        </div>
      </td>
    </tr>
  );
}
