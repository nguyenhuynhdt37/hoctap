"use client";

import { DEFAULT_COIN_VND_RATE } from "@/lib/learning-hub/coin-logic";
import { playSound, triggerPerfectConfetti } from "@/lib/utils/helpers/effects";
import type { WalletTransaction } from "@/types/user/wallet";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Coins,
  Copy,
  Pause,
  Play,
  Receipt,
} from "pulsoicon-react";
import {
  formatCoinNumber,
  formatVnDateTime,
  formatVndCompact,
  getTransactionMethodLabel,
  getTransactionTypeLabel,
  isIncomingTransaction,
} from "@/components/user/wallets/transactions/formatters";

interface SuccessProps {
  orderId?: string | null;
  transaction?: WalletTransaction | null;
  loadingTx?: boolean;
  receiptHref: string;
  redirectHref: string;
  secondsLeft: number;
  paused: boolean;
  onTogglePause: () => void;
}

export default function Success({
  orderId,
  transaction,
  loadingTx = false,
  receiptHref,
  redirectHref,
  secondsLeft,
  paused,
  onTogglePause,
}: SuccessProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    triggerPerfectConfetti();
    playSound("perfect");
  }, []);

  const displayOrderId = transaction?.order_id || orderId || null;
  const incoming = transaction ? isIncomingTransaction(transaction) : true;
  const progressPercent = Math.max(0, Math.min(100, ((5 - secondsLeft) / 5) * 100));

  const handleCopy = () => {
    const code = displayOrderId || transaction?.id;
    if (!code) return;
    void navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-primary-light/70 via-background to-secondary-light/30 px-4 py-10">
      {/* Mây mờ nền chuẩn Trang chủ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-12 -z-10 h-72 w-72 rounded-full bg-white/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-12 -z-10 h-80 w-80 rounded-full bg-accent/40 blur-3xl"
      />

      <div className="w-full max-w-lg">
        {/* VÉ BIÊN LAI 2 PHẦN CÓ RÃNH XÉ */}
        <article
          role="status"
          aria-live="polite"
          className="relative overflow-hidden rounded-[34px] border border-primary-pastel bg-surface/95 shadow-[0_28px_64px_-16px_rgba(53,111,167,0.22)] backdrop-blur-md"
        >
          {/* Phần trên: Dấu ấn xác nhận & Số Coin */}
          <div className="relative bg-gradient-to-br from-primary-light/75 via-surface to-success-bg/45 px-6 pb-7 pt-8 text-center sm:px-8">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-success-foreground">
              <CircleCheck
                solid
                aria-hidden="true"
                animated={false}
                className="size-3.5"
              />
              <span>Xác nhận thành công</span>
            </div>

            {/* Con dấu tròn */}
            <div className="relative mx-auto mt-5 flex size-20 items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-success-bg/80 ring-8 ring-success-bg/45"
              />
              <span className="relative flex size-16 items-center justify-center rounded-full border border-success-border bg-surface text-success-foreground shadow-sm">
                <CircleCheck
                  solid
                  aria-hidden="true"
                  animated={false}
                  className="size-9"
                />
              </span>
            </div>

            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {transaction
                ? getTransactionTypeLabel(transaction.type)
                : "Thanh toán thành công"}
            </h1>

            {loadingTx ? (
              <div className="mx-auto mt-3 h-10 w-44 animate-pulse rounded-2xl bg-primary-light" />
            ) : transaction ? (
              <div className="mt-3 space-y-1">
                <p className="inline-flex items-center justify-center gap-2 font-display text-4xl font-bold tracking-tight text-primary tabular-nums">
                  <span>
                    {incoming ? "+" : "-"}
                    {formatCoinNumber(transaction.amount, DEFAULT_COIN_VND_RATE)}
                  </span>
                  <Coins
                    solid
                    aria-hidden="true"
                    animated={false}
                    className="size-7 text-primary"
                  />
                </p>
                <p className="text-xs font-medium text-muted-foreground tabular-nums">
                  Quy đổi tương đương {formatVndCompact(transaction.amount)} ·{" "}
                  {getTransactionMethodLabel(
                    transaction.method,
                    transaction.gateway,
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Giao dịch của bạn đã được ghi nhận và cập nhật vào tài khoản Mây Mây.
              </p>
            )}
          </div>

          {/* Rãnh xé biên lai */}
          <div className="relative flex items-center bg-surface">
            <span
              aria-hidden="true"
              className="-ml-3.5 size-7 shrink-0 rounded-full border border-primary-pastel bg-background"
            />
            <div className="w-full border-t-2 border-dashed border-primary-pastel/80" />
            <span
              aria-hidden="true"
              className="-mr-3.5 size-7 shrink-0 rounded-full border border-primary-pastel bg-background"
            />
          </div>

          {/* Phần dưới: Thông tin đối chiếu & Đếm ngược sang biên lai */}
          <div className="space-y-5 px-6 pb-7 pt-5 sm:px-8">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-background/75 p-4 text-xs">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Mã đơn hàng
                </p>
                {displayOrderId ? (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-foreground transition hover:text-primary cursor-pointer"
                    title="Sao chép mã đơn hàng"
                  >
                    <span className="truncate max-w-[130px]">
                      {displayOrderId}
                    </span>
                    <span className="inline-flex items-center">
                      {copied ? (
                        <Check
                          aria-hidden="true"
                          animated={false}
                          className="size-3.5 text-success-foreground"
                        />
                      ) : (
                        <Copy
                          aria-hidden="true"
                          animated={false}
                          className="size-3.5 text-muted-foreground"
                        />
                      )}
                    </span>
                  </button>
                ) : (
                  <p className="mt-1 font-semibold text-foreground">—</p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Thời gian ghi nhận
                </p>
                <p className="mt-1 font-semibold text-foreground tabular-nums">
                  {transaction
                    ? formatVnDateTime(
                        transaction.confirmed_at || transaction.created_at,
                      )
                    : "Vừa xong"}
                </p>
              </div>

              {transaction?.description && (
                <div className="col-span-2 border-t border-border/70 pt-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Nội dung
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">
                    {transaction.description}
                  </p>
                </div>
              )}
            </div>

            {/* Thanh đếm ngược tự động chuyển sang biên lai */}
            <div className="space-y-2 rounded-2xl border border-primary-pastel/70 bg-primary-light/45 px-4 py-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                  <Receipt
                    aria-hidden="true"
                    animated={false}
                    className="size-3.5"
                  />
                  <span>
                    {paused
                      ? "Đã tạm dừng chuyển tự động"
                      : `Tự động mở biên lai chi tiết sau ${secondsLeft} giây...`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface px-2.5 py-0.5 text-[11px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
                >
                  <span className="inline-flex items-center">
                    {paused ? (
                      <Play
                        aria-hidden="true"
                        animated={false}
                        className="size-3"
                      />
                    ) : (
                      <Pause
                        aria-hidden="true"
                        animated={false}
                        className="size-3"
                      />
                    )}
                  </span>
                  <span>{paused ? "Tiếp tục" : "Dừng"}</span>
                </button>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Cụm nút điều hướng */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                href={receiptHref}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
              >
                <Receipt aria-hidden="true" className="size-4" />
                <span>Xem biên lai ngay</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>

              <Link
                href={redirectHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 py-3 text-xs font-bold text-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                <span>Quay lại Ví</span>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
