"use client";

import { Badge } from "@/components/ui";
import { DEFAULT_COIN_VND_RATE } from "@/lib/learning-hub/coin-logic";
import type { WalletTransaction } from "@/types/user/wallet";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "pulsoicon-react";
import {
  formatCoinNumber,
  formatDayGroupLabel,
  formatVnTimeOnly,
  formatVndCompact,
  getDayGroupKey,
  getTransactionMethodLabel,
  getTransactionStatusMeta,
  getTransactionTypeLabel,
  isIncomingTransaction,
} from "./formatters";

interface TransactionTimelineProps {
  transactions: WalletTransaction[];
  isLoading: boolean;
  rateVnd?: number;
  retryOrderId?: string | null;
  onSelectTransaction: (transaction: WalletTransaction) => void;
  onRetry?: (orderId?: string | null) => void;
  onResetFilters?: () => void;
}

function getTransactionIconMeta(t: WalletTransaction) {
  const incoming = isIncomingTransaction(t);
  switch (t.type) {
    case "deposit":
      return {
        Icon: ArrowDownLeft,
        boxClass:
          "border-primary-pastel bg-primary-light text-primary",
      };
    case "purchase":
      return {
        Icon: ShoppingBag,
        boxClass:
          "border-accent-border bg-accent/65 text-accent-foreground",
      };
    case "refund":
    case "withdraw_reject_refund":
      return {
        Icon: RotateCcw,
        boxClass:
          "border-success-border bg-success-bg text-success-foreground",
      };
    case "income":
      return {
        Icon: TrendingUp,
        boxClass:
          "border-warning-border bg-accent-vanilla/70 text-warning-foreground",
      };
    case "withdraw":
    case "withdraw_hold":
      return {
        Icon: Wallet,
        boxClass:
          "border-secondary-pastel bg-secondary-light text-secondary-foreground",
      };
    case "fee":
      return {
        Icon: CreditCard,
        boxClass: "border-border bg-background text-muted-foreground",
      };
    default:
      return incoming
        ? {
            Icon: ArrowDownLeft,
            boxClass: "border-primary-pastel bg-primary-light text-primary",
          }
        : {
            Icon: ArrowUpRight,
            boxClass: "border-border bg-background text-muted-foreground",
          };
  }
}

