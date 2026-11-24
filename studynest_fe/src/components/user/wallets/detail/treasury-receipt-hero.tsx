"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cloud,
  Coins,
  ShieldCheck,
  XCircle,
} from "pulsoicon-react";
import { Badge } from "@/components/ui";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import { cn } from "@/lib/utils";
import {
  formatCoinNumber,
  formatVnDateTime,
  formatVndCompact,
  getTransactionMethodLabel,
  getTransactionStatusMeta,
  getTransactionTypeLabel,
  isIncomingTransaction,
} from "../transactions/formatters";

interface TreasuryReceiptHeroProps {
  data: LecturerTransactionDetail;
}

export function TreasuryReceiptHero({ data }: TreasuryReceiptHeroProps) {
  const isIncome = isIncomingTransaction({
    direction: data.direction === "in" || data.direction === "out" ? data.direction : undefined,
    type: data.type,
  });
  const statusMeta = getTransactionStatusMeta(data.status);
  const typeLabel = getTransactionTypeLabel(data.type);
  const methodLabel = getTransactionMethodLabel(data.method, data.gateway);
  const statusLower = (data.status || "").toLowerCase();
  const isCompleted = statusLower === "completed" || statusLower === "approved";
  const isCanceled = statusLower === "canceled" || statusLower === "failed" || statusLower === "rejected";

  const StampIcon = isCompleted ? CheckCircle2 : isCanceled ? XCircle : Clock;
  const stampText = isCompleted ? "ĐÃ XÁC THỰC" : isCanceled ? "ĐÃ ĐÓNG LỆNH" : "ĐANG XỬ LÝ";

  const shortRef = (data.transaction_code || data.id || "").slice(0, 12).toUpperCase();

  return (
    <section
      aria-label="Chứng từ giao dịch kho bạc"
      className={cn(
        "relative isolate overflow-hidden rounded-[2rem] border bg-gradient-to-br p-6 shadow-[0_24px_48px_-12px_rgba(53,111,167,0.14)] sm:p-8",
        isIncome
          ? "border-success-border from-success-bg/75 via-surface to-accent-vanilla/55"
          : "border-primary-pastel from-primary-light/85 via-surface to-accent-vanilla/45",
      )}
    >
      {/* Đốm mây mờ pastel bay bổng */}
      <div
        aria-hidden="true"
        className="sky-drift pointer-events-none absolute -top-20 -left-16 -z-10 h-60 w-80 rounded-full bg-surface/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-16 -bottom-20 -z-10 h-64 w-80 rounded-full blur-3xl",
          isIncome ? "bg-success-border/40" : "bg-primary-pastel/45",
        )}
      />

      {/* Họa tiết vân sóng Guilloché kiểu chứng chỉ tài sản */}
      <svg
        aria-hidden="true"
        viewBox="0 0 720 260"
        fill="none"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-55"
      >
        <path
          d="M-30 215 C 120 140, 240 260, 400 165 C 530 90, 640 160, 750 60"
          stroke={isIncome ? "var(--color-success-border)" : "var(--color-primary-pastel)"}
          strokeWidth="1.6"
        />
        <path
          d="M-30 232 C 130 162, 250 272, 415 180 C 545 106, 650 178, 750 82"
          stroke="var(--color-accent-vanilla-border)"
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <circle
          cx="628"
          cy="58"
          r="44"
          stroke={isIncome ? "var(--color-success-border)" : "var(--color-primary-pastel)"}
          strokeWidth="1"
          strokeDasharray="3 5"
        />
      </svg>

      <Cloud
        aria-hidden="true"
        animated={false}
        strokeWidth={0.65}
        className="pointer-events-none absolute -right-6 -bottom-10 -z-10 size-48 -rotate-6 text-surface/75"
      />

      {/* Dòng đầu chứng từ */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-bold tracking-[0.12em] uppercase",
                isIncome
                  ? "border-success-border bg-success-bg text-success-foreground"
                  : "border-primary-pastel bg-primary-light text-primary",
              )}
            >
              {isIncome ? (
                <ArrowDownLeft aria-hidden="true" animated={false} className="size-3.5" />
              ) : (
                <ArrowUpRight aria-hidden="true" animated={false} className="size-3.5" />
              )}
              <span>{isIncome ? "Dòng tiền vào ví" : "Dòng tiền đầu tư"}</span>
            </span>
            <Badge variant={statusMeta.badgeVariant} size="sm">
              {statusMeta.label}
            </Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {typeLabel}
          </h1>
        </div>

        {/* Con dấu xác thực Kho Bạc */}
        <div
          aria-hidden="true"
          className={cn(
            "stamp-down inline-flex items-center gap-1.5 rounded-full border-2 border-dashed px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.14em] uppercase",
            isCompleted
              ? "border-success-foreground/40 bg-surface/80 text-success-foreground"
              : isCanceled
                ? "border-destructive/40 bg-surface/80 text-destructive-foreground"
                : "border-accent-vanilla-foreground/45 bg-surface/80 text-accent-vanilla-foreground",
          )}
        >
          <StampIcon animated={false} className="size-3.5" />
          <span>{stampText}</span>
        </div>
      </div>

      {/* Khối hiển thị số tiền Display cỡ lớn */}
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Giá trị ghi sổ tài sản
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
            <span
              className={cn(
                "font-display text-4xl font-bold tracking-tight tabular-nums sm:text-5xl",
                isIncome ? "text-success-foreground" : "text-primary",
              )}
            >
              {isIncome ? "+" : "-"}
              {formatCoinNumber(data.amount)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-3 py-1 text-sm font-extrabold text-accent-vanilla-foreground shadow-2xs">
              <Coins aria-hidden="true" animated={false} className="size-4" />
              Coin
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground tabular-nums">
            Giá trị quy đổi tương đương{" "}
            <strong className="font-bold text-foreground">
              {formatVndCompact(data.amount)}
            </strong>{" "}
            · Kênh {methodLabel}
          </p>
        </div>

        {/* Cuống số chứng từ & thời điểm */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 px-4 py-3 text-left shadow-xs backdrop-blur-sm sm:text-right">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-primary uppercase">
            <ShieldCheck aria-hidden="true" animated={false} className="size-3.5" />
            <span>Chứng từ #{shortRef}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-foreground tabular-nums">
            {formatVnDateTime(data.confirmed_at || data.created_at)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {data.confirmed_at ? "Đã chốt sổ kho bạc" : "Thời điểm khởi tạo lệnh"}
          </p>
        </div>
      </div>
    </section>
  );
}
