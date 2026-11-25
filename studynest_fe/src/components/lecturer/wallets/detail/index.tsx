"use client";

import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  FileText,
  Printer,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Wallet,
  XCircle,
} from "pulsoicon-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";

interface Props {
  transactionId: string;
  data?: LecturerTransactionDetail;
}

const formatCoin = (val: number) => formatVndAsCoin(val);

const formatVndApprox = (val?: number | null) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val ?? 0);

const stripHtml = (input?: string | null) => {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    deposit: "Nạp tiền vào ví",
    purchase: "Mua khóa học",
    income: "Thu nhập khóa học",
    earning_release: "Giải ngân thu nhập",
    earning_payout: "Thanh toán rút tiền",
    earning_refund: "Điều chỉnh hoàn tiền",
    refund: "Hoàn tiền",
    withdraw_request: "Yêu cầu rút tiền",
    withdraw_paid: "Rút tiền đã thanh toán",
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    completed: "Thành công",
    pending: "Đang xử lý",
    canceled: "Đã hủy",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    paid: "Đã thanh toán",
    failed: "Thất bại",
    payout_pending: "Đang chuyển PayPal",
  };
  return labels[status] || status;
};

const getStatusVariant = (status: string): BadgeVariant => {
  const variants: Record<string, BadgeVariant> = {
    completed: "success",
    approved: "success",
    paid: "success",
    pending: "warning",
    payout_pending: "warning",
    canceled: "destructive",
    rejected: "destructive",
    failed: "destructive",
  };
  return variants[status] || "neutral";
};

