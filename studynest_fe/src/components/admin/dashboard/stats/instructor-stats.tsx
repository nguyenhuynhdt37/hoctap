"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { InstructorStatsResponse } from "@/types/admin/statistics";
import useSWR from "swr";
import Link from "next/link";
import { HiExternalLink } from "react-icons/hi";

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function InstructorStats() {
  const { data, isLoading } = useSWR<InstructorStatsResponse>(
    "/admin/statistics/instructors",
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
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Thống kê Giảng viên</h3>
        <Link
          href="/admin/instructors"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
        >
          <HiExternalLink className="w-4 h-4" />
          Chi tiết
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">
            {data?.total ?? 0}
          </p>
          <p className="text-green-700 text-sm mt-1">Tổng giảng viên</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-emerald-600">
            {formatCurrency(data?.total_earnings)}
          </p>
          <p className="text-emerald-700 text-sm mt-1">Tổng thu nhập</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-yellow-600">
            {formatCurrency(data?.pending_payout)}
          </p>
          <p className="text-yellow-700 text-sm mt-1">Chờ thanh toán</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-teal-600">
            {formatCurrency(data?.paid_out)}
          </p>
          <p className="text-teal-700 text-sm mt-1">Đã thanh toán</p>
        </div>
      </div>
    </div>
  );
}
