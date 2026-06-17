"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { RevenueCompareResponse } from "@/types/admin/statistics";
import { HiTrendingUp, HiTrendingDown, HiCalendar } from "react-icons/hi";
import { useState } from "react";
import useSWR from "swr";

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Helper để lấy các khoảng thời gian mặc định
const getDefaultDates = () => {
  const today = new Date();
  const currentFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentTo = today;
  const previousFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousTo = new Date(today.getFullYear(), today.getMonth(), 0);

  return {
    current_from: currentFrom.toISOString().split("T")[0],
    current_to: currentTo.toISOString().split("T")[0],
    previous_from: previousFrom.toISOString().split("T")[0],
    previous_to: previousTo.toISOString().split("T")[0],
  };
};

export default function RevenueCompare() {
  const [dates, setDates] = useState(getDefaultDates);

  const { data, isLoading } = useSWR<RevenueCompareResponse>(
    `/admin/statistics/revenue/compare?current_from=${dates.current_from}&current_to=${dates.current_to}&previous_from=${dates.previous_from}&previous_to=${dates.previous_to}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const isPositive = (data?.change_percent ?? 0) >= 0;

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-900">So sánh doanh thu</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <HiCalendar className="w-4 h-4" />
          <span>
            {formatDate(dates.current_from)} - {formatDate(dates.current_to)} vs{" "}
            {formatDate(dates.previous_from)} - {formatDate(dates.previous_to)}
          </span>
        </div>
      </div>

      {/* Change Indicator */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
          isPositive ? "bg-green-50" : "bg-red-50"
        }`}
      >
        {isPositive ? (
          <HiTrendingUp className="w-8 h-8 text-green-600" />
        ) : (
          <HiTrendingDown className="w-8 h-8 text-red-600" />
        )}
        <div>
          <p
            className={`text-2xl font-bold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? "+" : ""}
            {(data?.change_percent ?? 0).toFixed(1)}%
          </p>
          <p className="text-gray-600 text-sm">
            {isPositive ? "Tăng" : "Giảm"}{" "}
            {formatCurrency(Math.abs(data?.change_amount ?? 0))} so với kỳ trước
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Period */}
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-green-600 text-sm font-medium mb-1">Kỳ hiện tại</p>
          <p className="text-2xl font-bold text-green-800">
            {formatCurrency(data?.current?.total)}
          </p>
          <p className="text-green-600 text-xs mt-1">
            {data?.current?.transaction_count ?? 0} giao dịch
          </p>
        </div>

        {/* Previous Period */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-gray-600 text-sm font-medium mb-1">Kỳ trước</p>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(data?.previous?.total)}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {data?.previous?.transaction_count ?? 0} giao dịch
          </p>
        </div>

        {/* Platform Income */}
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-emerald-600 text-sm font-medium mb-1">
            Thu nền tảng (Kỳ này)
          </p>
          <p className="text-xl font-bold text-emerald-800">
            {formatCurrency(data?.current?.platform_income)}
          </p>
        </div>

        {/* Instructor Payout */}
        <div className="bg-teal-50 rounded-xl p-4">
          <p className="text-teal-600 text-sm font-medium mb-1">
            Chi giảng viên (Kỳ này)
          </p>
          <p className="text-xl font-bold text-teal-800">
            {formatCurrency(data?.current?.instructor_payout)}
          </p>
        </div>
      </div>
    </div>
  );
}
