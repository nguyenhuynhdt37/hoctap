"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { InstructorByCategoryResponse } from "@/types/admin/statistics";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import {
  HiUser,
  HiBookOpen,
  HiUserGroup,
  HiCurrencyDollar,
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

export default function InstructorByCategory() {
  const { data, isLoading } = useSWR<InstructorByCategoryResponse>(
    "/admin/statistics/instructors/by-category?limit_instructors=3",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const categories = data?.data || [];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          Giảng viên theo danh mục
        </h3>
        <span className="text-sm text-gray-500">
          {data?.total_categories ?? 0} danh mục
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không có dữ liệu</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div key={cat.category_id} className="bg-gray-50 rounded-xl p-4">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  {cat.category_name}
                </h4>
                <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                  {formatCurrency(cat.total_revenue)}
                </span>
              </div>

              {/* Stats Row */}
              <div className="flex gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <HiUserGroup className="w-4 h-4 text-emerald-500" />
                  <span>{cat.instructor_count} GV</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <HiBookOpen className="w-4 h-4 text-teal-500" />
                  <span>{cat.total_courses} khóa</span>
                </div>
              </div>

              {/* Top Instructors */}
              {cat.top_instructors && cat.top_instructors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">
                    Top giảng viên
                  </p>
                  {cat.top_instructors.map((inst, idx) => (
                    <div
                      key={inst.instructor_id}
                      className="flex items-center gap-2 bg-white rounded-lg p-2"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {inst.avatar ? (
                          <img
                            src={getGoogleDriveImageUrl(inst.avatar)}
                            alt={inst.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-green-100">
                            <HiUser className="w-3 h-3 text-green-600" />
                          </div>
                        )}
                      </div>
                      <span className="flex-1 text-sm text-gray-800 truncate">
                        {inst.name}
                      </span>
                      <span className="text-xs font-medium text-green-600">
                        {formatCurrency(inst.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
