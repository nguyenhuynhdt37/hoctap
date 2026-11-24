"use client";

import { CoinBadge } from "@/components/ui";
import {
  DEFAULT_COIN_VND_RATE,
  type CoinBalances,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import type {
  MonthlyCashflowPoint,
  WalletTransactionSummary,
} from "@/types/user/wallet";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  BarChart3,
  Clock,
  Coins,
  Download,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
} from "pulsoicon-react";
import {
  formatCoinNumber,
  formatCoinWithUnit,
  formatVnDateTime,
  formatVndCompact,
} from "./formatters";

interface CashflowHeroProps {
  summary?: WalletTransactionSummary | null;
  coins?: CoinBalances;
  rateVnd?: number;
  totalFiltered: number;
  canExport: boolean;
  retryOrderId: string | null;
  onExportCsv: () => void;
  onQuickFilter: (preset: "in" | "purchase" | "refund" | "pending") => void;
  onRetryOrder: (orderId: string) => void;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

export function CashflowHero({
  summary,
  coins,
  rateVnd = DEFAULT_COIN_VND_RATE,
  totalFiltered,
  canExport,
  retryOrderId,
  onExportCsv,
  onQuickFilter,
  onRetryOrder,
}: CashflowHeroProps) {
  const months: MonthlyCashflowPoint[] = summary?.monthly_cashflow ?? [];
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);

  const selectedMonth = useMemo(() => {
    if (months.length === 0) return null;
    if (activeMonthKey) {
      const found = months.find((m) => m.key === activeMonthKey);
      if (found) return found;
    }
    // Ưu tiên tháng gần nhất có giao dịch, nếu không lấy tháng cuối
    for (let i = months.length - 1; i >= 0; i -= 1) {
      if (months[i].in_vnd > 0 || months[i].out_vnd > 0) return months[i];
    }
    return months[months.length - 1];
  }, [months, activeMonthKey]);

  const maxMonthVnd = useMemo(() => {
    let max = 0;
    for (const m of months) {
      if (m.in_vnd > max) max = m.in_vnd;
      if (m.out_vnd > max) max = m.out_vnd;
    }
    return max;
  }, [months]);

  const totalIn = summary?.total_in_vnd ?? 0;
  const totalOut = summary?.total_out_vnd ?? 0;
  const netVnd = summary?.net_vnd ?? 0;
  const flowSum = totalIn + totalOut;
  const inPercent = flowSum > 0 ? Math.round((totalIn / flowSum) * 100) : 50;
  const outPercent = flowSum > 0 ? 100 - inPercent : 50;

  const purchaseStat = summary?.by_type.find((item) => item.type === "purchase");
  const refundStat = summary?.by_type.find((item) => item.type === "refund");
  const pendingCount = summary?.counts.pending ?? 0;
  const completedCount = summary?.counts.completed ?? 0;
  const totalCount = summary?.counts.all ?? totalFiltered;

  const goldBalance = coins?.paid;
  const whiteBalance = coins?.bonus;

  return (
    <div className="space-y-5">
      {/* Header điều hướng tinh gọn */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-primary-light/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Coins solid aria-hidden="true" animated={false} className="size-3.5" />
            <span>Sổ cái dòng tiền Mây</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Lịch sử giao dịch
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Quan sát toàn cảnh dòng chảy Coin vàng &amp; Coin trắng, phân tích thu chi 6 tháng và tra cứu biên nhận tức thì.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!canExport}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground shadow-2xs transition-all duration-200 hover:border-primary-pastel hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <span className="inline-flex items-center">
              <Download aria-hidden="true" className="size-3.5" />
            </span>
            <span>Xuất sao kê</span>
          </button>

          <Link
            href="/wallets"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground shadow-2xs transition-all duration-200 hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            <span>Quay lại Ví</span>
          </Link>
        </div>
      </div>

      {/* TẦNG 1: Hero 2 Cột Bất Đối Xứng */}
      <div className="grid gap-5 lg:grid-cols-[1.28fr_1fr]">
        {/* Trái: Kho Bạc & Dòng Tiền (Cloudy Blue Pastel Sáng) */}
        <section
          aria-label="Tổng quan tài sản và dòng tiền"
          className="relative isolate flex flex-col justify-between overflow-hidden rounded-[30px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/45 p-6 text-foreground shadow-[0_20px_44px_-16px_rgba(53,111,167,0.16)] sm:p-7"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-14 -z-10 h-56 w-56 rounded-full bg-white/80 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 -z-10 h-56 w-56 rounded-full bg-primary-pastel/35 blur-3xl"
          />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CoinBadge kind="gold" size="sm" />
                {whiteBalance !== undefined && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                    <Coins aria-hidden="true" animated={false} className="size-3 text-muted-foreground" />
                    <span>{numberFormat.format(whiteBalance)} Coin trắng</span>
                  </span>
                )}
              </div>

