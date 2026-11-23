"use client";

import { Button, CoinBadge } from "@/components/ui";
import {
  coinToVnd,
  DEFAULT_COIN_VND_RATE,
  formatVnd,
  MIN_TOPUP_VND,
  purchaseCashbackBonus,
  type CoinBalances,
} from "@/lib/learning-hub/coin-logic";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Coins,
  Info,
  ShieldCheck,
} from "pulsoicon-react";

interface Props {
  amount: string;
  loading: boolean;
  error?: string;
  success?: string;
  coins?: CoinBalances;
  rateVnd?: number;
  onAmountChange: (amount: string) => void;
  onDeposit: () => void;
}

const QUICK_PACKAGES = [
  { coin: 5, tag: null },
  { coin: 10, tag: null },
  { coin: 20, tag: null },
  { coin: 50, tag: "Phổ biến" },
  { coin: 100, tag: "Tiết kiệm" },
] as const;

const numberFormat = new Intl.NumberFormat("vi-VN");

function formatCommaNumber(val: number): string {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function WalletDepositCard({
  amount,
  loading,
  error,
  success,
  coins,
  rateVnd = DEFAULT_COIN_VND_RATE,
  onAmountChange,
  onDeposit,
}: Props) {
  const [inputMode, setInputMode] = useState<"vnd" | "coin">("vnd");

  const safeRate = rateVnd > 0 ? rateVnd : DEFAULT_COIN_VND_RATE;
  const minCoin = Math.ceil(MIN_TOPUP_VND / safeRate);

  const numericVnd = useMemo(() => {
    const clean = amount.replace(/[^\d]/g, "");
    return clean ? Number(clean) : 0;
  }, [amount]);

  // Tính toán quy đổi realtime khớp 100% `topup_to_coin` backend (floor + giữ phần dư VND)
  const quote = useMemo(() => {
    const gainedGold = numericVnd > 0 ? Math.floor(numericVnd / safeRate) : 0;
    const remainderVnd = numericVnd > 0 ? numericVnd - gainedGold * safeRate : 0;
    const isValid = numericVnd >= MIN_TOPUP_VND && gainedGold > 0;
    const currentGold = coins?.paid ?? 0;
    const nextGold = currentGold + gainedGold;
    const estCashbackWhite = purchaseCashbackBonus(gainedGold);
    return {
      gainedGold,
      remainderVnd,
      isValid,
      currentGold,
      nextGold,
      estCashbackWhite,
    };
  }, [numericVnd, safeRate, coins?.paid]);

  const handleVndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    if (digits === "") {
      onAmountChange("");
      return;
    }
    const num = Number(digits);
    if (Number.isFinite(num)) {
      onAmountChange(formatCommaNumber(num));
    }
  };

  const handleCoinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    if (digits === "") {
      onAmountChange("");
      return;
    }
    const coinVal = Number(digits);
    if (Number.isFinite(coinVal)) {
      onAmountChange(formatCommaNumber(coinToVnd(coinVal, safeRate)));
    }
  };

  const selectQuickPackage = (coin: number) => {
    const vnd = coinToVnd(coin, safeRate);
    onAmountChange(formatCommaNumber(vnd));
  };

  const coinInputDisplay =
    numericVnd > 0 ? String(Math.floor(numericVnd / safeRate)) : "";

  return (
    <section
      id="deposit-studio"
      aria-label="Nạp Coin vàng qua PayPal"
      className="scroll-mt-24 overflow-hidden rounded-[32px] border border-border bg-surface shadow-ambient-sm"
    >
      <div className="grid lg:grid-cols-[1.2fr_1fr]">
        {/* CỘT TRÁI: NHẬP SỐ TIỀN / CHỌN GÓI */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Nạp tự động · PayPal
              </p>
              <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-foreground">
                <span>Nạp thêm</span>
                <CoinBadge kind="gold" size="sm" />
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Chọn nhanh gói hoặc nhập số tùy ý. Phiếu bên cạnh tự động tính quy đổi theo thời gian thực.
              </p>
            </div>

            {/* Chuyển đổi chế độ nhập 2 chiều VND <-> Đồng vàng */}
            <div
              role="group"
              aria-label="Đơn vị nhập"
              className="inline-flex rounded-full border border-border bg-background p-1 text-xs font-semibold"
            >
              <button
                type="button"
                onClick={() => setInputMode("vnd")}
                className={`rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
                  inputMode === "vnd"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                VND
              </button>
              <button
                type="button"
                onClick={() => setInputMode("coin")}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
                  inputMode === "coin"
                    ? "bg-[#784705] text-[#FFF7DB] shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Coins solid aria-hidden="true" animated={false} className="size-3.5 text-[#FFD55A]" />
                <span>Số lượng</span>
              </button>
            </div>
          </div>

          {/* Gói nạp nhanh phá cách */}
          <div className="mt-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Gói nạp nhanh
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {QUICK_PACKAGES.map((pkg) => {
                const vnd = coinToVnd(pkg.coin, safeRate);
                const isSelected = numericVnd === vnd;
                return (
                  <button
                    key={pkg.coin}
                    type="button"
                    onClick={() => selectQuickPackage(pkg.coin)}
                    className={`group relative flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "border-[#C47E0A] bg-gradient-to-b from-[#FFF7DB] to-[#F7DE8C] text-[#784705] shadow-xs ring-2 ring-[#E2B545]/40"
                        : "border-border bg-background/70 text-foreground hover:border-[#E2B545] hover:bg-[#FFFDF5]"
                    }`}
                  >
                    {pkg.tag && (
                      <span
                        className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? "bg-[#784705] text-[#FFF7DB]"
                            : "bg-primary-light text-primary"
                        }`}
                      >
                        {pkg.tag}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-base font-extrabold tabular-nums">
                      <Coins
                        solid
                        aria-hidden="true"
                        animated={false}
                        className={`size-4 ${isSelected ? "text-[#C47E0A]" : "text-[#C47E0A]/80"}`}
                      />
                      <span>{pkg.coin}</span>
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium opacity-80 tabular-nums">
                      {formatVnd(vnd)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ô nhập số tiền / số Coin */}
          <div className="mt-6 space-y-2">
            <label
              htmlFor="deposit-amount"
              className="flex items-center justify-between text-xs font-semibold text-foreground"
            >
              <span>
                {inputMode === "vnd" ? "Hoặc nhập số tiền nạp (VND)" : "Hoặc nhập số Coin vàng muốn nạp"}
              </span>
              <span className="font-normal text-muted-foreground tabular-nums">
                Tối thiểu {formatVnd(MIN_TOPUP_VND)} ({minCoin} Coin vàng)
              </span>
            </label>

            <div className="relative">
              <input
                id="deposit-amount"
                type="text"
                inputMode="numeric"
                value={inputMode === "vnd" ? amount : coinInputDisplay}
                onChange={inputMode === "vnd" ? handleVndInputChange : handleCoinInputChange}
                placeholder={inputMode === "vnd" ? "500,000" : "50"}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 pr-24 text-lg font-bold text-foreground tabular-nums placeholder:text-subtle-foreground outline-none transition-all focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-bold text-foreground border border-border/70">
                {inputMode === "vnd" ? "VND" : <Coins solid aria-hidden="true" animated={false} className="size-4 text-[#C47E0A]" />}
              </span>
            </div>

            {numericVnd > 0 && numericVnd < MIN_TOPUP_VND && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive-foreground">
                <CircleAlert aria-hidden="true" animated={false} className="size-3.5 shrink-0" />
                <span>
                  Cần nhập thêm {formatVnd(MIN_TOPUP_VND - numericVnd)} để đạt mức tối thiểu {formatVnd(MIN_TOPUP_VND)}.
                </span>
              </p>
            )}
          </div>

          {/* Thông báo lỗi / thành công */}
          {error && (
            <div className="mt-4 rounded-2xl border border-destructive-border bg-destructive-bg p-3.5 text-xs font-medium text-destructive-foreground">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-success-border bg-success-bg p-3.5 text-xs font-medium text-success-foreground">
              <Check aria-hidden="true" className="size-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Nút hành động */}
          <div className="mt-6 space-y-2.5">
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading || !quote.isValid}
              isLoading={loading}
              loadingText="Đang kết nối PayPal..."
              onClick={onDeposit}
              className="min-h-12 rounded-2xl text-sm font-bold shadow-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                {quote.isValid ? (
                  <>
                    <span>Nạp</span>
                    <CoinBadge kind="gold" amount={`+${quote.gainedGold}`} surface="dark" size="sm" />
                    <span>({formatVnd(numericVnd)}) qua PayPal</span>
                  </>
                ) : (
                  <span>Nhập từ {formatVnd(MIN_TOPUP_VND)} để nạp qua PayPal</span>
                )}
              </span>
              {quote.isValid && !loading && <ArrowRight aria-hidden="true" className="size-4" />}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <ShieldCheck aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              <span>Không đóng tab trình duyệt khi PayPal đang xử lý thanh toán.</span>
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: PHIẾU QUY ĐỔI QUY ƯỚC REALTIME (LIVE RECEIPT) */}
        <aside
          aria-label="Dự toán quy đổi realtime"
          className="relative flex flex-col justify-between border-t border-dashed border-primary-pastel bg-gradient-to-b from-primary-light/55 via-background to-[#FFFDF5] p-6 sm:p-8 lg:border-l lg:border-t-0"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Phiếu quy đổi Realtime
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
                <span className="size-1.5 rounded-full bg-success-foreground" />
                Tức thì
              </span>
            </div>

            {/* Khối số Coin vàng nhận được nổi bật */}
            <div className="mt-4 rounded-2xl border border-[#E2B545]/75 bg-gradient-to-br from-[#FFF7DB] via-[#FCEBB2]/80 to-[#F7DE8C]/75 p-4 text-[#784705] shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-85">
                Bạn sẽ nhận ngay
              </p>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <p className="inline-flex items-center gap-2 font-display text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  <Coins solid aria-hidden="true" animated={false} className="size-8 text-[#C47E0A]" />
                  <span>+{numberFormat.format(quote.gainedGold)}</span>
                </p>
              </div>
              {quote.remainderVnd > 0 ? (
                <p className="mt-2 rounded-xl bg-white/75 px-3 py-1.5 text-xs font-medium text-[#784705] tabular-nums">
                  Còn lẻ <strong>+{formatVnd(quote.remainderVnd)}</strong> sẽ được giữ nguyên ở phần dư VND (không mất).
                </p>
              ) : numericVnd >= MIN_TOPUP_VND ? (
                <p className="mt-2 text-xs font-medium text-[#784705]/85">
                  Chia tròn hoàn hảo theo tỷ giá — không phát sinh tiền lẻ.
                </p>
              ) : null}
            </div>

            {/* Chi tiết từng dòng quy ước realtime */}
            <dl className="mt-5 space-y-3 border-t border-dashed border-border pt-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Số tiền thanh toán</dt>
                <dd className="font-bold text-foreground tabular-nums">
                  {numericVnd > 0 ? formatVnd(numericVnd) : "0 đ"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Tỷ giá áp dụng</dt>
                <dd className="inline-flex items-center gap-1.5 font-semibold text-foreground tabular-nums">
                  <CoinBadge kind="gold" amount={1} size="sm" />
                  <span>= {formatVnd(safeRate)}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Số dư sau nạp</dt>
                <dd className="inline-flex items-center gap-1.5 font-bold text-[#784705] tabular-nums">
                  <CoinBadge kind="gold" amount={quote.currentGold} size="sm" />
                  <ArrowRight aria-hidden="true" animated={false} className="size-3.5 text-muted-foreground" />
                  <CoinBadge kind="gold" amount={quote.nextGold} size="sm" />
                </dd>
              </div>
              {quote.estCashbackWhite > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#CBD5E1] bg-white/90 px-3 py-2">
                  <dt className="text-xs text-[#475569]">
                    Ước tính hoàn 20% khi mua khóa học
                  </dt>
                  <dd>
                    <CoinBadge kind="white" amount={`+${quote.estCashbackWhite}`} size="sm" />
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Ghi chú quy ước minh bạch */}
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-primary-pastel/70 bg-surface/85 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <Info solid aria-hidden="true" animated={false} className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Quy ước quy đổi & sử dụng:</p>
              <p>
                • Tiền nạp làm tròn xuống theo tỷ giá <strong>{formatVnd(safeRate)}/Coin vàng</strong>; phần lẻ giữ nguyên.
              </p>
              <p>
                • Khi mua khóa học, tự động chiết khấu tối đa <strong>50% lượng Coin trắng</strong> (10 Coin trắng = 1 Coin vàng) và hoàn ngay <strong>+20% Coin trắng</strong>.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
