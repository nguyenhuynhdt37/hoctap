"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  RefundRequestsQuery,
  RefundRequestsResponse,
} from "@/types/user/refund";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HiArrowRight, HiExclamationCircle } from "react-icons/hi";
import { RefundRequestsFilterBar } from "./filter-bar";
import { RefundRequestsPagination } from "./pagination";
import { RefundRequestsTable } from "./refund-requests-table";

const defaultQuery: RefundRequestsQuery = {
  page: 1,
  limit: 10,
  search: "",
  refund_status: "all",
  course_id: "",
  instructor_id: "",
  date_from: "",
  date_to: "",
  order_by: "created_at",
  order_dir: "desc",
};

const defaultData: RefundRequestsResponse = {
  page: 1,
  limit: 10,
  total: 0,
  items: [],
};

interface MyRefundRequestsProps {
  initialData?: RefundRequestsResponse;
  initialQuery?: RefundRequestsQuery;
  initialError?: string | null;
}

const buildQueryString = (query: RefundRequestsQuery) => {
  const params = new URLSearchParams();
  params.set("page", query.page.toString());
  params.set("limit", query.limit.toString());
  params.set("order_by", query.order_by);
  params.set("order_dir", query.order_dir);

  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.refund_status !== "all")
    params.set("refund_status", query.refund_status);
  if (query.course_id) params.set("course_id", query.course_id);
  if (query.instructor_id) params.set("instructor_id", query.instructor_id);
  if (query.date_from) params.set("date_from", query.date_from);
  if (query.date_to) params.set("date_to", query.date_to);

  return params.toString();
};

export default function MyRefundRequests({
  initialData = defaultData,
  initialQuery = defaultQuery,
  initialError = null,
}: MyRefundRequestsProps) {
  const [filters, setFilters] = useState<RefundRequestsQuery>(initialQuery);
  const [searchValue, setSearchValue] = useState("");
  const [data, setData] = useState<RefundRequestsResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const queryString = buildQueryString(filters);
        const response = await api.get(
          `/users/refunds/my-requests?${queryString}`
        );
        setData(response.data);
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Không thể tải danh sách yêu cầu hoàn tiền. Vui lòng thử lại.";
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, page: 1, search: searchValue.trim() }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleStatusChange = (status: RefundRequestsQuery["refund_status"]) => {
    setFilters((prev) => ({ ...prev, refund_status: status, page: 1 }));
  };

  const handleOrderChange = (
    orderBy: RefundRequestsQuery["order_by"],
    orderDir: RefundRequestsQuery["order_dir"]
  ) => {
    setFilters((prev) => ({
      ...prev,
      order_by: orderBy,
      order_dir: orderDir,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchValue("");
    setFilters({ ...defaultQuery });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Danh sách yêu cầu hoàn tiền
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Theo dõi tất cả yêu cầu hoàn tiền của bạn. Lọc và tìm kiếm dễ
              dàng.
            </p>
          </div>
          <Link
            href="/refunds/refundable"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
          >
            <span>Khóa học có thể hoàn tiền</span>
            <HiArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <RefundRequestsFilterBar
        searchValue={searchValue}
        filters={filters}
        isLoading={isLoading}
        onSearchChange={setSearchValue}
        onSearchSubmit={handleSearch}
        onStatusChange={handleStatusChange}
        onOrderChange={handleOrderChange}
        onResetFilters={handleResetFilters}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <RefundRequestsTable requests={data?.items || []} isLoading={isLoading} />

      {data && data.total > 0 && (
        <RefundRequestsPagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      {!isLoading && data && data.total === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <HiExclamationCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Không có yêu cầu hoàn tiền nào
          </h3>
          <p className="text-gray-600">
            Hiện tại bạn chưa có yêu cầu hoàn tiền nào.
          </p>
        </div>
      )}
    </div>
  );
}
