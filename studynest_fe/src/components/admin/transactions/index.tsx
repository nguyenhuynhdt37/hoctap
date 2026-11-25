"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  Download,
  Eye,
  RefreshCw,
  Search,
  Wallet,
} from "pulsoicon-react";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { AdminTransactionsResponse } from "@/types/admin/transaction";
import {
  TX_STATUS_ORDER,
  TX_TYPE_OPTIONS,
  exportAdminTransactionsCsv,
  formatTxCoin,
  formatTxDateTime,
  getGatewayLabel,
  getTxStatusMeta,
  getTxTypeMeta,
} from "./transaction-visuals";

const DEFAULT_LIMIT = 20;

const TRANSACTIONS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: DEFAULT_LIMIT, min: 1, max: 100 },
  search: { type: "string", default: "" },
  type: {
    type: "string",
    default: "" as
      | ""
      | "deposit"
      | "purchase"
      | "income"
      | "refund"
      | "withdraw_hold"
      | "fee"
      | "withdraw_reject_refund",
    allowed: [
      "",
      "deposit",
      "purchase",
      "income",
      "refund",
      "withdraw_hold",
      "fee",
      "withdraw_reject_refund",
    ] as const,
  },
  status: {
    type: "string",
    default: "" as
      | ""
      | "pending"
      | "completed"
      | "failed"
      | "refunded"
      | "canceled",
    allowed: [
      "",
      "pending",
      "completed",
      "failed",
      "refunded",
      "canceled",
    ] as const,
  },
  direction: {
    type: "string",
    default: "" as "" | "in" | "out",
    allowed: ["", "in", "out"] as const,
  },
  gateway: {
    type: "string",
    default: "" as
      | ""
      | "paypal"
      | "internal_wallet"
      | "wallet"
      | "internal"
      | "momo"
      | "stripe",
    allowed: [
      "",
      "paypal",
      "internal_wallet",
      "wallet",
      "internal",
      "momo",
      "stripe",
    ] as const,
  },
  date_from: { type: "string", default: "" },
  date_to: { type: "string", default: "" },
  sort_by: {
    type: "string",
    default: "created_at" as "created_at" | "amount",
    allowed: ["created_at", "amount"] as const,
  },
  order_dir: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

