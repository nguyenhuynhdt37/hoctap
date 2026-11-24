"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CircleX,
  Receipt,
  RefreshCw,
} from "pulsoicon-react";

interface FailedProps {
  orderId?: string | null;
  statusLabel?: string;
  redirectHref: string;
}

export default function Failed({
  orderId,
  statusLabel = "Thanh toán chưa hoàn tất",
  redirectHref,
}: FailedProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!orderId || retrying) return;
    setRetrying(true);
    try {
      const res = await api.post(`/wallets/retry_wallet_payment/${orderId}`);
      if (res.data?.approve_url) {
        window.open(res.data.approve_url, "_blank", "noopener,noreferrer");
        showToast.success("Đã mở lại cổng thanh toán PayPal.");
      } else {
        showToast.info("Yêu cầu thanh toán lại đã được ghi nhận.");
      }
    } catch {
      showToast.error("Không thể khởi tạo lại giao dịch lúc này.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-secondary-light/55 via-background to-primary-light/40 px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-12 -z-10 h-72 w-72 rounded-full bg-white/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-12 -z-10 h-72 w-72 rounded-full bg-secondary-pastel/40 blur-3xl"
      />

      <div className="w-full max-w-lg">
        <article
          role="alert"
          className="overflow-hidden rounded-[34px] border border-destructive-border/80 bg-surface/95 shadow-[0_28px_64px_-16px_rgba(162,60,70,0.14)] backdrop-blur-md"
        >
          <div className="bg-gradient-to-br from-destructive-bg/65 via-surface to-secondary-light/40 px-6 pb-7 pt-8 text-center sm:px-8">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-destructive-border bg-destructive-bg px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-destructive-foreground">
              <CircleX
                solid
                aria-hidden="true"
                animated={false}
                className="size-3.5"
              />
              <span>Giao dịch gián đoạn</span>
            </div>

            <div className="relative mx-auto mt-5 flex size-20 items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-destructive-bg/80 ring-8 ring-destructive-bg/45"
              />
              <span className="relative flex size-16 items-center justify-center rounded-full border border-destructive-border bg-surface text-destructive-foreground shadow-sm">
                <CircleX
                  solid
                  aria-hidden="true"
                  animated={false}
                  className="size-9"
                />
              </span>
            </div>

            <h1 className="mt-5 font-display text-2xl font-bold text-foreground sm:text-3xl">
              {statusLabel}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Khoản thanh toán chưa được trừ hoặc đã bị hủy giữa chừng. Bạn có thể thử lại ngay hoặc kiểm tra sổ cái giao dịch.
            </p>
          </div>

          <div className="relative flex items-center bg-surface">
            <span
              aria-hidden="true"
              className="-ml-3.5 size-7 shrink-0 rounded-full border border-destructive-border/70 bg-background"
            />
            <div className="w-full border-t-2 border-dashed border-destructive-border/70" />
            <span
              aria-hidden="true"
              className="-mr-3.5 size-7 shrink-0 rounded-full border border-destructive-border/70 bg-background"
            />
          </div>

          <div className="space-y-4 px-6 pb-7 pt-5 sm:px-8">
            {orderId && (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-3 text-xs">
                <span className="text-muted-foreground">Mã đơn hàng</span>
                <span className="font-mono font-bold text-foreground">
                  {orderId}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row">
              {orderId && (
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  disabled={retrying}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
                >
                  <span className="inline-flex items-center">
                    <RefreshCw
                      aria-hidden="true"
                      animated={false}
                      className={`size-4 ${retrying ? "animate-spin" : ""}`}
                    />
                  </span>
                  <span>
                    {retrying ? "Đang mở lại PayPal..." : "Thử thanh toán lại"}
                  </span>
                </button>
              )}

              <Link
                href="/wallets/transactions"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-4 py-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                <Receipt aria-hidden="true" className="size-4" />
                <span>Lịch sử giao dịch</span>
              </Link>

              <Link
                href={redirectHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 py-3 text-xs font-bold text-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                <span>Quay lại</span>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
