"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  TransactionsListResponse,
  TransactionStatus,
} from "@/types/admin/statistics";
import { useState } from "react";
import useSWR from "swr";
import { HiSearch, HiChevronLeft, HiChevronRight } from "react-icons/hi";

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          Thành công
        </span>
      );
    case "pending":
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
          Đang xử lý
        </span>
      );
    case "refunded":
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          Hoàn tiền
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          {status}
        </span>
      );
  }
};

export default function RevenueTransactions() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState<TransactionStatus | "all">("all");

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("size", size.toString());
    if (status !== "all") params.set("status", status);
    return params.toString();
  };

  const { data, isLoading } = useSWR<TransactionsListResponse>(
    `/admin/statistics/revenue/transactions?${buildQuery()}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const transactions = data?.items || [];
  const totalPages = data?.pages ?? 1;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-900">Danh sách giao dịch</h3>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Thành công</option>
            <option value="pending">Đang xử lý</option>
            <option value="refunded">Hoàn tiền</option>
          </select>
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={10}>10/trang</option>
            <option value={20}>20/trang</option>
            <option value={50}>50/trang</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Không có giao dịch nào
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Người dùng
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Khóa học
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Số tiền
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Cổng
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {tx.user_name}
                        </p>
                        <p className="text-gray-500 text-xs">{tx.user_email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-900 text-sm truncate max-w-[200px]">
                        {tx.course_title || (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(tx.amount)}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-600 text-sm">
                        {tx.gateway || "N/A"}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-600 text-sm">
                        {formatDateTime(tx.created_at)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Trang {page} / {totalPages} · Tổng {data?.total ?? 0} giao dịch
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2)
                      pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === page
                          ? "bg-green-600 text-white"
                          : "border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
