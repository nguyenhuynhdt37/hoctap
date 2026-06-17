"use client";

import ContextMenu from "@/components/shared/context-menu";
import { WalletTransaction } from "@/types/user/wallet";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiArrowDown, HiArrowUp } from "react-icons/hi";

interface Props {
  transactions: WalletTransaction[];
  isLoading: boolean;
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
    withdraw: "Rút tiền",
    refund: "Hoàn tiền",
    income: "Thu nhập",
  };
  return labels[type] || type;
};

const getMethodLabel = (method: string, gateway: string) => {
  if (method === "wallet" || gateway === "internal_wallet") return "Ví nội bộ";
  if (method === "paypal" || gateway === "paypal") return "PayPal";
  if (method === "momo" || gateway === "momo") return "MoMo";
  return method?.toUpperCase() || "Không rõ";
};

const isIncome = (t: WalletTransaction) => {
  if (t.direction === "in") return true;
  if (t.direction === "out") return false;
  return ["deposit", "income", "refund"].includes(t.type);
};

const statusClasses: Record<string, string> = {
  completed: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
  canceled: "bg-red-100 text-red-700 border-red-200",
};

export function TransactionsTable({
  transactions,
  isLoading,
  retryOrderId,
  onRetry,
}: Props) {
  const router = useRouter();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    transaction: WalletTransaction | null;
  } | null>(null);

  const handleContextMenu = (
    e: React.MouseEvent,
    transaction: WalletTransaction
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, transaction });
  };

  return (
    <div className="rounded-xl border border-green-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-green-100">
          <thead>
            <tr className="bg-green-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                ID giao dịch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                Loại giao dịch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                Số tiền
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                Mã giao dịch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                Order ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                Thời gian
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                Mô tả
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang tải giao dịch...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Không tìm thấy giao dịch nào phù hợp với điều kiện lọc của bạn
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const income = isIncome(t);
                const statusClass =
                  statusClasses[t.status] ||
                  "bg-gray-100 text-gray-600 border-gray-200";

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onContextMenu={(e) => handleContextMenu(e, t)}
                  >
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 cursor-pointer hover:bg-gray-200"
                        title="Click để copy ID"
                        onClick={() => navigator.clipboard.writeText(t.id)}
                      >
                        {t.id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            income
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
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
                          <div className="mt-1 text-xs text-gray-500">
                            {getMethodLabel(t.method, t.gateway)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-lg font-bold ${
                          income ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {income ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            t.status === "completed"
                              ? "bg-green-500"
                              : t.status === "pending"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                        {t.status === "pending"
                          ? "Chờ thanh toán"
                          : t.status === "completed"
                          ? "Thành công"
                          : "Đã hủy"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {t.transaction_code ? (
                        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-700">
                          {t.transaction_code}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {t.order_id ? (
                        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-700">
                          {t.order_id}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-700">
                          {formatDateTime(t.created_at)}
                        </span>
                        {t.confirmed_at && (
                          <span className="text-xs text-gray-500">
                            Xác nhận: {formatDateTime(t.confirmed_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        {t.description && (
                          <p className="text-sm text-gray-700 max-w-md">
                            {t.description}
                          </p>
                        )}
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
                              ? "Đang mở lại..."
                              : "Thanh toán lại"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
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
              onClick: () => {
                if (contextMenu.transaction) {
                  router.push(
                    `/wallets/transactions/${contextMenu.transaction.id}`
                  );
                }
                setContextMenu(null);
              },
            },
            {
              label: "Copy ID",
              onClick: () => {
                if (contextMenu.transaction) {
                  navigator.clipboard.writeText(contextMenu.transaction.id);
                }
                setContextMenu(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