export function TransactionTimeline({
  transactions,
  isLoading,
  rateVnd = DEFAULT_COIN_VND_RATE,
  retryOrderId,
  onSelectTransaction,
  onRetry,
  onResetFilters,
}: TransactionTimelineProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groupedDays = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      netVnd: number;
      items: WalletTransaction[];
    }> = [];
    const map = new Map<string, (typeof groups)[number]>();

    for (const tx of transactions) {
      const key = getDayGroupKey(tx.created_at);
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          label: formatDayGroupLabel(tx.created_at),
          netVnd: 0,
          items: [],
        };
        map.set(key, group);
        groups.push(group);
      }
      group.items.push(tx);
      if (tx.status === "completed") {
        const incoming = isIncomingTransaction(tx);
        group.netVnd += incoming ? tx.amount : -tx.amount;
      }
    }

    return groups;
  }, [transactions]);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopiedId(key);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-24 animate-pulse rounded-[24px] border border-border bg-surface/80 p-5"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-surface/85 px-6 py-16 text-center shadow-2xs">
        <span className="flex size-14 items-center justify-center rounded-3xl border border-primary-pastel bg-primary-light text-primary">
          <Receipt aria-hidden="true" animated={false} className="size-6" />
        </span>
        <h3 className="mt-4 text-base font-bold text-foreground">
          Chưa tìm thấy giao dịch phù hợp
        </h3>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
          Hãy thử nới lỏng khoảng thời gian, chuyển sang trạng thái khác hoặc xóa từ khóa tìm kiếm để xem toàn bộ sổ cái.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-primary-light px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
          >
            <span className="inline-flex items-center">
              <RefreshCw aria-hidden="true" className="size-3.5" />
            </span>
            <span>Xóa toàn bộ bộ lọc</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-opacity ${isLoading ? "opacity-65" : "opacity-100"}`}>
      {groupedDays.map((group) => (
        <section key={group.key} className="space-y-2.5">
          {/* Header nhóm ngày */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">
                {group.label}
              </h3>
              <span className="rounded-full bg-primary-light/80 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                {group.items.length} giao dịch
              </span>
            </div>

            {group.netVnd !== 0 && (
              <span
                className={`text-xs font-semibold tabular-nums ${
                  group.netVnd > 0 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Biến động ngày: {group.netVnd > 0 ? "+" : "-"}
                {formatCoinNumber(group.netVnd, rateVnd)} Coin
              </span>
            )}
          </div>

          {/* Danh sách thẻ giao dịch trong ngày */}
          <div className="overflow-hidden rounded-[26px] border border-border bg-surface shadow-xs divide-y divide-border/70">
            {group.items.map((t) => {
              const incoming = isIncomingTransaction(t);
              const { Icon, boxClass } = getTransactionIconMeta(t);
              const statusMeta = getTransactionStatusMeta(t.status);
              const refCode = t.transaction_code || t.order_id || t.id;
              const isCopied = copiedId === t.id;
              const isRetrying = retryOrderId === t.order_id;

              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectTransaction(t)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectTransaction(t);
                    }
                  }}
                  className="group flex flex-col gap-3.5 p-4 transition-colors duration-150 hover:bg-primary-light/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 cursor-pointer"
                >
                  {/* Trái: Icon ngữ cảnh + Nội dung */}
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <div
                      className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${boxClass}`}
                    >
                      <Icon aria-hidden="true" animated={false} className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {getTransactionTypeLabel(t.type)}
                        </p>
                        <Badge variant={statusMeta.badgeVariant} size="sm">
                          {statusMeta.label}
                        </Badge>
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {getTransactionMethodLabel(t.method, t.gateway)}
                        </span>
                      </div>

                      {t.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {t.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[11px] text-subtle-foreground">
                        <span className="font-medium tabular-nums">
                          {formatVnTimeOnly(t.created_at)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, refCode, t.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition hover:border-primary-pastel hover:text-primary cursor-pointer"
                          title="Sao chép mã đối chiếu"
                        >
                          <span className="inline-flex items-center">
                            {isCopied ? (
                              <Check aria-hidden="true" animated={false} className="size-3 text-success-foreground" />
                            ) : (
                              <Copy aria-hidden="true" animated={false} className="size-3" />
                            )}
                          </span>
                          <span>
                            {isCopied
                              ? "Đã chép"
                              : refCode.length > 16
                                ? `${refCode.slice(0, 14)}…`
                                : refCode}
                          </span>
                        </button>

                        {t.status === "pending" && onRetry && t.order_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(t.order_id);
                            }}
                            disabled={isRetrying}
                            className="inline-flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-bg px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground transition hover:bg-accent-vanilla disabled:opacity-60 cursor-pointer"
                          >
                            <span className="inline-flex items-center">
                              <RefreshCw
                                aria-hidden="true"
                                animated={false}
                                className={`size-3 ${isRetrying ? "animate-spin" : ""}`}
                              />
                            </span>
                            <span>
                              {isRetrying ? "Đang mở PayPal..." : "Thanh toán lại"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Phải: Số Coin nổi bật + mũi tên mở biên nhận */}
                  <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2.5 sm:justify-end sm:border-t-0 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p
                        className={`inline-flex items-center gap-1 text-base font-bold tabular-nums ${
                          t.status === "canceled" || t.status === "failed"
                            ? "text-muted-foreground line-through"
                            : incoming
                              ? "text-primary"
                              : "text-foreground"
                        }`}
                      >
                        <span>
                          {incoming ? "+" : "-"}
                          {formatCoinNumber(t.amount, rateVnd)}
                        </span>
                        <Coins
                          solid={incoming}
                          aria-hidden="true"
                          animated={false}
                          className={`size-4 ${
                            incoming ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </p>
                      <p className="text-[11px] text-subtle-foreground tabular-nums">
                        {formatVndCompact(t.amount)}
                      </p>
                    </div>

                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-all group-hover:border-primary-pastel group-hover:bg-primary-light group-hover:text-primary">
                      <ChevronRight aria-hidden="true" animated={false} className="size-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
