"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Cloud,
  Layers,
  Plus,
  Tag,
  Ticket,
  TrendingUp,
  Users,
} from "pulsoicon-react";
import useSWR from "swr";
import Pagination from "@/components/shared/pagination";
import { Button } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type {
  DiscountsQueryParams,
  DiscountsResponse,
} from "@/types/lecturer/discount";
import { cn } from "@/lib/utils";
import {
  ComboCouponsPanel,
  type LecturerBundleItem,
} from "./combo-coupons-panel";
import { DiscountsEmpty } from "./discounts-empty";
import { DiscountsFilters } from "./discounts-filters";
import { DiscountsSkeleton } from "./discounts-skeleton";
import { DiscountsTable } from "./discounts-table";
import { VoucherCardGrid } from "./voucher-card-grid";

const DEFAULT_LIMIT = 10;

const LECTURER_DISCOUNTS_QUERY_SCHEMA = {
  tab: {
    type: "string",
    default: "courses",
    allowed: ["courses", "combos"] as const,
  },
  view: {
    type: "string",
    default: "cards",
    allowed: ["cards", "table"] as const,
  },
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: DEFAULT_LIMIT, min: 1, max: 100 },
  search: { type: "string", default: "" as string },
  discount_type: {
    type: "string",
    default: "",
    allowed: ["", "percent", "fixed"] as const,
  },
  is_active: {
    type: "string",
    default: "",
    allowed: ["", "true", "false"] as const,
  },
  validity: {
    type: "string",
    default: "",
    allowed: ["", "expired", "running", "upcoming"] as const,
  },
  sort_by: { type: "string", default: "created_at" as string },
  order_dir: {
    type: "string",
    default: "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

export default function DiscountsManagement() {
  const router = useRouter();
  const [comboCreateSignal, setComboCreateSignal] = useState(0);

  const { values, setParam, setParams, resetParams } = useUrlQueryState(
    LECTURER_DISCOUNTS_QUERY_SCHEMA,
  );
  const spaceTab = values.tab;
  const viewMode = values.view;
  const page = values.page;
  const limit = values.limit;
  const search = values.search;
  const discountType = values.discount_type;
  const isActive: boolean | null =
    values.is_active === "true"
      ? true
      : values.is_active === "false"
        ? false
        : null;
  const validity = values.validity;
  const sortBy = values.sort_by;
  const orderDir = values.order_dir;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const buildQueryParams = useCallback((): DiscountsQueryParams => {
    const params: DiscountsQueryParams = {
      page,
      limit,
      sort_by: sortBy,
      order_dir: orderDir,
    };

    if (search.trim()) params.search = search.trim();
    if (discountType) params.discount_type = discountType;
    if (isActive !== null) params.is_active = isActive;
    if (validity) params.validity = validity;

    return params;
  }, [page, limit, search, discountType, isActive, validity, sortBy, orderDir]);

  const { data, isLoading, mutate } = useSWR<DiscountsResponse>(
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
    },
  );

  // Tải danh sách Combo của giảng viên để quản lý mã giảm giá Combo trực tiếp
  const { data: bundlesData, isLoading: bundlesLoading } = useSWR<{
    items: LecturerBundleItem[];
    total: number;
  }>(
    "/lecturer/bundles?limit=50",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/lecturer/discounts/${id}`);
      showToast.success("Đã xóa mã giảm giá thành công!");
      void mutate();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string; message?: string } } };
      showToast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Không thể xóa mã giảm giá. Vui lòng thử lại.",
      );
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await api.patch(`/lecturer/discounts/${id}/toggle?is_active=${newStatus}`);
      showToast.success(`Đã ${newStatus ? "bật" : "tắt"} mã giảm giá thành công!`);
      void mutate();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string; message?: string } } };
      showToast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Không thể thay đổi trạng thái. Vui lòng thử lại.",
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    setParam("page", newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setParam("limit", newLimit);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setParam("order_dir", orderDir === "asc" ? "desc" : "asc");
    } else {
      setParams({ sort_by: column, order_dir: "asc" });
    }
  };

  const handleResetFilters = () => {
    setSearchInput("");
    resetParams();
  };

  const items = data?.items ?? [];
  const bundles = bundlesData?.items ?? [];
  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.ceil(data.total / limit);
  }, [data, limit]);

  const activeCourseDiscounts = items.filter((d) => d.is_active).length;
  const totalUsageOnPage = items.reduce((sum, d) => sum + (d.usage_count || 0), 0);

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
        {/* ── 1. HERO XƯỞNG ƯU ĐÃI GIẢNG VIÊN (PROMOTION ATELIER) ── */}
        <section
          aria-label="Tổng quan xưởng ưu đãi giảng viên"
          className="relative isolate overflow-hidden rounded-[2rem] border border-primary-pastel/90 bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/50 p-6 shadow-[0_24px_48px_-12px_rgba(53,111,167,0.13)] sm:p-8"
        >
          <div
            aria-hidden="true"
            className="sky-drift pointer-events-none absolute -top-20 -left-16 -z-10 h-60 w-80 rounded-full bg-surface/85 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-24 -z-10 h-72 w-96 rounded-full bg-primary-pastel/45 blur-3xl"
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
                  <Tag aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Promotion Atelier · Giảng viên</span>
                </span>
                <span
                  aria-hidden="true"
                  className="stamp-down hidden items-center gap-1 rounded-full border-2 border-dashed border-accent-vanilla-foreground/40 bg-surface/85 px-3 py-0.5 text-[10px] font-extrabold tracking-[0.14em] text-accent-vanilla-foreground uppercase sm:inline-flex"
                >
                  KHÓA LẺ + COMBO
                </span>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Xưởng Mã Giảm Giá &amp; Ưu Đãi Combo
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Phát hành chiến dịch giảm giá cho từng khóa học lẻ và các gói Combo lộ trình để bứt phá doanh thu giảng dạy.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => router.push("/lecturer/discounts/create")}
                className="min-h-11 rounded-full px-5 font-bold shadow-sm"
              >
                <Plus aria-hidden="true" className="size-4" />
                <span>Tạo mã Khóa học</span>
              </Button>
              <Button
                type="button"
                variant="pastel"
                size="sm"
                onClick={() => {
                  setParam("tab", "combos", { resetPage: false });
                  setComboCreateSignal((prev) => prev + 1);
                }}
                className="min-h-11 rounded-full border border-accent-vanilla-border bg-accent-vanilla/85 px-5 font-bold text-accent-vanilla-foreground hover:bg-accent-vanilla"
              >
                <Layers aria-hidden="true" className="size-4" />
                <span>Tạo mã Combo</span>
              </Button>
            </div>
          </div>

          {/* Lưới 4 chỉ số Bento sống */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/70 pt-5 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/90 p-3.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                Tổng mã khóa học
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-foreground tabular-nums">
                <Ticket aria-hidden="true" animated={false} className="size-5 text-primary" />
                <span>{data?.total ?? 0}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-3.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold tracking-wider text-success-foreground uppercase">
                Đang kích hoạt
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-success-foreground tabular-nums">
                <TrendingUp aria-hidden="true" animated={false} className="size-5" />
                <span>{activeCourseDiscounts}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-primary-pastel/75 bg-primary-light/55 p-3.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold tracking-wider text-primary uppercase">
                Lượt dùng (trang này)
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-primary tabular-nums">
                <Users aria-hidden="true" animated={false} className="size-5" />
                <span>{totalUsageOnPage}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/55 p-3.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
                Combo của bạn
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-foreground tabular-nums">
                <Layers
                  aria-hidden="true"
                  animated={false}
                  className="size-5 text-accent-vanilla-foreground"
                />
                <span>{bundlesData?.total ?? bundles.length}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. THANH CHUYỂN KHÔNG GIAN: MÃ KHÓA HỌC ↔ MÃ COMBO ── */}
        <div
          role="tablist"
          aria-label="Không gian quản lý ưu đãi"
          className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-primary-pastel/80 bg-surface/95 p-1.5 shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={spaceTab === "courses"}
            onClick={() => setParam("tab", "courses", { resetPage: false })}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all cursor-pointer",
              spaceTab === "courses"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-primary-light/60 hover:text-primary",
            )}
          >
            <Ticket aria-hidden="true" animated={false} className="size-4" />
            <span>Mã giảm giá Khóa học</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums",
                spaceTab === "courses"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary-light text-primary",
              )}
            >
              {data?.total ?? 0}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={spaceTab === "combos"}
            onClick={() => setParam("tab", "combos", { resetPage: false })}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all cursor-pointer",
              spaceTab === "combos"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-primary-light/60 hover:text-primary",
            )}
          >
            <Layers aria-hidden="true" animated={false} className="size-4" />
            <span>Mã giảm giá Combo</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums",
                spaceTab === "combos"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-accent-vanilla text-accent-vanilla-foreground",
              )}
            >
              {bundlesData?.total ?? bundles.length}
            </span>
          </button>
        </div>

        {/* ── 3. NỘI DUNG TỪNG KHÔNG GIAN ── */}
        {spaceTab === "courses" ? (
          <div className="space-y-5">
            <DiscountsFilters
              search={searchInput}
              onSearchChange={setSearchInput}
              discountType={discountType}
              onDiscountTypeChange={(val) => setParam("discount_type", val)}
              isActive={isActive}
              onIsActiveChange={(val) =>
                setParam(
                  "is_active",
                  val === null ? "" : val ? "true" : "false",
                )
              }
              validity={validity}
              onValidityChange={(val) => setParam("validity", val)}
              sortBy={sortBy}
              onSortByChange={(val) => setParam("sort_by", val)}
              orderDir={orderDir}
              onOrderDirChange={(val) => setParam("order_dir", val)}
              onReset={handleResetFilters}
              viewMode={viewMode}
              onViewModeChange={(mode) =>
                setParam("view", mode, { resetPage: false })
              }
            />

            {isInitialLoading ? (
              <DiscountsSkeleton />
            ) : isEmpty ? (
              <DiscountsEmpty />
            ) : (
              <>
                {viewMode === "cards" ? (
                  <VoucherCardGrid
                    data={items}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                  />
                ) : (
                  <DiscountsTable
                    data={items}
                    sortBy={sortBy}
                    orderDir={orderDir}
                    onSort={handleSort}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                  />
                )}

                {data && data.total > 0 && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={data.total}
                    pageSize={limit}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handleLimitChange}
                    showPageSizeSelector={true}
                    pageSizeOptions={[5, 10, 20, 50]}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <ComboCouponsPanel
            bundles={bundles}
            bundlesLoading={bundlesLoading}
            openCreateSignal={comboCreateSignal}
          />
        )}
      </div>
    </main>
  );
}
