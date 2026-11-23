"use client";

import { Alert, Button, Card } from "@/components/ui";
import { formatVnd, withdrawQuote } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { User } from "@/types/user/user";
import { Send } from "pulsoicon-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
    {
      revalidateOnFocus: false,
    }
  );

  const { data: checkData, mutate: mutateCheck } = useSWR<CheckResponse>(
    "/lecturer/withdraw/check-can-request",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const hasPayPalInfo =
    user?.paypal_email && user?.paypal_payer_id ? true : false;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    if (value === "") {
      setAmount("");
      return;
    }
    const numValue = Number(value);
    if (!Number.isNaN(numValue)) {
      const formatted = numValue
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setAmount(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const coinAmount = Number(amount.replace(/[^\d]/g, ""));
    const quote = withdrawQuote(coinAmount, checkData?.balance ?? 0, checkData?.rate_vnd ?? 10000, checkData?.min_coin ?? 1);
    if (!quote.valid) {
      setError(quote.reason ?? "Số Coin rút không hợp lệ.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(
        `/lecturer/withdraw/request?coin_amount=${coinAmount}`
      );

      setSuccess("Yêu cầu rút tiền đã được tạo thành công");
      setAmount("");
      await mutateCheck();

      setTimeout(() => {
        router.push("/lecturer/withdraw");
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Không thể tạo yêu cầu rút tiền");
    } finally {
      setLoading(false);
    }
  };

  const withdrawable = checkData?.balance ?? 0;
  const minCoin = checkData?.min_coin ?? 1;
  const quickAmounts = Array.from(new Set([minCoin, Math.floor(withdrawable * 0.25), Math.floor(withdrawable * 0.5),
    Math.floor(withdrawable * 0.75), withdrawable])).filter((value) => value >= minCoin && value <= withdrawable);
  const preview = withdrawQuote(Number(amount.replace(/[^\d]/g, "")), withdrawable, checkData?.rate_vnd ?? 10000, minCoin);

  if (!hasPayPalInfo) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Card variant="surface" className="p-6 sm:p-8 space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
                Tạo yêu cầu rút tiền
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Rút Coin từ thu nhập giảng dạy, nhận tiền qua PayPal
              </p>
            </div>

            <Alert variant="warning" title="Thiếu thông tin PayPal">
              <p className="mb-4">
                Để có thể rút tiền, bạn cần cập nhật thông tin PayPal (email và
                Payer ID) trong hồ sơ của mình.
              </p>
              <Link
                href="/lecturer/profile"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover font-semibold text-sm transition-colors shadow-soft-xs"
              >
                Cập nhật thông tin PayPal
              </Link>
            </Alert>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Card variant="surface" className="p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              Tạo yêu cầu rút tiền
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Rút Coin từ thu nhập giảng dạy, nhận tiền qua PayPal
            </p>
          </div>

          {checkData && (
            <div className="space-y-3">
              {checkData.balance !== undefined && (
                <div className="p-4 bg-primary-light/60 border border-primary-pastel rounded-2xl">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Coin rút được (từ thu nhập)
                  </div>
                  <div className="text-2xl font-bold text-primary tabular-nums">
                    {checkData.balance} Coin
                  </div>
                  {checkData.rate_vnd && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      1 Coin = {formatVnd(checkData.rate_vnd)}. Coin nạp bằng tiền chỉ dùng để mua, không rút được.
                    </div>
                  )}
                </div>
              )}

              {checkData.min_coin !== undefined && (
                <div className="p-4 bg-background border border-border rounded-2xl">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Số Coin rút tối thiểu
                  </div>
                  <div className="text-lg font-semibold text-foreground tabular-nums">
                    {checkData.min_coin} Coin
                  </div>
                </div>
              )}

              {!checkData.can_withdraw && checkData.reason && (
                <Alert variant="destructive">{checkData.reason}</Alert>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Số Coin cần rút
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Ví dụ: 50"
                disabled={!checkData?.can_withdraw || loading}
                className="w-full px-4 py-2.5 text-sm border border-border bg-surface text-foreground placeholder:text-muted-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              />
              <p className={`mt-1.5 text-xs ${amount && !preview.valid ? "text-destructive-foreground" : "text-muted-foreground"}`} role={amount && !preview.valid ? "alert" : undefined}>
                {amount ? (preview.valid ? `Bạn sẽ nhận ${formatVnd(preview.vnd)} qua PayPal.` : preview.reason) : `Tối thiểu: ${minCoin} Coin`}
              </p>
            </div>

            {quickAmounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-muted-foreground self-center">
                  Gợi ý:
                </span>
                {quickAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    disabled={!checkData?.can_withdraw || loading}
                    className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary-light/50 border border-primary-pastel rounded-xl hover:bg-primary-light disabled:opacity-50 transition-colors"
                  >
                    {value} Coin
                  </button>
                ))}
              </div>
            )}

            {error && <Alert variant="destructive">{error}</Alert>}

            {success && <Alert variant="success">{success}</Alert>}

            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!checkData?.can_withdraw || loading}
                isLoading={loading}
                loadingText="Đang tạo..."
                leftIcon={<Send className="h-4 w-4" />}
              >
                Tạo yêu cầu
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
