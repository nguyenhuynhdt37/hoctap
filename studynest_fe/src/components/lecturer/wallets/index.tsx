"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  LecturerTransactionsResponse,
  LecturerWallet,
} from "@/types/lecturer/wallet";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiArrowDown, HiArrowUp } from "react-icons/hi";
import useSWR from "swr";

const WALLET_ENDPOINT = "/lecturer/wallets/lecturer/wallet";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Đang cập nhật";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "Đang cập nhật";
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    deposit: "Nạp tiền",
    earning_release: "Thu nhập",
    earning_payout: "Rút tiền",
    earning_refund: "Hoàn tiền",
    withdraw_request: "Yêu cầu rút",
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

const isIncomeTransaction = ({
  direction,
  type,
}: {
  direction?: "in" | "out";
  type: string;
}) => {
  if (direction === "in") return true;
  if (direction === "out") return false;
  return (
    type === "deposit" ||
    type === "earning_release" ||
    type === "earning_refund"
  );
};

const extractAxiosError = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string };
    return data?.detail || data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

export default function LecturerWallets() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: wallet, error: walletError } = useSWR<LecturerWallet>(
    WALLET_ENDPOINT,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  };

  const { data: transactionsData, error: transactionsError } =
    useSWR<LecturerTransactionsResponse>(
      `/lecturer/transactions?${buildQuery()}`,
      async (url) => {
        const response = await api.get(url);
        return response.data;
      },
      {
        revalidateOnFocus: false,
      }
    );

  const walletStatus = wallet?.is_locked ? "Đã khóa" : "Đang hoạt động";

  const error =
    (walletError &&
      extractAxiosError(
        walletError,
        "Không thể tải thông tin ví. Vui lòng thử lại."
      )) ||
    (transactionsError &&
      extractAxiosError(
        transactionsError,
        "Không thể tải danh sách giao dịch."
      ));

  const totalPages = transactionsData
    ? Math.max(1, Math.ceil(transactionsData.total / limit))
    : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Ví của giảng viên
          </h1>
          <p className="text-sm text-gray-600">
            Quản lý số dư, trạng thái KYC và các giao dịch gần đây.
          </p>
        </div>
        <Link
          href="/lecturer/hold"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors text-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Giao dịch đang hold</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-[2fr,3fr]">
        <WalletSummaryCard
          wallet={wallet ?? null}
          walletStatus={walletStatus}
        />
      </section>

      <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Rút tiền</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/lecturer/withdraw/create"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            Tạo yêu cầu rút tiền
          </Link>
          <Link
            href="/lecturer/withdraw"
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
          >
            Lịch sử yêu cầu
          </Link>
        </div>
      </div>

      <TransactionsTable
        transactions={transactionsData?.items || []}
        page={page}
        limit={limit}
        total={transactionsData?.total || 0}
        totalPages={totalPages}
        status={status}
        type={type}
        search={search}
        isLoading={!transactionsData && !transactionsError}
        router={router}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        onTypeChange={(t) => {
          setType(t);
          setPage(1);
        }}
        onSearchChange={setSearch}
        onSearchSubmit={() => setPage(1)}
      />
    </div>
  );
}

interface WalletSummaryCardProps {
  wallet: LecturerWallet | null;
  walletStatus: string;
}

function WalletSummaryCard({ wallet, walletStatus }: WalletSummaryCardProps) {
  const isLocked = Boolean(wallet?.is_locked);
  const statusStyles = isLocked
    ? "bg-red-500/15 text-red-500 border-red-400/40"
    : "bg-white/15 text-white border-white/30";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-6 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Số dư ví
          </span>
          <p className="mt-3 text-3xl font-semibold sm:text-4xl">
            {formatCurrency(wallet?.balance)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white/90"
            >
              <path
                d="M4 8.5C4 6.567 5.567 5 7.5 5h9A3.5 3.5 0 0 1 20 8.5v7A3.5 3.5 0 0 1 16.5 19h-9A3.5 3.5 0 0 1 4 15.5v-7Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M16 12.5h1.2a1.3 1.3 0 0 0 0-2.6H16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {wallet?.currency || "VND"}
          </span>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 text-sm text-white/80 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Tổng nạp
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatCurrency(wallet?.total_in)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Tổng rút
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatCurrency(wallet?.total_out)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Trạng thái
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                {walletStatus}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isLocked ? "bg-red-500" : "bg-white"
                }`}
              />
              {isLocked ? "Ví đã khóa" : "Ví đang hoạt động"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Giao dịch gần nhất
          </p>
          <p className="mt-1 text-base font-medium text-white">
            {wallet?.last_transaction_at
              ? formatDateTime(wallet.last_transaction_at)
              : "Chưa ghi nhận giao dịch"}
          </p>
        </div>
      </div>
    </div>
  );
}

interface TransactionsTableProps {
  transactions: LecturerTransactionsResponse["items"];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  status: string;
  type: string;
  search: string;
  isLoading: boolean;
  router: ReturnType<typeof useRouter>;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onStatusChange: (status: string) => void;
  onTypeChange: (type: string) => void;
  onSearchChange: (search: string) => void;
  onSearchSubmit: () => void;
}

function TransactionsTable({
  transactions,
  page,
  limit,
  total,
  totalPages,
  status,
  type,
  search,
  isLoading,
  router,
  onPageChange,
  onLimitChange,
  onStatusChange,
  onTypeChange,
  onSearchChange,
  onSearchSubmit,
}: TransactionsTableProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Lịch sử giao dịch
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
            placeholder="Tìm kiếm..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Thành công</option>
            <option value="pending">Đang xử lý</option>
            <option value="canceled">Đã hủy</option>
          </select>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tất cả loại</option>
            <option value="deposit">Nạp tiền</option>
            <option value="income">Thu nhập</option>
            <option value="earning_release">Thu nhập</option>
            <option value="withdraw_request">Yêu cầu rút</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">
          <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2">Đang tải...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p>Chưa có giao dịch nào</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Loại
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
                {transactions.map((item) => {
                  const tx = item.transaction;
                  const isIncome = isIncomeTransaction(tx);
                  const typeLabel = getTypeLabel(tx.type);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(`/lecturer/wallets/transactions/${tx.id}`)
                      }
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              isIncome
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isIncome ? (
                              <HiArrowUp className="h-5 w-5" />
                            ) : (
                              <HiArrowDown className="h-5 w-5" />
                            )}
                          </div>
                          <div className="font-semibold text-gray-900">
                            {typeLabel}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-lg font-bold ${
                            isIncome ? "text-green-600" : "text-gray-900"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            tx.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : tx.status === "canceled"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {getStatusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">
                          {tx.description || "Không có mô tả"}
                        </p>
                        {tx.transaction_code && (
                          <p className="text-xs text-gray-500 mt-1">
                            Mã: {tx.transaction_code}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {formatDateTime(tx.created_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Hiển thị {(page - 1) * limit + 1}-
                  {Math.min(page * limit, total)} trên tổng số {total} giao dịch
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Mỗi trang</span>
                  <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onPageChange(1)}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        pageNum === page
                          ? "bg-green-600 text-white"
                          : "border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => onPageChange(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
