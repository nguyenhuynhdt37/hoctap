"use client";

import Pagination from "@/components/shared/pagination";
import api from "@/lib/utils/fetcher/client/axios";
import { HoldEarningsQuery, HoldEarningsResponse } from "@/types/lecturer/hold";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { HoldEarningsEmpty } from "./hold-empty";
import { HoldEarningsFilters } from "./hold-filters";
import { HoldEarningsSkeleton } from "./hold-skeleton";
import { HoldEarningsTable } from "./hold-table";

const DEFAULT_LIMIT = 10;

export default function HoldEarningsManagement() {
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
  const buildQueryParams = useCallback((): HoldEarningsQuery => {
    const params: HoldEarningsQuery = {
      page: pagination.page,
      limit: pagination.limit,
      order_by: sortBy,
      order_dir: orderDir,
    };

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    if (status) {
      params.status = status;
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

  // Fetch hold earnings data
  const { data, error, isLoading, mutate } = useSWR<HoldEarningsResponse>(
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
    }
  );

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

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
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              Giao dịch đang chờ hold
            </h1>
            <p className="text-gray-600">
              Danh sách các khoản tiền đang được hệ thống giữ và có yêu cầu hoàn
              tiền
            </p>
          </div>
        </div>

        {/* Filters */}
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
          onReset={handleResetFilters}
        />

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Không thể tải dữ liệu. Vui lòng thử lại.
          </div>
        )}

        {/* Content */}
        {isInitialLoading ? (
          <HoldEarningsSkeleton />
        ) : isEmpty ? (
          <HoldEarningsEmpty />
        ) : (
          <>
            <HoldEarningsTable
              data={data?.items || []}
              sortBy={sortBy}
              orderDir={orderDir}
              onSort={handleSort}
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
    </div>
  );
}
