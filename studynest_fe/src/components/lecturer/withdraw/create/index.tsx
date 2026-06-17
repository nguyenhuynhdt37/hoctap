"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { User } from "@/types/user/user";
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
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tạo yêu cầu rút tiền
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Yêu cầu rút tiền từ ví giảng viên của bạn
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-2">
                    Thiếu thông tin PayPal
                  </h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    Để có thể rút tiền, bạn cần cập nhật thông tin PayPal (email
                    và Payer ID) trong hồ sơ của mình.
                  </p>
                  <Link
                    href="/lecturer/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Cập nhật thông tin PayPal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tạo yêu cầu rút tiền
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Yêu cầu rút tiền từ ví giảng viên của bạn
            </p>
          </div>

          {checkData && (
            <div className="space-y-4">
              {checkData.balance !== undefined && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Số dư ví</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(checkData.balance)}
                  </div>
                </div>
              )}

              {checkData.min_balance !== undefined && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    Số tiền rút tối thiểu
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(checkData.min_balance)}
                  </div>
                </div>
              )}

              {!checkData.can_withdraw && checkData.reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {checkData.reason}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Số tiền cần rút (VND)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Ví dụ: 500,000"
                disabled={!checkData?.can_withdraw || loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {checkData?.min_balance && (
                <p className="mt-1 text-xs text-gray-500">
                  Tối thiểu: {formatCurrency(checkData.min_balance)}
                </p>
              )}
            </div>

            {quickAmounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-gray-600 self-center">
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
                      className="px-3 py-1.5 text-xs font-semibold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50"
                    >
                      {formatted} ₫
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!checkData?.can_withdraw || loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang tạo..." : "Tạo yêu cầu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
