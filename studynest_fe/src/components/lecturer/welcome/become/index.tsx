"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Coins,
  GraduationCap,
  Wallet,
  X,
} from "pulsoicon-react";
import { Button, Modal } from "@/components/ui";
import {
  DEFAULT_COIN_VND_RATE,
  formatCoin,
  formatVnd,
} from "@/lib/learning-hub/coin-logic";
import { useCoinBalances } from "@/lib/learning-hub/shop-hooks";
import { useUserStore } from "@/stores/user";

export const LECTURER_ACTIVATION_COIN_FEE = 100;

interface BecomeLecturerActionProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

export const BecomeLecturerAction = ({
  label = "Kích hoạt Giảng viên · 100 Coin",
  size = "lg",
  fullWidth = false,
  className = "",
}: BecomeLecturerActionProps) => {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { data: coins, isLoading: coinsLoading } = useCoinBalances();
  const [insufficientModalOpen, setInsufficientModalOpen] = useState(false);

  const paidCoin = coins?.paid ?? 0;
  const rateVnd = coins?.rateVnd ?? DEFAULT_COIN_VND_RATE;
  const hasEnoughCoins = paidCoin >= LECTURER_ACTIVATION_COIN_FEE;
  const missingCoins = Math.max(0, LECTURER_ACTIVATION_COIN_FEE - paidCoin);
  const progressPct = Math.min(
    100,
    Math.round((paidCoin / LECTURER_ACTIVATION_COIN_FEE) * 100),
  );

  const handleClick = () => {
    if (!user) {
      toast("Vui lòng đăng nhập để kiểm tra xu và ký hợp đồng Giảng viên.");
      router.push("/login");
      return;
    }
    if (coinsLoading) {
      toast("Đang kiểm tra số dư Coin vàng của bạn...");
      return;
    }
    if (!hasEnoughCoins) {
      setInsufficientModalOpen(true);
      return;
    }
    // Đủ >= 100 Coin → Chuyển thẳng sang trang ký số riêng toàn màn hình
    router.push("/welcome/sign-contract");
  };

  return (
    <>
      <Button
        variant="primary"
        size={size}
        fullWidth={fullWidth}
        onClick={handleClick}
        className={`shadow-[0_14px_30px_-10px_rgba(53,111,167,0.55)] ${className}`}
      >
        <GraduationCap size={18} />
        <span>{label}</span>
        <ArrowRight size={16} />
      </Button>

      {/* Modal báo thiếu Coin gọn gàng, cân đối chuẩn Cloudy Blue */}
      <Modal
        open={insufficientModalOpen}
        onClose={() => setInsufficientModalOpen(false)}
        hideCloseButton
        size="sm"
        className="overflow-hidden rounded-[2rem] border border-primary-pastel/80 p-0"
      >
        <div className="relative space-y-5 p-6 text-center">
          <button
            type="button"
            onClick={() => setInsufficientModalOpen(false)}
            aria-label="Đóng thông báo"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X size={16} animated={false} />
          </button>

          {/* Icon + Title */}
          <div className="space-y-2 pt-1">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground shadow-2xs">
              <Coins size={26} animated={false} />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Cần thêm {formatCoin(missingCoins)}
            </h2>
            <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
              Ví cần tối thiểu <strong>100 Coin vàng</strong> để mở trang ký Hợp
              đồng Điện tử và kích hoạt Giảng viên trọn đời.
            </p>
          </div>

          {/* Unified Balance Card with Progress */}
          <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4 text-left">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-muted-foreground">Tiến độ số dư</span>
                <span className="tabular-nums text-primary">
                  {paidCoin} / {LECTURER_ACTIVATION_COIN_FEE} Coin
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary-light">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border border-t border-border/80 pt-3">
              <div className="pr-3">
                <span className="block text-[11px] text-muted-foreground">
                  Hiện có trong ví
                </span>
                <span className="mt-0.5 block text-base font-bold tabular-nums text-foreground">
                  {formatCoin(paidCoin)}
                </span>
              </div>
              <div className="pl-4">
                <span className="block text-[11px] text-muted-foreground">
                  Cần nạp thêm
                </span>
                <span className="mt-0.5 block text-base font-bold tabular-nums text-primary">
                  +{formatCoin(missingCoins)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  ≈ {formatVnd(missingCoins * rateVnd)}
                </span>
              </div>
            </div>
          </div>

          {/* Balanced 50/50 Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setInsufficientModalOpen(false)}
            >
              Để sau
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setInsufficientModalOpen(false);
                router.push("/wallets");
              }}
            >
              <Wallet size={15} />
              Nạp Coin ngay
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
