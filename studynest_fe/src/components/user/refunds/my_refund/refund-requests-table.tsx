"use client";

import ContextMenu from "@/components/shared/context-menu";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { RefundRequestItem } from "@/types/user/refund";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface RefundRequestsTableProps {
  requests: RefundRequestItem[];
  isLoading: boolean;
}

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

const getStatusLabel = (status: string) => {
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

const statusBadgeClasses: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-700 border-yellow-300",
  instructor_approved: "bg-blue-100 text-blue-700 border-blue-300",
  instructor_rejected: "bg-red-100 text-red-700 border-red-300",
  admin_approved: "bg-green-100 text-green-700 border-green-300",
  admin_rejected: "bg-red-100 text-red-700 border-red-300",
  refunded: "bg-green-100 text-green-700 border-green-300",
};

export function RefundRequestsTable({
  requests,
  isLoading,
}: RefundRequestsTableProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    refundId: string;
  } | null>(null);

  const handleViewDetail = (refundId: string) => {
    window.location.href = `/refunds/${refundId}`;
  };

  const handleCopyId = (refundId: string) => {
    navigator.clipboard.writeText(refundId);
    setContextMenu(null);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-green-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Khóa học
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Lý do
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ngày yêu cầu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-100">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4">
                    <div className="h-16 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 bg-gray-200 rounded w-24" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 bg-gray-200 rounded w-32" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 bg-gray-200 rounded w-40" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 bg-gray-200 rounded w-28" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-green-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-green-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Khóa học
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Số tiền
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Lý do
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Ngày yêu cầu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-100">
            {requests.map((request) => (
              <RefundRequestRow
                key={request.refund_id}
                request={request}
                onContextMenu={(e, refundId) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, refundId });
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: "Xem chi tiết",
              onClick: () => handleViewDetail(contextMenu.refundId),
            },
            {
              label: "Copy ID",
              onClick: () => handleCopyId(contextMenu.refundId),
            },
          ]}
        />
      )}
    </div>
  );
}

function RefundRequestRow({
  request,
  onContextMenu,
}: {
  request: RefundRequestItem;
  onContextMenu: (e: React.MouseEvent, refundId: string) => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const thumbnailSrc = request.course.thumbnail
    ? getGoogleDriveImageUrl(request.course.thumbnail)
    : null;
  const avatarSrc = request.instructor.avatar
    ? getGoogleDriveImageUrl(request.instructor.avatar)
    : null;

  return (
    <tr
      className="hover:bg-green-50/50 transition-colors cursor-pointer"
      onContextMenu={(e) => onContextMenu(e, request.refund_id)}
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {thumbnailSrc && !thumbnailError ? (
              <Image
                src={thumbnailSrc}
                alt={request.course.title}
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
              href={`/learning/${request.course.course_id}`}
              className="text-sm font-semibold text-gray-900 hover:text-green-600 transition-colors line-clamp-2"
            >
              {request.course.title}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              {avatarSrc && !avatarError ? (
                <Image
                  src={avatarSrc}
                  alt={request.instructor.fullname}
                  width={20}
                  height={20}
                  className="rounded-full object-cover object-center aspect-square border border-green-200"
                  onError={() => setAvatarError(true)}
                  unoptimized
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center border border-green-200">
                  {request.instructor.fullname
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}
              <span className="text-xs text-gray-600">
                {request.instructor.fullname}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
            statusBadgeClasses[request.refund_status] ||
            "bg-gray-100 text-gray-700 border-gray-300"
          }`}
        >
          {getStatusLabel(request.refund_status)}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-semibold text-gray-900">
          {formatCurrency(request.refund_amount)}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Giá gốc: {formatCurrency(request.purchase.original_price)}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-gray-900 max-w-xs line-clamp-2">
          {request.refund_reason || "—"}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-gray-900">
          {formatDateTime(request.requested_at)}
        </div>
        {request.instructor_reviewed_at && (
          <div className="text-xs text-gray-500 mt-0.5">
            GV: {formatDateTime(request.instructor_reviewed_at)}
          </div>
        )}
        {request.admin_reviewed_at && (
          <div className="text-xs text-gray-500 mt-0.5">
            Admin: {formatDateTime(request.admin_reviewed_at)}
          </div>
        )}
      </td>
    </tr>
  );
}

