"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Coins,
  FolderOpen,
  ShieldCheck,
  Wallet,
} from "pulsoicon-react";
import { Badge, Button, Card } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { LecturerWallet } from "@/types/lecturer/wallet";

interface WalletPanelProps {
  wallet?: LecturerWallet;
  holdCount: number;
}

const formatVndApprox = (vnd?: number | null) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(vnd || 0)) + " đ";

export function WalletPanel({ wallet, holdCount }: WalletPanelProps) {
  const router = useRouter();

  const totalIn = wallet?.total_in ?? 0;
  const totalOut = wallet?.total_out ?? 0;
  const balance = wallet?.balance ?? 0;
  const withdrawnPct =
    totalIn > 0 ? Math.min(100, Math.round((totalOut / totalIn) * 100)) : 0;

  return (
    <div className="space-y-6 xl:sticky xl:top-6">
      {/* Thẻ Ví Kho Bạc Giảng Viên — Cloudy Blue Pastel Sáng Thoáng */}
      <div className="relative overflow-hidden rounded-[26px] border border-primary-pastel bg-gradient-to-br from-primary-light/90 via-surface to-secondary-light/65 p-6 shadow-sm">
        {/* Họa tiết vòng cung Guilloché */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 text-primary/10"
          viewBox="0 0 180 180"
          fill="none"
        >
          <circle cx="90" cy="90" r="74" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 5" />
          <circle cx="90" cy="90" r="46" stroke="currentColor" strokeWidth="1.2" />
        </svg>

        <div className="relative space-y-5">
          {/* Header ví */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-pastel bg-surface text-primary shadow-2xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Ví Kho Bạc Giảng Viên
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Tài khoản thu nhập khả dụng
                </p>
              </div>
            </div>

            {wallet?.kyc_verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
                <ShieldCheck animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                KYC
              </span>
            )}
          </div>

          {/* Số dư chính */}
          <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 backdrop-blur-xs">
            <p className="text-xs font-medium text-muted-foreground">
              Số dư khả dụng
            </p>
            <div className="mt-1 flex items-center gap-2 font-display text-3xl font-bold tracking-tight tabular-nums text-primary">
              <Coins animated={false} className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {wallet ? formatVndAsCoin(balance) : "—"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {wallet ? `≈ ${formatVndApprox(balance)}` : "Đang cập nhật số dư..."}
            </p>
          </div>

          {/* Tỷ lệ Đã rút vs Tổng thu nhập */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-border/70 bg-surface/80 p-3">
                <p className="text-[11px] text-muted-foreground">Tổng thu nhập</p>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  {wallet ? formatVndAsCoin(totalIn) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface/80 p-3">
                <p className="text-[11px] text-muted-foreground">Tổng đã rút</p>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  {wallet ? formatVndAsCoin(totalOut) : "—"}
                </p>
              </div>
            </div>

            {totalIn > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Tỷ lệ đã rút về tài khoản</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {withdrawnPct}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${withdrawnPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hành động ví */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              onClick={() => router.push("/lecturer/wallets")}
            >
              Chi tiết ví
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="rounded-full shadow-xs"
              onClick={() => router.push("/lecturer/withdraw/create")}
            >
              Rút tiền ngay
            </Button>
          </div>
        </div>
      </div>

      {/* Thẻ Giao dịch Đang Giữ (Hold) */}
      <Card
        variant="surface"
        className="rounded-[24px] border border-border p-5 shadow-2xs"
      >
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">
            Kho tạm giữ (Hold)
          </h2>
          {holdCount > 0 ? (
            <Badge variant="warning" size="sm" dot>
              Chờ giải ngân
            </Badge>
          ) : (
            <Badge variant="success" size="sm" dot>
              Ổn định
            </Badge>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-accent-vanilla-border/60 bg-accent-vanilla/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-surface text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Số khoản đang giữ
              </p>
              <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                {holdCount}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="pastel"
          size="md"
          fullWidth
          className="rounded-full"
          onClick={() => router.push("/lecturer/hold")}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Mở lịch giải ngân
        </Button>
      </Card>

      {/* Thẻ Kho Tài Nguyên Giảng Dạy */}
      <Card
        variant="surface"
        className="rounded-[24px] border border-border bg-gradient-to-br from-surface to-primary-light/30 p-5 shadow-2xs"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-pastel/70 bg-primary-light text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold text-foreground">
              Kho tài nguyên giảng dạy
            </h3>
            <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">
              Lưu trữ tập trung slide PDF, video bài giảng và bộ câu hỏi trắc
              nghiệm để tái sử dụng nhanh cho nhiều khóa học.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-surface"
                onClick={() => router.push("/lecturer/resources")}
              >
                Mở kho tài nguyên
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-primary"
                leftIcon={<BookOpen className="h-3.5 w-3.5" />}
                onClick={() => router.push("/lecturer/chapters")}
              >
                Chương &amp; bài học
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
