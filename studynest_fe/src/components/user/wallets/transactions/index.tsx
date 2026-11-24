"use client";

import { Alert } from "@/components/ui";
import { useCoinBalances, useCoinRate } from "@/lib/learning-hub/shop-hooks";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  WalletDatePreset,
  WalletTransaction,
  WalletTransactionsQuery,
  WalletTransactionsResponse,
  WalletTransactionSummary,
} from "@/types/user/wallet";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { CashflowHero } from "./cashflow-hero";
import {
  TransactionsFilterBar,
  type TransactionsViewMode,
} from "./filter-bar";
import { exportTransactionsCsv, resolveDatePresetRange } from "./formatters";
import { TransactionsPagination } from "./pagination";
import { TransactionDrawer } from "./transaction-drawer";
import { TransactionsTable } from "./transaction-table";
import { TransactionTimeline } from "./transaction-timeline";

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
  if (query.direction && query.direction !== "all") {
    params.set("direction", query.direction);
  }
  if (query.dateFrom) params.set("date_from", query.dateFrom);
  if (query.dateTo) params.set("date_to", query.dateTo);

  return params.toString();
};

const buildSummaryKey = (query: WalletTransactionsQuery) => {
  const params = new URLSearchParams();
  if (query.dateFrom) params.set("date_from", query.dateFrom);
  if (query.dateTo) params.set("date_to", query.dateTo);
  const qs = params.toString();
  return qs ? `/user/transaction/summary?${qs}` : "/user/transaction/summary";
};

