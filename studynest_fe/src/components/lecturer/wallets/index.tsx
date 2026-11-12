"use client";

import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import {
  LecturerTransactionsResponse,
  LecturerWallet,
} from "@/types/lecturer/wallet";
import { isAxiosError } from "axios";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  History,
  PlusCircle,
  Search,
  Wallet as WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Ví của giảng viên
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Quản lý số dư, trạng thái KYC và các giao dịch gần đây.
          </p>
        </div>
        <Link
          href="/lecturer/hold"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover transition-colors text-sm shadow-soft-xs self-start sm:self-auto"
        >
          <Clock className="w-4 h-4" />
          <span>Giao dịch đang hold</span>
        </Link>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <section className="grid gap-6 md:grid-cols-[2fr,3fr]">
        <WalletSummaryCard
          wallet={wallet ?? null}
          walletStatus={walletStatus}
        />
      </section>

      <Card variant="surface" className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Rút tiền</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/withdraw/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover font-semibold text-sm transition-colors shadow-soft-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo yêu cầu rút tiền</span>
          </Link>
          <Link
            href="/lecturer/withdraw"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-surface rounded-xl text-foreground hover:bg-background font-semibold text-sm transition-colors"
          >
            <History className="w-4 h-4 text-muted-foreground" />
            <span>Lịch sử yêu cầu</span>
          </Link>
        </div>
      </Card>

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
    ? "bg-destructive-bg text-destructive-foreground border-destructive-border"
    : "bg-white/15 text-white border-white/25";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary-pastel/40 bg-gradient-to-br from-primary via-[#2D5F94] to-[#234C78] p-6 text-white shadow-soft-md">
      <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/75">
            Số dư ví
          </span>
          <p className="mt-2 text-3xl font-semibold sm:text-4xl tracking-tight">
            {formatCurrency(wallet?.balance)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur border border-white/15">
            <WalletIcon className="h-6 w-6 text-white/95" />
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {wallet?.currency || "VND"}
          </span>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 text-sm text-white/85 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Tổng nạp
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatCurrency(wallet?.total_in)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Tổng rút
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatCurrency(wallet?.total_out)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">
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
                  isLocked ? "bg-destructive-foreground" : "bg-white"
                }`}
              />
              {isLocked ? "Ví đã khóa" : "Ví đang hoạt động"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-white/70">
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
    <Card variant="surface" className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Lịch sử giao dịch
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
              placeholder="Tìm kiếm..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border bg-surface text-foreground placeholder:text-muted-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3.5 py-2 text-sm border border-border bg-surface text-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Thành công</option>
            <option value="pending">Đang xử lý</option>
            <option value="canceled">Đã hủy</option>
          </select>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            className="px-3.5 py-2 text-sm border border-border bg-surface text-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
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
        <div className="space-y-3 py-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<WalletIcon className="h-7 w-7" />}
          title="Chưa có giao dịch nào"
          description="Các giao dịch phát sinh trong ví của bạn sẽ hiển thị tại đây."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-background">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Số tiền
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mô tả
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {transactions.map((item) => {
                  const tx = item.transaction;
                  const isIncome = isIncomeTransaction(tx);
                  const typeLabel = getTypeLabel(tx.type);
                  const badgeVariant =
                    tx.status === "completed"
                      ? "success"
                      : tx.status === "canceled"
                      ? "destructive"
                      : "warning";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-background/80 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/lecturer/wallets/transactions/${tx.id}`)
                      }
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                              isIncome
                                ? "bg-success-bg text-success-foreground border-success-border/70"
                                : "bg-background text-muted-foreground border-border"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4" />
                            )}
                          </div>
                          <div className="font-semibold text-sm text-foreground">
                            {typeLabel}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-base font-bold tabular-nums ${
                            isIncome
                              ? "text-success-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={badgeVariant} size="sm" dot>
                          {getStatusLabel(tx.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground">
                          {tx.description || "Không có mô tả"}
                        </p>
                        {tx.transaction_code && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Mã: {tx.transaction_code}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-muted-foreground">
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
            <div className="mt-5 pt-4 border-t border-border space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Hiển thị {(page - 1) * limit + 1}-
                  {Math.min(page * limit, total)} trên tổng số {total} giao dịch
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Mỗi trang
                  </span>
                  <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-border bg-surface text-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onPageChange(1)}
                  disabled={page === 1}
                  className="p-2 border border-border bg-surface text-foreground rounded-xl hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Trang đầu"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 border border-border bg-surface text-foreground rounded-xl hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
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
                      type="button"
                      onClick={() => onPageChange(pageNum)}
                      className={`min-w-[36px] px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                        pageNum === page
                          ? "bg-primary text-primary-foreground shadow-soft-xs"
                          : "border border-border bg-surface text-foreground hover:bg-background"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-border bg-surface text-foreground rounded-xl hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(totalPages)}
                  disabled={page === totalPages}
                  className="p-2 border border-border bg-surface text-foreground rounded-xl hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Trang cuối"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
