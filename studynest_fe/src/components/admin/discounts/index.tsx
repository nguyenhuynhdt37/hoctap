"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutGrid,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  Table2,
  Tag,
  Trash2,
  User,
} from "pulsoicon-react";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  Discount,
  DiscountsQueryParams,
  DiscountsResponse,
} from "@/types/admin/discount";
import {
  type AdminDiscountStats,
  VoucherTicketPreview,
  formatDiscountCoin,
  formatDiscountDateTime,
  getAppliesToLabel,
  getDiscountLifecycle,
} from "./discount-visuals";

const DEFAULT_LIMIT = 12;

const DISCOUNTS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: DEFAULT_LIMIT, min: 1, max: 100 },
  search: { type: "string", default: "" },
  created_role: {
    type: "string",
    default: "" as "" | "ADMIN" | "LECTURER",
    allowed: ["", "ADMIN", "LECTURER"] as const,
  },
  creator_id: { type: "string", default: "" },
  discount_type: {
    type: "string",
    default: "" as "" | "percent" | "fixed",
    allowed: ["", "percent", "fixed"] as const,
  },
  is_active: {
    type: "string",
    default: "" as "" | "true" | "false",
    allowed: ["", "true", "false"] as const,
  },
  validity: {
    type: "string",
    default: "" as "" | "expired" | "running" | "upcoming",
    allowed: ["", "expired", "running", "upcoming"] as const,
  },
  sort_by: { type: "string", default: "created_at" },
  order_dir: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

