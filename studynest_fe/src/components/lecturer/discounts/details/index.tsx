"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import {
  DiscountDetail,
  DiscountDetailsProps,
} from "@/types/lecturer/discount";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  HiArrowLeft,
  HiCalendar,
  HiCheckCircle,
  HiCurrencyDollar,
  HiTag,
  HiUser,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function DiscountDetails({ discountId }: DiscountDetailsProps) {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<DiscountDetail>(
    `/lecturer/discounts/${discountId}`,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const discountStatus = useMemo(() => {
    if (!data?.discount) return null;
    const now = new Date();
    const startAt = new Date(data.discount.start_at);
    const endAt = new Date(data.discount.end_at);

    if (!data.discount.is_active) {
      return { label: "Đã tắt", color: "text-gray-600", bg: "bg-gray-100" };
    }
    if (now < startAt) {
      return {
        label: "Sắp bắt đầu",
        color: "text-yellow-600",
        bg: "bg-yellow-100",
      };
    }
    if (now > endAt) {
      return { label: "Đã hết hạn", color: "text-red-600", bg: "bg-red-100" };
    }
    return {
      label: "Đang hoạt động",
      color: "text-teal-600",
      bg: "bg-teal-100",
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Đang tải thông tin...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <div className="flex items-center gap-3 text-red-600">
              <HiXCircle className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Không thể tải thông tin</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Vui lòng thử lại sau hoặc liên hệ hỗ trợ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { discount, targets, usage_history } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-4"
          >
            <HiArrowLeft className="h-5 w-5" />
            <span className="font-medium">Quay lại</span>
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Chi tiết mã giảm giá
          </h1>
        </div>

        {/* Discount Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <HiTag className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {discount.name}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg font-semibold text-sm">
                    {discount.code}
                  </span>
                  {discountStatus && (
                    <span
                      className={`px-3 py-1 ${discountStatus.bg} ${discountStatus.color} rounded-lg font-medium text-sm`}
                    >
                      {discountStatus.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {discount.is_active ? (
                <HiCheckCircle className="h-6 w-6 text-teal-600" />
              ) : (
                <HiXCircle className="h-6 w-6 text-gray-400" />
              )}
            </div>
          </div>

          {discount.description && (
            <p className="text-gray-700 mb-6 leading-relaxed">
              {discount.description}
            </p>
          )}

          {/* Discount Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <HiCurrencyDollar className="h-5 w-5" />
                <span className="text-sm font-medium">Giá trị giảm</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {discount.discount_type === "percent"
                  ? `${discount.percent_value}%`
                  : formatCurrency(discount.fixed_value || 0)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <HiUser className="h-5 w-5" />
                <span className="text-sm font-medium">Đã sử dụng</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {discount.usage_count}
                {discount.usage_limit && ` / ${discount.usage_limit}`}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <HiUser className="h-5 w-5" />
                <span className="text-sm font-medium">Giới hạn/người</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {discount.per_user_limit}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <HiTag className="h-5 w-5" />
                <span className="text-sm font-medium">Áp dụng cho</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {discount.applies_to === "course"
                  ? "Khóa học"
                  : discount.applies_to === "category"
                  ? "Danh mục"
                  : discount.applies_to === "global"
                  ? "Toàn bộ"
                  : discount.applies_to}
              </p>
            </div>
          </div>

          {/* Date Range */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-3">
              <HiCalendar className="h-5 w-5" />
              <span className="font-medium">Thời gian hiệu lực</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Bắt đầu</p>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(discount.start_at)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Kết thúc</p>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(discount.end_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Targets Section */}
        {targets.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Đối tượng áp dụng ({targets.length})
            </h3>
            <div className="space-y-3">
              {targets.map((target, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  {target.course_title ? (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Khóa học</p>
                      <p className="font-semibold text-gray-900">
                        {target.course_title}
                      </p>
                    </div>
                  ) : target.category_name ? (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Danh mục</p>
                      <p className="font-semibold text-gray-900">
                        {target.category_name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-600">Toàn bộ</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Lịch sử sử dụng ({usage_history.length})
          </h3>
          {usage_history.length === 0 ? (
            <div className="text-center py-12">
              <HiUser className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Chưa có lịch sử sử dụng</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Khóa học
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Số tiền giảm
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usage_history.map((usage, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {usage.avatar ? (
                            <img
                              src={getGoogleDriveImageUrl(usage.avatar)}
                              alt={usage.user_name}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                              <HiUser className="h-5 w-5 text-teal-600" />
                            </div>
                          )}
                          <span className="font-medium text-gray-900">
                            {usage.user_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700">
                          {usage.course_title}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-teal-600">
                          {formatCurrency(usage.discounted_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDateTime(usage.used_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
