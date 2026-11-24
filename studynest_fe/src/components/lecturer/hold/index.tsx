"use client";

import Pagination from "@/components/shared/pagination";
import { Alert, Button } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { HoldEarningsQuery, HoldEarningsResponse } from "@/types/lecturer/hold";
import {
  Clock,
  Coins,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "pulsoicon-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getHoldProgressInfo, HoldCardGrid } from "./hold-card-grid";
import { HoldEarningsEmpty } from "./hold-empty";
import { HoldEarningsFilters } from "./hold-filters";
import { HoldEarningsSkeleton } from "./hold-skeleton";
import { HoldEarningsTable } from "./hold-table";

const DEFAULT_LIMIT = 10;

const formatVndApprox = (vnd: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(vnd || 0)) + " đ";

export default function HoldEarningsManagement() {
  const router = useRouter();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"holding" | "freeze" | "">("");
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] =
    useState<HoldEarningsQuery["order_by"]>("hold_until");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [status, courseId, studentId, dateFrom, dateTo, sortBy, orderDir]);

  const buildQueryParams = useCallback((): HoldEarningsQuery => {
    const params: HoldEarningsQuery = {
      page: pagination.page,
      limit: pagination.limit,
      order_by: sortBy,
      order_dir: orderDir,
    };

    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (status) params.status = status;
    if (courseId) params.course_id = courseId;
    if (studentId) params.student_id = studentId;

    if (dateFrom && dateTo) {
      if (dateFrom <= dateTo) {
        params.date_from = dateFrom;
        params.date_to = dateTo;
      }
    } else if (dateFrom) {
      params.date_from = dateFrom;
    } else if (dateTo) {
      params.date_to = dateTo;
    }

    return params;
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    status,
    courseId,
    studentId,
    dateFrom,
    dateTo,
    sortBy,
    orderDir,
  ]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<HoldEarningsResponse>(
      ["/lecturer/transactions/earnings/holding", buildQueryParams()],
      async ([url, params]: [string, HoldEarningsQuery]) => {
        const response = await api.get(url, { params });
        return response.data;
      },
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 2000,
        keepPreviousData: true,
        revalidateIfStale: false,
      },
    );

  // Thống kê Bento Escrow Pulse từ dữ liệu hiện hành
  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const totalCount = data?.total ?? items.length;
    const holdingItems = items.filter((i) => i.status === "holding");
    const freezeItems = items.filter((i) => i.status === "freeze");
    const totalAmount = items.reduce(
      (sum, i) => sum + (Number(i.amount_instructor) || 0),
      0,
    );
    const holdingAmount = holdingItems.reduce(
      (sum, i) => sum + (Number(i.amount_instructor) || 0),
      0,
    );
    const freezeAmount = freezeItems.reduce(
      (sum, i) => sum + (Number(i.amount_instructor) || 0),
      0,
    );
    const holdingPct =
      totalAmount > 0 ? Math.round((holdingAmount / totalAmount) * 100) : 0;

    // Tìm mốc giải ngân gần nhất trong các khoản holding
    let nearestReleaseLabel = "Chưa có lịch giải ngân";
    let nearestReleaseAmount = 0;
    const sortedHolding = [...holdingItems]
      .filter((i) => i.hold_until)
      .sort(
        (a, b) =>
          new Date(a.hold_until).getTime() - new Date(b.hold_until).getTime(),
      );
    if (sortedHolding.length > 0) {
      const next = sortedHolding[0];
      const info = getHoldProgressInfo(
        next.created_at,
        next.hold_until,
        next.status,
      );
      nearestReleaseLabel = info.countdownLabel;
      nearestReleaseAmount = Number(next.amount_instructor) || 0;
    }

    return {
      totalCount,
      holdingCount: holdingItems.length,
      freezeCount: freezeItems.length,
      totalAmount,
      holdingAmount,
      freezeAmount,
      holdingPct,
      nearestReleaseLabel,
      nearestReleaseAmount,
    };
  }, [data]);

  const handleSort = (column: HoldEarningsQuery["order_by"]) => {
    if (sortBy === column) {
      setOrderDir(orderDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setOrderDir("asc");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setCourseId("");
    setStudentId("");
    setDateFrom("");
    setDateTo("");
    setSortBy("hold_until");
    setOrderDir("asc");
    setPagination({ page: 1, limit: DEFAULT_LIMIT });
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "" ||
    courseId !== "" ||
    studentId !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    sortBy !== "hold_until" ||
    orderDir !== "asc";

  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.ceil(data.total / pagination.limit);
  }, [data, pagination.limit]);

  const isInitialLoading = isLoading && !data;
  const isEmpty = !isInitialLoading && data && data.items.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Cloudy Vault Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/70 p-6 shadow-sm sm:p-8">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-primary/10"
            viewBox="0 0 240 240"
            fill="none"
          >
            <circle
              cx="120"
              cy="120"
              r="98"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />
            <circle cx="120" cy="120" r="66" stroke="currentColor" strokeWidth="1.2" />
            <circle
              cx="120"
              cy="120"
              r="36"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="3 5"
            />
          </svg>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-xs">
                <ShieldCheck animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lecturer Vault &amp; Escrow Ledger</span>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Kho Tạm Giữ &amp; Lịch Giải Ngân
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Theo dõi chi tiết các khoản thù lao đang trong chu kỳ bảo vệ quỹ
                (hold), tiến độ đếm ngược về ví và các khoản tạm khóa do có yêu
                cầu hoàn tiền.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface/90"
                disabled={isValidating}
                onClick={() => void mutate()}
                leftIcon={
                  <RefreshCw
                    className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
                  />
                }
              >
                Làm mới
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface/90"
                onClick={() => router.push("/lecturer/refund")}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Trạm hoàn tiền
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="rounded-full shadow-sm"
                onClick={() => router.push("/lecturer/wallets")}
                leftIcon={<Wallet className="h-4 w-4" />}
              >
                Ví giảng viên
              </Button>
            </div>
          </div>

          {/* Bento 4 chỉ số Escrow Pulse */}
          <div className="relative mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Tổng Coin đang giữ (trang)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Coins animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-primary">
                {formatVndAsCoin(stats.totalAmount)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.totalCount} khoản · ≈ {formatVndApprox(stats.totalAmount)}
              </p>
            </div>

            <div className="rounded-2xl border border-primary-pastel/80 bg-primary-light/45 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-primary">
                <span>Đang chờ giải ngân</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-primary">
                  <Clock animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                  {formatVndAsCoin(stats.holdingAmount)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface/80">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${stats.holdingPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-primary tabular-nums">
                  {stats.holdingCount} khoản
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-destructive-border/70 bg-destructive-bg/45 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-destructive-foreground">
                <span>Đang đóng băng (Freeze)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-destructive-foreground">
                  <Lock animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
                {formatVndAsCoin(stats.freezeAmount)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.freezeCount} khoản có yêu cầu hoàn tiền
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-accent-vanilla/70 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-foreground/80">
                <span>Mốc giải ngân gần nhất</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-primary">
                  <ShieldCheck animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 text-sm font-bold leading-snug text-foreground line-clamp-1">
                {stats.nearestReleaseLabel}
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {stats.nearestReleaseAmount > 0
                  ? `Dự kiến về ví: ${formatVndAsCoin(stats.nearestReleaseAmount)}`
                  : "Không có khoản chờ giải ngân"}
              </p>
            </div>
          </div>
        </section>

        {/* Bộ lọc kính mờ 2 tầng */}
        <HoldEarningsFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          courseId={courseId}
          onCourseIdChange={setCourseId}
          studentId={studentId}
          onStudentIdChange={setStudentId}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          orderDir={orderDir}
          onOrderDirChange={setOrderDir}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onReset={handleResetFilters}
        />

        {/* Lỗi */}
        {error && (
          <Alert variant="destructive">
            Không thể tải dữ liệu khoản tiền đang tạm giữ. Vui lòng thử lại.
          </Alert>
        )}

        {/* Nội dung chính */}
        {isInitialLoading ? (
          <HoldEarningsSkeleton viewMode={viewMode} />
        ) : isEmpty ? (
          <HoldEarningsEmpty
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <>
            {viewMode === "grid" ? (
              <HoldCardGrid data={data?.items || []} />
            ) : (
              <HoldEarningsTable
                data={data?.items || []}
                sortBy={sortBy}
                orderDir={orderDir}
                onSort={handleSort}
              />
            )}

            {data && data.total > 0 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={totalPages}
                totalItems={data.total}
                pageSize={pagination.limit}
                onPageChange={(newPage) =>
                  setPagination((prev) => ({ ...prev, page: newPage }))
                }
                onPageSizeChange={(newLimit) =>
                  setPagination({ page: 1, limit: newLimit })
                }
                showPageSizeSelector={true}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