export default function DiscountsManagement() {
  const router = useRouter();
  const [layout, setLayout] = useState<"tickets" | "table">("tickets");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { values, setParam, setParams, resetParams } = useUrlQueryState(
    DISCOUNTS_QUERY_SCHEMA,
  );
  const {
    page,
    limit,
    search: debouncedSearch,
    created_role: createdRole,
    creator_id: creatorId,
    discount_type: discountType,
    is_active: isActiveParam,
    validity,
    sort_by: sortBy,
    order_dir: orderDir,
  } = values;

  const { inputValue: search, setInputValue: setSearch } =
    useDebouncedUrlSearch(debouncedSearch, (val) => setParam("search", val));

  const isActive: boolean | null =
    isActiveParam === "" ? null : isActiveParam === "true";

  const buildQueryParams = useCallback((): DiscountsQueryParams => {
    const params: DiscountsQueryParams = {
      page,
      limit,
      sort_by: sortBy,
      order_dir: orderDir,
    };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (createdRole) params.created_role = createdRole;
    if (creatorId) params.creator_id = creatorId;
    if (discountType) params.discount_type = discountType;
    if (isActive !== null) params.is_active = isActive;
    if (validity) params.validity = validity;
    return params;
  }, [
    page,
    limit,
    debouncedSearch,
    createdRole,
    creatorId,
    discountType,
    isActive,
    validity,
    sortBy,
    orderDir,
  ]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<DiscountsResponse>(
      ["/admin/discounts", buildQueryParams()],
      async ([url, params]: [string, DiscountsQueryParams]) => {
        const response = await api.get(url, { params });
        return response.data;
      },
      { revalidateOnFocus: false },
    );

  const { data: stats, mutate: mutateStats } = useSWR<AdminDiscountStats>(
    "/admin/discounts/stats",
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const creators = stats?.creators ?? [];

  const hasActiveFilter = useMemo(
    () =>
      Boolean(
        debouncedSearch ||
          createdRole ||
          creatorId ||
          discountType ||
          isActiveParam ||
          validity,
      ),
    [
      debouncedSearch,
      createdRole,
      creatorId,
      discountType,
      isActiveParam,
      validity,
    ],
  );

  const allOnPageSelected = useMemo(
    () => items.length > 0 && items.every((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleSelectAllOnPage() {
    if (allOnPageSelected) {
      const pageIdSet = new Set(items.map((item) => item.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.add(item.id));
        return Array.from(next);
      });
    }
  }

  async function handleBulkToggle(nextActive: boolean) {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await api.patch("/admin/discounts/bulk-toggle", {
        discount_ids: selectedIds,
        is_active: nextActive,
      });
      const updated = res.data?.updated ?? selectedIds.length;
      await Promise.all([mutate(), mutateStats()]);
      setSelectedIds([]);
      toast.success(
        nextActive
          ? `Đã kích hoạt ${updated} mã giảm giá`
          : `Đã tạm tắt ${updated} mã giảm giá`,
      );
    } catch {
      toast.error("Không thể cập nhật hàng loạt trạng thái mã giảm giá.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleToggleActive(discount: Discount) {
    setBusyId(discount.id);
    try {
      await api.patch(`/admin/discounts/${discount.id}/toggle`, null, {
        params: { is_active: !discount.is_active },
      });
      await Promise.all([mutate(), mutateStats()]);
      toast.success(
        !discount.is_active
          ? `Đã kích hoạt mã ${discount.discount_code}`
          : `Đã tạm tắt mã ${discount.discount_code}`,
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái mã giảm giá.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(discount: Discount) {
    if (discount.usage_count > 0) {
      toast.error("Mã đã có người sử dụng nên không thể xóa, hãy tạm tắt.");
      return;
    }
    if (!window.confirm(`Xóa vĩnh viễn mã “${discount.discount_code}”?`)) {
      return;
    }
    setBusyId(discount.id);
    try {
      await api.delete(`/admin/discounts/${discount.id}`);
      setSelectedIds((prev) => prev.filter((id) => id !== discount.id));
      await Promise.all([mutate(), mutateStats()]);
      toast.success("Đã xóa mã giảm giá");
    } catch {
      toast.error("Không thể xóa mã giảm giá này.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Editorial Hero — Cloudy Blue Pastel Sky */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-accent-vanilla/45 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/75 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-2xs">
              <Tag size={13} animated={false} />
              Mây Mây Voucher &amp; Promotion Studio
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Trung tâm Kiểm soát Mã Giảm Giá Toàn Sàn
            </h1>
            <p className="text-sm text-muted-foreground">
              Giám sát đồng thời chiến dịch Nền tảng và toàn bộ mã khuyến mãi do
              Giảng viên phát hành, bật/tắt tức thì và kiểm soát ngân sách trợ giá.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isValidating}
              onClick={() => void Promise.all([mutate(), mutateStats()])}
            >
              <RefreshCw
                size={14}
                className={isValidating ? "animate-spin" : ""}
              />
              Làm mới
            </Button>
            <Button onClick={() => router.push("/admin/discounts/create")}>
              <Plus size={16} />
              Tạo mã nền tảng
            </Button>
          </div>
        </div>

        {/* 4 Floating Glass KPIs */}
        {stats && (
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Tổng chiến dịch toàn sàn
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {stats.total} mã
              </p>
              <p className="mt-0.5 text-[11px] text-primary">
                {stats.admin_count} nền tảng · {stats.lecturer_count} giảng viên
              </p>
            </div>

            <div className="rounded-2xl border border-accent-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <GraduationCap size={13} className="text-accent-foreground" />
                Mã Giảng viên phát hành
              </p>
              <p className="mt-1 text-2xl font-bold text-accent-foreground">
                {stats.lecturer_count} mã
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {stats.lecturer_running} đang chạy · {stats.lecturer_inactive}{" "}
                tạm tắt
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/70 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Percent size={13} className="text-success-foreground" />
                Hiệu lực &amp; Lượt đổi mã
              </p>
              <p className="mt-1 text-2xl font-bold text-success-foreground">
                {stats.running} đang chạy
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {stats.total_redemptions} lượt đổi · {stats.inactive} tạm tắt
              </p>
            </div>

            <div className="rounded-2xl border border-accent-vanilla-border/90 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Coins size={13} className="text-accent-vanilla-foreground" />
                Tổng ngân sách trợ giá
              </p>
              <p className="mt-1 text-2xl font-bold text-accent-vanilla-foreground">
                {formatDiscountCoin(stats.total_discounted_amount)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {stats.history_records} giao dịch áp mã
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Filter & Source Control Toolbar */}
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] sm:p-5">
        {/* Top Row: Source Segmented Tabs + Layout Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                {
                  key: "",
                  label: "Tất cả nguồn",
                  count: stats?.total,
                  icon: Tag,
                },
                {
                  key: "LECTURER",
                  label: "Mã Giảng viên",
                  count: stats?.lecturer_count,
                  icon: GraduationCap,
                },
                {
                  key: "ADMIN",
                  label: "Mã Nền tảng",
                  count: stats?.admin_count,
                  icon: ShieldCheck,
                },
              ] as const
            ).map(({ key, label, count, icon: Icon }) => {
              const active = createdRole === key;
              return (
                <button
                  key={key || "all-source"}
                  type="button"
                  onClick={() =>
                    setParams({
                      created_role: key,
                      creator_id: key === "ADMIN" ? "" : creatorId,
                      page: 1,
                    })
                  }
                  className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
                  }`}
                >
                  <Icon size={13} animated={false} />
                  <span>{label}</span>
                  {typeof count === "number" && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-primary-light text-primary"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllOnPage}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary"
              >
                {allOnPageSelected ? (
                  <CheckSquare size={14} animated={false} className="text-primary" />
                ) : (
                  <Square size={14} animated={false} />
                )}
                {allOnPageSelected ? "Bỏ chọn trang" : "Chọn trang"}
              </button>
            )}

            {/* Ticket vs Table Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setLayout("tickets")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  layout === "tickets"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid size={14} animated={false} />
                Vé Voucher
              </button>
              <button
                type="button"
                onClick={() => setLayout("table")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  layout === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table2 size={14} animated={false} />
                Bảng
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Validity Pills */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          {(
            [
              ["", "Tất cả hiệu lực"],
              ["running", "Đang chạy"],
              ["upcoming", "Sắp bắt đầu"],
              ["expired", "Đã hết hạn"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key || "all"}
              type="button"
              onClick={() => setParams({ validity: key, page: 1 })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                validity === key
                  ? "border-primary-pastel bg-primary-light text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Third Row: Search + Lecturer Filter + Type + Status + Sort */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search
              size={15}
              animated={false}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên chiến dịch, mã voucher hoặc tên giảng viên..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <select
            aria-label="Lọc theo giảng viên tạo mã"
            value={creatorId}
            disabled={createdRole === "ADMIN"}
            onChange={(e) =>
              setParams({
                creator_id: e.target.value,
                created_role: e.target.value ? "LECTURER" : createdRole,
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50 md:col-span-3"
          >
            <option value="">Tất cả giảng viên ({creators.length})</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullname} ({c.discount_count} mã)
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc loại giảm giá"
            value={discountType}
            onChange={(e) =>
              setParams({
                discount_type: e.target.value as "" | "percent" | "fixed",
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none md:col-span-2"
          >
            <option value="">Tất cả loại giảm</option>
            <option value="percent">Giảm theo %</option>
            <option value="fixed">Giảm Coin cố định</option>
          </select>

          <select
            aria-label="Lọc trạng thái bật tắt"
            value={isActiveParam}
            onChange={(e) =>
              setParams({
                is_active: e.target.value as "" | "true" | "false",
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none md:col-span-1"
          >
            <option value="">Trạng thái</option>
            <option value="true">Đang bật</option>
            <option value="false">Đã tắt</option>
          </select>

          <div className="flex gap-2 md:col-span-2">
            <select
              aria-label="Sắp xếp"
              value={`${sortBy}:${orderDir}`}
              onChange={(e) => {
                const [sb, od] = e.target.value.split(":") as [
                  string,
                  "asc" | "desc",
                ];
                setParams({ sort_by: sb, order_dir: od, page: 1 });
              }}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="created_at:desc">Mới tạo nhất</option>
              <option value="usage_count:desc">Dùng nhiều nhất</option>
              <option value="end_at:asc">Sắp hết hạn</option>
            </select>

            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  resetParams();
                }}
              >
                Đặt lại
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Bulk Control Floating Bar */}
      {selectedIds.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-pastel bg-primary-light/85 px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <CheckSquare size={16} animated={false} />
            <span>
              Đang chọn <strong>{selectedIds.length}</strong> mã giảm giá
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void handleBulkToggle(true)}
            >
              <Eye size={14} animated={false} />
              Kích hoạt hàng loạt
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void handleBulkToggle(false)}
            >
              <EyeOff size={14} animated={false} />
              Tạm tắt hàng loạt
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được danh sách mã giảm giá.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-3xl border border-border bg-surface p-5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center">
          <p className="text-sm font-semibold text-foreground">
            Chưa có chiến dịch mã giảm giá nào phù hợp
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thử nới lỏng bộ lọc nguồn hoặc tạo ngay chiến dịch khuyến mãi mới.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/admin/discounts/create")}
          >
            <Plus size={16} />
            Tạo mã nền tảng
          </Button>
        </div>
      ) : layout === "tickets" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => {
            const isBusy = busyId === d.id;
            const isSelected = selectedIds.includes(d.id);
            return (
              <div
                key={d.id}
                className={`group flex flex-col justify-between gap-3 rounded-[1.75rem] transition-all ${
                  isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                }`}
              >
                <div
                  onClick={() => router.push(`/admin/discounts/${d.id}`)}
                  className="cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  <VoucherTicketPreview
                    name={d.name}
                    code={d.discount_code}
                    discountType={d.discount_type}
                    percentValue={d.percent_value}
                    fixedValue={d.fixed_value}
                    appliesTo={d.applies_to}
                    isActive={d.is_active}
                    isHidden={d.is_hidden}
                    startAt={d.start_at}
                    endAt={d.end_at}
                    usageCount={d.usage_count}
                    usageLimit={d.usage_limit}
                    createdRole={d.created_role}
                    creator={d.creator}
                    targetCount={d.target_count}
                    compact
                  />
                </div>

                {/* Action Strip */}
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSelect(d.id)}
                      aria-label={`Chọn mã ${d.discount_code}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary-light hover:text-primary"
                    >
                      {isSelected ? (
                        <CheckSquare
                          size={15}
                          animated={false}
                          className="text-primary"
                        />
                      ) : (
                        <Square size={15} animated={false} />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleToggleActive(d)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors ${
                        d.is_active
                          ? "bg-success-bg text-success-foreground hover:opacity-85"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.is_active ? (
                        <Eye size={13} animated={false} />
                      ) : (
                        <EyeOff size={13} animated={false} />
                      )}
                      {d.is_active ? "Đang bật" : "Đã tắt"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {d.created_role === "LECTURER" && d.creator?.id && (
                      <Link
                        href={`/admin/lecturers/${d.creator.id}`}
                        title={`Xem hồ sơ giảng viên ${d.creator.fullname}`}
                        aria-label={`Xem hồ sơ ${d.creator.fullname}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <User size={14} animated={false} />
                      </Link>
                    )}
                    <Link
                      href={`/admin/discounts/${d.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-primary hover:bg-primary-light"
                    >
                      <Eye size={13} animated={false} />
                      Chi tiết
                    </Link>
                    <Link
                      href={`/admin/discounts/${d.id}/edit`}
                      aria-label={`Sửa ${d.discount_code}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary-light hover:text-primary"
                    >
                      <Pencil size={14} animated={false} />
                    </Link>
                    <button
                      type="button"
                      disabled={isBusy || d.usage_count > 0}
                      onClick={() => void handleDelete(d)}
                      title={
                        d.usage_count > 0
                          ? "Mã đã có người sử dụng nên không thể xóa"
                          : "Xóa mã giảm giá"
                      }
                      aria-label={`Xóa ${d.discount_code}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground disabled:opacity-35"
                    >
                      <Trash2 size={14} animated={false} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <button
                    type="button"
                    onClick={toggleSelectAllOnPage}
                    aria-label="Chọn tất cả trang này"
                    className="flex items-center justify-center text-muted-foreground hover:text-primary"
                  >
                    {allOnPageSelected ? (
                      <CheckSquare
                        size={15}
                        animated={false}
                        className="text-primary"
                      />
                    ) : (
                      <Square size={15} animated={false} />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">Chiến dịch &amp; Mã</th>
                <th className="px-4 py-3.5">Nguồn / Người tạo</th>
                <th className="px-4 py-3.5">Ưu đãi</th>
                <th className="px-4 py-3.5">Phạm vi</th>
                <th className="px-4 py-3.5">Lượt dùng</th>
                <th className="px-4 py-3.5">Hiệu lực</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((d) => {
                const lc = getDiscountLifecycle(d);
                const isSelected = selectedIds.includes(d.id);
                const isBusy = busyId === d.id;
                return (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/admin/discounts/${d.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-primary-light/25 ${
                      isSelected ? "bg-primary-light/30" : ""
                    }`}
                  >
                    <td
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelect(d.id)}
                        aria-label={`Chọn mã ${d.discount_code}`}
                        className="flex items-center justify-center text-muted-foreground hover:text-primary"
                      >
                        {isSelected ? (
                          <CheckSquare
                            size={15}
                            animated={false}
                            className="text-primary"
                          />
                        ) : (
                          <Square size={15} animated={false} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground">{d.name}</p>
                      <code className="mt-0.5 inline-block rounded-md bg-primary-light px-2 py-0.5 text-xs font-bold text-primary">
                        {d.discount_code}
                      </code>
                    </td>
                    <td
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {d.created_role === "LECTURER" ? (
                        <div className="flex items-center gap-2">
                          {d.creator?.avatar ? (
                            <img
                              src={getImageUrl(d.creator.avatar)}
                              alt={d.creator.fullname}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                              {(d.creator?.fullname || "G")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            {d.creator?.id ? (
                              <Link
                                href={`/admin/lecturers/${d.creator.id}`}
                                className="block truncate text-xs font-semibold text-foreground hover:text-primary"
                              >
                                {d.creator.fullname}
                              </Link>
                            ) : (
                              <span className="block text-xs font-semibold text-foreground">
                                Giảng viên
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-foreground">
                              <GraduationCap size={10} animated={false} />
                              Giảng viên
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                          <ShieldCheck size={12} animated={false} />
                          Nền tảng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-primary">
                      {d.discount_type === "percent"
                        ? `${d.percent_value ?? 0}%`
                        : formatDiscountCoin(d.fixed_value ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <p>{getAppliesToLabel(d.applies_to)}</p>
                      {typeof d.target_count === "number" &&
                        d.target_count > 0 &&
                        d.applies_to !== "global" && (
                          <p className="text-[11px] text-primary">
                            {d.target_count}{" "}
                            {d.applies_to === "category"
                              ? "danh mục"
                              : "khóa học"}
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-foreground">
                      {d.usage_count}
                      {d.usage_limit ? ` / ${d.usage_limit}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${lc.badgeClass}`}
                      >
                        {lc.label}
                      </span>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Đến {formatDiscountDateTime(d.end_at)}
                      </p>
                    </td>
                    <td
                      className="px-4 py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleToggleActive(d)}
                        >
                          {d.is_active ? "Tắt" : "Bật"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/discounts/${d.id}/edit`)
                          }
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy || d.usage_count > 0}
                          onClick={() => void handleDelete(d)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={limit}
        itemLabel="chiến dịch"
        disabled={isValidating}
        onPageChange={(nextPage) => setParam("page", nextPage)}
        onPageSizeChange={(nextSize) =>
          setParams({ limit: nextSize, page: 1 })
        }
      />
    </main>
  );
}
