"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Download,
  Eye,
  LayoutGrid,
  RefreshCw,
  RotateCcw,
  Search,
  Table2,
} from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  AdminRefundRequestsQuery,
  AdminRefundRequestsResponse,
} from "@/types/admin/refund";
import {
  type AdminRefundStats,
  REFUND_STATUS_ORDER,
  exportRefundRequestsCsv,
  formatRefundCoin,
  formatRefundDateTime,
  getRefundStatusMeta,
} from "./refund-visuals";

const DEFAULT_LIMIT = 12;

const REFUNDS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: DEFAULT_LIMIT, min: 1, max: 100 },
  search: { type: "string", default: "" },
  refund_status: {
    type: "string",
    default: "" as NonNullable<AdminRefundRequestsQuery["refund_status"]>,
    allowed: [
      "",
      "requested",
      "instructor_approved",
      "instructor_rejected",
      "admin_approved",
      "admin_rejected",
      "refunded",
    ] as const,
  },
  course_id: { type: "string", default: "" },
  student_id: { type: "string", default: "" },
  instructor_id: { type: "string", default: "" },
  date_from: { type: "string", default: "" },
  date_to: { type: "string", default: "" },
  order_by: {
    type: "string",
    default: "created_at" as NonNullable<AdminRefundRequestsQuery["order_by"]>,
    allowed: ["created_at", "refund_amount", "status"] as const,
  },
  order_dir: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

