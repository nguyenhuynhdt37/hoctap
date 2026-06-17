"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import {
  AdminRefundRequestsQuery,
  AdminRefundRequestsResponse,
} from "@/types/admin/refund";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { RefundRequestsEmpty } from "./refund-empty";
import { RefundRequestsFilters } from "./refund-filters";
import { RefundRequestsSkeleton } from "./refund-skeleton";
import { RefundRequestsTable } from "./refund-table";

const DEFAULT_LIMIT = 10;

export default function AdminRefundRequests() {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] =
    useState<AdminRefundRequestsQuery["refund_status"]>("");
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] =
    useState<AdminRefundRequestsQuery["order_by"]>("created_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    refundId: string;
  } | null>(null);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [
    status,
    courseId,
    studentId,
    instructorId,
    dateFrom,
    dateTo,
    sortBy,
    orderDir,
  ]);

  // Build query parameters
  const buildQueryParams = useCallback((): AdminRefundRequestsQuery => {
    const params: AdminRefundRequestsQuery = {
      page: pagination.page,
      limit: pagination.limit,
      order_by: sortBy,
      order_dir: orderDir,
    };

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    if (status) {
      params.refund_status = status;
    }

    if (courseId) {
      params.course_id = courseId;
    }

    if (studentId) {
      params.student_id = studentId;
    }

    if (instructorId) {
      params.instructor_id = instructorId;
    }

    // Chỉ thêm date range nếu dateFrom <= dateTo
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
    instructorId,
    dateFrom,
    dateTo,
    sortBy,
    orderDir,
  ]);

  // Fetch refund requests data
  const { data, error, isLoading, mutate } =
    useSWR<AdminRefundRequestsResponse>(
      ["/admin/refunds/requests", buildQueryParams()],
      async ([url, params]: [string, AdminRefundRequestsQuery]) => {
        const response = await api.get(url, { params });
        return response.data;
      },
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 2000,
        keepPreviousData: true,
        revalidateIfStale: false,
      }
    );

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleSort = (column: AdminRefundRequestsQuery["order_by"]) => {
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
    setInstructorId("");
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
    []
  );

  const handleCloseContextMenu = () => setContextMenu(null);

  const handleViewDetail = useCallback(() => {
    if (!contextMenu) return;
    window.location.href = `/admin/refunds/${contextMenu.refundId}`;
    handleCloseContextMenu();
  }, [contextMenu]);

  const handleCopyId = useCallback(() => {
    if (!contextMenu) return;
    navigator.clipboard.writeText(contextMenu.refundId);
    handleCloseContextMenu();
  }, [contextMenu]);

  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.ceil(data.total / pagination.limit);
  }, [data, pagination.limit]);

  const isInitialLoading = isLoading && !data;
  const isEmpty = !isInitialLoading && data && data.items.length === 0;
  const isValidating = isLoading && data !== undefined;

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Yêu cầu hoàn tiền
              </h1>
              <p className="text-gray-600 mt-1">
                {data?.total || 0} yêu cầu hoàn tiền
              </p>
            </div>
            {/* Loading indicator khi đang fetch data mới */}
            {isValidating && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-green-700 font-medium">
                  Đang tải...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 mb-6">
          <RefundRequestsFilters
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            courseId={courseId}
            onCourseIdChange={setCourseId}
            studentId={studentId}
            onStudentIdChange={setStudentId}
            instructorId={instructorId}
            onInstructorIdChange={setInstructorId}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            orderDir={orderDir}
            onOrderDirChange={setOrderDir}
            onReset={handleResetFilters}
            isValidating={isValidating}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden relative">
          {/* Overlay mờ khi đang fetch - không block UI */}
          {isValidating && data && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 pointer-events-none flex items-start justify-center pt-8 transition-opacity duration-200">
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Đang cập nhật...</span>
              </div>
            </div>
          )}

          {isInitialLoading ? (
            <RefundRequestsSkeleton />
          ) : isEmpty ? (
            <RefundRequestsEmpty />
          ) : (
            <>
              <RefundRequestsTable
                data={data?.items || []}
                sortBy={sortBy}
                orderDir={orderDir}
                onSort={handleSort}
                onContextMenu={handleRowContextMenu}
              />
              {/* Pagination */}
              {data && data.total > 0 && totalPages > 1 && (
                <div className="px-6 py-4 border-t-2 border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{" "}
                    {Math.min(pagination.page * pagination.limit, data.total)}{" "}
                    trong {data.total} yêu cầu
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1 || isValidating}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
                    >
                      Trước
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            onClick={() =>
                              setPagination((prev) => ({ ...prev, page: p }))
                            }
                            disabled={isValidating}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              p === pagination.page
                                ? "bg-green-600 text-white"
                                : "border-2 border-gray-300 hover:bg-gray-50"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(totalPages, prev.page + 1),
                        }))
                      }
                      disabled={pagination.page === totalPages || isValidating}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
                    >
                      Sau
                    </button>
                    <select
                      value={pagination.limit}
                      onChange={(e) =>
                        handleLimitChange(Number(e.target.value))
                      }
                      disabled={isValidating}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <option value={5}>5 / trang</option>
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                      <option value={50}>50 / trang</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {contextMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={handleCloseContextMenu}
            items={[
              { label: "Xem chi tiết", onClick: handleViewDetail },
              { label: "Copy ID", onClick: handleCopyId },
            ]}
          />,
          document.body
        )}
    </div>
  );
}
