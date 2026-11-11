"use client";

import { Alert } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import {
  WalletTransactionsQuery,
  WalletTransactionsResponse,
} from "@/types/user/wallet";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HiArrowLeft, HiClock } from "react-icons/hi";
import useSWR from "swr";
import { TransactionsFilterBar } from "./filter-bar";
import { TransactionsPagination } from "./pagination";
import { TransactionsTable } from "./transaction-table";

interface Props {
  initialData: WalletTransactionsResponse;
  initialQuery: WalletTransactionsQuery;
  initialError: string | null;
}

const buildQueryString = (query: WalletTransactionsQuery) => {
  const params = new URLSearchParams();
  params.set("page", query.page.toString());
  params.set("limit", query.limit.toString());
  params.set("order_by", query.orderBy);
  params.set("order_dir", query.orderDir);

  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.status !== "all") params.set("status", query.status);
  if (query.type !== "all") params.set("type", query.type);
  if (query.method !== "all") params.set("method", query.method);
  if (query.dateFrom) params.set("date_from", query.dateFrom);
  if (query.dateTo) params.set("date_to", query.dateTo);

  return params.toString();
};

export default function WalletTransactions({
  initialData,
  initialQuery,
  initialError,
}: Props) {
  const [filters, setFilters] = useState(initialQuery);
  const [searchValue, setSearchValue] = useState(initialQuery.search);
  const [error, setError] = useState(initialError || "");
  const [success, setSuccess] = useState("");
  const [retryOrderId, setRetryOrderId] = useState<string | null>(null);

  const queryString = buildQueryString(filters);
  const swrKey = `/user/transaction?${queryString}`;

  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<WalletTransactionsResponse>(
    swrKey,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (swrError) {
      const err = swrError as any;
      setError(
        err?.response?.data?.detail ||
          "Không thể tải danh sách giao dịch. Vui lòng thử lại"
      );
    }
  }, [swrError]);

  const updateFilters = (updates: Partial<WalletTransactionsQuery>) => {
    setError("");
    setSuccess("");
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleRetry = async (orderId?: string | null) => {
    if (!orderId) {
      setError("Không tìm thấy mã giao dịch PayPal");
      return;
    }

    setRetryOrderId(orderId);
    setError("");
    setSuccess("");

    try {
      const res = await api.post(`/wallets/retry_wallet_payment/${orderId}`);

      if (res.data?.approve_url) {
        window.open(res.data.approve_url, "_blank", "noopener,noreferrer");
        setSuccess("Đã mở lại PayPal. Vui lòng hoàn tất thanh toán để cập nhật số dư ví");
      } else {
        setSuccess("Yêu cầu thanh toán lại đã được ghi nhận");
      }

      await mutate();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Không thể khôi phục giao dịch. Vui lòng thử lại sau"
      );
    } finally {
      setRetryOrderId(null);
    }
  };

  const transactionsData = data ?? initialData;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <HiClock className="h-4 w-4" />
            <span>Sổ cái tài chính</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl mt-1">
            Lịch sử giao dịch
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Theo dõi chi tiết mọi biến động số dư, lọc theo trạng thái và hỗ trợ thanh toán lại
            cho các giao dịch PayPal đang chờ xử lý.
          </p>
        </div>

        <Link
          href="/wallets"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-all duration-200 hover:border-primary-pastel hover:bg-primary-light hover:text-primary shadow-2xs"
        >
          <HiArrowLeft className="h-4 w-4" />
          <span>Quay lại Ví</span>
        </Link>
      </div>

      <TransactionsFilterBar
        searchValue={searchValue}
        filters={filters}
        isLoading={isLoading}
        onSearchChange={setSearchValue}
        onSearchSubmit={() =>
          updateFilters({ page: 1, search: searchValue.trim() })
        }
        onStatusChange={(status) => updateFilters({ status, page: 1 })}
        onMethodChange={(method) => updateFilters({ method, page: 1 })}
        onTypeChange={(type) => updateFilters({ type, page: 1 })}
        onOrderChange={(orderBy, orderDir) =>
          updateFilters({ orderBy, orderDir, page: 1 })
        }
        onResetFilters={() => {
          setSearchValue(initialQuery.search);
          setFilters({ ...initialQuery });
        }}
      />

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <TransactionsTable
        transactions={transactionsData.transactions}
        isLoading={isLoading}
        retryOrderId={retryOrderId}
        onRetry={handleRetry}
      />

      <TransactionsPagination
        page={transactionsData.page}
        limit={transactionsData.limit}
        total={transactionsData.total}
        isLoading={isLoading}
        onPageChange={(page) => updateFilters({ page })}
        onLimitChange={(limit) => updateFilters({ limit, page: 1 })}
      />
    </div>
  );
}
