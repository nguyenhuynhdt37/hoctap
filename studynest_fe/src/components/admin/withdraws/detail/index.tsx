"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import type { AdminWithdrawDetail } from "@/types/admin/withdraw";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  HiArrowLeft,
  HiCheckCircle,
  HiClock,
  HiCurrencyDollar,
  HiUser,
  HiXCircle,
} from "react-icons/hi";

interface Props {
  data: AdminWithdrawDetail;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);

const formatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

const getStatusMeta = (status: string) => {
  const meta: Record<
    string,
    { label: string; class: string; icon: typeof HiCheckCircle }
  > = {
    pending: {
      label: "Đang chờ",
      class: "bg-yellow-100 text-yellow-700 border-yellow-300",
      icon: HiClock,
    },
    approved: {
      label: "Đã duyệt",
      class: "bg-green-100 text-green-700 border-green-300",
      icon: HiCheckCircle,
    },
    rejected: {
      label: "Đã từ chối",
      class: "bg-red-100 text-red-700 border-red-300",
      icon: HiXCircle,
    },
    payout_pending: {
      label: "Đang chờ PayPal thanh toán",
      class: "bg-yellow-100 text-yellow-700 border-yellow-300",
      icon: HiClock,
    },
    failed: {
      label: "PayPal thanh toán thất bại",
      class: "bg-red-100 text-red-700 border-red-300",
      icon: HiXCircle,
    },
    paid: {
      label: "Đã rút tiền thành công",
      class: "bg-green-100 text-green-700 border-green-300",
      icon: HiCheckCircle,
    },
  };
  return (
    meta[status] || {
      label: status,
      class: "bg-gray-100 text-gray-700 border-gray-300",
      icon: HiClock,
    }
  );
};

export default function AdminWithdrawDetail({ data }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null
  );
  const [comment, setComment] = useState("");

  const statusMeta = getStatusMeta(data.status);
  const StatusIcon = statusMeta.icon;
  const canAction = data.status === "pending";

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !comment.trim()) {
      showToast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setSubmitting(action);
      await api.post(`/admin/withdraw/approve_deny`, {
        approve: action === "approve",
        withdraw_ids: [data.id],
        ...(comment.trim() ? { reason: comment.trim() } : {}),
      });
      showToast.success(
        action === "approve" ? "Đã duyệt yêu cầu" : "Đã từ chối yêu cầu"
      );
      router.refresh();
    } catch (error: any) {
      showToast.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          "Không thể xử lý yêu cầu"
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
        >
          <HiArrowLeft className="h-5 w-5" />
          <span className="font-medium">Quay lại</span>
        </button>

        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                <StatusIcon className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Chi tiết yêu cầu rút tiền
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  ID: <span className="font-mono">{data.id}</span>
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusMeta.class}`}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <HiCurrencyDollar className="h-5 w-5" />
                <span className="text-sm font-medium">Số tiền yêu cầu</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.amount)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <HiClock className="h-5 w-5" />
                <span className="text-sm font-medium">Thời gian yêu cầu</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {formatDateTime(data.requested_at)}
              </p>
            </div>
            {data.paypal_batch_id && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <HiCheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">PayPal Batch ID</span>
                </div>
                <p className="text-sm font-mono text-gray-900">
                  {data.paypal_batch_id}
                </p>
              </div>
            )}
          </div>

          {canAction && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <HiClock className="h-5 w-5 text-yellow-600" />
                <p className="font-semibold text-gray-900">
                  Yêu cầu đang chờ xử lý
                </p>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ghi chú (bắt buộc khi từ chối)..."
                className="w-full min-h-[100px] rounded-lg border border-yellow-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm p-3 mb-3"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAction("reject")}
                  disabled={submitting === "reject"}
                  className="px-4 py-2 border border-red-200 rounded-lg text-red-600 font-semibold hover:bg-red-50 disabled:opacity-50"
                >
                  {submitting === "reject" ? "Đang xử lý..." : "Từ chối"}
                </button>
                <button
                  type="button"
                  onClick={() => handleAction("approve")}
                  disabled={submitting === "approve"}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting === "approve" ? "Đang xử lý..." : "Duyệt"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <HiUser className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Giảng viên</h2>
              </div>
              <div className="flex items-center gap-4">
                {data.lecturer.avatar ? (
                  <img
                    src={getGoogleDriveImageUrl(data.lecturer.avatar)}
                    alt={data.lecturer.fullname}
                    className="rounded-full w-14 h-14 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-green-700 font-bold text-lg">
                      {data.lecturer.fullname[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {data.lecturer.fullname}
                  </p>
                  <p className="text-sm text-gray-600">{data.lecturer.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <HiCurrencyDollar className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Ví</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Số dư</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(data.wallets.balance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng nạp</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(data.wallets.total_in)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng rút</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(data.wallets.total_out)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">KYC</span>
                  <span
                    className={`font-semibold ${
                      data.wallets.kyc_verified
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {data.wallets.kyc_verified
                      ? "Đã xác thực"
                      : "Chưa xác thực"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Lịch sử</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Yêu cầu lúc</span>
                <span className="font-medium text-gray-900">
                  {formatDateTime(data.requested_at)}
                </span>
              </div>
              {data.approved_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duyệt lúc</span>
                  <span className="font-medium text-gray-900">
                    {formatDateTime(data.approved_at)}
                  </span>
                </div>
              )}
              {data.rejected_at && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Từ chối lúc</span>
                    <span className="font-medium text-gray-900">
                      {formatDateTime(data.rejected_at)}
                    </span>
                  </div>
                  {data.reason && (
                    <div className="pt-2">
                      <span className="text-gray-600 text-sm block mb-1">
                        Lý do từ chối
                      </span>
                      <p className="text-gray-900 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                        {data.reason}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
