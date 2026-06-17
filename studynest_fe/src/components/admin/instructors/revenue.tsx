"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { RevenueByInstructorResponse } from "@/types/admin/statistics";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HiUser, HiCalendar } from "react-icons/hi";
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

export default function InstructorRevenue() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const { data, isLoading } = useSWR<RevenueByInstructorResponse>(
    `/admin/statistics/revenue/by-instructor?from_date=${fromDate}&to_date=${toDate}&limit=20`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const instructors = data?.data || [];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-900">
          Doanh thu theo giảng viên
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <HiCalendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-green-800 font-bold text-lg">
            {formatCurrency(data?.total_revenue)}
          </p>
          <p className="text-green-600 text-xs">Tổng doanh thu</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-emerald-800 font-bold text-lg">
            {formatCurrency(data?.total_platform_fee)}
          </p>
          <p className="text-emerald-600 text-xs">Phí nền tảng</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-4 text-center">
          <p className="text-teal-800 font-bold text-lg">
            {formatCurrency(data?.total_instructor_earning)}
          </p>
          <p className="text-teal-600 text-xs">Giảng viên nhận</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  #
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Giảng viên
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Doanh thu
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Phí
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Thực nhận
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  GD
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {instructors.map((item, idx) => (
                <tr
                  key={item.instructor_id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-2 text-sm text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.avatar ? (
                          <img
                            src={getGoogleDriveImageUrl(item.avatar)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-green-100">
                            <HiUser className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {item.name}
                        </p>
                        <p className="text-gray-500 text-xs">{item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-green-600 text-sm">
                    {formatCurrency(item.revenue)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-500 text-sm">
                    {formatCurrency(item.platform_fee)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900 text-sm">
                    {formatCurrency(item.net_earning)}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600 text-sm">
                    {item.transaction_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
