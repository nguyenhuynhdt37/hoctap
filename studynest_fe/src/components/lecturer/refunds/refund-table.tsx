"use client";

import { Badge, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/utils/helpers/image";
import {
  LecturerRefundRequestItem,
  LecturerRefundRequestsQuery,
} from "@/types/lecturer/refund";
import { ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const getStatusLabel = (
  status: LecturerRefundRequestItem["status"]
): string => {
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

const getStatusVariant = (
  status: LecturerRefundRequestItem["status"]
): BadgeVariant => {
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

interface RefundRequestsTableProps {
  data: LecturerRefundRequestItem[];
  sortBy: LecturerRefundRequestsQuery["order_by"];
  orderDir: "asc" | "desc";
  onSort: (column: LecturerRefundRequestsQuery["order_by"]) => void;
  onContextMenu?: (
    event: React.MouseEvent,
    refundId: string,
    refund: LecturerRefundRequestItem
  ) => void;
}

export function RefundRequestsTable({
  data,
  sortBy,
  orderDir,
  onSort,
  onContextMenu,
}: RefundRequestsTableProps) {
  const handleSort = (column: LecturerRefundRequestsQuery["order_by"]) => {
    onSort(column);
  };

  const columns: Array<{
    key: LecturerRefundRequestsQuery["order_by"] | "info";
    title: string;
    sortable: boolean;
  }> = [
    { key: "info" as const, title: "Thông tin", sortable: false },
    { key: "status" as const, title: "Trạng thái", sortable: true },
    { key: "refund_amount" as const, title: "Số tiền", sortable: true },
    { key: "created_at" as const, title: "Ngày yêu cầu", sortable: true },
  ];

  return (
    <Card variant="surface" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key as any)}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <span>{col.title}</span>
                      {sortBy === col.key && (
                        <span className="text-primary">
                          {orderDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </button>
                  ) : (
                    col.title
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {data.map((item) => (
              <RefundRequestRow
                key={item.refund_id}
                item={item}
                onContextMenu={onContextMenu}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RefundRequestRow({
  item,
  onContextMenu,
}: {
  item: LecturerRefundRequestItem;
  onContextMenu?: (
    event: React.MouseEvent,
    refundId: string,
    refund: LecturerRefundRequestItem
  ) => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [studentAvatarError, setStudentAvatarError] = useState(false);
  const [instructorAvatarError, setInstructorAvatarError] = useState(false);

  const thumbnailSrc = item.course.thumbnail
    ? getImageUrl(item.course.thumbnail)
    : null;
  const studentAvatarSrc = item.student.avatar
    ? getImageUrl(item.student.avatar)
    : null;
  const instructorAvatarSrc = item.instructor.avatar
    ? getImageUrl(item.instructor.avatar)
    : null;

  const handleRowClick = () => {
    window.location.href = `/lecturer/refunds/${item.refund_id}`;
  };

  return (
    <tr
      className="hover:bg-background/70 transition-colors cursor-pointer"
      onClick={handleRowClick}
      onContextMenu={(e) => onContextMenu?.(e, item.refund_id, item)}
    >
      <td className="px-4 py-4">
        <div className="flex items-start gap-4">
          <div className="relative w-20 h-14 shrink-0 rounded-xl overflow-hidden bg-background border border-border">
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
              <div className="w-full h-full flex items-center justify-center bg-primary-light/40">
                <span className="text-muted-foreground text-xs">No img</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/learning/${item.course.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 mb-2"
            >
              {item.course.title}
            </Link>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {studentAvatarSrc && !studentAvatarError ? (
                  <Image
                    src={studentAvatarSrc}
                    alt={item.student.fullname}
                    width={20}
                    height={20}
                    className="rounded-full object-cover object-center aspect-square border border-border"
                    onError={() => setStudentAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary-light text-primary text-[10px] font-bold flex items-center justify-center border border-primary-pastel">
                    {item.student.fullname
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {item.student.fullname}
                </span>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {item.reason}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge variant={getStatusVariant(item.status)} size="sm" dot>
          {getStatusLabel(item.status)}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(item.refund_amount)}
        </div>
        {item.earnings?.amount_instructor !== null &&
          item.earnings?.amount_instructor !== undefined && (
            <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              Thu nhập GV: {formatCurrency(item.earnings.amount_instructor)}
            </div>
          )}
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-foreground">
          {formatDateTime(item.created_at)}
        </div>
        {item.earnings?.hold_until && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Hold đến: {formatDateTime(item.earnings.hold_until)}
          </div>
        )}
      </td>
    </tr>
  );
}
