"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Copy,
  CreditCard,
  History,
  Lock,
  Receipt,
  Tag,
  UserCheck,
  Wallet,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import {
  formatTxCoin,
  formatTxDateTime,
  getGatewayLabel,
  getTxStatusMeta,
  getTxTypeMeta,
} from "../transaction-visuals";

interface TransactionDetailProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export default function AdminTransactionDetail({
  data,
}: TransactionDetailProps) {
  const router = useRouter();
  const {
    transaction: t,
    user,
    wallet,
    recent_transactions = [],
    purchase_items = [],
    discount_history = [],
    instructor_earnings = [],
    platform_wallet_logs = [],
  } = data || {};

  const isIncome = t?.direction === "in";
  const typeMeta = getTxTypeMeta(t?.type);
  const statusMeta = getTxStatusMeta(t?.status);

  const totalInstructorShare = instructor_earnings.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, e: any) => sum + Number(e?.amount_instructor || 0),
    0,
  );
  const totalPlatformShare = instructor_earnings.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, e: any) => sum + Number(e?.amount_platform || 0),
    0,
  );
  const totalSplit = totalInstructorShare + totalPlatformShare;
  const instructorPct =
    totalSplit > 0 ? Math.round((totalInstructorShare / totalSplit) * 100) : 0;
  const platformPct = totalSplit > 0 ? 100 - instructorPct : 0;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Audit Hero Banner */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/75 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/admin/transactions")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowLeft size={13} />
                Danh sách giao dịch
              </button>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeMeta.badgeClass}`}
              >
                {typeMeta.label}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Hồ sơ Đối soát Giao dịch
            </h1>

            {t?.id && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Transaction ID:</span>
                <button
                  type="button"
                  onClick={() => copyText(t.id, "Transaction ID")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-2.5 py-1 font-mono text-xs text-foreground hover:border-primary hover:text-primary"
                >
                  <span>{t.id}</span>
                  <Copy size={12} animated={false} />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border/80 bg-surface/90 p-5 text-left shadow-xs backdrop-blur-sm lg:min-w-[270px] lg:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Giá trị giao dịch ({isIncome ? "Tiền vào" : "Tiền ra"})
            </p>
            <p
              className={`mt-1 text-3xl font-bold ${
                isIncome
                  ? "text-success-foreground"
                  : "text-destructive-foreground"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatTxCoin(Math.abs(Number(t?.amount || 0)))}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground lg:justify-end">
              <Clock size={13} animated={false} />
              Tạo: {formatTxDateTime(t?.created_at)}
            </p>
            {t?.confirmed_at && (
              <p className="mt-0.5 text-[11px] font-medium text-success-foreground">
                Xác nhận: {formatTxDateTime(t.confirmed_at)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Revenue Split Visualizer */}
      {totalSplit > 0 && (
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.12)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Phân bổ Doanh thu (Revenue Split)
              </h2>
              <p className="text-xs text-muted-foreground">
                Tỉ lệ chia giữa Giảng viên và Phí nền tảng từ giao dịch này
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-primary">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Giảng viên ({instructorPct}%):{" "}
                {formatTxCoin(totalInstructorShare)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-accent-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-accent-border" />
                Phí sàn ({platformPct}%): {formatTxCoin(totalPlatformShare)}
              </span>
            </div>
          </div>
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-primary"
              style={{ width: `${instructorPct}%` }}
            />
            <div
              className="h-full bg-accent-border"
              style={{ width: `${platformPct}%` }}
            />
          </div>
        </section>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Technical Payment Info */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CreditCard size={18} className="text-primary" />
              Thông tin Cổng thanh toán &amp; Đối soát
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3.5 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-background/60 p-3.5">
                <p className="text-xs text-muted-foreground">Cổng &amp; Phương thức</p>
                <p className="mt-1 font-semibold text-foreground">
                  {getGatewayLabel(t?.gateway, t?.method)}
                  {t?.method ? ` (${t.method})` : ""}
                </p>
              </div>
              <div className="rounded-2xl bg-background/60 p-3.5">
                <p className="text-xs text-muted-foreground">Mã đơn hàng (Order ID)</p>
                <p className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                  {t?.order_id || "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-background/60 p-3.5">
                <p className="text-xs text-muted-foreground">Mã tham chiếu (Transaction Code)</p>
                <p className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                  {t?.transaction_code || t?.ref_id || "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-background/60 p-3.5">
                <p className="text-xs text-muted-foreground">Đơn vị tiền tệ gốc</p>
                <p className="mt-1 font-semibold text-foreground">
                  {t?.currency || "VND"}
                </p>
              </div>
              {t?.description && (
                <div className="rounded-2xl bg-background/60 p-3.5 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Mô tả giao dịch</p>
                  <p className="mt-1 text-sm text-foreground">{t.description}</p>
                </div>
              )}
            </div>
          </section>

          {/* Purchase Items */}
          {purchase_items.length > 0 && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <BookOpen size={18} className="text-primary" />
                Hạng mục Mua khóa học ({purchase_items.length})
              </h2>
              <div className="mt-4 space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {purchase_items.map((pi: any) => {
                  const stMeta = getTxStatusMeta(pi.status);
                  return (
                    <div
                      key={pi.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/40 p-4"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {pi.course_title || `Khóa học #${String(pi.course_id || "").slice(0, 8)}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stMeta.badgeClass}`}
                          >
                            {stMeta.label}
                          </span>
                          <span>Giá gốc: {formatTxCoin(Number(pi.original_price || 0))}</span>
                          {Number(pi.discount_amount || 0) > 0 && (
                            <span className="text-secondary-foreground">
                              Giảm: -{formatTxCoin(Number(pi.discount_amount))}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Thực thu</p>
                        <p className="text-base font-bold text-primary">
                          {formatTxCoin(Number(pi.discounted_price || 0))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Instructor Earnings */}
          {instructor_earnings.length > 0 && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Lock size={17} className="text-accent-vanilla-foreground" />
                Hạch toán Doanh thu Giảng viên ({instructor_earnings.length})
              </h2>
              <div className="mt-4 space-y-2.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {instructor_earnings.map((e: any) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="inline-block rounded-full border border-accent-vanilla-border bg-accent-vanilla px-2.5 py-0.5 font-semibold text-accent-vanilla-foreground">
                        {e.status}
                      </span>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar size={12} animated={false} />
                        Giải ngân: {formatTxDateTime(e.hold_until)}
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div>
                        <p className="text-muted-foreground">Giảng viên</p>
                        <p className="text-sm font-bold text-primary">
                          {formatTxCoin(Number(e.amount_instructor || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phí sàn</p>
                        <p className="text-sm font-bold text-accent-foreground">
                          {formatTxCoin(Number(e.amount_platform || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Platform Wallet Logs Linked */}
          {platform_wallet_logs.length > 0 && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Receipt size={18} className="text-primary" />
                Bút toán Ví Nền tảng Liên quan ({platform_wallet_logs.length})
              </h2>
              <div className="mt-4 space-y-2.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {platform_wallet_logs.map((log: any) => (
                  <Link
                    key={log.id}
                    href={`/admin/wallets/transactions/${log.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-3.5 text-xs transition-colors hover:border-primary-pastel hover:bg-primary-light/25"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold uppercase text-primary">
                        {log.type}
                      </span>
                      <p className="mt-0.5 truncate text-foreground">
                        {log.note || "Bút toán ví nền tảng"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {formatTxCoin(Number(log.amount || 0))}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatTxDateTime(log.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Discount History */}
          {discount_history.length > 0 && (
            <section className="rounded-3xl border border-secondary-pastel bg-secondary-light/30 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
                <Tag size={16} />
                Khuyến mãi đã áp dụng ({discount_history.length})
              </h2>
              <div className="mt-3 space-y-2 text-xs">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {discount_history.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl bg-surface/90 px-3.5 py-2.5"
                  >
                    <span className="font-mono text-muted-foreground">
                      Discount #{String(d.discount_id || "").slice(0, 8)}
                    </span>
                    <span className="font-bold text-secondary-foreground">
                      -{formatTxCoin(Number(d.discounted_amount || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: User + User Wallet + Recent User Transactions */}
        <div className="space-y-6 lg:col-span-4">
          {/* User Profile */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserCheck size={18} className="text-primary" />
              Hồ sơ Người dùng
            </h2>
            {!user ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Giao dịch hệ thống (không gắn người dùng).
              </p>
            ) : (
              <div className="mt-4 flex items-center gap-3.5">
                {user.avatar ? (
                  <img
                    src={getImageUrl(user.avatar)}
                    alt={user.fullname}
                    className="h-12 w-12 rounded-2xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light font-bold text-primary">
                    {String(user.fullname || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {user.fullname}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {wallet && (
              <div className="mt-4 rounded-2xl border border-primary-pastel/70 bg-primary-light/40 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Wallet size={14} className="text-primary" />
                    Số dư ví cá nhân
                  </span>
                  <span className="text-base font-bold text-primary">
                    {formatTxCoin(Number(wallet.balance || 0))}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Recent Transactions of This User */}
          {recent_transactions.length > 0 && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <History size={18} className="text-primary" />
                Giao dịch gần đây của user
              </h2>
              <div className="mt-4 space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {recent_transactions.slice(0, 6).map((rt: any) => {
                  const rType = getTxTypeMeta(rt.type);
                  const rStatus = getTxStatusMeta(rt.status);
                  const isCurrent = rt.id === t?.id;
                  return (
                    <Link
                      key={rt.id}
                      href={`/admin/transactions/${rt.id}`}
                      className={`block rounded-2xl border p-3 text-xs transition-colors ${
                        isCurrent
                          ? "border-primary bg-primary-light/50"
                          : "border-border/70 bg-background/40 hover:border-primary-pastel hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {rType.label}
                        </span>
                        <span className="font-bold text-primary">
                          {formatTxCoin(Number(rt.amount || 0))}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{rStatus.label}</span>
                        <span>{formatTxDateTime(rt.created_at)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <Link href="/admin/transactions" className="block">
            <Button variant="outline" className="w-full">
              <ArrowLeft size={15} />
              Về danh sách giao dịch
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
