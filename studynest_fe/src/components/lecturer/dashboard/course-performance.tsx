"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { CoursePerformanceItem } from "@/types/lecturer/statistics";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HiStar, HiUserGroup, HiCurrencyDollar } from "react-icons/hi";
import useSWR from "swr";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function CoursePerformance() {
  const { data, isLoading } = useSWR<CoursePerformanceItem[]>(
    "/lecturer/statistics/courses",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Hiệu Suất Khóa Học
          </h3>
          <p className="text-sm text-gray-500">
            Top khóa học hoạt động hiệu quả nhất
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Khóa Học
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Trạng Thái
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Học Viên
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Đánh Giá
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                Doanh Thu Tháng
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="py-4 px-4">
                    <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-12 bg-gray-100 rounded animate-pulse mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-12 bg-gray-100 rounded animate-pulse mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse ml-auto" />
                  </td>
                </tr>
              ))
            ) : data?.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-gray-500 text-sm"
                >
                  Chưa có dữ liệu khóa học
                </td>
              </tr>
            ) : (
              data?.map((course) => (
                <tr
                  key={course.course_id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {course.thumbnail && (
                          <img
                            src={getGoogleDriveImageUrl(course.thumbnail)}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <p
                        className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs"
                        title={course.title}
                      >
                        {course.title}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        course.status === "published"
                          ? "bg-green-100 text-green-800"
                          : course.status === "draft"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {course.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                      <HiUserGroup className="w-4 h-4 text-blue-500" />
                      <span>{course.total_students}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                      <HiStar className="w-4 h-4 text-yellow-500" />
                      <span>{course.average_rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">
                        ({course.reviews_count})
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="text-sm font-bold text-green-600">
                      {formatCurrency(course.this_month_revenue)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Tổng: {formatCurrency(course.revenue)}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
