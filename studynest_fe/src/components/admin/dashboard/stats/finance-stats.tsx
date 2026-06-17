"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { FinanceStatsResponse } from "@/types/admin/statistics";
import {
  HiCurrencyDollar,
  HiArrowDown,
  HiArrowUp,
  HiClock,
  HiRefresh,
} from "react-icons/hi";
import useSWR from "swr";

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function FinanceStats() {
  const { data, isLoading } = useSWR<FinanceStatsResponse>(
    "/admin/statistics/finance",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Thống kê Tài chính
      </h3>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <HiCurrencyDollar className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 text-lg font-bold">
            {formatCurrency(data?.platform_balance)}
          </p>
          <p className="text-green-600 text-xs">Số dư nền tảng</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <HiArrowDown className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          <p className="text-emerald-800 text-lg font-bold">
            {formatCurrency(data?.total_deposits)}
          </p>
          <p className="text-emerald-600 text-xs">Tổng nạp</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-4 text-center">
          <HiArrowUp className="w-6 h-6 text-teal-600 mx-auto mb-2" />
          <p className="text-teal-800 text-lg font-bold">
            {formatCurrency(data?.total_withdrawals)}
          </p>
          <p className="text-teal-600 text-xs">Tổng rút</p>
        </div>
      </div>

      {/* Pending Withdrawals */}
      <div className="bg-yellow-50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HiClock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-yellow-800 font-semibold">Chờ rút tiền</p>
              <p className="text-yellow-600 text-sm">
                {data?.pending_withdrawals?.count ?? 0} yêu cầu
              </p>
            </div>
          </div>
          <p className="text-yellow-800 font-bold">
            {formatCurrency(data?.pending_withdrawals?.amount)}
          </p>
        </div>
      </div>

      {/* Refunds */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <HiRefresh className="w-5 h-5 text-gray-600" />
          <p className="text-gray-800 font-semibold">Hoàn tiền</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Yêu cầu:</span>
            <span className="font-medium">{data?.refunds?.requested ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Đã duyệt:</span>
            <span className="font-medium text-green-600">
              {data?.refunds?.approved ?? 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Từ chối:</span>
            <span className="font-medium text-red-600">
              {data?.refunds?.rejected ?? 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tổng hoàn:</span>
            <span className="font-medium">
              {formatCurrency(data?.refunds?.total_refunded)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
