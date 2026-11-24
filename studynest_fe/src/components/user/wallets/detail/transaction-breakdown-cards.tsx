"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Coins,
  CreditCard,
  RotateCcw,
  Tag,
  TrendingUp,
  Wallet,
} from "pulsoicon-react";
import { Badge } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import {
  formatCoinWithUnit,
  formatVnDateTime,
  getTransactionStatusMeta,
} from "../transactions/formatters";

interface TransactionBreakdownCardsProps {
  data: LecturerTransactionDetail;
}

export function TransactionBreakdownCards({ data }: TransactionBreakdownCardsProps) {
  const hasAnySection = Boolean(
    data.purchase || data.income || data.deposit || data.refund || data.withdraw,
  );
  if (!hasAnySection) return null;

  return (
    <div className="space-y-5">
      {/* 1. Thẻ Tài Sản Tri Thức (Mua khóa học) */}
      {data.purchase && (
        <section
          aria-label="Thông tin tài sản khóa học"
          className="overflow-hidden rounded-[24px] border border-primary-pastel/80 bg-surface shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-primary-light/45 px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-2">
              <BookOpen aria-hidden="true" animated={false} className="size-4 text-primary" />
              <h2 className="font-display text-base font-bold text-foreground">
                Tài sản tri thức đã đầu tư
              </h2>
            </div>
            <Badge variant="info" size="sm">
              {data.purchase.status}
            </Badge>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {data.course && (
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background/70 p-3.5 sm:flex-row sm:items-center">
                {data.course.thumbnail ? (
                  <img
                    src={getImageUrl(data.course.thumbnail)}
                    alt={data.course.title}
                    className="h-24 w-full shrink-0 rounded-xl border border-border object-cover sm:h-20 sm:w-32"
                  />
                ) : (
                  <div className="grid h-20 w-32 shrink-0 place-items-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                    <BookOpen aria-hidden="true" animated={false} className="size-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] font-bold tracking-wider text-primary uppercase">
                    Khóa học sở hữu trọn đời
                  </p>
                  <h3 className="text-sm font-bold text-foreground sm:text-base">
                    {data.course.title}
                  </h3>
                  <Link
                    href={`/learning/${data.course.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <span>Vào học ngay</span>
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Phân tích giá gốc / ưu đãi / thực trả */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/60 p-3.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Học phí niêm yết</p>
                <p className="mt-1 font-display text-lg font-bold text-foreground tabular-nums">
                  {formatCoinWithUnit(data.purchase.original_price)}
                </p>
              </div>

              <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-3.5">
                <p className="text-[11px] font-semibold text-success-foreground">
                  Tiết kiệm được
                </p>
                <p className="mt-1 font-display text-lg font-bold text-success-foreground tabular-nums">
                  {data.purchase.discount_amount > 0
                    ? `-${formatCoinWithUnit(data.purchase.discount_amount)}`
                    : "0 Coin"}
                </p>
              </div>

              <div className="rounded-2xl border border-primary-pastel bg-primary-light/55 p-3.5">
                <p className="text-[11px] font-semibold text-primary">Thực thanh toán</p>
                <p className="mt-1 font-display text-lg font-bold text-primary tabular-nums">
                  {formatCoinWithUnit(data.purchase.discounted_price)}
                </p>
              </div>
            </div>

            {data.discount && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-accent-border bg-accent/45 px-4 py-2.5 text-xs font-semibold text-accent-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Tag aria-hidden="true" animated={false} className="size-3.5" />
                  Mã ưu đãi đã áp dụng:
                </span>
                <span className="rounded-full bg-surface px-2.5 py-0.5 font-mono font-bold">
                  {data.discount.code} ({data.discount.type})
                </span>
              </div>
            )}

            {data.refund_request && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-warning-border bg-warning-bg/70 px-4 py-3 text-xs font-semibold text-warning-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <RotateCcw aria-hidden="true" animated={false} className="size-3.5" />
                  Yêu cầu hoàn học phí ({data.refund_request.status})
                </span>
                <span className="font-bold tabular-nums">
                  {formatCoinWithUnit(data.refund_request.amount)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Thẻ Chia Sẻ Doanh Thu (Thu nhập giảng dạy) */}
      {data.income && (
        <section
          aria-label="Phân bổ thù lao giảng dạy"
          className="overflow-hidden rounded-[24px] border border-success-border/80 bg-surface shadow-xs"
        >
          <div className="flex items-center gap-2 border-b border-border/70 bg-success-bg/50 px-5 py-3.5 sm:px-6">
            <TrendingUp aria-hidden="true" animated={false} className="size-4 text-success-foreground" />
            <h2 className="font-display text-base font-bold text-foreground">
              Phân bổ dòng tiền giảng dạy
            </h2>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {(() => {
              const total =
                Math.max(0, data.income.amount_instructor) +
                Math.max(0, data.income.amount_platform);
              const instructorPct =
                total > 0 ? Math.round((data.income.amount_instructor / total) * 100) : 100;
              const platformPct = Math.max(0, 100 - instructorPct);

              return (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-success-foreground">
                        Thù lao giảng viên ({instructorPct}%)
                      </span>
                      <span className="text-muted-foreground">
                        Phí nền tảng ({platformPct}%)
                      </span>
                    </div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-background p-0.5 ring-1 ring-border">
                      <div
                        className="h-full rounded-l-full bg-success-foreground transition-all"
                        style={{ width: `${instructorPct}%` }}
                      />
                      <div
                        className="h-full rounded-r-full bg-primary-pastel transition-all"
                        style={{ width: `${platformPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-success-border bg-success-bg/55 p-3.5">
                      <p className="text-[11px] font-semibold text-success-foreground">
                        Thực nhận về ví
                      </p>
                      <p className="mt-1 font-display text-xl font-bold text-success-foreground tabular-nums">
                        +{formatCoinWithUnit(data.income.amount_instructor)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/70 p-3.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Phí duy trì nền tảng
                      </p>
                      <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">
                        {formatCoinWithUnit(data.income.amount_platform)}
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* 3. Thẻ Nạp PayPal */}
      {data.deposit && (
        <section
          aria-label="Thông tin nạp Coin qua cổng thanh toán"
          className="rounded-[24px] border border-primary-pastel/80 bg-surface p-5 shadow-xs sm:p-6"
        >
          <div className="mb-3.5 flex items-center gap-2">
            <CreditCard aria-hidden="true" animated={false} className="size-4 text-primary" />
            <h2 className="font-display text-base font-bold text-foreground">
              Chứng từ nạp qua cổng PayPal
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">PayPal Order ID</dt>
              <dd className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                {data.deposit.paypal_order_id || "—"}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">PayPal Capture ID</dt>
              <dd className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                {data.deposit.paypal_capture_id || "—"}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">Nguồn nạp</dt>
              <dd className="mt-1 text-xs font-bold text-foreground">
                {data.deposit.from || "PayPal"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* 4. Thẻ Hoàn Tiền */}
      {data.refund && (
        <section
          aria-label="Thông tin hoàn tiền"
          className="rounded-[24px] border border-info-border bg-surface p-5 shadow-xs sm:p-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RotateCcw aria-hidden="true" animated={false} className="size-4 text-primary" />
              <h2 className="font-display text-base font-bold text-foreground">
                Chi tiết hoàn tiền bảo toàn
              </h2>
            </div>
            <Badge variant={getTransactionStatusMeta(data.refund.status).badgeVariant} size="sm">
              {getTransactionStatusMeta(data.refund.status).label}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/60 p-3.5">
              <p className="text-[11px] font-semibold text-muted-foreground">Mã yêu cầu hoàn</p>
              <p className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                {data.refund.refund_id}
              </p>
            </div>
            <div className="rounded-2xl border border-success-border bg-success-bg/55 p-3.5">
              <p className="text-[11px] font-semibold text-success-foreground">Số Coin hoàn về ví</p>
              <p className="mt-1 font-display text-lg font-bold text-success-foreground tabular-nums">
                +{formatCoinWithUnit(data.refund.refund_amount)}
              </p>
            </div>
          </div>
          {data.refund.reason && (
            <p className="mt-3 rounded-2xl border border-border bg-background/60 px-3.5 py-2.5 text-xs text-muted-foreground">
              <strong className="font-semibold text-foreground">Lý do: </strong>
              {data.refund.reason}
            </p>
          )}
        </section>
      )}

      {/* 5. Thẻ Rút Tiền */}
      {data.withdraw && (
        <section
          aria-label="Thông tin rút tiền"
          className="rounded-[24px] border border-accent-vanilla-border bg-surface p-5 shadow-xs sm:p-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet
                aria-hidden="true"
                animated={false}
                className="size-4 text-accent-vanilla-foreground"
              />
              <h2 className="font-display text-base font-bold text-foreground">
                Lệnh rút tài sản
              </h2>
            </div>
            <Badge variant={getTransactionStatusMeta(data.withdraw.status).badgeVariant} size="sm">
              {getTransactionStatusMeta(data.withdraw.status).label}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/60 p-3.5">
              <p className="text-[11px] font-semibold text-muted-foreground">Mã lệnh rút</p>
              <p className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                {data.withdraw.withdrawal_id}
              </p>
            </div>
            <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/50 p-3.5">
              <p className="text-[11px] font-semibold text-accent-vanilla-foreground">
                Giá trị lệnh rút
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-lg font-bold text-foreground tabular-nums">
                <Coins aria-hidden="true" animated={false} className="size-4 text-accent-vanilla-foreground" />
                {formatCoinWithUnit(data.withdraw.amount)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Yêu cầu lúc{" "}
            <strong className="font-semibold text-foreground tabular-nums">
              {formatVnDateTime(data.withdraw.requested_at)}
            </strong>
          </p>
        </section>
      )}
    </div>
  );
}
