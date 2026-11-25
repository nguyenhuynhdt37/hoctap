"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Lock,
  Receipt,
  Tag,
  UserCheck,
  Wallet,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { PlatformWalletHistoryDetail } from "@/types/admin/platform-wallet";
import {
  WalletAdminNav,
  WalletTypeIcon,
  formatWalletCoin,
  formatWalletDateTime,
  getWalletTypeMeta,
} from "../wallet-visuals";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: {
    label: "Hoàn tất",
    cls: "border-success-border bg-success-bg text-success-foreground",
  },
  paid: {
    label: "Đã giải ngân",
    cls: "border-success-border bg-success-bg text-success-foreground",
  },
  holding: {
    label: "Đang tạm giữ",
    cls: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
  },
  pending: {
    label: "Đang xử lý",
    cls: "border-warning-border bg-warning-bg text-warning-foreground",
  },
  refunded: {
    label: "Đã hoàn tiền",
    cls: "border-secondary-pastel bg-secondary-light text-secondary-foreground",
  },
  failed: {
    label: "Thất bại",
    cls: "border-destructive-border bg-destructive-bg text-destructive-foreground",
  },
};

function getStatusBadge(status?: string | null) {
  if (!status) {
    return {
      label: "Nội bộ",
      cls: "border-border bg-background text-muted-foreground",
    };
  }
  return (
    STATUS_BADGE[status] ?? {
      label: status,
      cls: "border-info-border bg-info-bg text-info-foreground",
    }
  );
}

