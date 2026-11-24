"use client";

import ContextMenu from "@/components/shared/context-menu";
import { Badge } from "@/components/ui";
import { DEFAULT_COIN_VND_RATE } from "@/lib/learning-hub/coin-logic";
import type { WalletTransaction } from "@/types/user/wallet";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  RefreshCw,
} from "pulsoicon-react";
import {
  formatCoinNumber,
  formatVnDateTime,
  formatVndCompact,
  getTransactionMethodLabel,
  getTransactionStatusMeta,
  getTransactionTypeLabel,
  isIncomingTransaction,
} from "./formatters";

interface Props {
  transactions: WalletTransaction[];
  isLoading: boolean;
  rateVnd?: number;
  retryOrderId?: string | null;
  onSelectTransaction?: (transaction: WalletTransaction) => void;
  onRetry?: (orderId?: string | null) => void;
}

export function TransactionsTable({
  transactions,
  isLoading,
  rateVnd = DEFAULT_COIN_VND_RATE,
  retryOrderId,
  onSelectTransaction,
  onRetry,
}: Props) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    transaction: WalletTransaction | null;
  } | null>(null);

  const handleContextMenu = (
    e: React.MouseEvent,
    transaction: WalletTransaction,
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, transaction });
  };

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopiedId(key);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  return (
    <div className="overflow-hidden rounded-[26px] border border-border bg-surface shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-primary-light/45">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Giao dịch
              </th>
              <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Biến động Coin
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Mã đối chiếu
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Thời gian
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Nội dung
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-surface">
            {isLoading && transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-14 text-center text-sm text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Đang tải danh sách giao dịch...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-14 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const incoming = isIncomingTransaction(t);
                const statusMeta = getTransactionStatusMeta(t.status);
                const refCode = t.transaction_code || t.order_id || t.id;
                const isCopied = copiedId === t.id;

                return (
                  <tr
                    key={t.id}
                    className="cursor-pointer transition-colors hover:bg-primary-light/25"
                    onContextMenu={(e) => handleContextMenu(e, t)}
                    onClick={() => {
                      if (onSelectTransaction) {
                        onSelectTransaction(t);
                      } else {
                        router.push(`/wallets/transactions/${t.id}`);
                      }
                    }}
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-2xs ${
                            incoming
                              ? "border-primary-pastel/80 bg-primary-light text-primary"
                              : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {incoming ? (
                            <ArrowDownLeft
                              aria-hidden="true"
                              animated={false}
                              className="size-4"
                            />
                          ) : (
                            <ArrowUpRight
                              aria-hidden="true"
                              animated={false}
                              className="size-4"
                            />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {getTransactionTypeLabel(t.type)}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {getTransactionMethodLabel(t.method, t.gateway)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div
                        className={`inline-flex items-center justify-end gap-1 text-sm font-bold tabular-nums ${
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
                          className="size-3.5"
                        />
                      </div>
                      <div className="mt-0.5 text-[11px] text-subtle-foreground tabular-nums">
                        {formatVndCompact(t.amount)}
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge variant={statusMeta.badgeVariant} size="sm">
                        {statusMeta.label}
                      </Badge>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, refCode, t.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition hover:border-primary-pastel hover:text-primary cursor-pointer"
                        title="Nhấn để sao chép mã đối chiếu"
                      >
                        <span className="inline-flex items-center">
                          {isCopied ? (
                            <Check
                              aria-hidden="true"
                              animated={false}
                              className="size-3 text-success-foreground"
                            />
                          ) : (
                            <Copy
                              aria-hidden="true"
                              animated={false}
                              className="size-3"
                            />
                          )}
                        </span>
                        <span>
                          {isCopied
                            ? "Đã chép"
                            : refCode.length > 14
                              ? `${refCode.slice(0, 12)}…`
                              : refCode}
                        </span>
                      </button>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        <span className="text-xs font-medium text-foreground">
                          {formatVnDateTime(t.created_at)}
                        </span>
                        {t.confirmed_at && (
                          <span className="text-[11px] text-muted-foreground">
                            Xác nhận: {formatVnDateTime(t.confirmed_at)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-xs flex-col gap-1.5">
                        {t.description ? (
                          <p className="line-clamp-2 text-xs text-foreground">
                            {t.description}
                          </p>
                        ) : (
                          <span className="text-xs text-subtle-foreground">—</span>
                        )}

                        {t.status === "pending" && onRetry && t.order_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(t.order_id);
                            }}
                            disabled={retryOrderId === t.order_id}
                            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-warning-border bg-warning-bg px-3 py-1 text-xs font-semibold text-warning-foreground transition hover:bg-accent-vanilla disabled:opacity-60 cursor-pointer"
                          >
                            <span className="inline-flex items-center">
                              <RefreshCw
                                aria-hidden="true"
                                animated={false}
                                className={`size-3.5 ${
                                  retryOrderId === t.order_id ? "animate-spin" : ""
                                }`}
                              />
                            </span>
                            <span>
                              {retryOrderId === t.order_id
                                ? "Đang mở PayPal..."
                                : "Thanh toán lại"}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: "Xem nhanh biên nhận",
              onClick: () => {
                if (contextMenu.transaction && onSelectTransaction) {
                  onSelectTransaction(contextMenu.transaction);
                }
                setContextMenu(null);
              },
            },
            {
              label: "Mở trang chi tiết",
              onClick: () => {
                if (contextMenu.transaction) {
                  router.push(
                    `/wallets/transactions/${contextMenu.transaction.id}`,
                  );
                }
                setContextMenu(null);
              },
            },
            {
              label: "Sao chép mã hệ thống",
              onClick: () => {
                if (contextMenu.transaction) {
                  void navigator.clipboard.writeText(
                    contextMenu.transaction.id,
                  );
                }
                setContextMenu(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
