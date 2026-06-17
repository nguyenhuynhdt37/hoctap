"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { useRouter } from "next/navigation";
import { HiArrowLeft, HiClock, HiCurrencyDollar } from "react-icons/hi";

interface TransactionDetailProps {
  data: any;
}

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

export default function AdminTransactionDetail({
  data,
}: TransactionDetailProps) {
  const router = useRouter();
  const {
    transaction: t,
    user,
    wallet,
    recent_transactions,
    purchase_items,
    discount_history,
    instructor_earnings,
    platform_wallet_logs,
  } = data || {};
  const isIncome = t?.direction === "in";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors mb-4"
          >
            <HiArrowLeft className="h-5 w-5" />
            <span className="font-medium">Quay lại</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Chi tiết giao dịch
          </h1>
          <p className="text-gray-600 mt-1">
            ID: <span className="font-mono">{t?.id}</span>
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <HiCurrencyDollar className="w-6 h-6 text-gray-700" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Số tiền</div>
            </div>
            <div
              className={`text-2xl font-bold ${
                isIncome ? "text-green-600" : "text-red-600"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(Math.abs(t?.amount || 0))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <HiClock className="w-6 h-6 text-gray-700" />
              </div>
              <div className="text-sm font-semibold text-gray-700">
                Thời gian
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDateTime(t?.created_at)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Xác nhận: {formatDateTime(t?.confirmed_at)}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="text-sm font-semibold text-gray-700 mb-1">
              Trạng thái / Loại
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  t?.status === "completed"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : t?.status === "pending"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : t?.status === "failed"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : t?.status === "refunded"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                {t?.status}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isIncome
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {t?.type}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {t?.method} • {t?.gateway}
            </p>
          </div>
        </div>

        {/* Transaction + User */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Thông tin giao dịch
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Order ID</p>
                <p className="font-mono">{t?.order_id || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Transaction code</p>
                <p className="font-mono">{t?.transaction_code || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Direction</p>
                <p className="font-semibold">{t?.direction}</p>
              </div>
              <div>
                <p className="text-gray-500">Currency</p>
                <p className="font-semibold">{t?.currency}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Mô tả</p>
                <p className="font-semibold text-gray-800">
                  {t?.description || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Người dùng</h2>
            {user ? (
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={getGoogleDriveImageUrl(user.avatar)}
                    alt={user.fullname}
                    className="h-12 w-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 text-sm font-semibold">
                      {user.fullname
                        .split(" ")
                        .map((s: string) => s[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{user.fullname}</p>
                  <p className="text-sm text-gray-600 truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">—</p>
            )}

            {wallet && (
              <div className="mt-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Ví người dùng</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Số dư</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(wallet.balance || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Khóa</p>
                    <p className="font-semibold text-gray-900">
                      {wallet.is_locked ? "Đã khóa" : "Đang hoạt động"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tổng vào</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(wallet.total_in || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tổng ra</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(wallet.total_out || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Purchase items */}
        {purchase_items && purchase_items.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Chi tiết mua hàng
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Khóa học
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Giá gốc
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Giảm
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Giá thanh toán
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchase_items.map((pi: any) => (
                    <tr key={pi.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {pi.course_snapshot?.title || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-700">
                          {formatCurrency(pi.original_price || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-red-600 font-semibold">
                          -{formatCurrency(pi.discount_amount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-900 font-semibold">
                          {formatCurrency(pi.discounted_price || 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Platform wallet logs */}
        {platform_wallet_logs && platform_wallet_logs.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Ghi log ví nền tảng
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Ghi chú
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Số tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {platform_wallet_logs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {log.note}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(log.amount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDateTime(log.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {recent_transactions && recent_transactions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Giao dịch gần đây của người dùng
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Thời gian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Loại / Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Số tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Mô tả
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent_transactions.map((rt: any) => {
                    const income = rt.direction === "in";
                    return (
                      <tr key={rt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {formatDateTime(rt.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                income
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {rt.type}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                rt.status === "completed"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : rt.status === "pending"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : rt.status === "failed"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {rt.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-semibold ${
                              income ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {income ? "+" : "-"}
                            {formatCurrency(Math.abs(rt.amount || 0))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {rt.description || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
