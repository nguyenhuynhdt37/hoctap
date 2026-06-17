"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { OverviewResponse } from "@/types/admin/statistics";
import {
  HiUsers,
  HiBookOpen,
  HiAcademicCap,
  HiCurrencyDollar,
  HiCash,
  HiArrowUp,
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

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  isLoading,
}: StatCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-600 text-sm font-medium truncate">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-green-600 transition-colors truncate">
              {value}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-xl ${color} shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function OverviewStats() {
  const { data, isLoading } = useSWR<OverviewResponse>(
    "/admin/statistics/overview",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const stats = [
    {
      title: "Tổng người dùng",
      value: (data?.total_users ?? 0).toLocaleString("vi-VN"),
      icon: HiUsers,
      color: "bg-green-500",
    },
    {
      title: "Tổng khóa học",
      value: (data?.total_courses ?? 0).toLocaleString("vi-VN"),
      icon: HiBookOpen,
      color: "bg-emerald-500",
    },
    {
      title: "Giảng viên",
      value: (data?.total_instructors ?? 0).toLocaleString("vi-VN"),
      icon: HiAcademicCap,
      color: "bg-teal-500",
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(data?.total_revenue),
      icon: HiCurrencyDollar,
      color: "bg-green-600",
    },
    {
      title: "Doanh thu hôm nay",
      value: formatCurrency(data?.today_revenue),
      icon: HiCash,
      color: "bg-emerald-600",
    },
    {
      title: "Chờ rút tiền",
      value: (data?.pending_withdrawals ?? 0).toLocaleString("vi-VN"),
      icon: HiArrowUp,
      color: "bg-yellow-500",
    },
    {
      title: "Chờ hoàn tiền",
      value: (data?.pending_refunds ?? 0).toLocaleString("vi-VN"),
      icon: HiRefresh,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {stats.map((stat, idx) => (
        <StatCard key={idx} {...stat} isLoading={isLoading} />
      ))}
    </div>
  );
}
