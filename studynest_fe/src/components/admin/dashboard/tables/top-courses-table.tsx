"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { TopCoursesResponse, TopCoursesSortBy } from "@/types/admin/statistics";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HiPhotograph } from "react-icons/hi";
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

export default function TopCoursesTable() {
  const [sortBy, setSortBy] = useState<TopCoursesSortBy>("revenue");

  const { data: response, isLoading } = useSWR<TopCoursesResponse>(
    `/admin/statistics/courses/top?sort_by=${sortBy}&limit=10`,
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
        <h3 className="text-xl font-bold text-gray-900">Top Khóa học</h3>
        <div className="flex gap-2">
          {(["revenue", "views", "enrollments"] as TopCoursesSortBy[]).map(
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
                  : s === "views"
                  ? "Lượt xem"
                  : "Đăng ký"}
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
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
      ) : (
        <div className="space-y-3">
          {data.map((course, idx) => (
            <div
              key={course.course_id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all group"
            >
              {/* Rank */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
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
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {course.thumbnail ? (
                  <img
                    src={getGoogleDriveImageUrl(course.thumbnail)}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HiPhotograph className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate group-hover:text-green-600 transition-colors">
                  {course.title}
                </p>
                <p className="text-gray-500 text-sm truncate">
                  {course.instructor_name}
                </p>
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-green-600">
                  {formatValue(course.value, course.metric)}
                </p>
                <p className="text-gray-500 text-xs">
                  {course.metric === "revenue"
                    ? "Doanh thu"
                    : course.metric === "views"
                    ? "Lượt xem"
                    : "Đăng ký"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
