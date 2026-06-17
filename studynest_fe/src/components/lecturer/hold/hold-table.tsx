"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HoldEarningsItem, HoldEarningsQuery } from "@/types/lecturer/hold";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HiArrowDown, HiArrowUp, HiExclamationCircle } from "react-icons/hi";

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

const getStatusBadgeClass = (status: "holding" | "freeze") => {
  switch (status) {
    case "holding":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "freeze":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
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

const getRefundStatusBadgeClass = (status: string | null) => {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-300";
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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center space-x-2 hover:text-green-600 transition-colors duration-200"
                    >
                      <span>{column.title}</span>
                      {sortBy === column.key && (
                        <span className="text-green-600 font-bold">
                          {orderDir === "asc" ? "↑" : "↓"}
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
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
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
    </div>
  );
}

function HoldEarningsRow({ item }: { item: HoldEarningsItem }) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const thumbnailSrc = item.course.thumbnail
    ? getGoogleDriveImageUrl(item.course.thumbnail)
    : null;
  const avatarSrc = item.student.avatar
    ? getGoogleDriveImageUrl(item.student.avatar)
    : null;

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-200">
      {/* Course */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100">
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
                <span className="text-gray-400 text-xs">No image</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/lecturer/courses/${item.course.course_id}`}
              className="text-sm font-semibold text-gray-900 hover:text-green-600 transition-colors line-clamp-2"
            >
              {item.course.title}
            </Link>
            <div className="text-xs text-gray-500 mt-0.5 font-mono">
              {item.course.course_id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>

      {/* Student */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {avatarSrc && !avatarError ? (
            <Image
              src={avatarSrc}
              alt={item.student.fullname}
              width={32}
              height={32}
              className="rounded-full object-cover object-center aspect-square border border-green-200"
              onError={() => setAvatarError(true)}
              unoptimized
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center border border-green-200">
              {item.student.fullname
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 line-clamp-1">
              {item.student.fullname}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {item.student.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>

      {/* Amount */}
      <td className="px-6 py-4">
        <div className="text-lg font-bold text-green-600">
          {formatCurrency(item.amount_instructor)}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
            item.status
          )}`}
        >
          {getStatusLabel(item.status)}
        </span>
      </td>

      {/* Hold Until */}
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          {formatDateTime(item.hold_until)}
        </div>
      </td>

      {/* Refund */}
      <td className="px-6 py-4">
        {item.refund && item.refund.refund_id ? (
          <div className="space-y-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getRefundStatusBadgeClass(
                item.refund.status
              )}`}
            >
              {getRefundStatusLabel(item.refund.status)}
            </span>
            {item.refund.reason && (
              <div className="text-xs text-gray-600 line-clamp-2 max-w-xs">
                {item.refund.reason}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-400">
            <HiExclamationCircle className="h-4 w-4" />
            <span className="text-xs">Không có</span>
          </div>
        )}
      </td>

      {/* Created At */}
      <td className="px-6 py-4">
        <div className="text-sm text-gray-600">
          {formatDateTime(item.created_at)}
        </div>
      </td>
    </tr>
  );
}
