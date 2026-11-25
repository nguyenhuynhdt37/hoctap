"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowRight,
  Clock,
  Coins,
  ShieldCheck,
  Wallet,
} from "pulsoicon-react";
import { Badge, Button, Card } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { LecturerWallet } from "@/types/lecturer/wallet";

const formatVndApprox = (vnd?: number | null) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(vnd || 0)) + " đ";

/**
 * Tầng 2 Phải: Cloud Treasury Pass — Thẻ Kho Bạc Đa Sắc Mây
 */
export function CloudTreasuryPass({ wallet }: { wallet?: LecturerWallet }) {
  const router = useRouter();
  const { data: withdrawCheck } = useSWR<{
    balance?: number;
    paid_balance?: number;
    rate_vnd?: number;
  } | null>(
    "/lecturer/withdraw/check-can-request",
    async (url) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const totalIn = wallet?.total_in ?? 0;
  const totalOut = wallet?.total_out ?? 0;
  const balance = wallet?.balance ?? 0;
  const paidCoin = withdrawCheck?.paid_balance;
  const withdrawableCoin = withdrawCheck?.balance;
  const rateVnd = withdrawCheck?.rate_vnd ?? 10000;
  const withdrawnPct =
    totalIn > 0 ? Math.min(100, Math.round((totalOut / totalIn) * 100)) : 0;

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-primary-pastel bg-gradient-to-br from-primary-pastel/75 via-primary-light/85 to-accent-vanilla/85 p-6 shadow-sm">
      {/* Dải ánh sáng lụa chéo & hoa văn Guilloché */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-surface/65 blur-2xl"
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 text-primary/12"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle
          cx="100"
          cy="100"
          r="84"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="6 6"
        />
        <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="1.2" />
        <circle
          cx="100"
          cy="100"
          r="30"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>

      <div className="relative space-y-5">
        {/* Header hộ chiếu kho bạc */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-surface bg-surface/90 text-primary shadow-2xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Ví Kho Bạc Giảng Viên
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Ví thu nhập giảng viên
              </p>
            </div>
          </div>

          {wallet?.kyc_verified && (
            <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg/95 px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground shadow-2xs">
              <ShieldCheck
                animated={false}
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
              KYC
            </span>
          )}
        </div>

        {/* Số dư khả dụng nổi bật */}
        <div className="rounded-[22px] border border-accent-vanilla-border/80 bg-surface/92 p-4 shadow-2xs backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Số dư Coin hiện có
          </p>
          <div className="mt-1.5 flex items-center gap-2 font-display text-3xl font-bold tracking-tight tabular-nums text-warning-foreground">
            <Coins
              animated={false}
              className="h-6 w-6 shrink-0 text-[#C98A2C]"
              aria-hidden="true"
            />
            <span className="truncate">
              {paidCoin !== undefined
                ? `${paidCoin.toLocaleString("vi-VN")} Coin`
                : wallet
                  ? formatVndAsCoin(balance)
                  : "—"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
            <span>
              {paidCoin !== undefined
                ? `≈ ${formatVndApprox(paidCoin * rateVnd)}`
                : wallet
                  ? `≈ ${formatVndApprox(balance)}`
                  : "Đang cập nhật số dư..."}
            </span>
            {withdrawableCoin !== undefined && (
              <span className="rounded-full bg-accent-vanilla/85 px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground">
                Rút được: {withdrawableCoin.toLocaleString("vi-VN")} Coin
              </span>
            )}
          </div>
        </div>

        {/* 2 ô glass Tổng thu / Đã rút */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-surface bg-surface/75 p-3 backdrop-blur-xs">
            <p className="text-[11px] text-muted-foreground">Tổng thu nhập</p>
            <p className="mt-0.5 truncate text-sm font-bold text-foreground tabular-nums">
              {wallet ? formatVndAsCoin(totalIn) : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-surface bg-surface/75 p-3 backdrop-blur-xs">
            <p className="text-[11px] text-muted-foreground">Tổng đã rút</p>
            <p className="mt-0.5 truncate text-sm font-bold text-foreground tabular-nums">
              {wallet ? formatVndAsCoin(totalOut) : "—"}
            </p>
          </div>
        </div>

        {totalIn > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground/80">
                Tỷ lệ đã giải ngân về tài khoản
              </span>
              <span className="font-bold text-primary tabular-nums">
                {withdrawnPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface/90">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${withdrawnPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2 nút hành động */}
      <div className="relative mt-5 grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-surface bg-surface/90 hover:bg-surface"
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
  );
}

/**
 * Tầng 4 Phải: Hold Pulse Card — Trạng thái kho tạm giữ
 */
export function HoldPulseCard({ holdCount }: { holdCount: number }) {
  const router = useRouter();

  return (
    <Card
      variant="surface"
      className="rounded-[26px] border border-accent-vanilla-border/80 bg-gradient-to-br from-accent-vanilla/65 via-surface to-primary-light/40 p-5 shadow-2xs"
    >
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-surface text-primary shadow-2xs">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Kho tạm giữ
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Chu kỳ bảo vệ quỹ &amp; lịch giải ngân
            </p>
          </div>
        </div>
        {holdCount > 0 ? (
          <Badge variant="warning" size="sm" dot>
            {holdCount} khoản
          </Badge>
        ) : (
          <Badge variant="success" size="sm" dot>
            Ổn định
          </Badge>
        )}
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        {holdCount > 0
          ? `Hiện có ${holdCount} giao dịch đang trong kỳ bảo vệ quỹ. Xem đếm ngược ngày về ví hoặc xử lý hồ sơ hoàn tiền liên quan.`
          : "Tất cả giao dịch của bạn đã qua kỳ giữ quỹ và sẵn sàng trong ví khả dụng."}
      </p>

      <Button
        variant="pastel"
        size="sm"
        fullWidth
        className="rounded-full border border-primary-pastel/70"
        onClick={() => router.push("/lecturer/hold")}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Mở lịch giải ngân
      </Button>
    </Card>
  );
}
