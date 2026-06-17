"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import {
  AdminRefundRequestItem,
  AdminRefundRequestsQuery,
} from "@/types/admin/refund";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HiArrowDown, HiArrowUp } from "react-icons/hi";

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
  status: AdminRefundRequestItem["status"]
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

const getStatusBadgeClass = (
  status: AdminRefundRequestItem["status"]
): string => {
  switch (status) {
    case "requested":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "instructor_approved":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "instructor_rejected":
      return "bg-red-100 text-red-700 border-red-300";
    case "admin_approved":
      return "bg-green-100 text-green-700 border-green-300";
    case "admin_rejected":
      return "bg-red-100 text-red-700 border-red-300";
    case "refunded":
      return "bg-green-100 text-green-700 border-green-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

interface RefundRequestsTableProps {
  data: AdminRefundRequestItem[];
  sortBy: AdminRefundRequestsQuery["order_by"];
  orderDir: "asc" | "desc";
  onSort: (column: AdminRefundRequestsQuery["order_by"]) => void;
  onContextMenu?: (
    event: React.MouseEvent,
    refundId: string,
    refund: AdminRefundRequestItem
  ) => void;
}

export function RefundRequestsTable({
  data,
  sortBy,
  orderDir,
  onSort,
  onContextMenu,
}: RefundRequestsTableProps) {
  const handleSort = (column: AdminRefundRequestsQuery["order_by"]) => {
    onSort(column);
  };

  const columns: Array<{
    key: AdminRefundRequestsQuery["order_by"] | "info";
    title: string;
    sortable: boolean;
  }> = [
    { key: "info" as const, title: "Thông tin", sortable: false },
    { key: "status" as const, title: "Trạng thái", sortable: true },
    { key: "refund_amount" as const, title: "Số tiền", sortable: true },
    { key: "created_at" as const, title: "Ngày yêu cầu", sortable: true },
  ];

  return (
    <>
      <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key as any)}
                        className="flex items-center gap-2 hover:text-green-600 transition-colors"
                      >
                        <span>{col.title}</span>
                        {sortBy === col.key && (
                          <span className="text-green-600">
                            {orderDir === "asc" ? (
                              <HiArrowUp className="h-4 w-4" />
                            ) : (
                              <HiArrowDown className="h-4 w-4" />
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
            <tbody className="divide-y divide-green-100">
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
      </div>
    </>
  );
}

function RefundRequestRow({
  item,
  onContextMenu,
}: {
  item: AdminRefundRequestItem;
  onContextMenu?: (
    event: React.MouseEvent,
    refundId: string,
    refund: AdminRefundRequestItem
  ) => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [studentAvatarError, setStudentAvatarError] = useState(false);
  const [instructorAvatarError, setInstructorAvatarError] = useState(false);

  const thumbnailSrc = item.course.thumbnail
    ? getGoogleDriveImageUrl(item.course.thumbnail)
    : null;
  const studentAvatarSrc = item.student.avatar
    ? getGoogleDriveImageUrl(item.student.avatar)
    : null;
  const instructorAvatarSrc = item.instructor.avatar
    ? getGoogleDriveImageUrl(item.instructor.avatar)
    : null;

  const handleRowClick = () => {
    window.location.href = `/admin/refunds/${item.refund_id}`;
  };

  return (
    <tr
      className="hover:bg-green-50/50 transition-colors cursor-pointer"
      onClick={handleRowClick}
      onContextMenu={(e) => onContextMenu?.(e, item.refund_id, item)}
    >
      <td className="px-4 py-4">
        <div className="flex items-start gap-4">
          <div className="relative w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100">
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
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-gray-400 text-xs">No img</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/learning/${item.course.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-gray-900 hover:text-green-600 transition-colors line-clamp-2 mb-2"
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
                    className="rounded-full object-cover object-center aspect-square border border-green-200"
                    onError={() => setStudentAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center border border-green-200">
                    {item.student.fullname
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-gray-600">
                  {item.student.fullname}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {instructorAvatarSrc && !instructorAvatarError ? (
                  <Image
                    src={instructorAvatarSrc}
                    alt={item.instructor.fullname}
                    width={16}
                    height={16}
                    className="rounded-full object-cover object-center aspect-square border border-green-200"
                    onError={() => setInstructorAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center border border-green-200">
                    {item.instructor.fullname
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  GV: {item.instructor.fullname}
                </span>
              </div>
              <div className="text-xs text-gray-500 line-clamp-2">
                {item.reason}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
            item.status
          )}`}
        >
          {getStatusLabel(item.status)}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-semibold text-gray-900">
          {formatCurrency(item.refund_amount)}
        </div>
        {item.earnings?.amount_instructor !== null &&
          item.earnings?.amount_instructor !== undefined && (
            <div className="text-xs text-gray-500 mt-0.5">
              Thu nhập GV: {formatCurrency(item.earnings.amount_instructor)}
            </div>
          )}
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-gray-900">
          {formatDateTime(item.created_at)}
        </div>
        {item.earnings?.hold_until && (
          <div className="text-xs text-gray-500 mt-0.5">
            Hold đến: {formatDateTime(item.earnings.hold_until)}
          </div>
        )}
      </td>
    </tr>
  );
}

