"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  TopInstructorsResponse,
  InstructorDetailResponse,
} from "@/types/admin/statistics";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import {
  HiUser,
  HiX,
  HiStar,
  HiBookOpen,
  HiUserGroup,
  HiCurrencyDollar,
  HiCheckCircle,
  HiBan,
} from "react-icons/hi";
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

export default function InstructorList() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: response, isLoading } = useSWR<TopInstructorsResponse>(
    "/admin/statistics/instructors/top?sort_by=revenue&limit=50",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const instructors = response?.data || [];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Danh sách giảng viên
      </h3>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Không có giảng viên nào
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {instructors.map((instructor) => (
            <div
              key={instructor.instructor_id}
              onClick={() => setSelectedId(instructor.instructor_id)}
              className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {instructor.avatar ? (
                    <img
                      src={getGoogleDriveImageUrl(instructor.avatar)}
                      alt={instructor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-green-100">
                      <HiUser className="w-6 h-6 text-green-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate group-hover:text-green-600">
                    {instructor.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {instructor.courses_count} khóa ·{" "}
                    {instructor.students_count} HV
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-bold text-sm">
                  {formatCurrency(instructor.value)}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-green-600">
                  Xem chi tiết →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <InstructorDetailModal
          instructorId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// Detail Modal Component
function InstructorDetailModal({
  instructorId,
  onClose,
}: {
  instructorId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useSWR<InstructorDetailResponse>(
    `/admin/statistics/instructors/${instructorId}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            Chi tiết giảng viên
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {data.avatar ? (
                  <img
                    src={getGoogleDriveImageUrl(data.avatar)}
                    alt={data.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-green-100">
                    <HiUser className="w-8 h-8 text-green-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold text-gray-900">
                    {data.name}
                  </h4>
                  {data.is_active && !data.is_banned && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      Active
                    </span>
                  )}
                  {data.is_banned && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      Banned
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">{data.email}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Tham gia: {formatDate(data.join_date)}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <HiCurrencyDollar className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-800">
                  {formatCurrency(data.total_revenue)}
                </p>
                <p className="text-green-600 text-xs">Tổng doanh thu</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <HiUserGroup className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-800">
                  {data.total_students}
                </p>
                <p className="text-emerald-600 text-xs">Học viên</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-4 text-center">
                <HiBookOpen className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-teal-800">
                  {data.total_courses}
                </p>
                <p className="text-teal-600 text-xs">Khóa học</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <HiStar className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-800">
                  {data.average_rating.toFixed(1)}
                </p>
                <p className="text-yellow-600 text-xs">Đánh giá TB</p>
              </div>
            </div>

            {/* 30 Days Stats */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-600 text-sm font-medium mb-3">
                30 ngày gần nhất
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(data.revenue_last_30d)}
                  </p>
                  <p className="text-gray-500 text-xs">Doanh thu</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {data.students_last_30d}
                  </p>
                  <p className="text-gray-500 text-xs">Học viên mới</p>
                </div>
              </div>
            </div>

            {/* Top Courses */}
            {data.top_courses && data.top_courses.length > 0 && (
              <div>
                <p className="text-gray-600 text-sm font-medium mb-3">
                  Top khóa học
                </p>
                <div className="space-y-2">
                  {data.top_courses.map((course) => (
                    <div
                      key={course.course_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {course.thumbnail ? (
                          <img
                            src={getGoogleDriveImageUrl(course.thumbnail)}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <HiBookOpen className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {course.title}
                        </p>
                      </div>
                      <p className="font-bold text-green-600 text-sm">
                        {formatCurrency(course.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            Không tìm thấy giảng viên
          </div>
        )}
      </div>
    </div>
  );
}
