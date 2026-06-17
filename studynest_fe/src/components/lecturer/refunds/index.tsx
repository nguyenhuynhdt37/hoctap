"use client";

import ContextMenu from "@/components/shared/context-menu";
import Pagination from "@/components/shared/pagination";
import api from "@/lib/utils/fetcher/client/axios";
import {
  LecturerRefundRequestsQuery,
  LecturerRefundRequestsResponse,
} from "@/types/lecturer/refund";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { RefundRequestsEmpty } from "./refund-empty";
import { RefundRequestsFilters } from "./refund-filters";
import { RefundRequestsSkeleton } from "./refund-skeleton";
import { RefundRequestsTable } from "./refund-table";

const DEFAULT_LIMIT = 10;

export default function LecturerRefundRequests() {
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
  }, [status, courseId, studentId, dateFrom, dateTo, sortBy, orderDir]);

  // Build query parameters
  const buildQueryParams = useCallback((): LecturerRefundRequestsQuery => {
    const params: LecturerRefundRequestsQuery = {
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
    dateFrom,
    dateTo,
    sortBy,
    orderDir,
  ]);

  // Fetch refund requests data
  const { data, error, isLoading, mutate } =
    useSWR<LecturerRefundRequestsResponse>(
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
      }
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
    []
  );

  const handleCloseContextMenu = () => setContextMenu(null);

  const handleViewDetail = useCallback(() => {
    if (!contextMenu) return;
    window.location.href = `/lecturer/refunds/${contextMenu.refundId}`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                Yêu cầu hoàn tiền
              </h1>
              <p className="text-gray-600">
                Quản lý và xử lý các yêu cầu hoàn tiền từ học viên
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
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
        />

        {/* Content */}
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
