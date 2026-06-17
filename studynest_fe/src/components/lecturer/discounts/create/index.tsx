"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  DiscountCourse,
  DiscountCoursesResponse,
  DiscountFormData,
} from "@/types/lecturer/discount";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  HiArrowLeft,
  HiCheck,
  HiCurrencyDollar,
  HiSearch,
  HiTag,
  HiX,
} from "react-icons/hi";
import useSWR from "swr";

export default function CreateDiscount() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<DiscountCourse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);

  const [formData, setFormData] = useState<DiscountFormData>({
    name: "",
    description: "",
    discount_code: "",
    is_hidden: false,
    applies_to: "course",
    discount_type: "fixed",
    percent_value: null,
    fixed_value: null,
    usage_limit: null,
    per_user_limit: 1,
    start_at: "",
    end_at: "",
    targets: [],
  });

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch courses - fetch all when search is empty
  const { data: coursesData, isLoading: isLoadingCourses } =
    useSWR<DiscountCoursesResponse>(
      showCourseSelector
        ? `/lecturer/courses/discount-targets${
            debouncedSearch
              ? `?search=${encodeURIComponent(debouncedSearch)}`
              : ""
          }`
        : null,
      async (url) => {
        const response = await api.get(url);
        return response.data;
      },
      {
        revalidateOnFocus: false,
      }
    );

  const availableCourses = useMemo(() => {
    if (!coursesData?.courses) return [];
    return coursesData.courses.filter(
      (course) => !selectedCourses.some((selected) => selected.id === course.id)
    );
  }, [coursesData, selectedCourses]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? value === ""
            ? null
            : Number(value)
          : name === "discount_code"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleSelectCourse = (course: DiscountCourse) => {
    setSelectedCourses((prev) => [...prev, course]);
    setFormData((prev) => ({
      ...prev,
      targets: [...prev.targets, { course_id: course.id }],
    }));
    setSearch("");
    setShowCourseSelector(false);
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== courseId));
    setFormData((prev) => ({
      ...prev,
      targets: prev.targets.filter((t) => t.course_id !== courseId),
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Vui lòng nhập tên mã giảm giá";
    if (!formData.discount_code.trim()) return "Vui lòng nhập mã giảm giá";
    if (formData.discount_type === "percent" && !formData.percent_value) {
      return "Vui lòng nhập phần trăm giảm giá";
    }
    if (formData.discount_type === "fixed" && !formData.fixed_value) {
      return "Vui lòng nhập số tiền giảm giá";
    }
    if (!formData.start_at) return "Vui lòng chọn thời gian bắt đầu";
    if (!formData.end_at) return "Vui lòng chọn thời gian kết thúc";
    if (new Date(formData.start_at) >= new Date(formData.end_at)) {
      return "Thời gian kết thúc phải sau thời gian bắt đầu";
    }
    if (formData.applies_to === "course" && formData.targets.length === 0) {
      return "Vui lòng chọn ít nhất một khóa học";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      showToast.error(error);
      return;
    }

    setIsSubmitting(true);
    try {
      // Helper: Convert datetime-local to ISO format (theo timezone local)
      const datetimeLocalToISO = (datetimeLocal: string): string => {
        if (!datetimeLocal) return "";
        try {
          // datetime-local không có timezone, nó là local time
          // Tạo Date object từ local time string
          const date = new Date(datetimeLocal);

          // Convert sang ISO string (sẽ tự động convert theo timezone)
          return date.toISOString();
        } catch {
          return "";
        }
      };

      const payload = {
        ...formData,
        percent_value:
          formData.discount_type === "percent" ? formData.percent_value : null,
        fixed_value:
          formData.discount_type === "fixed" ? formData.fixed_value : null,
        targets: formData.applies_to === "course" ? formData.targets : [],
        // Convert datetime-local to ISO format
        start_at: datetimeLocalToISO(formData.start_at),
        end_at: datetimeLocalToISO(formData.end_at),
      };

      await api.post("/lecturer/discounts", payload);
      showToast.success("Tạo mã giảm giá thành công! 🎉");
      router.push("/lecturer/discounts");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Không thể tạo mã giảm giá. Vui lòng thử lại.";
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
            Tạo mã giảm giá mới
          </h1>
          <p className="text-gray-600">
            Tạo mã giảm giá để thu hút học viên đăng ký khóa học
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Thông tin cơ bản
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tên mã giảm giá <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Ví dụ: Giảm 50K cho khóa học"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mã giảm giá <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="discount_code"
                    value={formData.discount_code}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 uppercase"
                    placeholder="Ví dụ: GIAM50K"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mã sẽ được chuyển thành chữ hoa tự động
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Mô tả về mã giảm giá..."
                  />
                </div>
              </div>
            </div>

            {/* Discount Type */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Loại giảm giá
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loại <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="fixed">Giảm trực tiếp (VND)</option>
                    <option value="percent">Giảm theo phần trăm (%)</option>
                  </select>
                </div>

                {formData.discount_type === "percent" ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phần trăm giảm <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="percent_value"
                        value={formData.percent_value || ""}
                        onChange={handleInputChange}
                        min="1"
                        max="100"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Ví dụ: 20"
                      />
                      <span className="absolute right-4 top-2 text-gray-500">
                        %
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Số tiền giảm (VND) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <HiCurrencyDollar className="absolute left-4 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        name="fixed_value"
                        value={formData.fixed_value || ""}
                        onChange={handleInputChange}
                        min="1"
                        required
                        className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Ví dụ: 50000"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Applies To */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Áp dụng cho
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phạm vi áp dụng <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="applies_to"
                    value={formData.applies_to}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value !== "course") {
                        setSelectedCourses([]);
                        setFormData((prev) => ({ ...prev, targets: [] }));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="course">Khóa học cụ thể</option>
                    <option value="global">Toàn bộ</option>
                  </select>
                </div>

                {formData.applies_to === "course" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Chọn khóa học <span className="text-red-500">*</span>
                    </label>

                    {/* Selected Courses */}
                    {selectedCourses.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {selectedCourses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {course.thumbnail_url && (
                                <img
                                  src={getGoogleDriveImageUrl(
                                    course.thumbnail_url
                                  )}
                                  alt={course.title}
                                  className="h-10 w-10 rounded object-cover"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {course.title}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCourse(course.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            >
                              <HiX className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Course Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowCourseSelector(!showCourseSelector)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-teal-500 transition-colors"
                      >
                        <span className="text-gray-500">
                          {selectedCourses.length > 0
                            ? `Đã chọn ${selectedCourses.length} khóa học`
                            : "Tìm kiếm và chọn khóa học..."}
                        </span>
                        <HiSearch className="h-5 w-5 text-gray-400" />
                      </button>

                      {showCourseSelector && (
                        <>
                          <div
                            className="fixed inset-0 z-[5]"
                            onClick={() => setShowCourseSelector(false)}
                          />
                          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
                            <div className="p-3 border-b border-gray-200">
                              <div className="relative">
                                <HiSearch className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <input
                                  type="text"
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  placeholder="Tìm kiếm khóa học..."
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto max-h-80">
                              {isLoadingCourses ? (
                                <div className="p-4 text-center text-gray-500">
                                  Đang tải...
                                </div>
                              ) : availableCourses.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                  {search
                                    ? "Không tìm thấy khóa học"
                                    : "Đang tải danh sách khóa học..."}
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {availableCourses.map((course) => (
                                    <button
                                      key={course.id}
                                      type="button"
                                      onClick={() => handleSelectCourse(course)}
                                      className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        {course.thumbnail_url && (
                                          <img
                                            src={getGoogleDriveImageUrl(
                                              course.thumbnail_url
                                            )}
                                            alt={course.title}
                                            className="h-12 w-12 rounded object-cover"
                                            onError={(e) => {
                                              (
                                                e.target as HTMLImageElement
                                              ).style.display = "none";
                                            }}
                                          />
                                        )}
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-900">
                                            {course.title}
                                          </p>
                                          <p className="text-xs text-teal-600 mt-1">
                                            {course.base_price > 0
                                              ? new Intl.NumberFormat("vi-VN", {
                                                  style: "currency",
                                                  currency: "VND",
                                                }).format(course.base_price)
                                              : "Miễn phí"}
                                          </p>
                                        </div>
                                        <HiCheck className="h-5 w-5 text-teal-600" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Limits */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Giới hạn sử dụng
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giới hạn tổng số lần sử dụng
                  </label>
                  <input
                    type="number"
                    name="usage_limit"
                    value={formData.usage_limit || ""}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Để trống = không giới hạn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giới hạn/người dùng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="per_user_limit"
                    value={formData.per_user_limit || ""}
                    onChange={handleInputChange}
                    min="1"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Thời gian hiệu lực
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="start_at"
                    value={formData.start_at}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="end_at"
                    value={formData.end_at}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tùy chọn</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_hidden"
                    checked={formData.is_hidden}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-gray-700">
                    Ẩn mã giảm giá (chỉ có thể sử dụng khi biết mã)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <HiTag className="h-5 w-5" />
                  <span>Tạo mã giảm giá</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
