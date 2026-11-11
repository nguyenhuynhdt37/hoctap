"use client";

import ContextMenu from "@/components/shared/context-menu";
import { Badge } from "@/components/ui";
import { WalletTransaction } from "@/types/user/wallet";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiArrowDown, HiArrowUp, HiRefresh } from "react-icons/hi";

interface Props {
  transactions: WalletTransaction[];
  isLoading: boolean;
  retryOrderId?: string | null;
  onRetry?: (orderId?: string | null) => void;
}

const formatCurrency = (val?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val ?? 0);

const formatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    deposit: "Nạp tiền vào ví",
    purchase: "Thanh toán khóa học",
    withdraw: "Rút tiền về tài khoản",
    refund: "Hoàn tiền học phí",
    income: "Thu nhập giảng dạy",
  };
  return labels[type] || type;
};

const getMethodLabel = (method: string, gateway: string) => {
  if (method === "wallet" || gateway === "internal_wallet") return "Ví nội bộ";
  if (method === "paypal" || gateway === "paypal") return "PayPal";
  if (method === "momo" || gateway === "momo") return "MoMo";
  return method?.toUpperCase() || "Không rõ";
};

const isIncome = (t: WalletTransaction) => {
  if (t.direction === "in") return true;
  if (t.direction === "out") return false;
  return ["deposit", "income", "refund"].includes(t.type);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" size="sm">
          Thành công
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="vanilla" size="sm">
          Chờ xử lý
        </Badge>
      );
    case "canceled":
      return (
        <Badge variant="destructive" size="sm">
          Đã hủy
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" size="sm">
          {status}
        </Badge>
      );
  }
};

export function TransactionsTable({
  transactions,
  isLoading,
  retryOrderId,
  onRetry,
}: Props) {
  const router = useRouter();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    transaction: WalletTransaction | null;
  } | null>(null);

  const handleContextMenu = (
    e: React.MouseEvent,
    transaction: WalletTransaction
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, transaction });
  };

  return (
    <div className="rounded-[28px] border border-border bg-surface p-6 shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-primary-light/40">
              <th className="rounded-l-xl px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mã hệ thống
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Loại giao dịch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Số tiền
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mã giao dịch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Thời gian
              </th>
              <th className="rounded-r-xl px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nội dung chi tiết
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-surface">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
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
                  colSpan={8}
                  className="px-4 py-14 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const income = isIncome(t);

                return (
                  <tr
                    key={t.id}
                    className="cursor-pointer transition-colors hover:bg-primary-light/30"
                    onContextMenu={(e) => handleContextMenu(e, t)}
                    onClick={() => router.push(`/wallets/transactions/${t.id}`)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center rounded-lg border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary"
                        title="Click để sao chép ID"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(t.id);
                        }}
                      >
                        {t.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-2xs ${
                            income
                              ? "border-primary-pastel/80 bg-primary-light text-primary"
                              : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {income ? (
                            <HiArrowDown className="h-4 w-4" />
                          ) : (
                            <HiArrowUp className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {getTypeLabel(t.type)}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {getMethodLabel(t.method, t.gateway)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`text-base font-bold ${
                          income ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {income ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {t.transaction_code ? (
                        <span className="inline-flex items-center rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs text-foreground">
                          {t.transaction_code}
                        </span>
                      ) : (
                        <span className="text-subtle-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {t.order_id ? (
                        <span className="inline-flex items-center rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs text-foreground">
                          {t.order_id}
                        </span>
                      ) : (
                        <span className="text-subtle-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-foreground">
                          {formatDateTime(t.created_at)}
                        </span>
                        {t.confirmed_at && (
                          <span className="text-[11px] text-muted-foreground">
                            Xác nhận: {formatDateTime(t.confirmed_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 max-w-xs">
                        {t.description && (
                          <p className="text-xs text-foreground line-clamp-2">
                            {t.description}
                          </p>
                        )}
                        {t.status === "pending" && onRetry && t.order_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(t.order_id);
                            }}
                            disabled={retryOrderId === t.order_id}
                            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-light disabled:opacity-60 cursor-pointer shadow-2xs"
                          >
                            <HiRefresh
                              className={`h-3.5 w-3.5 ${
                                retryOrderId === t.order_id ? "animate-spin" : ""
                              }`}
                            />
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
              label: "Xem chi tiết",
              onClick: () => {
                if (contextMenu.transaction) {
                  router.push(
                    `/wallets/transactions/${contextMenu.transaction.id}`
                  );
                }
                setContextMenu(null);
              },
            },
            {
              label: "Sao chép ID",
              onClick: () => {
                if (contextMenu.transaction) {
                  navigator.clipboard.writeText(contextMenu.transaction.id);
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
