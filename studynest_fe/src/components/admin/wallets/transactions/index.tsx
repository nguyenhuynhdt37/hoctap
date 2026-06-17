"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HiClock, HiRefresh, HiSearch, HiSortAscending } from "react-icons/hi";
import useSWR from "swr";

type PlatformWalletHistoryItem = {
  id: string;
  type: "in" | "out" | "hold" | "release" | "fee" | "refund" | string;
  note: string | null;
  amount: number;
  wallet_id: string;
  created_at: string;
  related_transaction_id?: string | null;
};

type PlatformWalletHistoryResponse = {
  total: number;
  page: number;
  limit: number;
  items: PlatformWalletHistoryItem[];
};

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

export default function PlatformWalletHistory() {
  const router = useRouter();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<string>("");
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
  }, [type, dateFrom, dateTo, debouncedSearch, sortBy, orderDir]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
    params.set("sort_by", sortBy);
    params.set("order_dir", orderDir);
    if (debouncedSearch) params.set("search", debouncedSearch.trim());
    if (type) params.set("type", type);
    if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("date_to", new Date(dateTo).toISOString());
    return params.toString();
  }, [
    pagination.page,
    pagination.limit,
    sortBy,
    orderDir,
    debouncedSearch,
    type,
    dateFrom,
    dateTo,
  ]);

  const { data, isLoading, mutate } = useSWR<PlatformWalletHistoryResponse>(
    `/admin/platform-wallet/history?${query}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

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
  const [menuItem, setMenuItem] = useState<PlatformWalletHistoryItem | null>(
    null
  );

  const openContextMenu = (
    e: React.MouseEvent,
    item: PlatformWalletHistoryItem
  ) => {
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
              Lịch sử ví hệ thống
            </h1>
            <p className="text-gray-600">
              Tất cả biến động số dư của ví nền tảng
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

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <HiSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo ghi chú..."
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
              <option value="">Loại biến động</option>
              <option value="in">Tiền vào</option>
              <option value="out">Tiền ra</option>
              <option value="hold">Giữ tiền</option>
              <option value="release">Giải phóng</option>
              <option value="fee">Phí nền tảng</option>
              <option value="refund">Hoàn tiền</option>
            </select>
            <div className="flex items-center gap-2">
              <HiSortAscending className="w-5 h-5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="created_at">Theo thời gian</option>
                <option value="amount">Theo số tiền</option>
                <option value="type">Theo loại</option>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
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
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Ghi chú
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Số tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Liên quan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12">
                      <div className="flex items-center justify-center gap-3 text-gray-600">
                        <div className="inline-block h-6 w-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        Đang tải dữ liệu...
                      </div>
                    </td>
                  </tr>
                ) : !data || data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-600"
                    >
                      Không có lịch sử nào
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => {
                    const isIncome = item.type === "in";
                    const isOut = item.type === "out";
                    const color =
                      item.type === "fee"
                        ? "bg-gray-50 text-gray-700 border-gray-200"
                        : item.type === "hold"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : item.type === "release"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : isIncome
                        ? "bg-green-50 text-green-700 border-green-200"
                        : isOut
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-gray-50 text-gray-700 border-gray-200";
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                        onContextMenu={(e) => openContextMenu(e, item)}
                    onDoubleClick={() =>
                      router.push(`/admin/wallets/transactions/${item.id}`)
                    }
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between gap-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <HiClock className="w-4 h-4 text-gray-400" />
                              <span>{formatDateTime(item.created_at)}</span>
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
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 line-clamp-2">
                            {item.note || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-semibold ${
                              isIncome
                                ? "text-green-600"
                                : isOut
                                ? "text-red-600"
                                : "text-gray-800"
                            }`}
                          >
                            {isIncome ? "+" : isOut ? "-" : ""}
                            {formatCurrency(Math.abs(item.amount))}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-700 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Txn:</span>
                              <span className="font-mono">
                                {item.related_transaction_id
                                  ? item.related_transaction_id
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">History:</span>
                              <span className="font-mono">{item.id}</span>
                            </div>
                          </div>
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
              lịch sử
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
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Xem chi tiết",
              onClick: () => {
                router.push(`/admin/wallets/transactions/${menuItem.id}`);
                setMenuOpen(false);
              },
            },
            ...(menuItem.related_transaction_id
              ? [
                  {
                    label: "Sao chép Transaction ID",
                    onClick: () => {
                      copy(menuItem.related_transaction_id);
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
            {
              label: "Sao chép History ID",
              onClick: () => {
                copy(menuItem.id);
                setMenuOpen(false);
              },
            },
            {
              label: "Sao chép Số tiền",
              onClick: () => {
                copy(String(menuItem.amount));
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
