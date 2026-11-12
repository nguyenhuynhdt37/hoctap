"use client";

import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import api from "@/lib/utils/fetcher/client/axios";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    deposit: "Nạp tiền",
    purchase: "Mua khóa học",
    income: "Thu nhập",
    refund: "Hoàn tiền",
    withdraw_request: "Yêu cầu rút tiền",
    withdraw_paid: "Rút tiền đã thanh toán",
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    completed: "Thành công",
    pending: "Đang chờ",
    canceled: "Đã hủy",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
  };
  return labels[status] || status;
};

const getStatusVariant = (status: string): BadgeVariant => {
  const variants: Record<string, BadgeVariant> = {
    completed: "success",
    approved: "success",
    pending: "warning",
    canceled: "destructive",
    rejected: "destructive",
  };
  return variants[status] || "neutral";
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/70 last:border-0">
      <div className="text-sm font-semibold text-muted-foreground min-w-[160px]">
        {label}
      </div>
      <div className="flex-1 text-right">
        {typeof value === "string" ? (
          <span className="text-sm text-foreground font-medium">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export default function LecturerTransactionDetail({ transactionId }: Props) {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<LecturerTransactionDetail>(
    `/lecturer/transactions/${transactionId}`,
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
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Card variant="surface" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Card variant="surface" className="p-8 text-center space-y-4">
            <Alert variant="destructive" className="text-left">
              Không thể tải chi tiết giao dịch
            </Alert>
            <Button
              type="button"
              variant="primary"
              onClick={() => router.back()}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Quay lại
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isIncome = data.direction === "in";
  const typeLabel = getTypeLabel(data.type);

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/lecturer/wallets"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách giao dịch</span>
        </Link>

        <Card variant="surface" className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              {typeLabel}
            </h1>
            <Badge variant={getStatusVariant(data.status)} size="md" dot>
              {getStatusLabel(data.status)}
            </Badge>
          </div>

          <div className="p-5 bg-background rounded-2xl border border-border">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Số tiền
            </div>
            <div
              className={`text-3xl font-bold tabular-nums ${
                isIncome ? "text-success-foreground" : "text-foreground"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(data.amount)}
            </div>
          </div>

          <div className="space-y-1">
            <DetailRow label="Mã giao dịch" value={data.id} />
            <DetailRow label="Loại giao dịch" value={typeLabel} />
            <DetailRow label="Phương thức" value={data.method || "—"} />
            <DetailRow label="Cổng thanh toán" value={data.gateway || "—"} />
            <DetailRow label="Mô tả" value={data.description || "—"} />
            {data.transaction_code && (
              <DetailRow
                label="Mã giao dịch hệ thống"
                value={data.transaction_code}
              />
            )}
            {data.order_id && (
              <DetailRow label="Mã đơn hàng" value={data.order_id} />
            )}
            <DetailRow
              label="Thời gian tạo"
              value={formatDateTime(data.created_at)}
            />
            {data.confirmed_at && (
              <DetailRow
                label="Thời gian xác nhận"
                value={formatDateTime(data.confirmed_at)}
              />
            )}
          </div>

          {data.deposit && (
            <div className="pt-5 border-t border-border">
              <h2 className="text-base font-semibold text-foreground mb-3">
                Thông tin nạp tiền
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="PayPal Order ID"
                  value={data.deposit.paypal_order_id || "—"}
                />
                <DetailRow
                  label="PayPal Capture ID"
                  value={data.deposit.paypal_capture_id || "—"}
                />
                <DetailRow label="Nguồn" value={data.deposit.from} />
              </div>
            </div>
          )}

          {data.purchase && (
            <div className="pt-5 border-t border-border">
              <h2 className="text-base font-semibold text-foreground mb-3">
                Thông tin mua khóa học
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="Giá gốc"
                  value={formatCurrency(data.purchase.original_price)}
                />
                <DetailRow
                  label="Giá sau giảm"
                  value={formatCurrency(data.purchase.discounted_price)}
                />
                {data.purchase.discount_amount > 0 && (
                  <DetailRow
                    label="Số tiền giảm"
                    value={formatCurrency(data.purchase.discount_amount)}
                  />
                )}
                <DetailRow label="Trạng thái" value={data.purchase.status} />
                {data.course && (
                  <DetailRow
                    label="Khóa học"
                    value={
                      <Link
                        href={`/learning/${data.course.slug}`}
                        className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
                      >
                        {data.course.title}
                      </Link>
                    }
                  />
                )}
                {data.discount && (
                  <DetailRow
                    label="Mã giảm giá"
                    value={`${data.discount.code} (${data.discount.type})`}
                  />
                )}
                {data.refund_request && (
                  <DetailRow
                    label="Yêu cầu hoàn tiền"
                    value={
                      <Badge variant="warning" size="sm">
                        {getStatusLabel(data.refund_request.status)} -{" "}
                        {formatCurrency(data.refund_request.amount)}
                      </Badge>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {data.income && (
            <div className="pt-5 border-t border-border">
              <h2 className="text-base font-semibold text-foreground mb-3">
                Thông tin thu nhập
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="Số tiền giảng viên"
                  value={formatCurrency(data.income.amount_instructor)}
                />
                <DetailRow
                  label="Số tiền nền tảng"
                  value={formatCurrency(data.income.amount_platform)}
                />
                {data.income.hold_until && (
                  <DetailRow
                    label="Giữ đến"
                    value={formatDateTime(data.income.hold_until)}
                  />
                )}
                {data.income.available_at && (
                  <DetailRow
                    label="Có sẵn từ"
                    value={formatDateTime(data.income.available_at)}
                  />
                )}
                {data.income.paid_at && (
                  <DetailRow
                    label="Đã thanh toán lúc"
                    value={formatDateTime(data.income.paid_at)}
                  />
                )}
              </div>
            </div>
          )}

          {data.refund && (
            <div className="pt-5 border-t border-border">
              <h2 className="text-base font-semibold text-foreground mb-3">
                Thông tin hoàn tiền
              </h2>
              <div className="space-y-1">
                <DetailRow label="Mã yêu cầu" value={data.refund.refund_id} />
                <DetailRow
                  label="Trạng thái"
                  value={getStatusLabel(data.refund.status)}
                />
                <DetailRow
                  label="Số tiền hoàn"
                  value={formatCurrency(data.refund.refund_amount)}
                />
                {data.refund.reason && (
                  <DetailRow label="Lý do" value={data.refund.reason} />
                )}
              </div>
            </div>
          )}

          {data.withdraw && (
            <div className="pt-5 border-t border-border">
              <h2 className="text-base font-semibold text-foreground mb-3">
                Thông tin rút tiền
              </h2>
              <div className="space-y-1">
                <DetailRow
                  label="Mã yêu cầu"
                  value={data.withdraw.withdrawal_id}
                />
                <DetailRow
                  label="Trạng thái"
                  value={
                    <Badge
                      variant={getStatusVariant(data.withdraw.status)}
                      size="sm"
                      dot
                    >
                      {getStatusLabel(data.withdraw.status)}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Số tiền"
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
        </Card>
      </div>
    </div>
  );
}
