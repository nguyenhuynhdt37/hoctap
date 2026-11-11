import { Badge } from "@/components/ui";
import { WalletTransaction } from "@/types/user/wallet";
import Link from "next/link";
import { HiArrowDown, HiArrowRight, HiArrowUp, HiRefresh } from "react-icons/hi";

interface Props {
  transactions: WalletTransaction[];
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
  if (!val) return "Đang cập nhật";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "Đang cập nhật";
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

const isIncome = (t: WalletTransaction) => {
  if (t.direction === "in") return true;
  if (t.direction === "out") return false;
  return ["deposit", "income", "refund"].includes(t.type);
};

export function WalletTransactionsTable({
  transactions,
  retryOrderId,
  onRetry,
}: Props) {
  return (
    <section className="rounded-[28px] border border-border bg-surface p-7 shadow-xs">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Giao dịch gần đây
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            5 biến động số dư mới nhất trên tài khoản của bạn
          </p>
        </div>
        <Link
          href="/wallets/transactions"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-4 py-2 text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground shadow-2xs"
        >
          <span>Xem tất cả</span>
          <HiArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-primary-light/40">
              <th className="rounded-l-xl px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Loại giao dịch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Số tiền
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nội dung chi tiết
              </th>
              <th className="rounded-r-xl px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Thời gian
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-surface">
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  Chưa có phát sinh giao dịch nào
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const income = isIncome(t);

                return (
                  <tr
                    key={t.id}
                    className="transition-colors hover:bg-primary-light/30"
                  >
                    <td className="px-4 py-4">
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
                          {t.status === "pending" && (
                            <span className="mt-0.5 inline-block text-[11px] font-medium text-warning-foreground">
                              Chờ xác nhận PayPal
                            </span>
                          )}
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
                    <td className="px-4 py-4">
                      <div className="space-y-1.5 max-w-xs sm:max-w-md">
                        <p className="text-xs leading-relaxed text-foreground truncate">
                          {t.description || "Giao dịch ví Mây Mây"}
                        </p>
                        {t.status === "pending" && onRetry && t.order_id && (
                          <button
                            type="button"
                            onClick={() => onRetry(t.order_id)}
                            disabled={retryOrderId === t.order_id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-light disabled:opacity-60 cursor-pointer shadow-2xs"
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
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(t.created_at)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
