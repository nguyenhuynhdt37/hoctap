"use client";

import ContextMenu from "@/components/shared/context-menu";
import { PlatformWalletOverview } from "@/types/admin/wallet";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiArrowDown,
  HiArrowUp,
  HiClock,
  HiCurrencyDollar,
  HiEye,
  HiTag,
} from "react-icons/hi";

interface AdminWalletsProps {
  data: PlatformWalletOverview;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const getHistoryTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    deposit: "Nạp tiền",
    withdraw: "Rút tiền",
    fee: "Phí nền tảng",
    refund: "Hoàn tiền",
    transfer: "Chuyển khoản",
  };
  return labels[type] || type;
};

const getHistoryTypeColor = (type: string, amount: number) => {
  if (amount > 0) {
    return "text-green-600 bg-green-50 border-green-200";
  }
  if (amount < 0) {
    return "text-red-600 bg-red-50 border-red-200";
  }
  return "text-gray-600 bg-gray-50 border-gray-200";
};

export default function AdminWallets({ data }: AdminWalletsProps) {
  const router = useRouter();
  const { wallet, recent_history } = data;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuHistoryId, setMenuHistoryId] = useState<string | null>(null);
  const [menuHistoryTxn, setMenuHistoryTxn] = useState<string | null>(null);
  const openContextMenu = (
    e: React.MouseEvent,
    historyId: string,
    relatedTxn?: string | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuHistoryId(historyId);
    setMenuHistoryTxn(relatedTxn || null);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quản lý ví nền tảng
        </h1>
        <p className="text-gray-600">
          Tổng quan về ví nền tảng và lịch sử giao dịch
        </p>
      </div>

      {/* Wallet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HiCurrencyDollar className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Số dư hiện tại</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(wallet.balance)}
            </p>
          </div>
        </div>

        {/* Total In */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HiArrowDown className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Tổng tiền vào</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(wallet.total_in)}
            </p>
          </div>
        </div>

        {/* Total Out */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <HiArrowUp className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Tổng tiền ra</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(wallet.total_out)}
            </p>
          </div>
        </div>

        {/* Platform Fee Total */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <HiTag className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Tổng phí nền tảng</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCurrency(wallet.platform_fee_total)}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Holding Amount */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <HiClock className="h-5 w-5 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">
              Số tiền đang giữ
            </p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(wallet.holding_amount)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Số tiền đang được giữ trong các giao dịch chưa hoàn tất
          </p>
        </div>

        {/* Last Updated */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <HiClock className="h-5 w-5 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">
              Cập nhật lần cuối
            </p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {formatDateTime(wallet.updated_at)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Thời gian cập nhật thông tin ví gần nhất
          </p>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Lịch sử giao dịch gần đây
            </h2>
            <p className="text-sm text-gray-600 mt-1">Top 5 giao dịch mới nhất</p>
          </div>
          <button
            onClick={() => router.push("/admin/wallets/transactions")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm flex items-center gap-2"
          >
            <HiEye className="h-4 w-4" />
            Xem tất cả giao dịch
          </button>
        </div>

        {recent_history.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <HiClock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Chưa có lịch sử giao dịch</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Số tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Ghi chú
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Mã giao dịch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent_history.map((history) => (
                  <tr
                    key={history.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(`/admin/wallets/transactions/${history.id}`)
                    }
                    onContextMenu={(e) =>
                      openContextMenu(e, history.id, history.related_transaction_id)
                    }
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHistoryTypeColor(
                          history.type,
                          history.amount
                        )}`}
                      >
                        {getHistoryTypeLabel(history.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {history.amount > 0 ? (
                          <HiArrowDown className="h-4 w-4 text-green-600" />
                        ) : history.amount < 0 ? (
                          <HiArrowUp className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span
                          className={`font-semibold ${
                            history.amount > 0
                              ? "text-green-600"
                              : history.amount < 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {history.amount > 0 ? "+" : ""}
                          {formatCurrency(Math.abs(history.amount))}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {history.note || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {history.related_transaction_id ? (
                        <span className="text-xs font-mono text-gray-600">
                          {history.related_transaction_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(history.created_at)}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/wallets/transactions/${history.id}`);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <HiEye className="h-4 w-4" />
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {menuOpen && menuHistoryId && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Xem chi tiết",
              onClick: () => {
                router.push(`/admin/wallets/transactions/${menuHistoryId}`);
                setMenuOpen(false);
              },
            },
            ...(menuHistoryTxn
              ? [
                  {
                    label: "Sao chép Transaction ID",
                    onClick: () => {
                      navigator.clipboard.writeText(menuHistoryTxn as string);
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
            {
              label: "Sao chép History ID",
              onClick: () => {
                navigator.clipboard.writeText(menuHistoryId as string);
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
