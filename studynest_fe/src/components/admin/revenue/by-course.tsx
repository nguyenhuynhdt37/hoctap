"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { RevenueByCourseResponse } from "@/types/admin/statistics";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HiPhotograph } from "react-icons/hi";
import useSWR from "swr";

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function RevenueByCourse() {
  const { data, isLoading } = useSWR<RevenueByCourseResponse>(
    "/admin/statistics/revenue/by-course?limit=10",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const courses = data?.data || [];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Doanh thu theo khóa học
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-green-800 font-bold text-sm">
            {formatCurrency(data?.total_revenue)}
          </p>
          <p className="text-green-600 text-xs">Tổng doanh thu</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-emerald-800 font-bold text-sm">
            {(data?.total_sales ?? 0).toLocaleString("vi-VN")}
          </p>
          <p className="text-emerald-600 text-xs">Tổng lượt bán</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {courses.map((item, idx) => (
            <div
              key={item.course_id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group"
            >
              {/* Rank */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                  idx === 0
                    ? "bg-yellow-100 text-yellow-700"
                    : idx === 1
                    ? "bg-gray-200 text-gray-700"
                    : idx === 2
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {idx + 1}
              </div>

              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {item.thumbnail ? (
                  <img
                    src={getGoogleDriveImageUrl(item.thumbnail)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HiPhotograph className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate group-hover:text-green-600">
                  {item.title}
                </p>
                <p className="text-gray-500 text-xs truncate">
                  {item.instructor_name}
                </p>
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-green-600 text-sm">
                  {formatCurrency(item.revenue)}
                </p>
                <p className="text-gray-500 text-xs">
                  {item.sales_count} bán · {item.refund_count} hoàn
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
