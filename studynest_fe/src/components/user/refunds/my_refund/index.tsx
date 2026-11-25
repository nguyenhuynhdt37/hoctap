"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Coins, FileText, ShieldCheck } from "pulsoicon-react";
import { Alert, EmptyState } from "@/components/ui";
import { useDebouncedUrlSearch, useUrlQueryState } from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  RefundRequestsQuery,
  RefundRequestsResponse,
} from "@/types/user/refund";
import { formatRefundCoinNumber } from "../shared/refund-status";
import { RefundStudioShell } from "../shared/refund-studio-shell";
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
  if (query.refund_status !== "all") params.set("refund_status", query.refund_status);
  if (query.course_id) params.set("course_id", query.course_id);
  if (query.instructor_id) params.set("instructor_id", query.instructor_id);
  if (query.date_from) params.set("date_from", query.date_from);
  if (query.date_to) params.set("date_to", query.date_to);

  return params.toString();
};

const MY_REFUNDS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 10, min: 1, max: 100 },
  search: { type: "string", default: "" as string, trim: true },
  refund_status: { type: "string", default: "all" as string },
  course_id: { type: "string", default: "" as string },
  instructor_id: { type: "string", default: "" as string },
  date_from: { type: "string", default: "" as string },
  date_to: { type: "string", default: "" as string },
  order_by: {
    type: "string",
    default: "created_at" as RefundRequestsQuery["order_by"],
    allowed: ["created_at", "refund_amount", "refund_status"] as const,
  },
  order_dir: {
    type: "string",
    default: "desc" as RefundRequestsQuery["order_dir"],
    allowed: ["asc", "desc"] as const,
  },
} as const;

export default function MyRefundRequests({
  initialData = defaultData,
  initialError = null,
}: MyRefundRequestsProps) {
  const { values, setParam, setParams, resetParams } = useUrlQueryState(
    MY_REFUNDS_QUERY_SCHEMA,
  );
  const {
    inputValue: searchValue,
    setInputValue: setSearchValue,
    commitNow: commitSearchNow,
  } = useDebouncedUrlSearch(values.search, (val) => setParam("search", val));

  const filters = useMemo<RefundRequestsQuery>(
    () => ({
      page: values.page,
      limit: values.limit,
      search: values.search,
      refund_status: values.refund_status,
      course_id: values.course_id,
      instructor_id: values.instructor_id,
      date_from: values.date_from,
      date_to: values.date_to,
      order_by: values.order_by,
      order_dir: values.order_dir,
    }),
    [values],
  );

  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const [data, setData] = useState<RefundRequestsResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(`/users/refunds/my-requests?${queryString}`);
        setData(response.data);
      } catch (err: unknown) {
        const maybeErr = err as { response?: { data?: { detail?: string; message?: string } } };
        const errorMsg =
          maybeErr?.response?.data?.detail ||
          maybeErr?.response?.data?.message ||
          "Không thể tải danh sách yêu cầu hoàn Coin. Vui lòng thử lại.";
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [queryString]);

  const handleSearch = () => {
    commitSearchNow(searchValue.trim());
  };

  const handlePageChange = (page: number) => {
    setParam("page", page);
  };

  const handleLimitChange = (limit: number) => {
    setParam("limit", limit);
  };

  const handleStatusChange = (status: RefundRequestsQuery["refund_status"]) => {
    setParam("refund_status", status);
  };

  const handleOrderChange = (
    orderBy: RefundRequestsQuery["order_by"],
    orderDir: RefundRequestsQuery["order_dir"],
  ) => {
    setParams({
      order_by: orderBy,
      order_dir: orderDir,
    });
  };

  const handleResetFilters = () => {
    setSearchValue("");
    resetParams();
  };

  const items = data?.items || [];
  const totalRefundedCoin = items
    .filter((r) => r.refund_status === "refunded" || r.refund_status === "admin_approved")
    .reduce((sum, r) => sum + (r.refund_amount || 0), 0);
  const pendingCount = items.filter(
    (r) => r.refund_status === "requested" || r.refund_status === "instructor_approved",
  ).length;

  return (
    <RefundStudioShell
      activeTab="requests"
      eyebrow="Cloud Shield · Hồ sơ hoàn Coin"
      title="Theo dõi yêu cầu hoàn Coin của tôi"
      description="Kiểm soát minh bạch tiến độ xét duyệt của giảng viên và Kho Bạc Mây Mây trên từng hồ sơ."
      tone="blue"
      heroRight={
        <div
          aria-hidden="true"
          className="stamp-down hidden items-center gap-1.5 rounded-full border-2 border-dashed border-primary/40 bg-surface/85 px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.14em] text-primary uppercase sm:inline-flex"
        >
          <ShieldCheck animated={false} className="size-3.5" />
          <span>SỔ THEO DÕI MINH BẠCH</span>
        </div>
      }
      heroFooter={
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-surface/90 p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Tổng hồ sơ đã gửi
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">
              {data?.total ?? 0}
              <span className="font-sans text-xs font-semibold text-muted-foreground"> hồ sơ</span>
            </p>
          </div>

          <div className="rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/50 p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
              Đang chờ xét duyệt
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">
              {pendingCount}
              <span className="font-sans text-xs font-semibold text-muted-foreground"> yêu cầu</span>
            </p>
          </div>

          <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-bold tracking-wider text-success-foreground uppercase">
              Coin đã bảo toàn (trang này)
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-success-foreground tabular-nums">
              <Coins aria-hidden="true" animated={false} className="size-5" />
              <span>+{formatRefundCoinNumber(totalRefundedCoin)} Coin</span>
            </p>
          </div>
        </div>
      }
    >
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

      {error && <Alert variant="destructive">{error}</Alert>}

      <RefundRequestsTable requests={items} isLoading={isLoading} />

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
        <div className="rounded-[24px] border border-border bg-surface p-8 shadow-xs">
          <EmptyState
            icon={<FileText />}
            title="Chưa có yêu cầu hoàn Coin nào"
            description="Bạn chưa gửi yêu cầu hoàn tiền nào hoặc không có hồ sơ khớp với bộ lọc hiện tại."
            action={
              <Link
                href="/refunds/refundable"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <span>Xem khóa học đủ điều kiện hoàn</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          />
        </div>
      )}
    </RefundStudioShell>
  );
}