function CopyableRow({
  label,
  value,
  copyText,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  copyText?: string | null;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyText) return;
    navigator.clipboard?.writeText(copyText);
    setCopied(true);
    showToast.success(`Đã sao chép ${label.toLowerCase()}`);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex flex-col gap-1 border-b border-border/70 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-2 sm:justify-end">
        <div
          className={`min-w-0 break-words text-sm font-medium text-foreground sm:text-right ${
            mono ? "font-mono text-xs" : ""
          }`}
        >
          {value}
        </div>
        {copyText && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Sao chép ${label}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer print:hidden"
          >
            {copied ? (
              <Check animated={false} className="h-3 w-3 text-primary" />
            ) : (
              <Copy animated={false} className="h-3 w-3" />
            )}
            <span>{copied ? "Đã chép" : "Chép"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function SectionBox({
  title,
  subtitle,
  icon,
  accent = "primary",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  accent?: "primary" | "secondary" | "vanilla";
  children: ReactNode;
}) {
  const bgMap = {
    primary: "bg-primary-light/35",
    secondary: "bg-secondary-light/35",
    vanilla: "bg-accent-vanilla/55",
  };
  return (
    <Card
      variant="surface"
      density="none"
      className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
    >
      <div
        className={`flex items-center gap-3 border-b border-border px-6 py-4 ${bgMap[accent]}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel/70 bg-surface text-primary shadow-2xs">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-semibold text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

export default function LecturerTransactionDetail({
  transactionId,
  data: loadedData,
}: Props) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState(false);

  const {
    data: fetchedData,
    error,
    isLoading,
  } = useSWR<LecturerTransactionDetail>(
    loadedData === undefined ? `/lecturer/transactions/${transactionId}` : null,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const data = loadedData ?? fetchedData;

  const incomeSplit = useMemo(() => {
    if (!data?.income) return null;
    const inst = Math.max(0, Number(data.income.amount_instructor || 0));
    const plat = Math.max(0, Number(data.income.amount_platform || 0));
    const total = inst + plat;
    const instPct = total > 0 ? Math.round((inst / total) * 100) : 0;
    const platPct = total > 0 ? Math.max(0, 100 - instPct) : 0;
    return { inst, plat, total, instPct, platPct };
  }, [data?.income]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-44 w-full rounded-[28px]" />
          <div className="grid gap-6 lg:grid-cols-12">
            <Skeleton className="h-80 rounded-[24px] lg:col-span-8" />
            <Skeleton className="h-64 rounded-[24px] lg:col-span-4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <Card variant="surface" className="space-y-4 rounded-[24px] p-8 text-center">
            <Alert variant="destructive" className="text-left">
              Không thể tải chi tiết giao dịch. Vui lòng thử lại sau.
            </Alert>
            <Button
              type="button"
              variant="primary"
              className="rounded-full"
              onClick={() => router.push("/lecturer/wallets")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Quay lại ví giảng viên
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isIncome = data.direction === "in";
  const typeLabel = getTypeLabel(data.type);
  const statusVariant = getStatusVariant(data.status);
  const isErrorStatus = statusVariant === "destructive";

  const heroBg = isErrorStatus
    ? "border-destructive-border bg-gradient-to-br from-destructive-bg/70 via-surface to-secondary-light/45"
    : statusVariant === "warning"
      ? "border-warning-border bg-gradient-to-br from-accent-vanilla/85 via-surface to-primary-light/55"
      : "border-success-border bg-gradient-to-br from-success-bg/75 via-surface to-accent-vanilla/60";

  const handleCopyTxId = () => {
    navigator.clipboard?.writeText(data.id);
    setCopiedId(true);
    showToast.success("Đã sao chép mã giao dịch");
    setTimeout(() => setCopiedId(false), 1600);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/lecturer/wallets"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại ví giảng viên</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              onClick={handleCopyTxId}
              leftIcon={
                copiedId ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )
              }
            >
              {copiedId
                ? "Đã chép mã"
                : `Mã #${data.id.slice(0, 8).toUpperCase()}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              onClick={() => window.print()}
              leftIcon={<Printer className="h-3.5 w-3.5" />}
            >
              In biên lai
            </Button>
          </div>
        </div>

        {/* Hero Biên Lai Kho Bạc */}
        <section
          className={`relative overflow-hidden rounded-[28px] border p-6 shadow-sm sm:p-8 ${heroBg}`}
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 text-primary/10"
            viewBox="0 0 240 240"
            fill="none"
          >
            <circle
              cx="120"
              cy="120"
              r="96"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />
            <circle cx="120" cy="120" r="66" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="120" cy="120" r="36" stroke="currentColor" strokeWidth="1.2" />
          </svg>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-surface shadow-2xs ${
                  isErrorStatus
                    ? "border-destructive-border text-destructive-foreground"
                    : statusVariant === "warning"
                      ? "border-warning-border text-warning-foreground"
                      : "border-success-border text-success-foreground"
                }`}
              >
                {isErrorStatus ? (
                  <XCircle className="h-7 w-7" />
                ) : statusVariant === "warning" ? (
                  <Clock className="h-7 w-7" />
                ) : (
                  <CheckCircle2 className="h-7 w-7" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <ShieldCheck animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                    Biên lai giao dịch kho bạc
                  </span>
                  <Badge variant={statusVariant} size="sm" dot>
                    {getStatusLabel(data.status)}
                  </Badge>
                </div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {typeLabel}
                </h1>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Khởi tạo lúc{" "}
                  <strong className="text-foreground">
                    {formatDateTime(data.created_at)}
                  </strong>
                  {data.confirmed_at
                    ? ` · Xác nhận lúc ${formatDateTime(data.confirmed_at)}`
                    : ""}
                </p>
              </div>
            </div>

            {/* Số Coin biến động màu vàng mật ong */}
            <div className="rounded-2xl border border-accent-vanilla-border/80 bg-surface/92 px-5 py-4 shadow-2xs backdrop-blur-xs lg:min-w-[260px] lg:text-right">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isIncome ? (
                  <ArrowUpRight animated={false} className="h-3.5 w-3.5 text-success-foreground" />
                ) : (
                  <ArrowDownLeft animated={false} className="h-3.5 w-3.5 text-warning-foreground" />
                )}
                {isIncome ? "Cộng vào ví" : "Trừ từ ví"}
              </p>
              <div className="mt-1 inline-flex items-center gap-2 font-display text-3xl font-bold tabular-nums text-warning-foreground sm:text-4xl">
                <Coins
                  animated={false}
                  className="h-7 w-7 shrink-0 text-[#C98A2C]"
                  aria-hidden="true"
                />
                <span>
                  {isIncome ? "+" : "-"}
                  {formatCoin(data.amount)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Quy đổi tương đương ≈ {formatVndApprox(data.amount)}
              </p>
            </div>
          </div>
        </section>

        {/* Bố cục 2 cột 8/4 */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Cột trái (8/12) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Thông tin chứng từ chính */}
            <SectionBox
              title="Chi tiết chứng từ giao dịch"
              subtitle="Thông tin định danh, phương thức và thời điểm ghi nhận"
              icon={<Receipt animated={false} className="h-5 w-5" />}
              accent="primary"
            >
              <CopyableRow
                label="Mã giao dịch"
                value={data.id}
                copyText={data.id}
                mono
              />
              {data.transaction_code && (
                <CopyableRow
                  label="Mã giao dịch hệ thống"
                  value={data.transaction_code}
                  copyText={data.transaction_code}
                  mono
                />
              )}
              {data.order_id && (
                <CopyableRow
                  label="Mã đơn hàng"
                  value={data.order_id}
                  copyText={data.order_id}
                  mono
                />
              )}
              <CopyableRow label="Loại giao dịch" value={typeLabel} />
              <CopyableRow label="Phương thức" value={data.method || "—"} />
              <CopyableRow label="Cổng thanh toán" value={data.gateway || "—"} />
              <CopyableRow label="Mô tả" value={data.description || "—"} />
              <CopyableRow
                label="Thời gian tạo"
                value={formatDateTime(data.created_at)}
              />
              {data.confirmed_at && (
                <CopyableRow
                  label="Thời gian xác nhận"
                  value={formatDateTime(data.confirmed_at)}
                />
              )}
            </SectionBox>

            {/* Khối đối soát thu nhập (nếu có) */}
            {data.income && (
              <SectionBox
                title="Phân bổ thu nhập giảng dạy"
                subtitle="Tỷ lệ chia sẻ giữa giảng viên và nền tảng"
                icon={<Coins animated={false} className="h-5 w-5 text-[#C98A2C]" />}
                accent="vanilla"
              >
                {incomeSplit && incomeSplit.total > 0 && (
                  <div className="mb-4 space-y-2 rounded-2xl border border-border/80 bg-background/70 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-warning-foreground">
                        Thù lao giảng viên ({incomeSplit.instPct}%)
                      </span>
                      <span className="text-secondary-foreground">
                        Phí nền tảng ({incomeSplit.platPct}%)
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary-light">
                      <div
                        className="h-full bg-[#C98A2C]"
                        style={{ width: `${incomeSplit.instPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <CopyableRow
                  label="Thù lao giảng viên"
                  value={
                    <span className="font-semibold text-warning-foreground tabular-nums">
                      {formatCoin(data.income.amount_instructor)} (≈{" "}
                      {formatVndApprox(data.income.amount_instructor)})
                    </span>
                  }
                />
                <CopyableRow
                  label="Phí nền tảng"
                  value={`${formatCoin(data.income.amount_platform)} (≈ ${formatVndApprox(data.income.amount_platform)})`}
                />
                {data.income.hold_until && (
                  <CopyableRow
                    label="Mốc giữ quỹ đến"
                    value={formatDateTime(data.income.hold_until)}
                  />
                )}
                {data.income.available_at && (
                  <CopyableRow
                    label="Khả dụng từ"
                    value={formatDateTime(data.income.available_at)}
                  />
                )}
                {data.income.paid_at && (
                  <CopyableRow
                    label="Đã giải ngân lúc"
                    value={formatDateTime(data.income.paid_at)}
                  />
                )}
              </SectionBox>
            )}

            {/* Thông tin nạp tiền */}
            {data.deposit && (
              <SectionBox
                title="Thông tin nạp tiền PayPal"
                icon={<Wallet animated={false} className="h-5 w-5" />}
                accent="secondary"
              >
                <CopyableRow
                  label="PayPal Order ID"
                  value={data.deposit.paypal_order_id || "—"}
                  copyText={data.deposit.paypal_order_id}
                  mono
                />
                <CopyableRow
                  label="PayPal Capture ID"
                  value={data.deposit.paypal_capture_id || "—"}
                  copyText={data.deposit.paypal_capture_id}
                  mono
                />
                <CopyableRow label="Nguồn nạp" value={data.deposit.from} />
              </SectionBox>
            )}

            {/* Thông tin mua khóa học */}
            {data.purchase && (
              <SectionBox
                title="Thông tin đơn hàng khóa học"
                icon={<FileText animated={false} className="h-5 w-5" />}
                accent="primary"
              >
                <CopyableRow
                  label="Giá gốc"
                  value={formatCoin(data.purchase.original_price)}
                />
                <CopyableRow
                  label="Giá sau ưu đãi"
                  value={
                    <span className="font-semibold text-warning-foreground">
                      {formatCoin(data.purchase.discounted_price)}
                    </span>
                  }
                />
                {data.purchase.discount_amount > 0 && (
                  <CopyableRow
                    label="Mức giảm"
                    value={
                      <Badge variant="secondary" size="sm">
                        -{formatCoin(data.purchase.discount_amount)}
                      </Badge>
                    }
                  />
                )}
                <CopyableRow
                  label="Trạng thái đơn"
                  value={getStatusLabel(data.purchase.status)}
                />
                {data.course && (
                  <CopyableRow
                    label="Khóa học"
                    value={
                      <Link
                        href={`/learning/${data.course.slug}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {data.course.title}
                      </Link>
                    }
                  />
                )}
                {data.discount && (
                  <CopyableRow
                    label="Mã giảm giá"
                    value={`${data.discount.code} (${data.discount.type})`}
                  />
                )}
                {data.refund_request && (
                  <CopyableRow
                    label="Yêu cầu hoàn tiền"
                    value={
                      <Badge variant="warning" size="sm" dot>
                        {getStatusLabel(data.refund_request.status)} ·{" "}
                        {formatCoin(data.refund_request.amount)}
                      </Badge>
                    }
                  />
                )}
              </SectionBox>
            )}

            {/* Thông tin hoàn tiền */}
            {data.refund && (
              <SectionBox
                title="Hồ sơ hoàn tiền liên kết"
                icon={<RotateCcw animated={false} className="h-5 w-5" />}
                accent="vanilla"
              >
                <CopyableRow
                  label="Mã yêu cầu hoàn tiền"
                  value={data.refund.refund_id}
                  copyText={data.refund.refund_id}
                  mono
                />
                <CopyableRow
                  label="Trạng thái"
                  value={
                    <Badge
                      variant={getStatusVariant(data.refund.status)}
                      size="sm"
                      dot
                    >
                      {getStatusLabel(data.refund.status)}
                    </Badge>
                  }
                />
                <CopyableRow
                  label="Số Coin hoàn"
                  value={
                    <span className="font-semibold text-warning-foreground">
                      {formatCoin(data.refund.refund_amount)}
                    </span>
                  }
                />
                {data.refund.reason && (
                  <CopyableRow
                    label="Lý do"
                    value={stripHtml(data.refund.reason)}
                  />
                )}
                <div className="pt-4 print:hidden">
                  <Link href={`/lecturer/refunds/${data.refund.refund_id}`}>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      className="rounded-full"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      Mở hồ sơ đối soát hoàn tiền
                    </Button>
                  </Link>
                </div>
              </SectionBox>
            )}

            {/* Thông tin rút tiền */}
            {data.withdraw && (
              <SectionBox
                title="Chi tiết lệnh rút tiền"
                icon={<Banknote animated={false} className="h-5 w-5" />}
                accent="secondary"
              >
                <CopyableRow
                  label="Mã lệnh rút"
                  value={data.withdraw.withdrawal_id}
                  copyText={data.withdraw.withdrawal_id}
                  mono
                />
                <CopyableRow
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
                <CopyableRow
                  label="Số Coin rút"
                  value={
                    <span className="font-semibold text-warning-foreground">
                      {formatCoin(data.withdraw.amount)} (≈{" "}
                      {formatVndApprox(data.withdraw.amount)})
                    </span>
                  }
                />
                <CopyableRow
                  label="Thời gian yêu cầu"
                  value={formatDateTime(data.withdraw.requested_at)}
                />
                {data.withdraw.approved_at && (
                  <CopyableRow
                    label="Thời gian duyệt"
                    value={formatDateTime(data.withdraw.approved_at)}
                  />
                )}
                {data.withdraw.rejected_at && (
                  <CopyableRow
                    label="Thời gian từ chối"
                    value={formatDateTime(data.withdraw.rejected_at)}
                  />
                )}
              </SectionBox>
            )}
          </div>

          {/* Cột phải Sticky (4/12): Tóm tắt & Điều hướng nhanh */}
          <div className="space-y-5 lg:sticky lg:top-6 lg:col-span-4">
            <Card
              variant="surface"
              className="rounded-[24px] border border-accent-vanilla-border/80 bg-gradient-to-br from-accent-vanilla/50 via-surface to-primary-light/30 p-5 shadow-2xs"
            >
              <h3 className="font-display text-base font-semibold text-foreground mb-3">
                Tóm tắt biên lai
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Chiều dòng tiền</span>
                  <strong className="text-foreground">
                    {isIncome ? "Cộng vào ví (+)" : "Trừ từ ví (-)"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Giá trị Coin</span>
                  <strong className="font-display text-sm text-warning-foreground tabular-nums">
                    {formatCoin(data.amount)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quy đổi VNĐ</span>
                  <strong className="text-foreground tabular-nums">
                    {formatVndApprox(data.amount)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <Badge variant={statusVariant} size="sm" dot>
                    {getStatusLabel(data.status)}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card
              variant="surface"
              className="rounded-[24px] border border-border p-5 shadow-2xs print:hidden"
            >
              <h3 className="font-display text-sm font-semibold text-foreground mb-3">
                Điều hướng nhanh tài chính
              </h3>
              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  fullWidth
                  className="justify-between rounded-full"
                  onClick={() => router.push("/lecturer/wallets")}
                  leftIcon={<Wallet className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Ví giảng viên
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="justify-between rounded-full bg-surface"
                  onClick={() => router.push("/lecturer/withdraw")}
                  leftIcon={<Banknote className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Lịch sử rút tiền
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="justify-between rounded-full bg-surface"
                  onClick={() => router.push("/lecturer/hold")}
                  leftIcon={<Clock className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Kho tạm giữ
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
