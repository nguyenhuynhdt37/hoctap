"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { InstructorStatsResponse } from "@/types/admin/statistics";
import {
  HiUserGroup,
  HiCurrencyDollar,
  HiClock,
  HiCheck,
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

export default function InstructorOverview() {
  const { data, isLoading } = useSWR<InstructorStatsResponse>(
    "/admin/statistics/instructors",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const stats = [
    {
      title: "Tổng giảng viên",
      value: (data?.total ?? 0).toLocaleString("vi-VN"),
      icon: HiUserGroup,
      color: "bg-green-500",
      bgLight: "bg-green-50",
    },
    {
      title: "Tổng thu nhập",
      value: formatCurrency(data?.total_earnings),
      icon: HiCurrencyDollar,
      color: "bg-emerald-500",
      bgLight: "bg-emerald-50",
    },
    {
      title: "Chờ thanh toán",
      value: formatCurrency(data?.pending_payout),
      icon: HiClock,
      color: "bg-yellow-500",
      bgLight: "bg-yellow-50",
    },
    {
      title: "Đã thanh toán",
      value: formatCurrency(data?.paid_out),
      icon: HiCheck,
      color: "bg-teal-500",
      bgLight: "bg-teal-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-sm font-medium">
                  {stat.title}
                </p>
                {isLoading ? (
                  <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-green-600 transition-colors truncate">
                    {stat.value}
                  </p>
                )}
              </div>
              <div
                className={`p-3 rounded-xl ${stat.color} shadow-lg group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