export default function WalletTransactions({
  initialData,
  initialQuery,
  initialError,
}: Props) {
  const [filters, setFilters] = useState<WalletTransactionsQuery>({
    ...initialQuery,
    direction: initialQuery.direction ?? "all",
    datePreset: initialQuery.datePreset ?? "all",
  });
  const [searchValue, setSearchValue] = useState(initialQuery.search);
  const [viewMode, setViewMode] = useState<TransactionsViewMode>("timeline");
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [error, setError] = useState(initialError || "");
  const [success, setSuccess] = useState("");
  const [retryOrderId, setRetryOrderId] = useState<string | null>(null);

  const coins = useCoinBalances();
  const publicRateVnd = useCoinRate();
  const coinRateVnd = coins.data?.rateVnd ?? publicRateVnd;

  const queryString = buildQueryString(filters);
  const swrKey = `/user/transaction?${queryString}`;
  const summaryKey = buildSummaryKey(filters);

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
    },
  );

  const { data: summaryData, mutate: mutateSummary } =
    useSWR<WalletTransactionSummary>(
      summaryKey,
      async (url) => {
        const res = await api.get(url);
        return res.data;
      },
      {
        revalidateOnFocus: false,
        keepPreviousData: true,
      },
    );

  useEffect(() => {
    if (swrError) {
      const err = swrError as { response?: { data?: { detail?: string } } };
      setError(
        err?.response?.data?.detail ||
          "Không thể tải danh sách giao dịch. Vui lòng thử lại.",
      );
    }
  }, [swrError]);

  const updateFilters = (updates: Partial<WalletTransactionsQuery>) => {
    setError("");
    setSuccess("");
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const resetAllFilters = () => {
    setSearchValue(initialQuery.search);
    setError("");
    setSuccess("");
    setFilters({
      ...initialQuery,
      direction: "all",
      datePreset: "all",
      dateFrom: null,
      dateTo: null,
    });
  };

  const handleDatePresetChange = (preset: WalletDatePreset) => {
    const { dateFrom, dateTo } = resolveDatePresetRange(preset);
    updateFilters({
      datePreset: preset,
      dateFrom,
      dateTo,
      page: 1,
    });
  };

  const handleQuickFilter = (
    preset: "in" | "purchase" | "refund" | "pending",
  ) => {
    if (preset === "in") {
      updateFilters({
        direction: filters.direction === "in" ? "all" : "in",
        type: "all",
        status: "all",
        page: 1,
      });
    } else if (preset === "purchase") {
      updateFilters({
        type: filters.type === "purchase" ? "all" : "purchase",
        direction: "all",
        status: "all",
        page: 1,
      });
    } else if (preset === "refund") {
      updateFilters({
        type: filters.type === "refund" ? "all" : "refund",
        direction: "all",
        status: "all",
        page: 1,
      });
    } else if (preset === "pending") {
      updateFilters({
        status: filters.status === "pending" ? "all" : "pending",
        type: "all",
        direction: "all",
        page: 1,
      });
    }
  };

  const handleRetry = async (orderId?: string | null) => {
    if (!orderId) {
      setError("Không tìm thấy mã đơn hàng PayPal.");
      return;
    }

    setRetryOrderId(orderId);
    setError("");
    setSuccess("");

    try {
      const res = await api.post(`/wallets/retry_wallet_payment/${orderId}`);

      if (res.data?.approve_url) {
        window.open(res.data.approve_url, "_blank", "noopener,noreferrer");
        setSuccess(
          "Đã mở lại cổng thanh toán PayPal. Vui lòng hoàn tất để cập nhật số dư Coin.",
        );
      } else {
        setSuccess("Yêu cầu thanh toán lại đã được ghi nhận.");
      }

      await Promise.allSettled([mutate(), mutateSummary(), coins.mutate()]);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(
        detail || "Không thể khôi phục giao dịch. Vui lòng thử lại sau.",
      );
    } finally {
      setRetryOrderId(null);
    }
  };

  const transactionsData = data ?? initialData;

  const handleExportCsv = () => {
    if (!transactionsData.transactions.length) return;
    exportTransactionsCsv(transactionsData.transactions, coinRateVnd);
    setSuccess(
      `Đã xuất sao kê ${transactionsData.transactions.length} giao dịch ra tệp CSV.`,
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <CashflowHero
        summary={summaryData}
        coins={coins.data}
        rateVnd={coinRateVnd}
        totalFiltered={transactionsData.total}
        canExport={transactionsData.transactions.length > 0}
        retryOrderId={retryOrderId}
        onExportCsv={handleExportCsv}
        onQuickFilter={handleQuickFilter}
        onRetryOrder={handleRetry}
      />

      <TransactionsFilterBar
        searchValue={searchValue}
        filters={filters}
        viewMode={viewMode}
        isLoading={isLoading}
        onViewModeChange={setViewMode}
        onSearchChange={setSearchValue}
        onSearchSubmit={() =>
          updateFilters({ page: 1, search: searchValue.trim() })
        }
        onStatusChange={(status) => updateFilters({ status, page: 1 })}
        onMethodChange={(method) => updateFilters({ method, page: 1 })}
        onDirectionChange={(direction) => updateFilters({ direction, page: 1 })}
        onDatePresetChange={handleDatePresetChange}
        onTypeChange={(type) => updateFilters({ type, page: 1 })}
        onOrderChange={(orderBy, orderDir) =>
          updateFilters({ orderBy, orderDir, page: 1 })
        }
        onResetFilters={resetAllFilters}
      />

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {viewMode === "timeline" ? (
        <TransactionTimeline
          transactions={transactionsData.transactions}
          isLoading={isLoading}
          rateVnd={coinRateVnd}
          retryOrderId={retryOrderId}
          onSelectTransaction={setSelectedTx}
          onRetry={handleRetry}
          onResetFilters={resetAllFilters}
        />
      ) : (
        <TransactionsTable
          transactions={transactionsData.transactions}
          isLoading={isLoading}
          rateVnd={coinRateVnd}
          retryOrderId={retryOrderId}
          onSelectTransaction={setSelectedTx}
          onRetry={handleRetry}
        />
      )}

      <TransactionsPagination
        page={transactionsData.page}
        limit={transactionsData.limit}
        total={transactionsData.total}
        isLoading={isLoading}
        onPageChange={(page) => updateFilters({ page })}
        onLimitChange={(limit) => updateFilters({ limit, page: 1 })}
      />

      <TransactionDrawer
        transaction={selectedTx}
        rateVnd={coinRateVnd}
        retryOrderId={retryOrderId}
        onClose={() => setSelectedTx(null)}
        onRetry={handleRetry}
      />
    </div>
  );
}
