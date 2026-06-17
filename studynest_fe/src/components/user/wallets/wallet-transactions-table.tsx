import { WalletTransaction } from "@/types/user/wallet";
import Link from "next/link";
import { HiArrowDown, HiArrowUp } from "react-icons/hi";

interface Props {
  transactions: WalletTransaction[];
  retryOrderId?: string | null;
  onRetry?: (orderId?: string | null) => void;
}

const formatCurrency = (val?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val ?? 0);

const formatDateTime = (val?: string | null) => {
  if (!val) return "Đang cập nhật";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "Đang cập nhật";
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    deposit: "Nạp tiền",
    purchase: "Mua khóa học",
    withdraw: "Rút tiền",
    refund: "Hoàn tiền",
    income: "Thu nhập",
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    completed: "Thành công",
    canceled: "Đã hủy",
    pending: "Đang xử lý",
  };
  return labels[status] || status;
};

const isIncome = (t: WalletTransaction) => {
  if (t.direction === "in") return true;
  if (t.direction === "out") return false;
  return ["deposit", "income", "refund"].includes(t.type);
};

export function WalletTransactionsTable({
  transactions,
  retryOrderId,
  onRetry,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Giao dịch gần đây</h2>
        <Link
          href="/wallets/transactions"
          className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-50"
        >
          Xem tất cả
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                Loại giao dịch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                Số tiền
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                Mô tả
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                Thời gian
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Chưa có giao dịch nào
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const income = isIncome(t);
                const statusColors: Record<string, string> = {
                  completed: "bg-green-100 text-green-700",
                  canceled: "bg-red-100 text-red-700",
                  pending: "bg-yellow-100 text-yellow-700",
                };

                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            income
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {income ? (
                            <HiArrowUp className="h-5 w-5" />
                          ) : (
                            <HiArrowDown className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {getTypeLabel(t.type)}
                          </div>
                          {t.status === "pending" && (
                            <span className="mt-1 inline-block rounded-full border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                              Chờ thanh toán
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-lg font-bold ${
                          income ? "text-green-600" : "text-gray-900"
                        }`}
                      >
                        {income ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          statusColors[t.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700">
                          {t.description || "Không có mô tả"}
                        </p>
                        {t.status === "pending" && onRetry && t.order_id && (
                          <button
                            onClick={() => onRetry(t.order_id)}
                            disabled={retryOrderId === t.order_id}
                            className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="text-green-700"
                            >
                              <path
                                d="M20 4v6h-6M20 10a8 8 0 1 1-2.343-5.657L20 6"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {retryOrderId === t.order_id
                              ? "Đang mở lại PayPal..."
                              : "Thanh toán lại"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600">
                        {formatDateTime(t.created_at)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
