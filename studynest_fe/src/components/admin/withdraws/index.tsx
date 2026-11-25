"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Download,
  Eye,
  LayoutGrid,
  RefreshCw,
  Search,
  Table2,
  Wallet,
  X,
} from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { AdminWithdrawResponse } from "@/types/admin/withdraw";
import {
  type AdminWithdrawStats,
  WITHDRAW_STATUS_ORDER,
  exportWithdrawsCsv,
  formatWithdrawCoin,
  formatWithdrawDateTime,
  getWithdrawStatusMeta,
} from "./withdraw-visuals";

const WITHDRAWS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 12, min: 1, max: 100 },
  status: {
    type: "string",
    default: "all" as
      | "all"
      | "pending"
      | "approved"
      | "rejected"
      | "payout_pending"
      | "failed"
      | "paid",
    allowed: [
      "all",
      "pending",
      "approved",
      "rejected",
      "payout_pending",
      "failed",
      "paid",
    ] as const,
  },
  lecturer_id: { type: "string", default: "" },
  search: { type: "string", default: "" },
  order_by: {
    type: "string",
    default: "requested_at" as "requested_at" | "amount" | "status",
    allowed: ["requested_at", "amount", "status"] as const,
  },
  order_dir: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

export default function AdminWithdraws() {
  const router = useRouter();
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);

  const { values, setParam, setParams } = useUrlQueryState(
    WITHDRAWS_QUERY_SCHEMA,
  );
  const {
    page,
    limit,
    status,
    lecturer_id: lecturerId,
    search,
    order_by: orderBy,
    order_dir: orderDir,
  } = values;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("order_by", orderBy);
    params.set("order_dir", orderDir);
    if (status && status !== "all") params.set("status", status);
    if (lecturerId) params.set("lecturer_id", lecturerId);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [page, limit, orderBy, orderDir, status, lecturerId, search]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<AdminWithdrawResponse>(
      `/admin/withdraw?${query}`,
      (url: string) => api.get(url).then((r) => r.data),
      { revalidateOnFocus: false },
    );

  const { data: stats, mutate: mutateStats } = useSWR<AdminWithdrawStats>(
    "/admin/withdraw/stats",
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  async function handleBatchAction(approve: boolean) {
    if (selectedIds.length === 0) return;
    if (!approve && !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối chi trả.");
      return;
    }
    setBatchBusy(true);
    try {
      await api.post("/admin/withdraw/approve_deny", {
        approve,
        withdraw_ids: selectedIds,
        ...(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
      });
      toast.success(
        approve
          ? `Đã phê duyệt ${selectedIds.length} lệnh rút tiền`
          : `Đã từ chối ${selectedIds.length} lệnh rút tiền`,
      );
      setSelectedIds([]);
      setRejectReason("");
      setShowRejectBox(false);
      await Promise.all([mutate(), mutateStats()]);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể xử lý hàng loạt lệnh rút tiền.";
      toast.error(detail);
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Editorial Hero — Cloudy Blue Pastel Sky */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
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
              <ArrowUpRight size={13} animated={false} />
              Mây Mây Payout &amp; Disbursement Hub
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Trung tâm Chi trả &amp; Rút tiền Giảng viên
            </h1>
            <p className="text-sm text-muted-foreground">
              Kiểm duyệt lệnh rút tiền, đối soát KYC &amp; số dư ví giảng viên, hỗ trợ duyệt chi trả hàng loạt an toàn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/wallets">
              <Button variant="outline" size="sm">
                <Wallet size={14} />
                Kho bạc Ví
              </Button>
            </Link>
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
                exportWithdrawsCsv(items);
                toast.success(`Đã xuất ${items.length} lệnh rút ra file CSV`);
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
                Tổng lệnh rút tiền
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {stats.total} lệnh
              </p>
              <p className="mt-0.5 text-[11px] text-primary">
                Toàn lịch sử yêu cầu chi trả
              </p>
            </div>

            <div className="rounded-2xl border border-accent-vanilla-border/90 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Clock size={13} className="text-accent-vanilla-foreground" />
                Chờ duyệt &amp; Đang chi
              </p>
              <p className="mt-1 text-2xl font-bold text-accent-vanilla-foreground">
                {stats.pending_count} lệnh
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatWithdrawCoin(stats.pending_amount)}
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/70 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Coins size={13} className="text-success-foreground" />
                Đã giải ngân thành công
              </p>
              <p className="mt-1 text-2xl font-bold text-success-foreground">
                {formatWithdrawCoin(stats.paid_amount)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {stats.paid_count} lệnh đã hoàn tất
              </p>
            </div>

            <div className="rounded-2xl border border-destructive-border/70 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Từ chối / Lỗi thanh toán
              </p>
              <p className="mt-1 text-2xl font-bold text-destructive-foreground">
                {stats.rejected_count} lệnh
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Đã hoàn lại số dư về ví giảng viên
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Batch Action Bar (when items selected) */}
      {selectedIds.length > 0 && (
        <section className="space-y-3 rounded-3xl border border-primary bg-primary-light/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-primary">
              Đã chọn {selectedIds.length} lệnh chờ duyệt
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={batchBusy}
                onClick={() => void handleBatchAction(true)}
              >
                <CheckCircle2 size={14} />
                Duyệt chi trả ({selectedIds.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={batchBusy}
                onClick={() => setShowRejectBox((v) => !v)}
              >
                <X size={14} />
                Từ chối hàng loạt
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedIds([]);
                  setShowRejectBox(false);
                }}
              >
                Bỏ chọn
              </Button>
            </div>
          </div>

          {showRejectBox && (
            <div className="flex flex-wrap items-center gap-2 border-t border-primary-pastel pt-3">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối chung cho các lệnh đã chọn..."
                className="h-9 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={batchBusy}
                onClick={() => void handleBatchAction(false)}
              >
                Xác nhận từ chối
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Status Pills + Filter Toolbar */}
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setParams({ status: "all", page: 1 })}
              className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                status === "all"
                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
              }`}
            >
              Tất cả ({stats?.total ?? total})
            </button>
            {WITHDRAW_STATUS_ORDER.map((st) => {
              const meta = getWithdrawStatusMeta(st);
              const active = status === st;
              const cnt = stats?.by_status?.[st]?.count ?? 0;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setParams({ status: st, page: 1 })}
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
              onClick={() => setLayout("cards")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                layout === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} animated={false} />
              Thẻ
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
          <div className="relative md:col-span-7">
            <Search
              size={15}
              animated={false}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm tên giảng viên, email hoặc mã lệnh rút..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-2 md:col-span-5">
            <select
              aria-label="Sắp xếp"
              value={`${orderBy}:${orderDir}`}
              onChange={(e) => {
                const [ob, od] = e.target.value.split(":") as [
                  "requested_at" | "amount" | "status",
                  "asc" | "desc",
                ];
                setParams({ order_by: ob, order_dir: od, page: 1 });
              }}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="requested_at:desc">Mới yêu cầu nhất</option>
              <option value="requested_at:asc">Cũ nhất trước</option>
              <option value="amount:desc">Số tiền rút cao nhất</option>
              <option value="amount:asc">Số tiền rút thấp nhất</option>
            </select>

            {(search || status !== "all" || lecturerId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setParams({
                    page: 1,
                    status: "all",
                    search: "",
                    lecturer_id: "",
                  });
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
          <span>Không tải được danh sách yêu cầu rút tiền.</span>
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
              className="h-48 animate-pulse rounded-3xl border border-border bg-surface p-5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center text-sm text-muted-foreground">
          Chưa có yêu cầu rút tiền nào phù hợp với bộ lọc.
        </div>
      ) : layout === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((w) => {
            const meta = getWithdrawStatusMeta(w.status);
            const isPending = w.status === "pending";
            const isSelected = selectedIds.includes(w.id);
            return (
              <article
                key={w.id}
                onClick={() => router.push(`/admin/withdraws/${w.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, id: w.id });
                }}
                className={`group flex cursor-pointer flex-col justify-between rounded-3xl border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(53,111,167,0.18)] ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : meta.accentBorder
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(w.id)}
                          aria-label={`Chọn lệnh rút ${w.id}`}
                        />
                      )}
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {formatWithdrawCoin(w.amount)}
                    </span>
                  </div>

                  {/* Lecturer */}
                  <div className="flex items-center gap-3 rounded-2xl bg-background/60 p-3">
                    {w.avatar ? (
                      <img
                        src={getImageUrl(w.avatar)}
                        alt={w.fullname}
                        className="h-10 w-10 shrink-0 rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light font-bold text-primary">
                        {w.fullname.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {w.fullname}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.email}
                      </p>
                    </div>
                  </div>

                  {w.reason && (
                    <p className="line-clamp-2 rounded-xl bg-destructive-bg/50 px-3 py-2 text-xs text-destructive-foreground">
                      Lý do: {w.reason}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} animated={false} />
                    {formatWithdrawDateTime(w.requested_at)}
                  </span>
                  <span className="font-semibold text-primary">
                    {isPending ? "Xét duyệt ngay →" : "Xem hồ sơ →"}
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
                <th className="w-10 px-4 py-3.5" />
                <th className="px-4 py-3.5">Giảng viên</th>
                <th className="px-4 py-3.5">Số tiền rút</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5">Thời gian yêu cầu</th>
                <th className="px-4 py-3.5 text-right">Hồ sơ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((w) => {
                const meta = getWithdrawStatusMeta(w.status);
                const isPending = w.status === "pending";
                return (
                  <tr
                    key={w.id}
                    onClick={() => router.push(`/admin/withdraws/${w.id}`)}
                    className="cursor-pointer transition-colors hover:bg-primary-light/25"
                  >
                    <td
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(w.id)}
                          onChange={() => toggleSelect(w.id)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground">
                        {w.fullname}
                      </p>
                      <p className="text-xs text-muted-foreground">{w.email}</p>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-primary">
                      {formatWithdrawCoin(w.amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {formatWithdrawDateTime(w.requested_at)}
                    </td>
                    <td
                      className="px-4 py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/withdraws/${w.id}`)}
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
        itemLabel="lệnh rút"
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
              label: "Xem hồ sơ chi trả",
              onClick: () => {
                router.push(`/admin/withdraws/${contextMenu.id}`);
                setContextMenu(null);
              },
            },
            {
              label: "Sao chép Withdraw ID",
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.id);
                toast.success("Đã sao chép Withdraw ID");
                setContextMenu(null);
              },
            },
          ]}
        />
      )}
    </main>
  );
}
