"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Eye,
  Lock,
  Percent,
  Scale,
  TrendingUp,
} from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Button } from "@/components/ui";
import type { PlatformWalletOverview } from "@/types/admin/wallet";
import {
  WalletAdminNav,
  WalletTypeIcon,
  formatShortDay,
  formatWalletCoin,
  formatWalletDateTime,
  getWalletTypeMeta,
} from "./wallet-visuals";

interface AdminWalletsProps {
  data: PlatformWalletOverview;
}

export default function AdminWallets({ data }: AdminWalletsProps) {
  const router = useRouter();
  const {
    wallet,
    recent_history,
    type_breakdown = [],
    daily_cashflow = [],
    escrow_summary,
    reconciliation,
  } = data;

  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuHistoryId, setMenuHistoryId] = useState<string | null>(null);
  const [menuHistoryTxn, setMenuHistoryTxn] = useState<string | null>(null);

  const openContextMenu = (
    e: React.MouseEvent,
    historyId: string,
    relatedTxn?: string | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuHistoryId(historyId);
    setMenuHistoryTxn(relatedTxn || null);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const availableBalance =
    reconciliation?.available_balance ??
    Math.max(0, wallet.balance - wallet.holding_amount);
  const availablePct =
    wallet.balance > 0
      ? Math.min(100, Math.max(0, Math.round((availableBalance / wallet.balance) * 100)))
      : 100;
  const holdingPct = 100 - availablePct;

  const maxDailyValue = useMemo(() => {
    return Math.max(
      1,
      ...daily_cashflow.map((d) => Math.max(d.in_amount, d.out_amount)),
    );
  }, [daily_cashflow]);

  const activeDay =
    selectedDayIndex !== null
      ? daily_cashflow[selectedDayIndex]
      : daily_cashflow[daily_cashflow.length - 1] ?? null;

  const maxBreakdownAmount = useMemo(() => {
    return Math.max(1, ...type_breakdown.map((b) => Math.abs(b.total_amount)));
  }, [type_breakdown]);

  const holdingItems = escrow_summary?.holding_items ?? [];
  const escrowHoldingStat = escrow_summary?.by_status?.holding;
  const escrowPaidStat = escrow_summary?.by_status?.paid;
  const escrowRefundedStat = escrow_summary?.by_status?.refunded;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      <WalletAdminNav totalLogs={reconciliation?.total_logs} />

      {/* Treasury Vault Hero — Cloudy Blue Pastel Sky */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/95 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-white/75 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/4 h-52 w-52 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-2xs">
                <Coins size={13} animated={false} />
                Mây Mây Treasury Observatory
              </span>
              {reconciliation && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                    reconciliation.is_balanced
                      ? "border-success-border bg-success-bg text-success-foreground"
                      : "border-warning-border bg-warning-bg text-warning-foreground"
                  }`}
                >
                  {reconciliation.is_balanced ? (
                    <CheckCircle2 size={13} animated={false} />
                  ) : (
                    <AlertTriangle size={13} animated={false} />
                  )}
                  {reconciliation.is_balanced
                    ? "Đối soát khớp 100%"
                    : `Lệch đối soát: ${formatWalletCoin(reconciliation.delta)}`}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Kho bạc &amp; Sổ cái Ví Nền tảng
            </h1>

            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Tổng số dư kho bạc
                </p>
                <p className="mt-0.5 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  {formatWalletCoin(wallet.balance)}
                </p>
              </div>
              <div className="border-l border-border/80 pl-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Khả dụng thực tế
                </p>
                <p className="mt-0.5 text-xl font-bold text-foreground">
                  {formatWalletCoin(availableBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(wallet.id, "Wallet ID")}
              >
                <Copy size={14} />
                ID: {wallet.id.slice(0, 8)}...
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/admin/wallets/transactions")}
              >
                <Eye size={15} />
                Mở Sổ cái đầy đủ
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={13} animated={false} />
              Cập nhật lần cuối: {formatWalletDateTime(wallet.updated_at)}
            </p>
          </div>
        </div>

        {/* Liquidity Allocation Bar */}
        <div className="relative z-10 mt-6 rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">
              Cấu trúc Thanh khoản Ví
            </span>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Khả dụng ({availablePct}%) · {formatWalletCoin(availableBalance)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent-vanilla-border" />
                Đang tạm giữ Escrow ({holdingPct}%) ·{" "}
                {formatWalletCoin(wallet.holding_amount)}
              </span>
            </div>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${availablePct}%` }}
            />
            <div
              className="h-full bg-accent-vanilla-border transition-all duration-500"
              style={{ width: `${holdingPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* 4 Glass KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-success-border/70 bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)]">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-success-border bg-success-bg text-success-foreground">
              <ArrowDownLeft size={20} />
            </span>
            <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
              Dòng tiền vào
            </span>
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            Tổng tiền vào tích lũy
          </p>
          <p className="mt-1 text-2xl font-bold text-success-foreground">
            {formatWalletCoin(wallet.total_in)}
          </p>
        </div>

        <div className="rounded-3xl border border-destructive-border/70 bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)]">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-destructive-border bg-destructive-bg text-destructive-foreground">
              <ArrowUpRight size={20} />
            </span>
            <span className="rounded-full bg-destructive-bg px-2.5 py-0.5 text-[11px] font-semibold text-destructive-foreground">
              Dòng tiền ra
            </span>
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            Tổng tiền chi trả &amp; hoàn
          </p>
          <p className="mt-1 text-2xl font-bold text-destructive-foreground">
            {formatWalletCoin(wallet.total_out)}
          </p>
        </div>

        <div className="rounded-3xl border border-accent-border/80 bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)]">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-border bg-accent text-accent-foreground">
              <Percent size={20} />
            </span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
              Doanh thu sàn
            </span>
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            Tổng phí nền tảng đã chốt
          </p>
          <p className="mt-1 text-2xl font-bold text-accent-foreground">
            {formatWalletCoin(wallet.platform_fee_total)}
          </p>
        </div>

        <div className="rounded-3xl border border-accent-vanilla-border/90 bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)]">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground">
              <Lock size={20} />
            </span>
            <span className="rounded-full bg-accent-vanilla px-2.5 py-0.5 text-[11px] font-semibold text-accent-vanilla-foreground">
              {escrowHoldingStat?.count ?? holdingItems.length} khoản giữ
            </span>
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            Đang tạm giữ Escrow
          </p>
          <p className="mt-1 text-2xl font-bold text-accent-vanilla-foreground">
            {formatWalletCoin(wallet.holding_amount)}
          </p>
        </div>
      </section>

      {/* Cashflow Chart + Type Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 14-Day Cashflow Bar Chart */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.12)] lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <TrendingUp size={18} className="text-primary" />
                Nhịp Dòng Tiền Theo Ngày
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                14 ngày phát sinh giao dịch gần nhất (bấm vào từng cột để xem chi tiết ngày đó)
              </p>
            </div>
            {activeDay && (
              <div className="rounded-2xl border border-primary-pastel/70 bg-primary-light/55 px-3.5 py-2 text-right text-xs">
                <div className="font-semibold text-primary">
                  Ngày {formatShortDay(activeDay.date)} · {activeDay.tx_count} lệnh
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px]">
                  <span className="font-medium text-success-foreground">
                    +{formatWalletCoin(activeDay.in_amount)}
                  </span>
                  <span className="font-medium text-destructive-foreground">
                    -{formatWalletCoin(activeDay.out_amount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {daily_cashflow.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu dòng tiền theo ngày.
            </div>
          ) : (
            <div className="mt-6 flex h-56 items-end gap-2 overflow-x-auto pb-2 pt-4">
              {daily_cashflow.map((day, idx) => {
                const inH =
                  day.in_amount > 0
                    ? Math.max(8, Math.round((day.in_amount / maxDailyValue) * 100))
                    : 0;
                const outH =
                  day.out_amount > 0
                    ? Math.max(8, Math.round((day.out_amount / maxDailyValue) * 100))
                    : 0;
                const isSelected =
                  selectedDayIndex === idx ||
                  (selectedDayIndex === null && idx === daily_cashflow.length - 1);
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`group flex min-w-[44px] flex-1 flex-col items-center gap-2 rounded-2xl px-1.5 py-2 transition-colors ${
                      isSelected
                        ? "bg-primary-light/70 ring-1 ring-primary-pastel"
                        : "hover:bg-background"
                    }`}
                  >
                    <div className="flex h-36 w-full items-end justify-center gap-1">
                      <div
                        title={`Tiền vào: ${formatWalletCoin(day.in_amount)}`}
                        className="w-3.5 rounded-t-lg bg-primary/85 transition-all group-hover:bg-primary"
                        style={{ height: `${inH}%` }}
                      />
                      {outH > 0 && (
                        <div
                          title={`Tiền ra: ${formatWalletCoin(day.out_amount)}`}
                          className="w-3.5 rounded-t-lg bg-secondary-pastel transition-all"
                          style={{ height: `${outH}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {formatShortDay(day.date)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Type Breakdown */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.12)] lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Scale size={18} className="text-primary" />
                Cơ cấu Sổ cái theo Loại
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bấm vào từng nhóm để mở bộ lọc Sổ cái tương ứng
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3.5">
            {type_breakdown.map((item) => {
              const meta = getWalletTypeMeta(item.type);
              const pct = Math.max(
                8,
                Math.round((Math.abs(item.total_amount) / maxBreakdownAmount) * 100),
              );
              return (
                <Link
                  key={item.type}
                  href={`/admin/wallets/transactions?type=${encodeURIComponent(item.type)}`}
                  className="group block rounded-2xl border border-border/70 bg-background/40 p-3 transition-all hover:border-primary-pastel hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2.5 font-medium text-foreground group-hover:text-primary">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border ${meta.iconBgClass}`}
                      >
                        <WalletTypeIcon type={item.type} size={15} />
                      </span>
                      <span>
                        {meta.label}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({item.count} lệnh)
                        </span>
                      </span>
                    </span>
                    <span className={`font-semibold ${meta.textClass}`}>
                      {formatWalletCoin(Math.abs(item.total_amount))}
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full rounded-full ${meta.barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* Escrow Watchlist */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Lock size={17} className="text-accent-vanilla-foreground" />
              Giám sát Tạm giữ Doanh thu Giảng viên (Escrow)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Các khoản đang trong thời gian bảo vệ hoàn tiền trước khi tự động giải ngân sang ví giảng viên
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-accent-vanilla-border bg-accent-vanilla px-3 py-1 font-semibold text-accent-vanilla-foreground">
              Đang giữ: {escrowHoldingStat?.count ?? 0} khoản ·{" "}
              {formatWalletCoin(escrowHoldingStat?.instructor_amount ?? 0)}
            </span>
            <span className="rounded-full border border-success-border bg-success-bg px-3 py-1 font-semibold text-success-foreground">
              Đã giải ngân: {escrowPaidStat?.count ?? 0} khoản ·{" "}
              {formatWalletCoin(escrowPaidStat?.instructor_amount ?? 0)}
            </span>
            <span className="rounded-full border border-secondary-pastel bg-secondary-light px-3 py-1 font-semibold text-secondary-foreground">
              Đã hoàn: {escrowRefundedStat?.count ?? 0} khoản
            </span>
          </div>
        </div>

        {holdingItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-success-border/70 bg-success-bg/50 p-5 text-center text-xs font-medium text-success-foreground">
            Hiện không có khoản doanh thu nào đang tạm giữ.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {holdingItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {item.instructor_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.instructor_email || item.instructor_id.slice(0, 8)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-accent-vanilla-foreground">
                    Escrow
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-accent-vanilla-border/50 pt-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Phần GV: </span>
                    <span className="font-bold text-foreground">
                      {formatWalletCoin(item.amount_instructor)}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Giải ngân: {formatWalletDateTime(item.hold_until)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Ledger Activity */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_12px_32px_-14px_rgba(53,111,167,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Sổ cái Giao dịch Gần đây
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {recent_history.length} biến động mới nhất trên ví nền tảng (nhấp chuột phải để sao chép nhanh ID)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/wallets/transactions")}
          >
            Xem toàn bộ sổ cái
            <ChevronRight size={15} />
          </Button>
        </div>

        {recent_history.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Chưa có lịch sử giao dịch nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-primary-light/55 text-xs font-semibold text-foreground">
                <tr>
                  <th className="px-6 py-3.5">Loại</th>
                  <th className="px-6 py-3.5">Số tiền</th>
                  <th className="px-6 py-3.5">Diễn giải</th>
                  <th className="px-6 py-3.5">Mã giao dịch</th>
                  <th className="px-6 py-3.5">Thời gian</th>
                  <th className="px-6 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {recent_history.map((history) => {
                  const meta = getWalletTypeMeta(history.type);
                  return (
                    <tr
                      key={history.id}
                      className="cursor-pointer transition-colors hover:bg-primary-light/25"
                      onClick={() =>
                        router.push(`/admin/wallets/transactions/${history.id}`)
                      }
                      onContextMenu={(e) =>
                        openContextMenu(
                          e,
                          history.id,
                          history.related_transaction_id,
                        )
                      }
                    >
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badgeClass}`}
                        >
                          <WalletTypeIcon type={history.type} size={13} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`font-bold ${meta.textClass}`}>
                          {meta.direction === "out"
                            ? "-"
                            : meta.direction === "in"
                              ? "+"
                              : ""}
                          {formatWalletCoin(Math.abs(history.amount))}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-6 py-3.5 text-foreground">
                        {history.note || "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        {history.related_transaction_id ? (
                          <code className="rounded-lg bg-background px-2 py-1 text-xs text-muted-foreground">
                            {history.related_transaction_id.slice(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        {formatWalletDateTime(history.created_at)}
                      </td>
                      <td
                        className="px-6 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/admin/wallets/transactions/${history.id}`,
                            )
                          }
                        >
                          <Eye size={14} />
                          Kiểm toán
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {menuOpen && menuHistoryId && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Xem hồ sơ kiểm toán",
              onClick: () => {
                router.push(`/admin/wallets/transactions/${menuHistoryId}`);
                setMenuOpen(false);
              },
            },
            ...(menuHistoryTxn
              ? [
                  {
                    label: "Sao chép Transaction ID",
                    onClick: () => {
                      copyText(menuHistoryTxn, "Transaction ID");
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
            {
              label: "Sao chép History ID",
              onClick: () => {
                copyText(menuHistoryId, "History ID");
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}
    </main>
  );
}
