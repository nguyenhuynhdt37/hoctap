"use client";

import { Badge } from "@/components/ui";
import { DEFAULT_COIN_VND_RATE } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  TransactionDetailData,
  WalletTransaction,
} from "@/types/user/wallet";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Receipt,
  RefreshCw,
  RotateCcw,
  Tag,
  User,
  X,
} from "pulsoicon-react";
import useSWR from "swr";
import {
  formatCoinNumber,
  formatVnDateTime,
  formatVndCompact,
  getTransactionMethodLabel,
  getTransactionStatusMeta,
  getTransactionTypeLabel,
  isIncomingTransaction,
} from "./formatters";

interface TransactionDrawerProps {
  transaction: WalletTransaction | null;
  rateVnd?: number;
  retryOrderId?: string | null;
  onClose: () => void;
  onRetry?: (orderId?: string | null) => void;
}

export function TransactionDrawer({
  transaction,
  rateVnd = DEFAULT_COIN_VND_RATE,
  retryOrderId,
  onClose,
  onRetry,
}: TransactionDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!transaction) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [transaction, onClose]);

  const { data: detail, isLoading } = useSWR<TransactionDetailData>(
    transaction ? `/user/transaction/${transaction.id}` : null,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  if (!mounted || !transaction) return null;

  const active = detail ?? transaction;
  const incoming = isIncomingTransaction(active);
  const statusMeta = getTransactionStatusMeta(active.status);
  const isRetrying = retryOrderId === active.order_id;

  const copyText = (value: string, key: string) => {
    void navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-foreground/30 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Biên nhận giao dịch nhanh"
    >
      <div
        className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Drawer */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
              <Receipt aria-hidden="true" animated={false} className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Biên nhận giao dịch
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Xem nhanh chứng từ sổ cái Mây Mây
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biên nhận"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {/* Nội dung cuộn */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Thẻ số tiền chính */}
          <div className="relative overflow-hidden rounded-[24px] border border-primary-pastel/70 bg-gradient-to-br from-surface via-surface to-primary-light/45 p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {getTransactionTypeLabel(active.type)}
              </span>
              <Badge variant={statusMeta.badgeVariant} size="sm">
                {statusMeta.label}
              </Badge>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <p
                className={`inline-flex items-center gap-1.5 font-display text-3xl font-bold tabular-nums ${
                  incoming ? "text-primary" : "text-foreground"
                }`}
              >
                <span>
                  {incoming ? "+" : "-"}
                  {formatCoinNumber(active.amount, rateVnd)}
                </span>
                <Coins
                  solid={incoming}
                  aria-hidden="true"
                  animated={false}
                  className="size-6"
                />
              </p>
              <span className="text-xs font-medium text-muted-foreground">
                Coin
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Quy đổi tương đương: {formatVndCompact(active.amount)}
            </p>

            {active.status === "pending" && onRetry && active.order_id && (
              <button
                type="button"
                onClick={() => onRetry(active.order_id)}
                disabled={isRetrying}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-warning-border bg-accent-vanilla px-4 py-2.5 text-xs font-bold text-warning-foreground transition hover:bg-warning-bg disabled:opacity-60 cursor-pointer"
              >
                <span className="inline-flex items-center">
                  <RefreshCw
                    aria-hidden="true"
                    animated={false}
                    className={`size-3.5 ${isRetrying ? "animate-spin" : ""}`}
                  />
                </span>
                <span>
                  {isRetrying
                    ? "Đang mở lại cổng PayPal..."
                    : "Tiếp tục thanh toán PayPal"}
                </span>
              </button>
            )}
          </div>

          {/* Thông tin chi tiết giao dịch */}
          <div className="rounded-[22px] border border-border bg-surface p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Thông tin đối chiếu
            </p>

            <dl className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Phương thức</dt>
                <dd className="font-semibold text-foreground">
                  {getTransactionMethodLabel(active.method, active.gateway)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Thời gian tạo</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {formatVnDateTime(active.created_at)}
                </dd>
              </div>

              {active.confirmed_at && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Thời gian xác nhận</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatVnDateTime(active.confirmed_at)}
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Mã hệ thống</dt>
                <dd>
                  <button
                    type="button"
                    onClick={() => copyText(active.id, "id")}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground transition hover:border-primary-pastel hover:text-primary cursor-pointer"
                  >
                    <span className="inline-flex items-center">
                      {copiedKey === "id" ? (
                        <Check aria-hidden="true" animated={false} className="size-3 text-success-foreground" />
                      ) : (
                        <Copy aria-hidden="true" animated={false} className="size-3" />
                      )}
                    </span>
                    <span>
                      {copiedKey === "id" ? "Đã chép" : `${active.id.slice(0, 12)}…`}
                    </span>
                  </button>
                </dd>
              </div>

              {active.transaction_code && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Mã giao dịch</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={() => copyText(active.transaction_code!, "tx_code")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground transition hover:border-primary-pastel hover:text-primary cursor-pointer"
                    >
                      <span className="inline-flex items-center">
                        {copiedKey === "tx_code" ? (
                          <Check aria-hidden="true" animated={false} className="size-3 text-success-foreground" />
                        ) : (
                          <Copy aria-hidden="true" animated={false} className="size-3" />
                        )}
                      </span>
                      <span>
                        {copiedKey === "tx_code"
                          ? "Đã chép"
                          : active.transaction_code}
                      </span>
                    </button>
                  </dd>
                </div>
              )}

              {active.order_id && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Mã đơn hàng</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={() => copyText(active.order_id!, "order_id")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground transition hover:border-primary-pastel hover:text-primary cursor-pointer"
                    >
                      <span className="inline-flex items-center">
                        {copiedKey === "order_id" ? (
                          <Check aria-hidden="true" animated={false} className="size-3 text-success-foreground" />
                        ) : (
                          <Copy aria-hidden="true" animated={false} className="size-3" />
                        )}
                      </span>
                      <span>
                        {copiedKey === "order_id" ? "Đã chép" : active.order_id}
                      </span>
                    </button>
                  </dd>
                </div>
              )}
            </dl>

            {active.description && (
              <div className="mt-3.5 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-xs leading-relaxed text-foreground">
                {active.description}
              </div>
            )}
          </div>

          {/* Chi tiết khóa học / mã giảm giá / hoàn tiền (tải từ GET /user/transaction/{id}) */}
          {isLoading ? (
            <div className="h-28 animate-pulse rounded-[22px] border border-border bg-surface/80 p-4" />
          ) : (
            <>
              {detail?.course && (
                <div className="overflow-hidden rounded-[22px] border border-border bg-surface shadow-2xs">
                  {detail.course.thumbnail && (
                    <div className="aspect-video w-full overflow-hidden bg-primary-light/40">
                      <img
                        src={detail.course.thumbnail}
                        alt={detail.course.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                      <BookOpen aria-hidden="true" animated={false} className="size-3.5" />
                      <span>Khóa học liên quan</span>
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-foreground">
                      {detail.course.title}
                    </h3>
                    {detail.instructor && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User aria-hidden="true" animated={false} className="size-3.5" />
                        <span>Giảng viên: {detail.instructor.name}</span>
                      </p>
                    )}
                    {detail.course.slug && (
                      <div className="mt-3">
                        <Link
                          href={`/learning/${detail.course.slug}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <span>Vào học ngay</span>
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detail?.discount && (
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-accent-border bg-accent/45 px-4 py-3 text-xs">
                  <div className="flex items-center gap-2 text-accent-foreground">
                    <Tag aria-hidden="true" animated={false} className="size-4" />
                    <span className="font-semibold">
                      Mã ưu đãi: {detail.discount.code}
                    </span>
                  </div>
                  {detail.purchase?.discount_amount ? (
                    <span className="font-bold text-accent-foreground tabular-nums">
                      -{formatCoinNumber(detail.purchase.discount_amount, rateVnd)} Coin
                    </span>
                  ) : null}
                </div>
              )}

              {detail?.refund_request && (
                <div className="rounded-[20px] border border-info-border bg-info-bg/70 p-4 text-xs text-info-foreground">
                  <p className="inline-flex items-center gap-1.5 font-bold">
                    <RotateCcw aria-hidden="true" animated={false} className="size-3.5" />
                    <span>Thông tin hoàn tiền</span>
                  </p>
                  <p className="mt-1 tabular-nums">
                    Số hoàn lại:{" "}
                    <strong>
                      +{formatCoinNumber(detail.refund_request.refund_amount, rateVnd)} Coin
                    </strong>
                  </p>
                  {detail.refund_request.reason && (
                    <p className="mt-1 text-info-foreground/85">
                      Lý do: {detail.refund_request.reason}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Drawer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground cursor-pointer"
          >
            <span>Đóng</span>
          </button>

          <Link
            href={`/wallets/transactions/${active.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition hover:bg-primary-hover"
          >
            <span>Mở biên nhận đầy đủ</span>
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
