"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Clock,
  Cloud,
  Coins,
  FileText,
  ShieldCheck,
} from "pulsoicon-react";
import useSWR from "swr";
import ContextMenu from "@/components/shared/context-menu";
import Pagination from "@/components/shared/pagination";
import { Button } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  LecturerRefundRequestItem,
  LecturerRefundRequestsQuery,
  LecturerRefundRequestsResponse,
} from "@/types/lecturer/refund";
import { QuickReviewModal } from "./quick-review-modal";
import { RefundCaseGrid } from "./refund-case-grid";
import { RefundRequestsEmpty } from "./refund-empty";
import { RefundRequestsFilters } from "./refund-filters";
import { RefundRequestsSkeleton } from "./refund-skeleton";
import { RefundRequestsTable } from "./refund-table";

const DEFAULT_LIMIT = 10;

export default function LecturerRefundRequests() {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [reviewTarget, setReviewTarget] = useState<{
    item: LecturerRefundRequestItem;
    action: "approve" | "reject";
  } | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] =
    useState<LecturerRefundRequestsQuery["refund_status"]>("");
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] =
    useState<LecturerRefundRequestsQuery["order_by"]>("created_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    refundId: string;
  } | null>(null);

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

  const buildQueryParams = useCallback((): LecturerRefundRequestsQuery => {
    const params: LecturerRefundRequestsQuery = {
      page: pagination.page,
      limit: pagination.limit,
      order_by: sortBy,
      order_dir: orderDir,
    };

    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (status) params.refund_status = status;
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

  const { data, isLoading, mutate } = useSWR<LecturerRefundRequestsResponse>(
    ["/lecturer/refunds/requests", buildQueryParams()],
    async ([url, params]: [string, LecturerRefundRequestsQuery]) => {
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

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleSort = (column: LecturerRefundRequestsQuery["order_by"]) => {
    if (sortBy === column) {
      setOrderDir(orderDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setOrderDir("desc");
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
    setSortBy("created_at");
    setOrderDir("desc");
    setPagination({ page: 1, limit: DEFAULT_LIMIT });
  };

  const handleRowContextMenu = useCallback(
    (event: React.MouseEvent, refundId: string) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, refundId });
    },
    [],
  );

  const handleCloseContextMenu = () => setContextMenu(null);

  const handleViewDetail = useCallback(() => {
    if (!contextMenu) return;
    window.location.href = `/lecturer/refunds/${contextMenu.refundId}`;
    handleCloseContextMenu();
  }, [contextMenu]);

  const handleCopyId = useCallback(() => {
    if (!contextMenu) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(contextMenu.refundId).catch(() => undefined);
    }
    handleCloseContextMenu();
  }, [contextMenu]);

  const items = data?.items ?? [];
  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.ceil(data.total / pagination.limit);
  }, [data, pagination.limit]);

  const pendingItems = useMemo(
    () => items.filter((item) => item.status === "requested"),
    [items],
  );
  const pendingCoinSum = useMemo(
    () => pendingItems.reduce((sum, item) => sum + (item.refund_amount || 0), 0),
    [pendingItems],
  );
  const resolvedCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status === "refunded" ||
          item.status === "admin_approved" ||
          item.status === "instructor_approved",
      ).length,
    [items],
  );

  const isInitialLoading = isLoading && !data;
  const isEmpty = !isInitialLoading && data && items.length === 0;

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-20 pt-6">
      {/* Dải nền pastel sáng loang nhẹ */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[30rem] bg-gradient-to-b from-primary-light/55 via-surface-muted/40 to-transparent"
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* ── 1. HERO TRẠM XỬ LÝ HOÀN TIỀN (RESOLUTION DESK) ── */}
        <section
          aria-label="Tổng quan trạm xử lý hoàn tiền giảng viên"
          className="relative isolate overflow-hidden rounded-[2rem] border border-primary-pastel/90 bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/50 p-6 shadow-[0_24px_48px_-12px_rgba(53,111,167,0.13)] sm:p-8"
        >
          <div
            aria-hidden="true"
            className="sky-drift pointer-events-none absolute -top-20 -left-16 -z-10 h-60 w-80 rounded-full bg-surface/85 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-24 -z-10 h-72 w-96 rounded-full bg-accent-vanilla/50 blur-3xl"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 760 220"
            fill="none"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-55"
          >
            <path
              d="M-20 185 C 140 115, 280 220, 440 135 C 570 70, 670 135, 780 48"
              stroke="var(--color-primary-pastel)"
              strokeWidth="1.6"
            />
            <path
              d="M-20 202 C 150 132, 290 232, 455 150 C 585 88, 680 150, 780 68"
              stroke="var(--color-accent-vanilla-border)"
              strokeWidth="1.2"
              strokeDasharray="4 6"
            />
          </svg>
          <Cloud
            aria-hidden="true"
            animated={false}
            strokeWidth={0.65}
            className="pointer-events-none absolute -right-8 -bottom-12 -z-10 size-52 -rotate-6 text-surface/75"
          />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                  <ShieldCheck aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Resolution Desk · Giảng viên</span>
                </span>
                <span
                  aria-hidden="true"
                  className="stamp-down hidden items-center gap-1 rounded-full border-2 border-dashed border-primary/40 bg-surface/85 px-3 py-0.5 text-[10px] font-extrabold tracking-[0.14em] text-primary uppercase sm:inline-flex"
                >
                  ĐỐI SOÁT MINH BẠCH
                </span>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Trạm Xử Lý Hoàn Tiền &amp; Đối Soát Học Viên
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Xem nhanh lý do, đánh giá tác động thù lao tạm giữ và phê duyệt hoặc phản hồi học viên ngay tại chỗ.
              </p>
            </div>

            {pendingItems.length > 0 && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() =>
                  setReviewTarget({ item: pendingItems[0], action: "approve" })
                }
                className="min-h-11 shrink-0 rounded-full px-5 font-bold shadow-sm"
              >
                <Clock aria-hidden="true" className="size-4" />
                <span>Xử lý ngay ({pendingItems.length} hồ sơ chờ)</span>
              </Button>
            )}
          </div>

          {/* 4 ô Bento tương tác */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/70 pt-5 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setStatus(status === "requested" ? "" : "requested")}
              className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/65 p-3.5 text-left transition-all hover:bg-accent-vanilla cursor-pointer"
            >
              <p className="text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
                Cần bạn phản hồi
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-foreground tabular-nums">
                <Clock aria-hidden="true" animated={false} className="size-5 text-accent-vanilla-foreground" />
                <span>{pendingItems.length}</span>
              </p>
            </button>

            <div className="rounded-2xl border border-primary-pastel/75 bg-primary-light/55 p-3.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold tracking-wider text-primary uppercase">
                Coin chờ đối soát
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-bold text-primary tabular-nums sm:text-2xl">
                <Coins aria-hidden="true" animated={false} className="size-5 text-accent-vanilla-foreground" />
                <span>{formatVndAsCoin(pendingCoinSum)}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-3.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold tracking-wider text-success-foreground uppercase">
                Đã duyệt / Hoàn (trang)
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-success-foreground tabular-nums">
                <CheckCircle2 aria-hidden="true" animated={false} className="size-5" />
                <span>{resolvedCount}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/90 p-3.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                Tổng hồ sơ
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-foreground tabular-nums">
                <FileText aria-hidden="true" animated={false} className="size-5 text-primary" />
                <span>{data?.total ?? 0}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. THANH LỌC KÍNH MỜ 2 TẦNG ── */}
        <RefundRequestsFilters
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
          onReset={handleResetFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* ── 3. DANH SÁCH HỒ SƠ (THẺ HỒ SƠ HOẶC BẢNG) ── */}
        {isInitialLoading ? (
          <RefundRequestsSkeleton />
        ) : isEmpty ? (
          <RefundRequestsEmpty />
        ) : (
          <>
            {viewMode === "cards" ? (
              <RefundCaseGrid
                data={items}
                onQuickReview={(item, action = "approve") =>
                  setReviewTarget({ item, action })
                }
                onContextMenu={handleRowContextMenu}
              />
            ) : (
              <RefundRequestsTable
                data={items}
                sortBy={sortBy}
                orderDir={orderDir}
                onSort={handleSort}
                onContextMenu={handleRowContextMenu}
              />
            )}

            {data && data.total > 0 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={totalPages}
                totalItems={data.total}
                pageSize={pagination.limit}
                onPageChange={handlePageChange}
                onPageSizeChange={handleLimitChange}
                showPageSizeSelector={true}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            )}
          </>
        )}
      </div>

      {/* Modal Xét Duyệt Nhanh Tại Chỗ */}
      <QuickReviewModal
        item={reviewTarget?.item ?? null}
        initialAction={reviewTarget?.action}
        onClose={() => setReviewTarget(null)}
        onSuccess={async () => {
          await mutate();
        }}
      />

      {/* Context Menu chuột phải */}
      {contextMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={handleCloseContextMenu}
            items={[
              {
                label: "Xem chi tiết hồ sơ",
                onClick: handleViewDetail,
              },
              {
                label: "Sao chép mã hồ sơ",
                onClick: handleCopyId,
              },
            ]}
          />,
          document.body,
        )}
    </main>
  );
}
