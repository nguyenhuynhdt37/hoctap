"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { Category } from "@/types/admin/category";
import { DiscountCourse, DiscountFormData } from "@/types/admin/discount";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiArrowLeft, HiCurrencyDollar, HiTag } from "react-icons/hi";
import { CategorySelector } from "./category-selector";
import { CourseSelector } from "./course-selector";
import { WeakCoursesList } from "./weak-courses-list";

// Helper: Convert datetime-local to ISO format
const datetimeLocalToISO = (datetimeLocal: string): string => {
  if (!datetimeLocal) return "";
  try {
    const date = new Date(datetimeLocal);
    if (isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
};

export default function CreateDiscount() {
  const router = useRouter();
  const [selectedCourses, setSelectedCourses] = useState<DiscountCourse[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<DiscountFormData>({
    name: "",
    description: "",
    discount_code: "",
    is_hidden: false,
    applies_to: "global",
    discount_type: "fixed",
    percent_value: null,
    fixed_value: null,
    usage_limit: null,
    per_user_limit: 1,
    start_at: "",
    end_at: "",
    auto_targets_weak_courses: false,
    targets: [],
  });

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
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== courseId));
    setFormData((prev) => ({
      ...prev,
      targets: prev.targets.filter((t) => t.course_id !== courseId),
    }));
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategories((prev) => [...prev, category]);
    setFormData((prev) => ({
      ...prev,
      targets: [...prev.targets, { category_id: category.id }],
    }));
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setFormData((prev) => ({
      ...prev,
      targets: prev.targets.filter((t) => t.category_id !== categoryId),
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
    if (
      formData.applies_to === "course" &&
      formData.targets.length === 0 &&
      !formData.auto_targets_weak_courses
    ) {
      return "Vui lòng chọn ít nhất một khóa học hoặc bật tự động chọn khóa học yếu";
    }
    if (formData.applies_to === "category" && formData.targets.length === 0) {
      return "Vui lòng chọn ít nhất một danh mục";
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
      const payload = {
        name: formData.name,
        description: formData.description,
        discount_code: formData.discount_code,
        is_hidden: formData.is_hidden,
        applies_to: formData.applies_to,
        discount_type: formData.discount_type,
        percent_value:
          formData.discount_type === "percent" ? formData.percent_value : null,
        fixed_value:
          formData.discount_type === "fixed" ? formData.fixed_value : null,
        usage_limit: formData.usage_limit,
        per_user_limit: formData.per_user_limit,
        start_at: datetimeLocalToISO(formData.start_at),
        end_at: datetimeLocalToISO(formData.end_at),
        auto_targets_weak_courses: formData.auto_targets_weak_courses,
        targets:
          formData.applies_to === "global"
            ? []
            : formData.applies_to === "category"
            ? formData.targets
                .filter((t) => t.category_id)
                .map((t) => ({ category_id: t.category_id }))
            : formData.targets
                .filter((t) => t.course_id)
                .map((t) => ({ course_id: t.course_id })),
      };

      await api.post("/admin/discounts", payload);
      showToast.success("Tạo mã giảm giá thành công!");
      router.push("/admin/discounts");
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
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors mb-4"
          >
            <HiArrowLeft className="h-5 w-5" />
            <span className="font-medium">Quay lại</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tạo mã giảm giá mới
          </h1>
          <p className="text-gray-600">
            Tạo mã giảm giá cho khóa học, danh mục hoặc toàn hệ thống
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ví dụ: Black Friday Sale 2024"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                    placeholder="Ví dụ: BLACKFRIDAY2024"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Ví dụ: 20"
                      />
                      <span className="absolute right-4 top-2.5 text-gray-500">
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
                        min="1000"
                        step="1000"
                        required
                        className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                Phạm vi áp dụng
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Áp dụng cho <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="applies_to"
                    value={formData.applies_to}
                    onChange={(e) => {
                      handleInputChange(e);
                      // Reset selections when changing applies_to
                      if (e.target.value !== "course") {
                        setSelectedCourses([]);
                        setFormData((prev) => ({
                          ...prev,
                          targets: prev.targets.filter((t) => !t.course_id),
                          auto_targets_weak_courses: false,
                        }));
                      }
                      if (e.target.value !== "category") {
                        setSelectedCategories([]);
                        setFormData((prev) => ({
                          ...prev,
                          targets: prev.targets.filter((t) => !t.category_id),
                        }));
                      }
                      if (e.target.value === "global") {
                        setFormData((prev) => ({
                          ...prev,
                          targets: [],
                          auto_targets_weak_courses: false,
                        }));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="global">
                      Toàn hệ thống (tất cả khóa học)
                    </option>
                    <option value="course">Khóa học cụ thể</option>
                    <option value="category">Danh mục</option>
                  </select>
                </div>

                {/* Auto-target weak courses (only for course) */}
                {formData.applies_to === "course" && (
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="auto_targets_weak_courses"
                        checked={formData.auto_targets_weak_courses}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-gray-700">
                        Tự động áp dụng cho 100 khóa học yếu nhất
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-8">
                      Hệ thống sẽ tự động chọn TOP 100 khóa học có rating,
                      enrolls và views thấp nhất
                    </p>
                    <WeakCoursesList
                      isEnabled={formData.auto_targets_weak_courses}
                    />
                  </div>
                )}

                {/* Course Selector */}
                {formData.applies_to === "course" &&
                  !formData.auto_targets_weak_courses && (
                    <CourseSelector
                      selectedCourses={selectedCourses}
                      onSelect={handleSelectCourse}
                      onRemove={handleRemoveCourse}
                    />
                  )}

                {/* Category Selector */}
                {formData.applies_to === "category" && (
                  <CategorySelector
                    selectedCategories={selectedCategories}
                    onSelect={handleSelectCategory}
                    onRemove={handleRemoveCategory}
                  />
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
                    Tổng số lần sử dụng
                  </label>
                  <input
                    type="number"
                    name="usage_limit"
                    value={formData.usage_limit || ""}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Để trống = không giới hạn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số lần/người dùng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="per_user_limit"
                    value={formData.per_user_limit || ""}
                    onChange={handleInputChange}
                    min="1"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
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
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
