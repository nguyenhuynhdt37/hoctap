"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  RefreshCw,
  Search,
} from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import {
  WALLET_TYPE_ORDER,
  WalletAdminNav,
  WalletTypeIcon,
  exportWalletHistoryCsv,
  formatWalletCoin,
  formatWalletDateTime,
  getWalletTypeMeta,
} from "../wallet-visuals";

type PlatformWalletHistoryItem = {
  id: string;
  type: "in" | "out" | "hold" | "release" | "fee" | "refund" | string;
  note: string | null;
  amount: number;
  wallet_id: string;
  created_at: string;
  related_transaction_id?: string | null;
};

type PlatformWalletHistoryResponse = {
  total: number;
  page: number;
  limit: number;
  items: PlatformWalletHistoryItem[];
  summary?: {
    total_in: number;
    total_out: number;
    total_fee: number;
    total_hold: number;
  };
};

const DEFAULT_LIMIT = 20;

const WALLET_TRANSACTIONS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: DEFAULT_LIMIT, min: 1, max: 100 },
  search: { type: "string", default: "" },
  type: {
    type: "string",
    default: "" as "" | "in" | "out" | "hold" | "release" | "fee" | "refund",
    allowed: ["", "in", "out", "hold", "release", "fee", "refund"] as const,
  },
  date_from: { type: "string", default: "" },
  date_to: { type: "string", default: "" },
  sort_by: {
    type: "string",
    default: "created_at" as "created_at" | "amount" | "type",
    allowed: ["created_at", "amount", "type"] as const,
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

export default function PlatformWalletHistory() {
  const router = useRouter();
  const { values, setParam, setParams } = useUrlQueryState(
    WALLET_TRANSACTIONS_QUERY_SCHEMA,
  );
  const {
    page,
    limit,
    search: debouncedSearch,
    type,
    date_from: dateFrom,
    date_to: dateTo,
    sort_by: sortBy,
    order_dir: orderDir,
  } = values;

  const { inputValue: search, setInputValue: setSearch } =
    useDebouncedUrlSearch(debouncedSearch, (val) => setParam("search", val));

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [menuItem, setMenuItem] = useState<PlatformWalletHistoryItem | null>(
    null,
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sort_by", sortBy);
    params.set("order_dir", orderDir);
    if (debouncedSearch) params.set("search", debouncedSearch.trim());
    if (type) params.set("type", type);
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
    dateFrom,
    dateTo,
  ]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<PlatformWalletHistoryResponse>(
      `/admin/platform-wallet/history?${query}`,
      (url: string) => api.get(url).then((r) => r.data),
      { revalidateOnFocus: false },
    );

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const summary = data?.summary;

  const hasActiveFilter = Boolean(
    debouncedSearch || type || dateFrom || dateTo,
  );

  const resetFilters = () => {
    setSearch("");
    setParams({
      page: 1,
      search: "",
      type: "",
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
      <WalletAdminNav totalLogs={total} />

      {/* Ledger Header */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/70 bg-gradient-to-br from-primary-light/85 via-surface to-info-bg/50 p-6 shadow-[0_20px_42px_-16px_rgba(53,111,167,0.14)] sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/75 blur-3xl"
        />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Sổ cái Giao dịch Toàn hệ thống
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tra cứu, lọc nhanh theo 6 nhóm dòng tiền, tìm theo ghi chú hoặc mã UUID và xuất báo cáo CSV.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              variant="secondary"
              size="sm"
              disabled={items.length === 0}
              onClick={() => {
                exportWalletHistoryCsv(items);
                toast.success(`Đã xuất ${items.length} dòng ra file CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV trang này
            </Button>
          </div>
        </div>

        {/* Dynamic Filtered Summary Ribbon */}
        {summary && (
          <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/85 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground">
                Tổng bản ghi khớp lọc
              </p>
              <p className="mt-0.5 text-lg font-bold text-foreground">
                {total} giao dịch
              </p>
            </div>
            <div className="rounded-2xl border border-success-border/70 bg-surface/85 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground">
                Tổng tiền vào (theo lọc)
              </p>
              <p className="mt-0.5 text-lg font-bold text-success-foreground">
                +{formatWalletCoin(summary.total_in)}
              </p>
            </div>
            <div className="rounded-2xl border border-destructive-border/70 bg-surface/85 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground">
                Tổng tiền ra &amp; hoàn
              </p>
              <p className="mt-0.5 text-lg font-bold text-destructive-foreground">
                -{formatWalletCoin(summary.total_out)}
              </p>
            </div>
            <div className="rounded-2xl border border-accent-border/80 bg-surface/85 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground">
                Phí sàn &amp; Tạm giữ
              </p>
              <p className="mt-0.5 text-lg font-bold text-accent-foreground">
                {formatWalletCoin(summary.total_fee)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Quick Type Pills + Filter Bar */}
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setParams({ type: "", page: 1 })}
            className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
              type === ""
                ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
            }`}
          >
            Tất cả loại
          </button>
          {WALLET_TYPE_ORDER.map((t) => {
            const meta = getWalletTypeMeta(t);
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setParams({ type: t, page: 1 })}
                className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : `${meta.badgeClass} opacity-85 hover:opacity-100`
                }`}
              >
                <WalletTypeIcon type={t} size={13} />
                {meta.label}
              </button>
            );
          })}
        </div>

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
              placeholder="Tìm ghi chú, History ID hoặc Transaction ID..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <input
              type="date"
              aria-label="Từ ngày"
              value={dateFrom}
              onChange={(e) =>
                setParams({ date_from: e.target.value, page: 1 })
              }
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <input
              type="date"
              aria-label="Đến ngày"
              value={dateTo}
              onChange={(e) => setParams({ date_to: e.target.value, page: 1 })}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-2 md:col-span-4">
            <select
              aria-label="Sắp xếp theo"
              value={`${sortBy}:${orderDir}`}
              onChange={(e) => {
                const [sb, od] = e.target.value.split(":") as [
                  "created_at" | "amount" | "type",
                  "asc" | "desc",
                ];
                setParams({ sort_by: sb, order_dir: od, page: 1 });
              }}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="created_at:desc">Mới nhất trước</option>
              <option value="created_at:asc">Cũ nhất trước</option>
              <option value="amount:desc">Giá trị cao nhất</option>
              <option value="amount:asc">Giá trị thấp nhất</option>
              <option value="type:asc">Nhóm theo loại (A–Z)</option>
            </select>

            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
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
          <span>Không tải được sổ cái giao dịch ví.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Ledger Table */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-background"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-14 text-center text-sm text-muted-foreground">
            Không có giao dịch nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
                <tr>
                  <th className="px-5 py-3.5">Loại giao dịch</th>
                  <th className="px-5 py-3.5">Số tiền</th>
                  <th className="px-5 py-3.5">Diễn giải</th>
                  <th className="px-5 py-3.5">Mã liên quan</th>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {items.map((item) => {
                  const meta = getWalletTypeMeta(item.type);
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-primary-light/25"
                      onClick={() =>
                        router.push(`/admin/wallets/transactions/${item.id}`)
                      }
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenuItem(item);
                        setMenuPos({ x: e.clientX, y: e.clientY });
                        setMenuOpen(true);
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badgeClass}`}
                        >
                          <WalletTypeIcon type={item.type} size={13} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-bold ${meta.textClass}`}>
                          {meta.direction === "out"
                            ? "-"
                            : meta.direction === "in"
                              ? "+"
                              : ""}
                          {formatWalletCoin(Math.abs(item.amount))}
                        </span>
                      </td>
                      <td className="max-w-sm truncate px-5 py-3.5 text-foreground">
                        {item.note || "—"}
                      </td>
                      <td
                        className="px-5 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.related_transaction_id ? (
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                item.related_transaction_id!,
                                "Transaction ID",
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <span>
                              {item.related_transaction_id.slice(0, 8)}...
                            </span>
                            <Copy size={11} animated={false} />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nội bộ
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {formatWalletDateTime(item.created_at)}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/admin/wallets/transactions/${item.id}`,
                            )
                          }
                        >
                          <Eye size={14} />
                          Kiểm toán
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={limit}
          itemLabel="bản ghi"
          pageSizeOptions={[15, 25, 50, 100]}
          onPageChange={(nextPage) => setParam("page", nextPage)}
          onPageSizeChange={(nextSize) =>
            setParams({ limit: nextSize, page: 1 })
          }
          className="rounded-none rounded-b-3xl border-0 border-t border-border shadow-none"
        />
      </section>

      {menuOpen && menuItem && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Xem hồ sơ kiểm toán",
              onClick: () => {
                router.push(`/admin/wallets/transactions/${menuItem.id}`);
                setMenuOpen(false);
              },
            },
            ...(menuItem.related_transaction_id
              ? [
                  {
                    label: "Sao chép Transaction ID",
                    onClick: () => {
                      copyText(
                        menuItem.related_transaction_id!,
                        "Transaction ID",
                      );
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
            {
              label: "Sao chép History ID",
              onClick: () => {
                copyText(menuItem.id, "History ID");
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}
    </main>
  );
}
