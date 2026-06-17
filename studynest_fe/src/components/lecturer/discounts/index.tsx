"use client";

import Pagination from "@/components/shared/pagination";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  DiscountsQueryParams,
  DiscountsResponse,
} from "@/types/lecturer/discount";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HiPlus } from "react-icons/hi";
import useSWR from "swr";
import { DiscountsEmpty } from "./discounts-empty";
import { DiscountsFilters } from "./discounts-filters";
import { DiscountsSkeleton } from "./discounts-skeleton";
import { DiscountsTable } from "./discounts-table";

const DEFAULT_LIMIT = 10;

export default function DiscountsManagement() {
  const router = useRouter();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "">(
    ""
  );
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [validity, setValidity] = useState<
    "expired" | "running" | "upcoming" | ""
  >("");
  const [sortBy, setSortBy] = useState("created_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");

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
  }, [discountType, isActive, validity, sortBy, orderDir]);

  // Build query parameters
  const buildQueryParams = useCallback((): DiscountsQueryParams => {
    const params: DiscountsQueryParams = {
      page: pagination.page,
      limit: pagination.limit,
      sort_by: sortBy,
      order_dir: orderDir,
    };

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    if (discountType) {
      params.discount_type = discountType;
    }

    if (isActive !== null) {
      params.is_active = isActive;
    }

    if (validity) {
      params.validity = validity as "expired" | "running" | "upcoming";
    }

    return params;
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    discountType,
    isActive,
    validity,
    sortBy,
    orderDir,
  ]);

  // Fetch discounts data
  const { data, error, isLoading, mutate } = useSWR<DiscountsResponse>(
    ["/lecturer/discounts", buildQueryParams()],
    async ([url, params]: [string, DiscountsQueryParams]) => {
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

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/lecturer/discounts/${id}`);
      showToast.success("Đã xóa mã giảm giá thành công!");
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Không thể xóa mã giảm giá. Vui lòng thử lại.";
      showToast.error(errorMessage);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await api.patch(
        `/lecturer/discounts/${id}/toggle?is_active=${newStatus}`
      );
      showToast.success(
        `Đã ${newStatus ? "bật" : "tắt"} mã giảm giá thành công!`
      );
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Không thể thay đổi trạng thái. Vui lòng thử lại.";
      showToast.error(errorMessage);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleSort = (column: string) => {
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
    setDiscountType("");
    setIsActive(null);
    setValidity("");
    setSortBy("created_at");
    setOrderDir("desc");
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                Quản lý mã giảm giá
              </h1>
              <p className="text-gray-600">
                Tạo và quản lý các mã giảm giá để thu hút học viên
              </p>
            </div>
            <button
              onClick={() => router.push("/lecturer/discounts/create")}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <HiPlus className="h-5 w-5" />
              <span>Tạo mã giảm giá</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <DiscountsFilters
          search={search}
          onSearchChange={setSearch}
          discountType={discountType}
          onDiscountTypeChange={setDiscountType}
          isActive={isActive}
          onIsActiveChange={setIsActive}
          validity={validity}
          onValidityChange={setValidity}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          orderDir={orderDir}
          onOrderDirChange={setOrderDir}
          onReset={handleResetFilters}
        />

        {/* Content */}
        {isInitialLoading ? (
          <DiscountsSkeleton />
        ) : isEmpty ? (
          <DiscountsEmpty />
        ) : (
          <>
            <DiscountsTable
              data={data?.items || []}
              sortBy={sortBy}
              orderDir={orderDir}
              onSort={handleSort}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
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
