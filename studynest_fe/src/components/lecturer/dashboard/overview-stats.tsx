"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { LecturerOverview } from "@/types/lecturer/statistics";
import {
  HiCurrencyDollar,
  HiUserGroup,
  HiBookOpen,
  HiStar,
  HiTrendingUp,
  HiTrendingDown,
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

export default function OverviewStats() {
  const { data, isLoading } = useSWR<LecturerOverview>(
    "/lecturer/statistics/overview",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const stats = [
    {
      title: "Tổng Doanh Thu",
      value: formatCurrency(data?.total_revenue),
      subValue: `${data?.revenue_growth.toFixed(1)}% so với tháng trước`,
      isGrowthPositive: (data?.revenue_growth ?? 0) >= 0,
      icon: HiCurrencyDollar,
      color: "text-green-600",
      bgLight: "bg-green-50",
    },
    {
      title: "Học Viên",
      value: (data?.total_students ?? 0).toLocaleString("vi-VN"),
      subValue: "Tổng số học viên",
      icon: HiUserGroup,
      color: "text-blue-600",
      bgLight: "bg-blue-50",
    },
    {
      title: "Khóa Học",
      value: (data?.total_courses ?? 0).toLocaleString("vi-VN"),
      subValue: "Khóa học đang hoạt động",
      icon: HiBookOpen,
      color: "text-indigo-600",
      bgLight: "bg-indigo-50",
    },
    {
      title: "Đánh Giá",
      value: (data?.average_rating ?? 0).toFixed(1),
      subValue: `${data?.total_reviews ?? 0} lượt đánh giá`,
      icon: HiStar,
      color: "text-yellow-500",
      bgLight: "bg-yellow-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bgLight}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              {idx === 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    stat.isGrowthPositive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {stat.isGrowthPositive ? (
                    <HiTrendingUp />
                  ) : (
                    <HiTrendingDown />
                  )}
                  {Math.abs(data?.revenue_growth ?? 0).toFixed(1)}%
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                {stat.title}
              </p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-xs text-gray-400 mt-2">{stat.subValue}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
