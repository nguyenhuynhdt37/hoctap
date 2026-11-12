"use client";

import { Alert, Button, Card } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { User } from "@/types/user/user";
import { Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

interface CheckResponse {
  pending: boolean;
  can_withdraw: boolean;
  reason: string | null;
  balance?: number;
  min_balance?: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);

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

    const cleanAmount = amount.replace(/[^\d]/g, "");
    const numAmount = Number(cleanAmount);

    if (!numAmount || numAmount <= 0) {
      setError("Số tiền không hợp lệ");
      return;
    }

    if (
      checkData &&
      checkData.min_balance &&
      numAmount < checkData.min_balance
    ) {
      setError(`Số tiền tối thiểu là ${formatCurrency(checkData.min_balance)}`);
      return;
    }

    if (checkData && checkData.balance && numAmount > checkData.balance) {
      setError("Số tiền vượt quá số dư ví");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(
        `/lecturer/withdraw/request?amount=${numAmount}`
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

  const quickAmounts = checkData?.balance
    ? [
        checkData.min_balance || 100000,
        Math.floor((checkData.balance * 0.25) / 1000) * 1000,
        Math.floor((checkData.balance * 0.5) / 1000) * 1000,
        Math.floor((checkData.balance * 0.75) / 1000) * 1000,
        checkData.balance,
      ].filter((val) => val >= (checkData.min_balance || 0))
    : [];

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
                Yêu cầu rút tiền từ ví giảng viên của bạn
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
              Yêu cầu rút tiền từ ví giảng viên của bạn
            </p>
          </div>

          {checkData && (
            <div className="space-y-3">
              {checkData.balance !== undefined && (
                <div className="p-4 bg-primary-light/60 border border-primary-pastel rounded-2xl">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Số dư ví
                  </div>
                  <div className="text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(checkData.balance)}
                  </div>
                </div>
              )}

              {checkData.min_balance !== undefined && (
                <div className="p-4 bg-background border border-border rounded-2xl">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Số tiền rút tối thiểu
                  </div>
                  <div className="text-lg font-semibold text-foreground tabular-nums">
                    {formatCurrency(checkData.min_balance)}
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
                Số tiền cần rút (VND)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Ví dụ: 500,000"
                disabled={!checkData?.can_withdraw || loading}
                className="w-full px-4 py-2.5 text-sm border border-border bg-surface text-foreground placeholder:text-muted-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              />
              {checkData?.min_balance && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Tối thiểu: {formatCurrency(checkData.min_balance)}
                </p>
              )}
            </div>

            {quickAmounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-muted-foreground self-center">
                  Gợi ý:
                </span>
                {quickAmounts.map((val) => {
                  const formatted = val
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(formatted)}
                      disabled={!checkData?.can_withdraw || loading}
                      className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary-light/50 border border-primary-pastel rounded-xl hover:bg-primary-light disabled:opacity-50 transition-colors"
                    >
                      {formatted} ₫
                    </button>
                  );
                })}
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
