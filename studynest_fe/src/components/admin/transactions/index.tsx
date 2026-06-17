"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import {
  AdminTransactionItem,
  AdminTransactionsQuery,
  AdminTransactionsResponse,
} from "@/types/admin/transaction";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  HiArrowDown,
  HiArrowUp,
  HiClock,
  HiCurrencyDollar,
  HiRefresh,
  HiSearch,
  HiSortAscending,
} from "react-icons/hi";
import useSWR from "swr";

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

const DEFAULT_LIMIT = 20;

export default function AdminTransactions() {
  const router = useRouter();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [direction, setDirection] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [gateway, setGateway] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [
    type,
    status,
    direction,
    method,
    gateway,
    dateFrom,
    dateTo,
    debouncedSearch,
    sortBy,
    orderDir,
  ]);

  const buildQuery = (): AdminTransactionsQuery => {
    const q: AdminTransactionsQuery = {
      page: pagination.page,
      limit: pagination.limit,
      sort_by: sortBy,
      order_dir: orderDir,
    };
    if (debouncedSearch) q.search = debouncedSearch.trim();
    if (type) q.type = type;
    if (status) q.status = status;
    if (direction) q.direction = direction;
    if (method) q.method = method;
    if (gateway) q.gateway = gateway;
    if (dateFrom) q.date_from = new Date(dateFrom).toISOString();
    if (dateTo) q.date_to = new Date(dateTo).toISOString();
    return q;
  };

  const query = buildQuery();
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        params.append(k, String(v));
    });
    return params.toString();
  }, [query]);

  const { data, isLoading, mutate } = useSWR<AdminTransactionsResponse>(
    `/admin/transactions?${queryString}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const totals = useMemo(() => {
    const totalIn = Number(data?.summary?.total_in || 0);
    const totalOut = Number(data?.summary?.total_out || 0);
    const totalAmount = Number(data?.summary?.total_amount || 0);
    return { totalIn, totalOut, totalAmount };
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.ceil(data.total / pagination.limit);
  }, [data, pagination.limit]);

  // Context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuItem, setMenuItem] = useState<AdminTransactionItem | null>(null);

  const openContextMenu = (e: React.MouseEvent, item: AdminTransactionItem) => {
    e.preventDefault();
    setMenuItem(item);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    const close = () => setMenuOpen(false);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener("click", close);
      document.addEventListener("contextmenu", close);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const copy = async (text?: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Giao dịch hệ thống
            </h1>
            <p className="text-gray-600">
              Danh sách các giao dịch phát sinh trong hệ thống
            </p>
          </div>
          <button
            type="button"
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <HiRefresh className="w-5 h-5" />
            Tải lại
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <HiArrowDown className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-sm font-semibold text-gray-700">
                Tổng tiền vào
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalIn)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <HiArrowUp className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-sm font-semibold text-gray-700">
                Tổng tiền ra
              </div>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.totalOut)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <HiCurrencyDollar className="w-6 h-6 text-gray-700" />
              </div>
              <div className="text-sm font-semibold text-gray-700">
                Tổng giao dịch
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(totals.totalAmount)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <HiSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo user, email, khóa học, order_id, transaction_code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Loại giao dịch</option>
              <option value="deposit">Nạp tiền</option>
              <option value="purchase">Mua khóa học</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="completed">Hoàn tất</option>
              <option value="failed">Thất bại</option>
              <option value="refunded">Hoàn tiền</option>
              <option value="canceled">Đã hủy</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Dòng tiền</option>
              <option value="in">Tiền vào</option>
              <option value="out">Tiền ra</option>
            </select>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Phương thức</option>
              <option value="wallet">Ví nội bộ</option>
              <option value="paypal">PayPal</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPAY</option>
              <option value="bank_transfer">Chuyển khoản</option>
            </select>
            <select
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Cổng thanh toán</option>
              <option value="internal_wallet">Internal Wallet</option>
              <option value="paypal">PayPal</option>
              <option value="momo">MoMo</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Từ ngày</span>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Đến ngày</span>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <HiSortAscending className="w-5 h-5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="created_at">Sắp xếp theo thời gian</option>
                <option value="amount">Sắp xếp theo số tiền</option>
              </select>
              <select
                value={orderDir}
                onChange={(e) =>
                  setOrderDir(e.target.value === "asc" ? "asc" : "desc")
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="desc">Mới nhất trước</option>
                <option value="asc">Cũ nhất trước</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Người dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Loại / Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Phương thức / Cổng
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Số tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Mã đơn / Mã giao dịch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Mô tả
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12">
                      <div className="flex items-center justify-center gap-3 text-gray-600">
                        <div className="inline-block h-6 w-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        Đang tải dữ liệu...
                      </div>
                    </td>
                  </tr>
                ) : !data || data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-600"
                    >
                      Không có giao dịch nào
                    </td>
                  </tr>
                ) : (
                  data.items.map((item: AdminTransactionItem) => {
                    const t = item.transaction;
                    const isIncome = t.direction === "in";
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-gray-50 transition-colors"
                        onContextMenu={(e) => openContextMenu(e, item)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between gap-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <HiClock className="w-4 h-4 text-gray-400" />
                              <span>{formatDateTime(t.created_at)}</span>
                            </div>
                            <button
                              type="button"
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors sm:hidden"
                              title="Thao tác"
                              onClick={(e) => {
                                const rect = (
                                  e.currentTarget as HTMLElement
                                ).getBoundingClientRect();
                                setMenuItem(item);
                                setMenuPos({
                                  x: rect.left + rect.width / 2,
                                  y: rect.bottom + 8,
                                });
                                setMenuOpen(true);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-5 h-5"
                              >
                                <path d="M10 4a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 20a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.user ? (
                            <div className="flex items-center gap-3">
                              {item.user.avatar ? (
                                <img
                                  src={getGoogleDriveImageUrl(item.user.avatar)}
                                  alt={item.user.fullname}
                                  className="h-9 w-9 rounded-full object-cover"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-green-700 text-xs font-semibold">
                                    {item.user.fullname
                                      .split(" ")
                                      .map((s) => s[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {item.user.fullname}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {item.user.email}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                isIncome
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {t.type}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                t.status === "completed"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : t.status === "pending"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : t.status === "failed"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : t.status === "canceled"
                                  ? "bg-gray-100 text-gray-600 border-gray-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">
                            <div className="font-medium">{t.method}</div>
                            <div className="text-xs text-gray-500">
                              {t.gateway}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-semibold ${
                              isIncome ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatCurrency(Math.abs(t.amount))}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-700 space-y-1">
                            <div>
                              <span className="text-gray-500">Order:</span>{" "}
                              <span className="font-mono">
                                {t.order_id ? t.order_id : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Txn:</span>{" "}
                              <span className="font-mono">
                                {t.transaction_code ? t.transaction_code : "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 line-clamp-2">
                            {t.description || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-600">
              Tổng:{" "}
              <span className="font-semibold">{data ? data.total : 0}</span>{" "}
              giao dịch
            </div>
            <div className="flex items-center gap-3">
              <select
                value={pagination.limit}
                onChange={(e) =>
                  setPagination((p) => ({
                    ...p,
                    limit: Number(e.target.value),
                    page: 1,
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.max(1, p.page - 1),
                    }))
                  }
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm text-gray-700">
                  {pagination.page} / {Math.max(1, totalPages)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(Math.max(1, totalPages), p.page + 1),
                    }))
                  }
                  disabled={pagination.page >= totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Context Menu */}
      {menuOpen && menuItem && (
        <div
          className="fixed z-50 min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg p-1"
          style={{ left: menuPos.x, top: menuPos.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50"
            onClick={() => {
              router.push(`/admin/transactions/${menuItem.transaction.id}`);
              setMenuOpen(false);
            }}
          >
            Xem chi tiết
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50"
            onClick={() => {
              copy(menuItem.transaction.id);
              setMenuOpen(false);
            }}
          >
            Sao chép Transaction ID
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50"
            onClick={() => {
              copy(menuItem.transaction.order_id);
              setMenuOpen(false);
            }}
          >
            Sao chép Order ID
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50"
            onClick={() => {
              copy(String(menuItem.transaction.amount));
              setMenuOpen(false);
            }}
          >
            Sao chép Số tiền
          </button>
        </div>
      )}
    </div>
  );
}
