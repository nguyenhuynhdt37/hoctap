"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  TopInstructorsResponse,
  TopInstructorsSortBy,
} from "@/types/admin/statistics";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HiUser } from "react-icons/hi";
import { useState } from "react";
import useSWR from "swr";

const formatValue = (value: number | null | undefined, metric: string) => {
  const safeValue = value ?? 0;
  if (metric === "revenue") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(safeValue);
  }
  return safeValue.toLocaleString("vi-VN");
};

export default function TopInstructors() {
  const [sortBy, setSortBy] = useState<TopInstructorsSortBy>("revenue");

  const { data: response, isLoading } = useSWR<TopInstructorsResponse>(
    `/admin/statistics/instructors/top?sort_by=${sortBy}&limit=10`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const data = response?.data || [];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Top Giảng viên</h3>
        <div className="flex gap-2">
          {(["revenue", "students", "courses"] as TopInstructorsSortBy[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  sortBy === s
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "revenue"
                  ? "Doanh thu"
                  : s === "students"
                  ? "Học viên"
                  : "Khóa học"}
              </button>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {data.map((instructor, idx) => (
            <div
              key={instructor.instructor_id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group cursor-pointer"
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

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                {instructor.avatar ? (
                  <img
                    src={getGoogleDriveImageUrl(instructor.avatar)}
                    alt={instructor.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-green-100">
                    <HiUser className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate group-hover:text-green-600">
                  {instructor.name}
                </p>
                <p className="text-gray-500 text-xs">
                  {instructor.courses_count} khóa · {instructor.students_count}{" "}
                  học viên
                </p>
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-green-600 text-sm">
                  {formatValue(instructor.value, instructor.metric)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
