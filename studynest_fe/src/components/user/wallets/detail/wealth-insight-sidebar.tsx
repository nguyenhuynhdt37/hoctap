"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Coins,
  Copy,
  Gift,
  History,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "pulsoicon-react";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import { cn } from "@/lib/utils";
import {
  formatCoinNumber,
  formatCoinWithUnit,
  isIncomingTransaction,
} from "../transactions/formatters";

interface WealthInsightSidebarProps {
  data: LecturerTransactionDetail;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
}

function getWealthPerspective(data: LecturerTransactionDetail) {
  const isIncome = isIncomingTransaction({
    direction: data.direction === "in" || data.direction === "out" ? data.direction : undefined,
    type: data.type,
  });

  if (data.type === "purchase" && data.purchase) {
    const saved = Math.max(0, data.purchase.discount_amount);
    const savedPct =
      data.purchase.original_price > 0
        ? Math.round((saved / data.purchase.original_price) * 100)
        : 0;
    return {
      eyebrow: "Đầu tư sinh lời tri thức",
      headline:
        saved > 0
          ? `Bạn đã tối ưu ${savedPct}% chi phí học tập!`
          : "Khoản đầu tư giá trị nhất là đầu tư vào bản thân",
      body:
        saved > 0
          ? `Nhờ tận dụng ưu đãi, bạn giữ lại được ${formatCoinWithUnit(saved)} trong Kho Coin cho các mục tiêu kế tiếp.`
          : "Mỗi khóa học hoàn thành giúp bạn tích thêm XP lên cấp, mở khóa Coin thưởng và danh hiệu độc quyền.",
      highlightLabel: saved > 0 ? "Khoản tiết kiệm giữ lại" : "Giá trị đầu tư tri thức",
      highlightValue: saved > 0 ? `+${formatCoinNumber(saved)} Coin` : `${formatCoinNumber(data.amount)} Coin`,
      tone: "border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/50",
    };
  }

  if (data.type === "income" && data.income) {
    return {
      eyebrow: "Dòng tiền thụ động tri thức",
      headline: "Kiến thức của bạn đang tạo ra tài sản thực",
      body: "Doanh thu giảng dạy được ghi sổ tự động và bảo vệ minh bạch qua Kho Bạc Mây Mây.",
      highlightLabel: "Thù lao cộng vào tài sản",
      highlightValue: `+${formatCoinNumber(data.income.amount_instructor)} Coin`,
      tone: "border-success-border bg-gradient-to-br from-success-bg/80 via-surface to-accent-vanilla/55",
    };
  }

  if (isIncome) {
    return {
      eyebrow: "Tích lũy quỹ thịnh vượng",
      headline: "Kho Coin của bạn vừa dày thêm một bậc!",
      body: "Bạn có thể dùng Coin này để đầu tư khóa học mới, hoặc ghé Cửa hàng Mây đổi khung avatar và danh hiệu giới hạn.",
      highlightLabel: "Tài sản vừa cộng thêm",
      highlightValue: `+${formatCoinNumber(data.amount)} Coin`,
      tone: "border-success-border bg-gradient-to-br from-success-bg/80 via-surface to-primary-light/50",
    };
  }

  return {
    eyebrow: "Quản trị dòng tiền thông minh",
    headline: "Mọi chuyển động tài sản đều trong tầm kiểm soát",
    body: "Biên lai được lưu trữ vĩnh viễn trong sổ Kho Bạc để bạn dễ dàng theo dõi và tối ưu ngân sách học tập.",
    highlightLabel: "Giá trị giao dịch",
    highlightValue: `${formatCoinNumber(data.amount)} Coin`,
    tone: "border-accent-vanilla-border bg-gradient-to-br from-accent-vanilla/65 via-surface to-primary-light/45",
  };
}

export function WealthInsightSidebar({
  data,
  copiedField,
  onCopy,
}: WealthInsightSidebarProps) {
  const perspective = getWealthPerspective(data);
  const referenceCode = data.transaction_code || data.id;

  return (
    <aside aria-label="Góc nhìn tài sản và thao tác nhanh" className="space-y-5 lg:sticky lg:top-24 print:hidden">
      {/* 1. Thẻ Góc Nhìn Làm Giàu (Wealth Perspective) */}
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-[28px] border p-5 shadow-[0_18px_36px_-12px_rgba(53,111,167,0.12)] sm:p-6",
          perspective.tone,
        )}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
          <TrendingUp aria-hidden="true" animated={false} className="size-3.5" />
          <span>{perspective.eyebrow}</span>
        </div>

        <h2 className="mt-3 font-display text-xl font-bold leading-snug text-foreground">
          {perspective.headline}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {perspective.body}
        </p>

        <div className="mt-4 rounded-2xl border border-border/80 bg-surface/90 p-3.5 backdrop-blur-sm">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            {perspective.highlightLabel}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-primary tabular-nums">
            <Coins aria-hidden="true" animated={false} className="size-5 text-accent-vanilla-foreground" />
            <span>{perspective.highlightValue}</span>
          </p>
        </div>
      </div>

      {/* 2. Hộp Công Cụ Tài Sản Nhanh */}
      <div className="rounded-[24px] border border-border bg-surface p-5 shadow-xs">
        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Điều hướng tài sản
        </p>
        <div className="mt-3 space-y-2">
          <Link
            href="/wallets"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-primary-pastel bg-primary-light/65 px-4 py-3 transition-colors hover:bg-primary-light"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Wallet aria-hidden="true" animated={false} className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Quản lý Ví & Nạp Coin</p>
                <p className="text-[11px] text-muted-foreground">Tăng số dư quỹ tri thức</p>
              </div>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          <Link
            href="/shop"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/45 px-4 py-3 transition-colors hover:bg-accent-vanilla/75"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent-vanilla-foreground shadow-2xs">
                <Gift aria-hidden="true" animated={false} className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Cửa hàng Mây</p>
                <p className="text-[11px] text-muted-foreground">Đổi khung, huy hiệu & danh hiệu</p>
              </div>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-accent-vanilla-foreground transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          <Link
            href="/wallets/transactions"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/70 px-4 py-3 transition-colors hover:border-primary-pastel hover:bg-primary-light/40"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-primary shadow-2xs">
                <History aria-hidden="true" animated={false} className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Toàn bộ lịch sử dòng tiền</p>
                <p className="text-[11px] text-muted-foreground">Theo dõi thu chi & biểu đồ</p>
              </div>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </Link>
        </div>
      </div>

      {/* 3. Thẻ Chứng Nhận Ghi Sổ Minh Bạch + Copy nhanh */}
      <div className="rounded-[24px] border border-dashed border-primary-pastel bg-surface/90 p-5">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck aria-hidden="true" animated={false} className="size-4" />
          <span className="text-xs font-bold">Chứng nhận ghi sổ Kho Bạc</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Cần đối soát nhanh với đội ngũ Mây Mây? Sao chép mã tham chiếu dưới đây để được hỗ trợ tức thì.
        </p>

        <button
          type="button"
          onClick={() => onCopy("sidebar-ref", referenceCode)}
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left font-mono text-xs font-semibold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/50 cursor-pointer"
        >
          <span className="truncate">{referenceCode}</span>
          {copiedField === "sidebar-ref" ? (
            <span className="inline-flex shrink-0 items-center gap-1 font-sans text-[11px] font-bold text-success-foreground">
              <Check aria-hidden="true" animated={false} className="size-3.5" />
              Đã chép
            </span>
          ) : (
            <Copy aria-hidden="true" animated={false} className="size-3.5 shrink-0 text-primary" />
          )}
        </button>
      </div>
    </aside>
  );
}
