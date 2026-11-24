"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  Check,
  Coins,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Percent,
  Power,
  Ticket,
  Trash2,
  Users,
} from "pulsoicon-react";
import { Badge } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { Discount } from "@/types/lecturer/discount";
import { cn } from "@/lib/utils";

interface VoucherCardGridProps {
  data: Discount[];
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, currentStatus: boolean) => void;
}

function getValidityMeta(discount: Discount): {
  label: string;
  variant: "success" | "warning" | "destructive" | "secondary" | "info";
} {
  if (!discount.is_active) return { label: "Đang tắt", variant: "secondary" };
  const now = Date.now();
  const start = new Date(discount.start_at).getTime();
  const end = new Date(discount.end_at).getTime();
  if (!Number.isNaN(end) && end <= now) return { label: "Hết hạn", variant: "destructive" };
  if (discount.usage_limit !== null && discount.usage_count >= discount.usage_limit) {
    return { label: "Hết lượt", variant: "warning" };
  }
  if (!Number.isNaN(start) && start > now) return { label: "Sắp chạy", variant: "info" };
  return { label: "Đang chạy", variant: "success" };
}

function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function VoucherCardGrid({
  data,
  onDelete,
  onToggleActive,
}: VoucherCardGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback((id: string, code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedId(id);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setCopiedId(null), 1800);
        })
        .catch(() => undefined);
    }
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((discount) => {
        const status = getValidityMeta(discount);
        const isPercent = discount.discount_type === "percent";
        const usagePct =
          discount.usage_limit && discount.usage_limit > 0
            ? Math.min(100, Math.round((discount.usage_count / discount.usage_limit) * 100))
            : null;
        const canDelete = discount.usage_count === 0;

        return (
          <article
            key={discount.id}
            className={cn(
              "group relative isolate flex flex-col overflow-hidden rounded-[24px] border bg-surface shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(53,111,167,0.16)] motion-reduce:hover:translate-y-0",
              discount.is_active ? "border-primary-pastel/85" : "border-border opacity-85",
            )}
          >
            {/* Thân trên kiểu Boarding Pass: Cánh trái (Mức giảm) + Cánh phải (Thông tin) */}
            <div className="grid flex-1 sm:grid-cols-[152px_minmax(0,1fr)]">
              {/* Cánh trái: Cuống mức giảm pastel */}
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center border-b border-dashed border-border-strong p-4 text-center sm:border-r sm:border-b-0",
                  isPercent
                    ? "bg-gradient-to-br from-primary-light/90 via-surface-muted/70 to-accent/45"
                    : "bg-gradient-to-br from-accent-vanilla/85 via-surface-muted/70 to-secondary-light/45",
                )}
              >
                {/* Vết khuyết bán nguyệt kiểu vé đục lỗ */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-3 -right-3 hidden size-6 rounded-full border border-border-strong bg-background sm:block"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-3 -bottom-3 hidden size-6 rounded-full border border-border-strong bg-background sm:block"
                />

                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl border bg-surface shadow-2xs",
                    isPercent
                      ? "border-primary-pastel text-primary"
                      : "border-accent-vanilla-border text-accent-vanilla-foreground",
                  )}
                >
                  {isPercent ? (
                    <Percent aria-hidden="true" animated={false} className="size-4" />
                  ) : (
                    <Coins aria-hidden="true" animated={false} className="size-4" />
                  )}
                </span>

                <p
                  className={cn(
                    "mt-2 font-display text-2xl font-bold tracking-tight tabular-nums",
                    isPercent ? "text-primary" : "text-accent-vanilla-foreground",
                  )}
                >
                  {isPercent
                    ? `-${discount.percent_value ?? 0}%`
                    : `-${formatVndAsCoin(discount.fixed_value ?? 0)}`}
                </p>

                <span className="mt-1 rounded-full bg-surface/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  {isPercent ? "Giảm phần trăm" : "Giảm trực tiếp"}
                </span>
              </div>

              {/* Cánh phải: Chi tiết mã & tiến độ lượt dùng */}
              <div className="flex min-w-0 flex-col justify-between gap-3 p-4 sm:p-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/lecturer/discounts/${discount.id}`}
                        className="line-clamp-1 font-display text-base font-bold text-foreground transition-colors hover:text-primary"
                      >
                        {discount.name}
                      </Link>
                      {discount.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {discount.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={status.variant} size="sm" className="shrink-0">
                      {status.label}
                    </Badge>
                  </div>

                  {/* Mã code copy 1 chạm + trạng thái ẩn/hiện */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(discount.id, discount.discount_code)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary-pastel bg-primary-light/55 px-3 py-1 font-mono text-xs font-extrabold text-primary transition-colors hover:bg-primary-light cursor-pointer"
                    >
                      <Ticket aria-hidden="true" animated={false} className="size-3.5" />
                      <span>{discount.discount_code}</span>
                      {copiedId === discount.id ? (
                        <Check
                          aria-hidden="true"
                          animated={false}
                          className="size-3.5 text-success-foreground"
                        />
                      ) : (
                        <Copy aria-hidden="true" animated={false} className="size-3" />
                      )}
                    </button>

                    {discount.is_hidden && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        <EyeOff aria-hidden="true" animated={false} className="size-3" />
                        Mã riêng tư
                      </span>
                    )}
                  </div>
                </div>

                {/* Thời gian + tiến độ lượt dùng */}
                <div className="space-y-2 border-t border-border/60 pt-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar aria-hidden="true" animated={false} className="size-3 text-primary" />
                      {formatDateShort(discount.start_at)} → {formatDateShort(discount.end_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground tabular-nums">
                      <Users aria-hidden="true" animated={false} className="size-3 text-primary" />
                      {discount.usage_count}
                      {discount.usage_limit ? ` / ${discount.usage_limit} lượt` : " lượt"}
                    </span>
                  </div>

                  {usagePct !== null && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer thao tác nhanh */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-background/60 px-4 py-2.5">
              <button
                type="button"
                onClick={() => onToggleActive?.(discount.id, discount.is_active)}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer",
                  discount.is_active
                    ? "border-success-border bg-success-bg/75 text-success-foreground hover:bg-success-bg"
                    : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
                )}
              >
                <Power aria-hidden="true" animated={false} className="size-3.5" />
                <span>{discount.is_active ? "Đang bật" : "Đang tắt"}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <Link
                  href={`/lecturer/discounts/${discount.id}`}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                >
                  <Eye aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Chi tiết</span>
                </Link>
                <Link
                  href={`/lecturer/discounts/${discount.id}/edit`}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                >
                  <Pencil aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Sửa</span>
                </Link>
                {onDelete && canDelete && (
                  confirmDeleteId === discount.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(discount.id);
                        setConfirmDeleteId(null);
                      }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-destructive-border bg-destructive px-3 text-xs font-bold text-primary-foreground cursor-pointer"
                    >
                      Xác nhận xóa
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(discount.id)}
                      aria-label={`Xóa mã ${discount.discount_code}`}
                      className="grid size-8 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-destructive-border hover:bg-destructive-bg hover:text-destructive-foreground cursor-pointer"
                    >
                      <Trash2 aria-hidden="true" animated={false} className="size-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
