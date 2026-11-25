"use client";

import { Alert, Badge, Button, Card } from "@/components/ui";
import { formatVnd, withdrawQuote } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { User } from "@/types/user/user";
import {
  ArrowLeft,
  ArrowRight,
  BrandPaypal,
  Coins,
  Send,
  ShieldCheck,
  Wallet,
} from "pulsoicon-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";

interface CheckResponse {
  pending: boolean;
  can_withdraw: boolean;
  reason: string | null;
  balance?: number;
  paid_balance?: number;
  min_coin?: number;
  rate_vnd?: number;
}

const formatCoinInput = (num: number) =>
  num <= 0 ? "" : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function CreateWithdrawPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: user } = useSWR<User>(
    "/auth/me",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const { data: checkData, mutate: mutateCheck } = useSWR<CheckResponse>(
    "/lecturer/withdraw/check-can-request",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const hasPayPalInfo = Boolean(user?.paypal_email && user?.paypal_payer_id);

  const withdrawable = checkData?.balance ?? 0;
  const minCoin = checkData?.min_coin ?? 1;
  const rateVnd = checkData?.rate_vnd ?? 10000;
  const parsedCoin = Number(amount.replace(/[^\d]/g, "")) || 0;

  const preview = useMemo(
    () => withdrawQuote(parsedCoin, withdrawable, rateVnd, minCoin),
    [parsedCoin, withdrawable, rateVnd, minCoin],
  );

  const remainingCoins = Math.max(0, withdrawable - parsedCoin);
  const sliderPct =
    withdrawable > 0
      ? Math.min(100, Math.max(0, Math.round((parsedCoin / withdrawable) * 100)))
      : 0;

  const presets = useMemo(() => {
    if (withdrawable < minCoin) return [];
    const list = [
      { label: "Tối thiểu", value: minCoin },
      { label: "25%", value: Math.floor(withdrawable * 0.25) },
      { label: "50%", value: Math.floor(withdrawable * 0.5) },
      { label: "75%", value: Math.floor(withdrawable * 0.75) },
      { label: "Tối đa", value: withdrawable },
    ];
    const seen = new Set<number>();
    return list.filter((item) => {
      if (item.value < minCoin || item.value > withdrawable || seen.has(item.value)) {
        return false;
      }
      seen.add(item.value);
      return true;
    });
  }, [withdrawable, minCoin]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    if (value === "") {
      setAmount("");
      return;
    }
    const numValue = Number(value);
    if (!Number.isNaN(numValue)) {
      setAmount(formatCoinInput(numValue));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value) || 0;
    if (pct === 0 || withdrawable <= 0) {
      setAmount("");
      return;
    }
    const coin =
      pct === 100
        ? withdrawable
        : Math.max(minCoin, Math.round((withdrawable * pct) / 100));
    setAmount(formatCoinInput(Math.min(withdrawable, coin)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const quote = withdrawQuote(parsedCoin, withdrawable, rateVnd, minCoin);
    if (!quote.valid) {
      setError(quote.reason ?? "Số Coin rút không hợp lệ.");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/lecturer/withdraw/request?coin_amount=${parsedCoin}`);
      setSuccess("Yêu cầu rút tiền đã được khởi tạo thành công!");
      setAmount("");
      await mutateCheck();
      setTimeout(() => {
        router.push("/lecturer/withdraw");
      }, 1500);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(
        typeof detail === "string" && detail.trim()
          ? detail
          : "Không thể tạo yêu cầu rút tiền. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/lecturer/withdraw")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại lịch sử rút tiền</span>
          </button>

          <Link href="/lecturer/profile">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              leftIcon={<BrandPaypal size="1em" />}
            >
              Cấu hình tài khoản PayPal
            </Button>
          </Link>
        </div>

        {/* Hero tiêu đề */}
        <section className="relative overflow-hidden rounded-[28px] border border-primary-pastel bg-gradient-to-br from-primary-light/90 via-surface to-accent-vanilla/75 p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Wallet animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Khởi tạo lệnh giải ngân</span>
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Tạo yêu cầu rút tiền về PayPal
              </h1>
              <p className="text-sm text-muted-foreground">
                Quy đổi Coin từ thu nhập giảng dạy sang tiền mặt minh bạch theo
                tỷ giá niêm yết hiện hành.
              </p>
            </div>

            {checkData?.balance !== undefined && (
              <div className="rounded-2xl border border-accent-vanilla-border bg-surface/92 px-5 py-3.5 shadow-2xs backdrop-blur-xs sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Số dư Coin khả dụng
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                  <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" aria-hidden="true" />
                  {withdrawable.toLocaleString("vi-VN")} Coin
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  ≈ {formatVnd(withdrawable * rateVnd)}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Thiếu thông tin PayPal */}
        {!hasPayPalInfo ? (
          <Card
            variant="surface"
            className="rounded-[26px] border border-warning-border bg-gradient-to-br from-accent-vanilla/65 via-surface to-surface p-6 sm:p-8"
          >
            <Alert variant="warning" title="Chưa đủ thông tin tài khoản PayPal">
              <p className="mb-4 text-sm leading-relaxed">
                Để tạo yêu cầu rút tiền, bạn cần cập nhật đầy đủ{" "}
                <strong>Email PayPal</strong> và <strong>PayPal Payer ID</strong>{" "}
                trong hồ sơ giảng viên.
              </p>
              <Link href="/lecturer/profile">
                <Button
                  type="button"
                  variant="primary"
                  className="rounded-full"
                  leftIcon={<BrandPaypal size="1em" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Cập nhật thông tin PayPal ngay
                </Button>
              </Link>
            </Alert>
          </Card>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Cột trái (7/12): Nhập lệnh rút & Thanh trượt trực quan */}
            <Card
              variant="surface"
              density="none"
              className="overflow-hidden rounded-[26px] border border-border shadow-xs lg:col-span-7"
            >
              <div className="border-b border-border bg-primary-light/35 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Thiết lập số Coin muốn rút
                </h2>
                <p className="text-xs text-muted-foreground">
                  1 Coin = {formatVnd(rateVnd)} · Tối thiểu {minCoin} Coin/lần ·
                  Áp dụng cho toàn bộ số dư Coin thật trong ví (không gồm Coin thưởng).
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                {checkData && !checkData.can_withdraw && checkData.reason && (
                  <Alert variant="destructive">{checkData.reason}</Alert>
                )}

                {/* Ô nhập Coin cỡ lớn */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="withdraw-coin-input"
                      className="text-sm font-semibold text-foreground"
                    >
                      Số Coin cần rút
                    </label>
                    {withdrawable >= minCoin && checkData?.can_withdraw && (
                      <button
                        type="button"
                        onClick={() => setAmount(formatCoinInput(withdrawable))}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Rút tối đa ({withdrawable.toLocaleString("vi-VN")} Coin)
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Coins
                      animated={false}
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#C98A2C]"
                      aria-hidden="true"
                    />
                    <input
                      id="withdraw-coin-input"
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder={`Tối thiểu ${minCoin} Coin`}
                      disabled={!checkData?.can_withdraw || loading}
                      className="w-full rounded-2xl border border-primary-pastel bg-primary-light/25 py-3.5 pl-12 pr-20 font-display text-2xl font-bold tabular-nums text-foreground placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground transition-all focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-primary border border-primary-pastel/70">
                      Coin
                    </span>
                  </div>

                  <p
                    className={`text-xs ${
                      amount && !preview.valid
                        ? "font-medium text-destructive-foreground"
                        : "text-muted-foreground"
                    }`}
                    role={amount && !preview.valid ? "alert" : undefined}
                  >
                    {amount
                      ? preview.valid
                        ? `Quy đổi chính xác: ${formatVnd(preview.vnd)} sẽ được chuyển về PayPal.`
                        : preview.reason
                      : `Số Coin rút tối thiểu là ${minCoin} Coin.`}
                  </p>
                </div>

                {/* Thanh trượt chọn nhanh tỷ lệ % */}
                {withdrawable >= minCoin && checkData?.can_withdraw && (
                  <div className="space-y-3 rounded-2xl border border-border/80 bg-background/70 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">
                        Kéo chọn tỷ lệ rút trên số dư khả dụng
                      </span>
                      <span className="rounded-full bg-primary-light px-2.5 py-0.5 font-bold text-primary tabular-nums">
                        {sliderPct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={sliderPct}
                      onChange={handleSliderChange}
                      disabled={loading}
                      aria-label="Chọn tỷ lệ phần trăm Coin cần rút"
                      className="h-2 w-full cursor-pointer accent-primary"
                    />

                    {presets.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {presets.map((preset) => {
                          const selected = parsedCoin === preset.value;
                          return (
                            <button
                              key={`${preset.label}-${preset.value}`}
                              type="button"
                              onClick={() =>
                                setAmount(formatCoinInput(preset.value))
                              }
                              disabled={loading}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                                  : "border-primary-pastel bg-surface text-primary hover:bg-primary-light"
                              }`}
                            >
                              {preset.label} · {preset.value.toLocaleString("vi-VN")}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {error && <Alert variant="destructive">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => router.push("/lecturer/withdraw")}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-full shadow-sm"
                    disabled={
                      !checkData?.can_withdraw || loading || !preview.valid
                    }
                    isLoading={loading}
                    loadingText="Đang khởi tạo lệnh..."
                    leftIcon={<Send className="h-4 w-4" />}
                  >
                    Gửi yêu cầu rút tiền
                  </Button>
                </div>
              </form>
            </Card>

            {/* Cột phải Sticky (5/12): Phiếu Xác Nhận & Tài khoản PayPal */}
            <div className="space-y-5 lg:sticky lg:top-6 lg:col-span-5">
              {/* Xem trước phiếu giải ngân */}
              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[26px] border border-primary-pastel bg-gradient-to-br from-primary-light/55 via-surface to-accent-vanilla/50 shadow-sm"
              >
                <div className="border-b border-primary-pastel/60 px-5 py-4">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Phiếu dự tính giải ngân
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Cập nhật trực tiếp theo số Coin bạn nhập
                  </p>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Số Coin rút</span>
                    <strong className="font-semibold tabular-nums text-foreground">
                      {parsedCoin.toLocaleString("vi-VN")} Coin
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tỷ giá áp dụng</span>
                    <strong className="font-semibold tabular-nums text-foreground">
                      1 Coin = {formatVnd(rateVnd)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Số dư còn lại sau rút
                    </span>
                    <strong className="font-semibold tabular-nums text-foreground">
                      {remainingCoins.toLocaleString("vi-VN")} Coin
                    </strong>
                  </div>

                  <div className="mt-2 rounded-2xl border border-surface bg-surface/90 p-4 shadow-2xs">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Thực nhận dự kiến qua PayPal
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums text-primary">
                      {preview.valid ? formatVnd(preview.vnd) : "0 ₫"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Tài khoản nhận PayPal */}
              <Card
                variant="surface"
                className="rounded-[24px] border border-border p-5 shadow-2xs"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                      <BrandPaypal size="1em" />
                    </span>
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Tài khoản nhận PayPal
                    </h3>
                  </div>
                  <Badge variant="success" size="sm" dot>
                    Đã liên kết
                  </Badge>
                </div>

                <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 p-3.5 text-xs">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Email nhận</p>
                    <p className="break-all font-semibold text-foreground">
                      {user?.paypal_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Mã PayPal Payer ID
                    </p>
                    <p className="break-all font-mono text-[11px] text-foreground">
                      {user?.paypal_payer_id}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-border/70 pt-3.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <ShieldCheck
                      animated={false}
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    Quy trình xử lý 3 bước
                  </p>
                  <ul className="space-y-1.5 pl-6 list-disc">
                    <li>Khởi tạo yêu cầu và tạm khóa số Coin tương ứng.</li>
                    <li>Quản trị viên đối soát và phê duyệt lệnh rút.</li>
                    <li>Hệ thống giải ngân tự động về tài khoản PayPal đã liên kết.</li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