export default function AdminRefundRequests() {
  const router = useRouter();
  const [layout, setLayout] = useState<"cases" | "table">("cases");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    refundId: string;
  } | null>(null);

  const { values, setParam, setParams, resetParams } =
    useUrlQueryState(REFUNDS_QUERY_SCHEMA);
  const {
    page,
    limit,
    search: debouncedSearch,
    refund_status: status,
    course_id: courseId,
    student_id: studentId,
    instructor_id: instructorId,
    date_from: dateFrom,
    date_to: dateTo,
    order_by: sortBy,
    order_dir: orderDir,
  } = values;

  const { inputValue: search, setInputValue: setSearch } =
    useDebouncedUrlSearch(debouncedSearch, (val) => setParam("search", val));

  const buildQueryParams = useCallback((): AdminRefundRequestsQuery => {
    const params: AdminRefundRequestsQuery = {
      page,
      limit,
      order_by: sortBy,
      order_dir: orderDir,
    };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (status) params.refund_status = status;
    if (courseId) params.course_id = courseId;
    if (studentId) params.student_id = studentId;
    if (instructorId) params.instructor_id = instructorId;
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
    page,
    limit,
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

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<AdminRefundRequestsResponse>(
      ["/admin/refunds/requests", buildQueryParams()],
      async ([url, params]: [string, AdminRefundRequestsQuery]) => {
        const res = await api.get(url, { params });
        return res.data;
      },
      { revalidateOnFocus: false },
    );

  const { data: stats, mutate: mutateStats } = useSWR<AdminRefundStats>(
    "/admin/refunds/stats",
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [contextMenu]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const hasActiveFilter = useMemo(
    () =>
      Boolean(
        debouncedSearch ||
          status ||
          courseId ||
          studentId ||
          instructorId ||
          dateFrom ||
          dateTo,
      ),
    [
      debouncedSearch,
      status,
      courseId,
      studentId,
      instructorId,
      dateFrom,
      dateTo,
    ],
  );

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Editorial Hero — Cloudy Blue Pastel Sky */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-secondary-light/40 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
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
              <RotateCcw size={13} animated={false} />
              Mây Mây Refund Resolution Desk
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Trung tâm Xử lý &amp; Phân xử Hoàn tiền
            </h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi toàn bộ quy trình hoàn tiền giữa Học viên, Giảng viên và Admin — đối soát Escrow minh bạch và xử lý nhanh 1 chạm.
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
            <Button
              size="sm"
              disabled={items.length === 0}
              onClick={() => {
                exportRefundRequestsCsv(items);
                toast.success(`Đã xuất ${items.length} hồ sơ ra file CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* 4 Floating Glass KPIs */}
        {stats && (
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Tổng hồ sơ hoàn tiền
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {stats.total} yêu cầu
              </p>
              <p className="mt-0.5 text-[11px] text-primary">
                {stats.refunded_count} đã hoàn về ví học viên
              </p>
            </div>

            <div className="rounded-2xl border border-warning-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <AlertTriangle size={13} className="text-warning-foreground" />
                Cần Admin phân xử
              </p>
              <p className="mt-1 text-2xl font-bold text-warning-foreground">
                {stats.needs_admin_action} hồ sơ
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Chờ duyệt &amp; GV từ chối cần xem xét
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/70 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CheckCircle2 size={13} className="text-success-foreground" />
                Đã phê duyệt / Hoàn
              </p>
              <p className="mt-1 text-2xl font-bold text-success-foreground">
                {stats.approved_total} hồ sơ
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {stats.rejected_count} bị từ chối ở cấp Admin
              </p>
            </div>

            <div className="rounded-2xl border border-secondary-pastel/90 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Coins size={13} className="text-secondary-foreground" />
                Tổng giá trị hoàn
              </p>
              <p className="mt-1 text-2xl font-bold text-secondary-foreground">
                {formatRefundCoin(stats.total_amount)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Tổng số Coin yêu cầu hoàn trả
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Pipeline Status Pills + Filters */}
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setParams({ refund_status: "", page: 1 })}
              className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                status === ""
                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
              }`}
            >
              Tất cả ({stats?.total ?? total})
            </button>
            {REFUND_STATUS_ORDER.map((st) => {
              const meta = getRefundStatusMeta(st);
              const active = status === st;
              const cnt = stats?.by_status?.[st]?.count ?? 0;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setParams({ refund_status: st, page: 1 })}
                  className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : `${meta.badgeClass} opacity-85 hover:opacity-100`
                  }`}
                >
                  <span>{meta.shortLabel}</span>
                  <span className="rounded-full bg-surface/85 px-1.5 py-0.2 text-[10px] font-bold text-foreground">
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setLayout("cases")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                layout === "cases"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} animated={false} />
              Thẻ Hồ sơ
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search
              size={15}
              animated={false}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên học viên, khóa học, lý do hoàn tiền..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <input
            type="date"
            aria-label="Từ ngày"
            value={dateFrom}
            onChange={(e) => setParams({ date_from: e.target.value, page: 1 })}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none md:col-span-2"
          />

          <input
            type="date"
            aria-label="Đến ngày"
            value={dateTo}
            onChange={(e) => setParams({ date_to: e.target.value, page: 1 })}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none md:col-span-2"
          />

          <div className="flex gap-2 md:col-span-3">
            <select
              aria-label="Sắp xếp"
              value={`${sortBy}:${orderDir}`}
              onChange={(e) => {
                const [ob, od] = e.target.value.split(":") as [
                  "created_at" | "refund_amount" | "status",
                  "asc" | "desc",
                ];
                setParams({ order_by: ob, order_dir: od, page: 1 });
              }}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="created_at:desc">Mới gửi nhất</option>
              <option value="created_at:asc">Cũ nhất trước</option>
              <option value="refund_amount:desc">Số tiền cao nhất</option>
              <option value="refund_amount:asc">Số tiền thấp nhất</option>
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

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được danh sách yêu cầu hoàn tiền.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-3xl border border-border bg-surface p-5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center text-sm text-muted-foreground">
          Không có hồ sơ hoàn tiền nào khớp với bộ lọc hiện tại.
        </div>
      ) : layout === "cases" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const meta = getRefundStatusMeta(item.status);
            const needsAction =
              item.status === "requested" ||
              item.status === "instructor_rejected";
            return (
              <article
                key={item.refund_id}
                onClick={() => router.push(`/admin/refunds/${item.refund_id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    refundId: item.refund_id,
                  });
                }}
                className={`group flex cursor-pointer flex-col justify-between rounded-3xl border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(53,111,167,0.18)] ${meta.accentBorder}`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-base font-bold text-primary">
                      {formatRefundCoin(item.refund_amount)}
                    </span>
                  </div>

                  {/* Course Preview */}
                  <div className="flex items-center gap-3 rounded-2xl bg-background/60 p-2.5">
                    {item.course?.thumbnail ? (
                      <img
                        src={getImageUrl(item.course.thumbnail)}
                        alt={item.course.title}
                        className="h-11 w-16 shrink-0 rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                        <BookOpen size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {item.course?.title || "Khóa học"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        GV: {item.instructor?.fullname || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Reason Quote */}
                  <p className="line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-muted-foreground">
                    “{item.reason || "Không ghi lý do chi tiết"}”
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    {item.student?.avatar ? (
                      <img
                        src={getImageUrl(item.student.avatar)}
                        alt={item.student.fullname}
                        className="h-6 w-6 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary">
                        {(item.student?.fullname || "H").slice(0, 1)}
                      </span>
                    )}
                    <span className="max-w-[120px] truncate font-medium text-foreground">
                      {item.student?.fullname || "Học viên"}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      needsAction ? "text-warning-foreground" : "text-primary"
                    }`}
                  >
                    <Clock size={12} animated={false} />
                    {needsAction
                      ? "Phân xử ngay"
                      : formatRefundDateTime(item.created_at).split(" ")[0]}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="px-5 py-3.5">Học viên &amp; Khóa học</th>
                <th className="px-5 py-3.5">Giảng viên</th>
                <th className="px-5 py-3.5">Số tiền hoàn</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5">Ngày gửi</th>
                <th className="px-5 py-3.5 text-right">Hồ sơ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((item) => {
                const meta = getRefundStatusMeta(item.status);
                return (
                  <tr
                    key={item.refund_id}
                    onClick={() =>
                      router.push(`/admin/refunds/${item.refund_id}`)
                    }
                    className="cursor-pointer transition-colors hover:bg-primary-light/25"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-foreground">
                        {item.student?.fullname}
                      </p>
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {item.course?.title}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-foreground">
                      {item.instructor?.fullname}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-primary">
                      {formatRefundCoin(item.refund_amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {formatRefundDateTime(item.created_at)}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/refunds/${item.refund_id}`)
                        }
                      >
                        <Eye size={14} />
                        Xem
                      </Button>
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
        itemLabel="yêu cầu"
        onPageChange={(nextPage) => setParam("page", nextPage)}
        onPageSizeChange={(nextSize) =>
          setParams({ limit: nextSize, page: 1 })
        }
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: "Mở hồ sơ phân xử",
              onClick: () => {
                router.push(`/admin/refunds/${contextMenu.refundId}`);
                setContextMenu(null);
              },
            },
            {
              label: "Sao chép Refund ID",
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.refundId);
                toast.success("Đã sao chép Refund ID");
                setContextMenu(null);
              },
            },
          ]}
        />
      )}
    </main>
  );
}