export default function WalletTxnDetail({
  data,
}: {
  data: PlatformWalletHistoryDetail;
}) {
  const {
    log,
    wallet,
    transaction,
    user,
    courses = [],
    purchase_items = [],
    instructor_earnings = [],
    discount,
  } = data;

  const typeMeta = getWalletTypeMeta(log.type);
  const txBadge = getStatusBadge(transaction?.status);

  const courseById = new Map(courses.map((c) => [c.id, c]));

  const totalInstructorShare = instructor_earnings.reduce(
    (sum, e) => sum + (e.amount_instructor || 0),
    0,
  );
  const totalPlatformShare = instructor_earnings.reduce(
    (sum, e) => sum + (e.amount_platform || 0),
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
      <WalletAdminNav />

      {/* Audit Receipt Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/75 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/wallets/transactions"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowLeft size={13} />
                Quay lại Sổ cái
              </Link>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${typeMeta.badgeClass}`}
              >
                <WalletTypeIcon type={log.type} size={13} />
                {typeMeta.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${txBadge.cls}`}
              >
                <CheckCircle2 size={12} animated={false} />
                {txBadge.label}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Hồ sơ Kiểm toán Giao dịch Ví
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Mã log:</span>
              <button
                type="button"
                onClick={() => copyText(log.id, "History ID")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-2.5 py-1 font-mono text-xs text-foreground hover:border-primary hover:text-primary"
              >
                <span>{log.id}</span>
                <Copy size={12} animated={false} />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-border/80 bg-surface/90 p-5 text-left shadow-xs backdrop-blur-sm lg:min-w-[260px] lg:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Giá trị biến động ví
            </p>
            <p className={`mt-1 text-3xl font-bold ${typeMeta.textClass}`}>
              {typeMeta.direction === "out"
                ? "-"
                : typeMeta.direction === "in"
                  ? "+"
                  : ""}
              {formatWalletCoin(Math.abs(log.amount))}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground lg:justify-end">
              <Clock size={13} animated={false} />
              {formatWalletDateTime(log.created_at)}
            </p>
          </div>
        </div>

        {log.note && (
          <div className="relative z-10 mt-5 rounded-2xl border border-border/80 bg-surface/85 px-4 py-3 text-sm text-foreground">
            <span className="font-semibold text-primary">Diễn giải: </span>
            {log.note}
          </div>
        )}
      </section>

      {/* Revenue Split Bar (only when instructor_earnings exists) */}
      {totalSplit > 0 && (
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.12)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Phân bổ Dòng Tiền (Revenue Split)
              </h2>
              <p className="text-xs text-muted-foreground">
                Tỉ lệ chia doanh thu giữa Giảng viên và Phí nền tảng Mây Mây
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-primary">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Giảng viên ({instructorPct}%):{" "}
                {formatWalletCoin(totalInstructorShare)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-accent-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-accent-border" />
                Nền tảng ({platformPct}%):{" "}
                {formatWalletCoin(totalPlatformShare)}
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

      {/* Main 2-Column Audit Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Related Gateway Transaction */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CreditCard size={18} className="text-primary" />
              Giao dịch Thanh toán Gốc
            </h2>
            {!transaction ? (
              <p className="mt-3 rounded-2xl border border-dashed border-border bg-background/50 p-4 text-xs text-muted-foreground">
                Đây là bút toán ví nội bộ, không gắn với giao dịch cổng thanh toán bên ngoài.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-background/60 p-3.5">
                  <p className="text-xs text-muted-foreground">Mã giao dịch</p>
                  <button
                    type="button"
                    onClick={() => copyText(transaction.id, "Transaction ID")}
                    className="mt-1 flex items-center gap-1.5 break-all font-mono text-xs font-semibold text-foreground hover:text-primary"
                  >
                    <span>{transaction.id}</span>
                    <Copy size={12} animated={false} />
                  </button>
                </div>
                <div className="rounded-2xl bg-background/60 p-3.5">
                  <p className="text-xs text-muted-foreground">
                    Giá trị giao dịch
                  </p>
                  <p className="mt-1 text-base font-bold text-primary">
                    {formatWalletCoin(transaction.amount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-background/60 p-3.5">
                  <p className="text-xs text-muted-foreground">
                    Phương thức &amp; Cổng
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {transaction.method || "—"} · {transaction.gateway || "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-background/60 p-3.5">
                  <p className="text-xs text-muted-foreground">
                    Mã đơn hàng / Xác nhận
                  </p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {transaction.order_id || transaction.transaction_code || "—"}{" "}
                    · {formatWalletDateTime(transaction.confirmed_at)}
                  </p>
                </div>
                {transaction.description && (
                  <div className="rounded-2xl bg-background/60 p-3.5 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Mô tả từ cổng thanh toán
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {transaction.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Purchased Courses & Items */}
          {purchase_items.length > 0 && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <BookOpen size={18} className="text-primary" />
                Khóa học &amp; Hạng mục Mua ({purchase_items.length})
              </h2>
              <div className="mt-4 space-y-3">
                {purchase_items.map((pi) => {
                  const course = courseById.get(pi.course_id);
                  const piBadge = getStatusBadge(pi.status);
                  return (
                    <div
                      key={pi.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        {course?.thumbnail_url ? (
                          <img
                            src={getImageUrl(course.thumbnail_url)}
                            alt={course.title}
                            className="h-14 w-20 shrink-0 rounded-xl border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                            <BookOpen size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">
                            {course?.title || `Khóa học #${pi.course_id.slice(0, 8)}`}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${piBadge.cls}`}
                            >
                              {piBadge.label}
                            </span>
                            <span>
                              Giá gốc: {formatWalletCoin(pi.original_price)}
                            </span>
                            {pi.discount_amount > 0 && (
                              <span className="text-secondary-foreground">
                                Giảm: -{formatWalletCoin(pi.discount_amount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-muted-foreground">
                          Thực thanh toán
                        </p>
                        <p className="text-base font-bold text-primary">
                          {formatWalletCoin(pi.discounted_price)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Instructor Earnings Ledger */}
          {instructor_earnings.length > 0 && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Lock size={17} className="text-accent-vanilla-foreground" />
                Hạch toán Doanh thu Giảng viên ({instructor_earnings.length})
              </h2>
              <div className="mt-4 space-y-2.5">
                {instructor_earnings.map((e) => {
                  const eBadge = getStatusBadge(e.status);
                  return (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 font-semibold ${eBadge.cls}`}
                          >
                            {eBadge.label}
                          </span>
                          <code className="text-muted-foreground">
                            GV: {e.instructor_id.slice(0, 8)}...
                          </code>
                        </div>
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar size={12} animated={false} />
                          Giải ngân dự kiến: {formatWalletDateTime(e.hold_until)}
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        <div>
                          <p className="text-muted-foreground">Giảng viên</p>
                          <p className="text-sm font-bold text-primary">
                            {formatWalletCoin(e.amount_instructor)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phí sàn</p>
                          <p className="text-sm font-bold text-accent-foreground">
                            {formatWalletCoin(e.amount_platform)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Discount Coupon Used */}
          {discount && (
            <section className="rounded-3xl border border-secondary-pastel bg-secondary-light/35 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-secondary-pastel bg-surface text-secondary-foreground">
                    <Tag size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                      Mã khuyến mãi đã áp dụng
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {discount.name} ({discount.discount_code})
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {discount.discount_type === "percent"
                    ? `Giảm ${discount.percent_value}%`
                    : `Giảm ${formatWalletCoin(discount.fixed_value)}`}
                </span>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: User + Wallet Snapshot */}
        <div className="space-y-6 lg:col-span-4">
          {/* User Card */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserCheck size={18} className="text-primary" />
              Người thực hiện
            </h2>
            {!user ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Giao dịch hệ thống tự động (không gắn tài khoản người dùng cụ thể).
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
                    {user.fullname.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {user.fullname}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Tham gia: {formatWalletDateTime(user.created_at)}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Platform Wallet Snapshot */}
          <section className="rounded-3xl border border-primary-pastel/70 bg-primary-light/35 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Wallet size={18} className="text-primary" />
              Trạng thái Ví Nền tảng
            </h2>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-surface/90 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">Số dư hiện tại</span>
                <span className="font-bold text-primary">
                  {formatWalletCoin(wallet.balance)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface/90 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">Tổng tiền vào</span>
                <span className="font-semibold text-success-foreground">
                  +{formatWalletCoin(wallet.total_in)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface/90 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">Tổng tiền ra</span>
                <span className="font-semibold text-destructive-foreground">
                  -{formatWalletCoin(wallet.total_out)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface/90 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">Đang tạm giữ</span>
                <span className="font-semibold text-accent-vanilla-foreground">
                  {formatWalletCoin(wallet.holding_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface/90 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">Phí sàn tích lũy</span>
                <span className="font-semibold text-accent-foreground">
                  {formatWalletCoin(wallet.platform_fee_total)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/admin/wallets" className="block">
                <Button variant="outline" className="w-full">
                  <Receipt size={15} />
                  Về Kho bạc Tổng quan
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
