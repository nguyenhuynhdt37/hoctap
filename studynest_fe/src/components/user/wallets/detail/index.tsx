"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, FileText, Printer, RefreshCw } from "pulsoicon-react";
import useSWR from "swr";
import { Alert, Button, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import {
  formatVnDateTime,
  getTransactionMethodLabel,
  getTransactionTypeLabel,
} from "../transactions/formatters";
import { TransactionBreakdownCards } from "./transaction-breakdown-cards";
import { TransactionFlowTimeline } from "./transaction-flow-timeline";
import { TreasuryReceiptHero } from "./treasury-receipt-hero";
import { WealthInsightSidebar } from "./wealth-insight-sidebar";

interface Props {
  transactionId: string;
}

function LedgerCell({
  label,
  value,
  mono = false,
  copyKey,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyKey?: string;
  copiedField?: string | null;
  onCopy?: (field: string, text: string) => void;
}) {
  const canCopy = Boolean(copyKey && onCopy && value && value !== "—");
  const isCopied = Boolean(copyKey && copiedField === copyKey);

  return (
    <div className="rounded-2xl border border-border/80 bg-background/65 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        {canCopy && copyKey && onCopy && (
          <button
            type="button"
            onClick={() => onCopy(copyKey, value)}
            aria-label={`Sao chép ${label}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:border-primary-pastel hover:bg-primary-light cursor-pointer print:hidden"
          >
            {isCopied ? (
              <>
                <Check aria-hidden="true" animated={false} className="size-3 text-success-foreground" />
                <span className="text-success-foreground">Đã chép</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" animated={false} className="size-3" />
                <span>Chép</span>
              </>
            )}
          </button>
        )}
      </div>
      <p
        className={
          mono
            ? "mt-1.5 break-all font-mono text-xs font-semibold text-foreground"
            : "mt-1.5 text-xs font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function UserTransactionDetail({ transactionId }: Props) {
  const router = useRouter();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, error, isLoading, mutate } = useSWR<LecturerTransactionDetail>(
    `/user/transaction/${transactionId}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback((field: string, value: string) => {
    if (!value) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => {
          setCopiedField(field);
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(() => setCopiedField(null), 2000);
        })
        .catch(() => {
          // Bỏ qua nếu trình duyệt chặn clipboard trong ngữ cảnh không an toàn
        });
    }
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-label="Đang tải chi tiết giao dịch"
          className="mx-auto max-w-6xl space-y-6"
        >
          <Skeleton className="h-10 w-52 rounded-full motion-reduce:animate-none" />
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <Skeleton className="h-60 rounded-[2rem] motion-reduce:animate-none" />
              <Skeleton className="h-56 rounded-[24px] motion-reduce:animate-none" />
              <Skeleton className="h-64 rounded-[24px] motion-reduce:animate-none" />
            </div>
            <div className="space-y-5 lg:col-span-5">
              <Skeleton className="h-60 rounded-[28px] motion-reduce:animate-none" />
              <Skeleton className="h-56 rounded-[24px] motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-5 rounded-[28px] border border-border bg-surface p-7 shadow-xs">
          <Alert variant="destructive">
            Không thể tải thông tin chi tiết giao dịch. Giao dịch có thể không tồn tại hoặc bạn không có quyền xem.
          </Alert>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="min-h-11 rounded-full px-5"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              <span>Quay lại</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void mutate()}
              className="min-h-11 rounded-full px-5"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              <span>Thử tải lại</span>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const typeLabel = getTransactionTypeLabel(data.type);
  const methodLabel = getTransactionMethodLabel(data.method, data.gateway);
  const primaryRef = data.transaction_code || data.id;

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-20 pt-6">
      {/* Nền pastel mờ nhẹ đầu trang đồng bộ Trang chủ */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[28rem] bg-gradient-to-b from-primary-light/50 via-surface-muted/40 to-transparent print:hidden"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Thanh điều hướng & hành động nhanh */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/wallets/transactions"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-bold text-foreground shadow-2xs transition-all hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Quay lại lịch sử giao dịch</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy("top-ref", primaryRef)}
              className="min-h-10 rounded-full bg-surface px-4 text-xs font-bold"
            >
              {copiedField === "top-ref" ? (
                <>
                  <Check aria-hidden="true" className="size-3.5 text-success-foreground" />
                  <span className="text-success-foreground">Đã sao chép mã</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="size-3.5" />
                  <span>Sao chép mã</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="pastel"
              size="sm"
              onClick={handlePrint}
              className="min-h-10 rounded-full px-4 text-xs font-bold"
            >
              <Printer aria-hidden="true" className="size-3.5" />
              <span>In biên lai</span>
            </Button>
          </div>
        </div>

        {/* Bố cục 2 cột Editorial (7 trái / 5 phải) */}
        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI: Chứng từ kho bạc + Timeline + Phân tích chuyên biệt + Sổ đối chiếu */}
          <div className="space-y-6 lg:col-span-7 print:col-span-12">
            <TreasuryReceiptHero data={data} />

            <TransactionFlowTimeline data={data} />

            <TransactionBreakdownCards data={data} />

            {/* Sổ đối chiếu biên lai kiểu cuống giấy có đường đục lỗ */}
            <section
              aria-label="Sổ đối chiếu chi tiết giao dịch"
              className="relative overflow-hidden rounded-[24px] border border-border bg-surface shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-border-strong bg-background/50 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <FileText aria-hidden="true" animated={false} className="size-4 text-primary" />
                  <h2 className="font-display text-base font-bold text-foreground">
                    Sổ đối chiếu biên lai
                  </h2>
                </div>
                <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  {data.currency || "COIN"}
                </span>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
                <LedgerCell
                  label="Mã định danh (UUID)"
                  value={data.id}
                  mono
                  copyKey="uuid"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                />
                <LedgerCell label="Loại giao dịch" value={typeLabel} />
                <LedgerCell label="Phương thức" value={methodLabel} />
                <LedgerCell label="Cổng thanh toán" value={data.gateway || "Hệ thống Mây Mây"} />

                {data.transaction_code && (
                  <LedgerCell
                    label="Mã giao dịch hệ thống"
                    value={data.transaction_code}
                    mono
                    copyKey="tx-code"
                    copiedField={copiedField}
                    onCopy={handleCopy}
                  />
                )}

                {data.order_id && (
                  <LedgerCell
                    label="Mã đơn hàng (Order ID)"
                    value={data.order_id}
                    mono
                    copyKey="order-id"
                    copiedField={copiedField}
                    onCopy={handleCopy}
                  />
                )}

                <LedgerCell label="Thời gian khởi tạo" value={formatVnDateTime(data.created_at)} />
                <LedgerCell
                  label="Thời gian hoàn tất"
                  value={data.confirmed_at ? formatVnDateTime(data.confirmed_at) : "Chưa ghi nhận"}
                />

                <div className="sm:col-span-2">
                  <LedgerCell
                    label="Diễn giải giao dịch"
                    value={data.description?.trim() || "Không có ghi chú bổ sung"}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* CỘT PHẢI: Trạm Làm Giàu & Hành động tài sản */}
          <div className="lg:col-span-5">
            <WealthInsightSidebar
              data={data}
              copiedField={copiedField}
              onCopy={handleCopy}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