              <div className="pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Số dư khả dụng hiện tại
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <p className="inline-flex items-center gap-2.5 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl tabular-nums">
                    <Coins
                      solid
                      aria-hidden="true"
                      animated={false}
                      className="size-8 shrink-0 text-warning-foreground sm:size-9"
                    />
                    <span>
                      {goldBalance !== undefined
                        ? numberFormat.format(goldBalance)
                        : "…"}
                    </span>
                  </p>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {totalCount} giao dịch ({completedCount} thành công)
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/wallets"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-2xs transition-all hover:bg-primary-hover"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              <span>Nạp thêm Coin</span>
            </Link>
          </div>

          {/* Thanh tỷ lệ Dòng tiền Vào / Ra */}
          <div className="mt-6 space-y-3 rounded-2xl border border-border bg-surface/90 p-4 shadow-2xs backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp aria-hidden="true" animated={false} className="size-4 text-primary" />
                <span className="font-bold text-foreground">Cán cân dòng tiền</span>
              </div>
              <span className="font-bold text-primary tabular-nums">
                Ròng: {netVnd >= 0 ? "+" : "-"}
                {formatCoinWithUnit(netVnd, rateVnd)}
              </span>
            </div>

            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-primary-light">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${inPercent}%` }}
                title={`Tiền vào: ${inPercent}%`}
              />
              <div
                className="h-full bg-secondary-pastel transition-all duration-500"
                style={{ width: `${outPercent}%` }}
                title={`Tiền ra: ${outPercent}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-0.5 text-xs">
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" />
                  <span>Tổng vào ({inPercent}%)</span>
                </span>
                <strong className="mt-0.5 text-sm font-bold text-primary tabular-nums">
                  +{formatCoinWithUnit(totalIn, rateVnd)}
                </strong>
                <span className="text-[11px] text-subtle-foreground tabular-nums">
                  ≈ {formatVndCompact(totalIn)}
                </span>
              </div>

              <div className="flex flex-col text-right">
                <span className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                  <span>Tổng ra ({outPercent}%)</span>
                  <span className="size-2 rounded-full bg-secondary-pastel border border-secondary-foreground/30" />
                </span>
                <strong className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  -{formatCoinWithUnit(totalOut, rateVnd)}
                </strong>
                <span className="text-[11px] text-subtle-foreground tabular-nums">
                  ≈ {formatVndCompact(totalOut)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Phải: Biểu đồ Nhịp Dòng Tiền 6 Tháng */}
        <section
          aria-label="Biểu đồ nhịp dòng tiền 6 tháng gần nhất"
          className="flex flex-col justify-between rounded-[30px] border border-border bg-surface p-6 shadow-xs sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <BarChart3 aria-hidden="true" animated={false} className="size-3.5" />
                <span>Nhịp dòng tiền 6 tháng</span>
              </p>
              <h2 className="mt-1 text-base font-bold text-foreground">
                {selectedMonth ? selectedMonth.full_label : "Biến động theo tháng"}
              </h2>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" />
                <span>Vào</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-secondary-pastel border border-secondary-foreground/25" />
                <span>Ra</span>
              </span>
            </div>
          </div>

          {/* Tóm tắt tháng đang chọn */}
          {selectedMonth && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-background/80 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-3 tabular-nums">
                <span className="font-semibold text-primary">
                  +{formatCoinNumber(selectedMonth.in_vnd, rateVnd)} Coin
                </span>
                <span className="text-border">|</span>
                <span className="font-semibold text-secondary-foreground">
                  -{formatCoinNumber(selectedMonth.out_vnd, rateVnd)} Coin
                </span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {selectedMonth.count} giao dịch
              </span>
            </div>
          )}

          {/* Biểu đồ cột đôi */}
          <div className="mt-5 flex h-40 items-end justify-between gap-2.5 px-1">
            {months.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 text-xs text-muted-foreground">
                Chưa có dữ liệu dòng tiền trong 6 tháng qua
              </div>
            ) : (
              months.map((m) => {
                const isSelected = selectedMonth?.key === m.key;
                const inH =
                  maxMonthVnd > 0 && m.in_vnd > 0
                    ? Math.max(10, Math.round((m.in_vnd / maxMonthVnd) * 100))
                    : 4;
                const outH =
                  maxMonthVnd > 0 && m.out_vnd > 0
                    ? Math.max(10, Math.round((m.out_vnd / maxMonthVnd) * 100))
                    : 4;

                return (
                  <button
                    key={m.key}
                    type="button"
                    onMouseEnter={() => setActiveMonthKey(m.key)}
                    onFocus={() => setActiveMonthKey(m.key)}
                    onClick={() => setActiveMonthKey(m.key)}
                    className={`group flex h-full flex-1 flex-col items-center justify-end gap-2 rounded-2xl px-1.5 py-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary-light/65 ring-1 ring-primary-pastel"
                        : "hover:bg-background"
                    }`}
                    aria-label={`${m.full_label}: vào ${vndToCoin(m.in_vnd, rateVnd)} Coin, ra ${vndToCoin(m.out_vnd, rateVnd)} Coin`}
                  >
                    <div className="flex h-28 w-full items-end justify-center gap-1.5">
                      <div
                        className={`w-2.5 rounded-t-full transition-all duration-300 sm:w-3 ${
                          m.in_vnd > 0
                            ? isSelected
                              ? "bg-primary shadow-2xs"
                              : "bg-primary/70 group-hover:bg-primary"
                            : "bg-border/60"
                        }`}
                        style={{ height: `${inH}%` }}
                      />
                      <div
                        className={`w-2.5 rounded-t-full transition-all duration-300 sm:w-3 ${
                          m.out_vnd > 0
                            ? isSelected
                              ? "bg-secondary-foreground/75 shadow-2xs"
                              : "bg-secondary-pastel group-hover:bg-secondary-foreground/65"
                            : "bg-border/50"
                        }`}
                        style={{ height: `${outH}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* TẦNG 2: Bento 4 Chỉ Số Nhanh (Click để lọc 1 chạm) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onQuickFilter("in")}
          className="group flex items-center justify-between gap-3 rounded-[24px] border border-border bg-surface p-4 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-sm cursor-pointer"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng nạp &amp; thu vào
            </p>
            <p className="mt-1 text-lg font-bold text-primary tabular-nums">
              +{formatCoinWithUnit(totalIn, rateVnd)}
            </p>
            <p className="mt-0.5 text-[11px] text-subtle-foreground">
              Nhấn để lọc tiền vào
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel/70 bg-primary-light text-primary transition-transform group-hover:scale-105">
            <ArrowDownLeft aria-hidden="true" animated={false} className="size-5" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onQuickFilter("purchase")}
          className="group flex items-center justify-between gap-3 rounded-[24px] border border-border bg-surface p-4 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-border hover:shadow-sm cursor-pointer"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Đầu tư học tập
            </p>
            <p className="mt-1 text-lg font-bold text-foreground tabular-nums">
              {formatCoinWithUnit(purchaseStat?.amount_vnd ?? 0, rateVnd)}
            </p>
            <p className="mt-0.5 text-[11px] text-subtle-foreground tabular-nums">
              {purchaseStat?.count ?? 0} giao dịch khóa học
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-accent-border bg-accent/65 text-accent-foreground transition-transform group-hover:scale-105">
            <ShoppingBag aria-hidden="true" animated={false} className="size-5" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onQuickFilter("refund")}
          className="group flex items-center justify-between gap-3 rounded-[24px] border border-border bg-surface p-4 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-success-border hover:shadow-sm cursor-pointer"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hoàn tiền nhận lại
            </p>
            <p className="mt-1 text-lg font-bold text-success-foreground tabular-nums">
              +{formatCoinWithUnit(refundStat?.amount_vnd ?? 0, rateVnd)}
            </p>
            <p className="mt-0.5 text-[11px] text-subtle-foreground tabular-nums">
              {refundStat?.count ?? 0} lần hoàn học phí
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-success-border bg-success-bg text-success-foreground transition-transform group-hover:scale-105">
            <RotateCcw aria-hidden="true" animated={false} className="size-5" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onQuickFilter("pending")}
          className={`group flex items-center justify-between gap-3 rounded-[24px] border p-4 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer ${
            pendingCount > 0
              ? "border-warning-border bg-warning-bg/60 hover:border-accent-vanilla-border"
              : "border-border bg-surface hover:border-primary-pastel"
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Đang chờ xử lý
            </p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                pendingCount > 0 ? "text-warning-foreground" : "text-foreground"
              }`}
            >
              {pendingCount} đơn
            </p>
            <p className="mt-0.5 text-[11px] text-subtle-foreground">
              {pendingCount > 0
                ? "Có thể thanh toán lại"
                : "Không có đơn chờ"}
            </p>
          </div>
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105 ${
              pendingCount > 0
                ? "border-warning-border bg-accent-vanilla text-warning-foreground"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            <Clock aria-hidden="true" animated={false} className="size-5" />
          </span>
        </button>
      </div>

      {/* Smart Pending Strip: chỉ hiện khi có giao dịch PayPal chờ xử lý */}
      {summary && summary.pending_orders.length > 0 && (
        <div className="rounded-[24px] border border-accent-vanilla-border bg-accent-vanilla/50 p-4 shadow-2xs">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-surface text-warning-foreground">
                <Clock aria-hidden="true" animated={false} className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-warning-foreground">
                  Bạn có {summary.pending_orders.length} giao dịch PayPal đang chờ hoàn tất
                </p>
                <p className="mt-0.5 text-xs text-warning-foreground/80">
                  Giao dịch chưa hoàn tất sẽ tự động hủy sau 3 giờ kể từ lúc khởi tạo.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {summary.pending_orders.map((order) => {
                const isRetrying = retryOrderId === order.order_id;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onRetryOrder(order.order_id)}
                    disabled={isRetrying}
                    className="inline-flex items-center gap-2 rounded-full border border-warning-border bg-surface px-3.5 py-2 text-xs font-semibold text-warning-foreground shadow-2xs transition hover:bg-warning-bg disabled:opacity-60 cursor-pointer"
                    title={`Tạo lúc ${formatVnDateTime(order.created_at)}`}
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
                        ? "Đang mở PayPal..."
                        : `Thanh toán lại ${formatCoinWithUnit(order.amount, rateVnd)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