const toIsoIfValid = (value: string): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export default function AdminTransactions() {
  const router = useRouter();
  const { values, setParam, setParams } = useUrlQueryState(
    TRANSACTIONS_QUERY_SCHEMA,
  );
  const {
    page,
    limit,
    search: debouncedSearch,
    type,
    status,
    direction,
    gateway,
    date_from: dateFrom,
    date_to: dateTo,
    sort_by: sortBy,
    order_dir: orderDir,
  } = values;

  const { inputValue: search, setInputValue: setSearch } =
    useDebouncedUrlSearch(debouncedSearch, (val) => setParam("search", val));

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sort_by", sortBy);
    params.set("order_dir", orderDir);
    if (debouncedSearch) params.set("search", debouncedSearch.trim());
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (direction) params.set("direction", direction);
    if (gateway) params.set("gateway", gateway);
    const fromIso = toIsoIfValid(dateFrom);
    const toIso = toIsoIfValid(dateTo);
    if (fromIso) params.set("date_from", fromIso);
    if (toIso) params.set("date_to", toIso);
    return params.toString();
  }, [
    page,
    limit,
    sortBy,
    orderDir,
    debouncedSearch,
    type,
    status,
    direction,
    gateway,
    dateFrom,
    dateTo,
  ]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<AdminTransactionsResponse>(
      `/admin/transactions?${query}`,
      (url: string) => api.get(url).then((r) => r.data),
      { revalidateOnFocus: false },
    );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const summary = data?.summary;
  const statusCounts = summary?.status_counts ?? {};
  const successRate = summary?.success_rate ?? 0;

  const totalAmountNum = Number(summary?.total_amount || 0);
  const totalInNum = Number(summary?.total_in || 0);
  const totalOutNum = Number(summary?.total_out || 0);

  const hasActiveFilter = Boolean(
    debouncedSearch || type || status || direction || gateway || dateFrom || dateTo,
  );

  const resetFilters = () => {
    setSearch("");
    setParams({
      page: 1,
      search: "",
      type: "",
      status: "",
      direction: "",
      gateway: "",
      date_from: "",
      date_to: "",
      sort_by: "created_at",
      order_dir: "desc",
    });
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Editorial Hero Banner — Cloudy Blue Pastel Sky */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-secondary-light/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/75 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-2xs">
              <Coins size={13} animated={false} />
              Mây Mây Transaction Command Center
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Trung tâm Quản trị Giao dịch
            </h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi toàn bộ 7 dòng giao dịch (nạp tiền, mua khóa học, thu nhập GV, hoàn tiền, rút tiền, phí sàn) theo thời gian thực.
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
              onClick={() => void mutate()}
              disabled={isValidating}
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
                exportAdminTransactionsCsv(items);
                toast.success(`Đã xuất ${items.length} giao dịch ra file CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* 4 Floating Glass KPI Cards */}
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng khối lượng (Hoàn tất)
            </p>
            <p className="mt-1 text-xl font-bold text-primary">
              {formatTxCoin(totalAmountNum)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Trên tổng {total} lệnh khớp lọc
            </p>
          </div>

          <div className="rounded-2xl border border-success-border/70 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ArrowDownLeft size={13} className="text-success-foreground" />
              Dòng tiền vào (Hoàn tất)
            </p>
            <p className="mt-1 text-xl font-bold text-success-foreground">
              +{formatTxCoin(totalInNum)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Nạp tiền &amp; doanh thu thực nhận
            </p>
          </div>

          <div className="rounded-2xl border border-destructive-border/70 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ArrowUpRight size={13} className="text-destructive-foreground" />
              Dòng tiền ra (Hoàn tất)
            </p>
            <p className="mt-1 text-xl font-bold text-destructive-foreground">
              -{formatTxCoin(totalOutNum)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Mua khóa, chi trả &amp; hoàn tiền
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CheckCircle2 size={13} className="text-primary" />
                Tỉ lệ hoàn tất
              </p>
              <span className="text-sm font-bold text-primary">
                {successRate}%
              </span>
            </div>
            <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-background">
              {TX_STATUS_ORDER.map((st) => {
                const cnt = statusCounts[st] ?? 0;
                if (!cnt || !total) return null;
                const w = (cnt / total) * 100;
                const meta = getTxStatusMeta(st);
                return (
                  <div
                    key={st}
                    title={`${meta.label}: ${cnt}`}
                    className={`h-full ${meta.dotClass}`}
                    style={{ width: `${w}%` }}
                  />
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {statusCounts.completed ?? 0} hoàn tất ·{" "}
              {statusCounts.pending ?? 0} chờ · {statusCounts.failed ?? 0} lỗi
            </p>
          </div>
        </div>
      </section>

      {/* Quick Status Pills + Multi-Filter Bar */}
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] sm:p-5">
        {/* Quick Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setParams({ status: "", page: 1 })}
            className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
              status === ""
                ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
            }`}
          >
            Tất cả ({total})
          </button>
          {TX_STATUS_ORDER.map((st) => {
            const meta = getTxStatusMeta(st);
            const active = status === st;
            const cnt = statusCounts[st];
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
                <span>{meta.label}</span>
                {typeof cnt === "number" && status === "" && (
                  <span className="rounded-full bg-surface/80 px-1.5 py-0.2 text-[10px] font-bold text-foreground">
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Detailed Filter Controls */}
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
              placeholder="Tìm tên, email, khóa học, mã đơn, mã GD..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <select
            aria-label="Lọc theo loại giao dịch"
            value={type}
            onChange={(e) =>
              setParams({
                type: e.target.value as typeof type,
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none md:col-span-2"
          >
            <option value="">Tất cả loại GD</option>
            {TX_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo hướng tiền"
            value={direction}
            onChange={(e) =>
              setParams({
                direction: e.target.value as "" | "in" | "out",
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none md:col-span-2"
          >
            <option value="">Tất cả hướng</option>
            <option value="in">Tiền vào (In)</option>
            <option value="out">Tiền ra (Out)</option>
          </select>

          <select
            aria-label="Lọc theo cổng thanh toán"
            value={gateway}
            onChange={(e) =>
              setParams({
                gateway: e.target.value as typeof gateway,
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none md:col-span-2"
          >
            <option value="">Tất cả cổng</option>
            <option value="paypal">PayPal</option>
            <option value="internal_wallet">Ví nội bộ (internal_wallet)</option>
            <option value="wallet">Ví (wallet)</option>
            <option value="internal">Hệ thống (internal)</option>
            <option value="momo">MoMo</option>
            <option value="stripe">Stripe</option>
          </select>

          <select
            aria-label="Sắp xếp"
            value={`${sortBy}:${orderDir}`}
            onChange={(e) => {
              const [sb, od] = e.target.value.split(":") as [
                "created_at" | "amount",
                "asc" | "desc",
              ];
              setParams({ sort_by: sb, order_dir: od, page: 1 });
            }}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none md:col-span-2"
          >
            <option value="created_at:desc">Mới nhất</option>
            <option value="created_at:asc">Cũ nhất</option>
            <option value="amount:desc">Giá trị cao nhất</option>
            <option value="amount:asc">Giá trị thấp nhất</option>
          </select>
        </div>

        {/* Date Range + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Khoảng thời gian:</span>
            <input
              type="date"
              aria-label="Từ ngày"
              value={dateFrom}
              onChange={(e) =>
                setParams({ date_from: e.target.value, page: 1 })
              }
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <span>đến</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={dateTo}
              onChange={(e) => setParams({ date_to: e.target.value, page: 1 })}
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {hasActiveFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Đặt lại bộ lọc
            </Button>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được danh sách giao dịch.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Transactions Table */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-background"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-14 text-center text-sm text-muted-foreground">
            Không tìm thấy giao dịch nào khớp với tiêu chí lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
                <tr>
                  <th className="px-5 py-3.5">Người dùng</th>
                  <th className="px-5 py-3.5">Loại &amp; Trạng thái</th>
                  <th className="px-5 py-3.5">Số tiền</th>
                  <th className="px-5 py-3.5">Cổng / Mã GD</th>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5 text-right">Hồ sơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {items.map(({ transaction: t, user, course }) => {
                  const typeMeta = getTxTypeMeta(t.type);
                  const statusMeta = getTxStatusMeta(t.status);
                  const isIn = t.direction === "in";
                  const refCode = t.order_id || t.transaction_code || t.id;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/admin/transactions/${t.id}`)}
                      className="cursor-pointer transition-colors hover:bg-primary-light/25"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {user?.avatar ? (
                            <img
                              src={getImageUrl(user.avatar)}
                              alt={user.fullname}
                              className="h-9 w-9 shrink-0 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-xs font-bold text-primary">
                              {(user?.fullname || "HT")
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate font-semibold text-foreground">
                              {user?.fullname || "Hệ thống"}
                            </p>
                            <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                              {course?.title || user?.email || "Giao dịch nội bộ"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeMeta.badgeClass}`}
                          >
                            {typeMeta.label}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isIn
                              ? "text-success-foreground"
                              : "text-destructive-foreground"
                          }`}
                        >
                          {isIn ? "+" : "-"}
                          {formatTxCoin(Math.abs(t.amount))}
                        </span>
                      </td>

                      <td
                        className="px-5 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-1">
                          <span className="block text-xs font-medium text-foreground">
                            {getGatewayLabel(t.gateway, t.method)}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(refCode, "mã giao dịch")}
                            className="inline-flex items-center gap-1 rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-primary"
                          >
                            <span>{refCode.slice(0, 10)}...</span>
                            <Copy size={10} animated={false} />
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        <div>{formatTxDateTime(t.created_at)}</div>
                        {t.confirmed_at && (
                          <div className="text-[11px] text-success-foreground">
                            XN: {formatTxDateTime(t.confirmed_at)}
                          </div>
                        )}
                      </td>

                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/transactions/${t.id}`)
                          }
                        >
                          <Eye size={14} />
                          Chi tiết
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
          itemLabel="giao dịch"
          pageSizeOptions={[15, 25, 50, 100]}
          onPageChange={(nextPage) => setParam("page", nextPage)}
          onPageSizeChange={(nextSize) =>
            setParams({ limit: nextSize, page: 1 })
          }
          className="rounded-none rounded-b-3xl border-0 border-t border-border shadow-none"
        />
      </section>
    </main>
  );
}
