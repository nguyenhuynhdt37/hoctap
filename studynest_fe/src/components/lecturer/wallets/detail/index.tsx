"use client";

import api from "@/lib/utils/fetcher/client/axios";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiArrowLeft } from "react-icons/hi";
import useSWR from "swr";

interface Props {
  transactionId: string;
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
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    deposit: "Nạp tiền",
    purchase: "Mua khóa học",
    income: "Thu nhập",
    refund: "Hoàn tiền",
    withdraw_request: "Yêu cầu rút tiền",
    withdraw_paid: "Rút tiền đã thanh toán",
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    completed: "Thành công",
    pending: "Đang chờ",
    canceled: "Đã hủy",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
  };
  return labels[status] || status;
};

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    completed: "bg-green-100 text-green-700 border-green-200",
    approved: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    canceled: "bg-red-100 text-red-700 border-red-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  return classes[status] || "bg-gray-100 text-gray-700 border-gray-200";
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="text-sm font-semibold text-gray-600 min-w-[160px]">
        {label}
      </div>
      <div className="flex-1 text-right">
        {typeof value === "string" ? (
          <span className="text-sm text-gray-900 font-medium">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export default function LecturerTransactionDetail({ transactionId }: Props) {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<LecturerTransactionDetail>(
    `/lecturer/transactions/${transactionId}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Đang tải chi tiết giao dịch...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">
                Không thể tải chi tiết giao dịch
              </p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isIncome = data.direction === "in";
  const typeLabel = getTypeLabel(data.type);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/lecturer/wallets"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <HiArrowLeft className="w-5 h-5" />
          <span>Quay lại danh sách giao dịch</span>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{typeLabel}</h1>
            <span
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold ${getStatusClass(
                data.status
              )}`}
            >
              {getStatusLabel(data.status)}
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Số tiền</div>
            <div
              className={`text-3xl font-bold ${
                isIncome ? "text-green-600" : "text-gray-900"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(data.amount)}
            </div>
          </div>

          <div className="space-y-1">
            <DetailRow label="Mã giao dịch" value={data.id} />
            <DetailRow label="Loại giao dịch" value={typeLabel} />
            <DetailRow label="Phương thức" value={data.method || "—"} />
            <DetailRow label="Cổng thanh toán" value={data.gateway || "—"} />
            <DetailRow label="Mô tả" value={data.description || "—"} />
            {data.transaction_code && (
              <DetailRow
                label="Mã giao dịch hệ thống"
                value={data.transaction_code}
              />
            )}
            {data.order_id && (
              <DetailRow label="Mã đơn hàng" value={data.order_id} />
            )}
            <DetailRow
              label="Thời gian tạo"
              value={formatDateTime(data.created_at)}
            />
            {data.confirmed_at && (
              <DetailRow
                label="Thời gian xác nhận"
                value={formatDateTime(data.confirmed_at)}
              />
            )}
          </div>

          {data.deposit && (
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Thông tin nạp tiền
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="PayPal Order ID"
                  value={data.deposit.paypal_order_id || "—"}
                />
                <DetailRow
                  label="PayPal Capture ID"
                  value={data.deposit.paypal_capture_id || "—"}
                />
                <DetailRow label="Nguồn" value={data.deposit.from} />
              </div>
            </div>
          )}

          {data.purchase && (
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Thông tin mua khóa học
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="Giá gốc"
                  value={formatCurrency(data.purchase.original_price)}
                />
                <DetailRow
                  label="Giá sau giảm"
                  value={formatCurrency(data.purchase.discounted_price)}
                />
                {data.purchase.discount_amount > 0 && (
                  <DetailRow
                    label="Số tiền giảm"
                    value={formatCurrency(data.purchase.discount_amount)}
                  />
                )}
                <DetailRow label="Trạng thái" value={data.purchase.status} />
                {data.course && (
                  <DetailRow
                    label="Khóa học"
                    value={
                      <Link
                        href={`/learning/${data.course.slug}`}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        {data.course.title}
                      </Link>
                    }
                  />
                )}
                {data.discount && (
                  <DetailRow
                    label="Mã giảm giá"
                    value={`${data.discount.code} (${data.discount.type})`}
                  />
                )}
                {data.refund_request && (
                  <DetailRow
                    label="Yêu cầu hoàn tiền"
                    value={
                      <span className="text-yellow-600">
                        {getStatusLabel(data.refund_request.status)} -{" "}
                        {formatCurrency(data.refund_request.amount)}
                      </span>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {data.income && (
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Thông tin thu nhập
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="Số tiền giảng viên"
                  value={formatCurrency(data.income.amount_instructor)}
                />
                <DetailRow
                  label="Số tiền nền tảng"
                  value={formatCurrency(data.income.amount_platform)}
                />
                {data.income.hold_until && (
                  <DetailRow
                    label="Giữ đến"
                    value={formatDateTime(data.income.hold_until)}
                  />
                )}
                {data.income.available_at && (
                  <DetailRow
                    label="Có sẵn từ"
                    value={formatDateTime(data.income.available_at)}
                  />
                )}
                {data.income.paid_at && (
                  <DetailRow
                    label="Đã thanh toán lúc"
                    value={formatDateTime(data.income.paid_at)}
                  />
                )}
              </div>
            </div>
          )}

          {data.refund && (
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Thông tin hoàn tiền
              </h2>
              <div className="space-y-1">
                <DetailRow label="Mã yêu cầu" value={data.refund.refund_id} />
                <DetailRow
                  label="Trạng thái"
                  value={getStatusLabel(data.refund.status)}
                />
                <DetailRow
                  label="Số tiền hoàn"
                  value={formatCurrency(data.refund.refund_amount)}
                />
                {data.refund.reason && (
                  <DetailRow label="Lý do" value={data.refund.reason} />
                )}
              </div>
            </div>
          )}

          {data.withdraw && (
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Thông tin rút tiền
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="Mã yêu cầu"
                  value={data.withdraw.withdrawal_id}
                />
                <DetailRow
                  label="Trạng thái"
                  value={
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                        data.withdraw.status
                      )}`}
                    >
                      {getStatusLabel(data.withdraw.status)}
                    </span>
                  }
                />
                <DetailRow
                  label="Số tiền"
                  value={formatCurrency(data.withdraw.amount)}
                />
                <DetailRow
                  label="Thời gian yêu cầu"
                  value={formatDateTime(data.withdraw.requested_at)}
                />
                {data.withdraw.approved_at && (
                  <DetailRow
                    label="Thời gian duyệt"
                    value={formatDateTime(data.withdraw.approved_at)}
                  />
                )}
                {data.withdraw.rejected_at && (
                  <DetailRow
                    label="Thời gian từ chối"
                    value={formatDateTime(data.withdraw.rejected_at)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
