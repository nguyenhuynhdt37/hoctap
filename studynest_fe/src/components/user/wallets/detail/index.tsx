"use client";

import { Alert, Badge, Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiArrowLeft } from "react-icons/hi";
import useSWR from "swr";

interface Props {
  transactionId: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);

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
    income: "Thu nhập giảng dạy",
    refund: "Hoàn tiền học phí",
    withdraw_request: "Yêu cầu rút tiền",
    withdraw_paid: "Rút tiền đã thanh toán",
  };
  return labels[type] || type;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
    case "approved":
      return (
        <Badge variant="default" size="sm">
          Thành công
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="vanilla" size="sm">
          Đang chờ xử lý
        </Badge>
      );
    case "canceled":
    case "rejected":
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <div className="text-xs font-semibold text-muted-foreground min-w-[160px]">
        {label}
      </div>
      <div className="flex-1 text-right">
        {typeof value === "string" ? (
          <span className="text-xs font-medium text-foreground">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export default function UserTransactionDetail({ transactionId }: Props) {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<LecturerTransactionDetail>(
    `/user/transaction/${transactionId}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-[28px] border border-border bg-surface p-8 shadow-xs text-center">
            <div className="py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <p className="mt-4 text-xs text-muted-foreground">
                Đang tải chi tiết giao dịch...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Alert variant="destructive">
            Không thể tải thông tin chi tiết giao dịch. Giao dịch có thể không tồn tại hoặc bạn không có quyền xem.
          </Alert>
          <div className="text-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <HiArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isIncome = data.direction === "in";
  const typeLabel = getTypeLabel(data.type);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/wallets/transactions"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-all duration-200 hover:border-primary-pastel hover:bg-primary-light hover:text-primary shadow-2xs"
        >
          <HiArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách giao dịch</span>
        </Link>

        <div className="rounded-[28px] border border-border bg-surface p-7 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Chi tiết giao dịch
              </span>
              <h1 className="font-display text-2xl font-bold text-foreground mt-0.5">
                {typeLabel}
              </h1>
            </div>
            {getStatusBadge(data.status)}
          </div>

          {/* Khối hiển thị số tiền giao dịch */}
          <div className="rounded-2xl border border-primary-pastel/60 bg-primary-light/40 p-5 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                Giá trị giao dịch
              </div>
              <div
                className={`font-display text-3xl font-bold tracking-tight mt-1 ${
                  isIncome ? "text-primary" : "text-foreground"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatCurrency(data.amount)}
              </div>
            </div>
            <div className="mt-3 sm:mt-0">
              <span className="inline-block rounded-full border border-primary-pastel bg-surface px-3 py-1 font-mono text-xs text-muted-foreground">
                {data.currency || "VND"}
              </span>
            </div>
          </div>

          {/* Bảng chi tiết thuộc tính */}
          <div className="space-y-0.5">
            <DetailRow
              label="Mã định danh"
              value={
                <span className="font-mono text-xs text-foreground bg-background px-2 py-1 rounded border border-border">
                  {data.id}
                </span>
              }
            />
            <DetailRow label="Loại giao dịch" value={typeLabel} />
            <DetailRow label="Phương thức" value={data.method || "—"} />
            <DetailRow label="Cổng thanh toán" value={data.gateway || "—"} />
            <DetailRow label="Mô tả" value={data.description || "—"} />
            {data.transaction_code && (
              <DetailRow
                label="Mã giao dịch hệ thống"
                value={
                  <span className="font-mono text-xs text-foreground">
                    {data.transaction_code}
                  </span>
                }
              />
            )}
            {data.order_id && (
              <DetailRow
                label="Mã đơn hàng (Order ID)"
                value={
                  <span className="font-mono text-xs text-foreground">
                    {data.order_id}
                  </span>
                }
              />
            )}
            <DetailRow
              label="Thời gian khởi tạo"
              value={formatDateTime(data.created_at)}
            />
            {data.confirmed_at && (
              <DetailRow
                label="Thời gian hoàn tất"
                value={formatDateTime(data.confirmed_at)}
              />
            )}
          </div>

          {/* Khối Deposit nếu có */}
          {data.deposit && (
            <div className="pt-4 border-t border-border">
              <h2 className="font-display text-base font-bold text-foreground mb-3">
                Thông tin nạp tiền PayPal
              </h2>
              <div className="space-y-0.5">
                <DetailRow
                  label="PayPal Order ID"
                  value={data.deposit.paypal_order_id || "—"}
                />
                <DetailRow
                  label="PayPal Capture ID"
                  value={data.deposit.paypal_capture_id || "—"}
                />
                <DetailRow label="Nguồn giao dịch" value={data.deposit.from} />
              </div>
            </div>
          )}

          {/* Khối Purchase nếu có */}
          {data.purchase && (
            <div className="pt-4 border-t border-border">
              <h2 className="font-display text-base font-bold text-foreground mb-3">
                Thông tin thanh toán khóa học
              </h2>
              <div className="space-y-0.5">
                <DetailRow
                  label="Học phí gốc"
                  value={formatCurrency(data.purchase.original_price)}
                />
                <DetailRow
                  label="Học phí thanh toán"
                  value={formatCurrency(data.purchase.discounted_price)}
                />
                {data.purchase.discount_amount > 0 && (
                  <DetailRow
                    label="Số tiền ưu đãi"
                    value={formatCurrency(data.purchase.discount_amount)}
                  />
                )}
                <DetailRow label="Trạng thái đơn hàng" value={data.purchase.status} />
                {data.course && (
                  <DetailRow
                    label="Khóa học đăng ký"
                    value={
                      <Link
                        href={`/learning/${data.course.slug}`}
                        className="text-primary hover:underline font-semibold"
                      >
                        {data.course.title}
                      </Link>
                    }
                  />
                )}
                {data.discount && (
                  <DetailRow
                    label="Mã giảm giá áp dụng"
                    value={`${data.discount.code} (${data.discount.type})`}
                  />
                )}
                {data.refund_request && (
                  <DetailRow
                    label="Yêu cầu hoàn học phí"
                    value={
                      <span className="text-warning-foreground font-medium">
                        {data.refund_request.status} -{" "}
                        {formatCurrency(data.refund_request.amount)}
                      </span>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Khối Income nếu có */}
          {data.income && (
            <div className="pt-4 border-t border-border">
              <h2 className="font-display text-base font-bold text-foreground mb-3">
                Thông tin thù lao giảng dạy
              </h2>
              <div className="space-y-0.5">
                <DetailRow
                  label="Thù lao giảng viên"
                  value={formatCurrency(data.income.amount_instructor)}
                />
                <DetailRow
                  label="Phí nền tảng"
                  value={formatCurrency(data.income.amount_platform)}
                />
                {data.income.hold_until && (
                  <DetailRow
                    label="Tạm giữ đến"
                    value={formatDateTime(data.income.hold_until)}
                  />
                )}
                {data.income.available_at && (
                  <DetailRow
                    label="Khả dụng từ"
                    value={formatDateTime(data.income.available_at)}
                  />
                )}
                {data.income.paid_at && (
                  <DetailRow
                    label="Thời gian thanh toán"
                    value={formatDateTime(data.income.paid_at)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Khối Refund nếu có */}
          {data.refund && (
            <div className="pt-4 border-t border-border">
              <h2 className="font-display text-base font-bold text-foreground mb-3">
                Thông tin hoàn tiền
              </h2>
              <div className="space-y-0.5">
                <DetailRow label="Mã yêu cầu hoàn tiền" value={data.refund.refund_id} />
                <DetailRow
                  label="Trạng thái hoàn tiền"
                  value={data.refund.status}
                />
                <DetailRow
                  label="Số tiền hoàn lại"
                  value={formatCurrency(data.refund.refund_amount)}
                />
                {data.refund.reason && (
                  <DetailRow label="Lý do hoàn tiền" value={data.refund.reason} />
                )}
              </div>
            </div>
          )}

          {/* Khối Withdraw nếu có */}
          {data.withdraw && (
            <div className="pt-4 border-t border-border">
              <h2 className="font-display text-base font-bold text-foreground mb-3">
                Thông tin rút tiền
              </h2>
              <div className="space-y-0.5">
                <DetailRow
                  label="Mã yêu cầu rút tiền"
                  value={data.withdraw.withdrawal_id}
                />
                <DetailRow
                  label="Trạng thái rút tiền"
                  value={getStatusBadge(data.withdraw.status)}
                />
                <DetailRow
                  label="Số tiền yêu cầu rút"
                  value={formatCurrency(data.withdraw.amount)}
                />
                <DetailRow
                  label="Thời gian yêu cầu"
                  value={formatDateTime(data.withdraw.requested_at)}
                />
                {data.withdraw.approved_at && (
                  <DetailRow
                    label="Thời gian duyệt"
                    value={formatDateTime(data.withdraw.approved_at)}
                  />
                )}
                {data.withdraw.rejected_at && (
                  <DetailRow
                    label="Thời gian từ chối"
                    value={formatDateTime(data.withdraw.rejected_at)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
