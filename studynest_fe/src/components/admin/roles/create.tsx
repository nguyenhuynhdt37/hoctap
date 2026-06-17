"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiCheck, HiExclamationCircle, HiUsers, HiX } from "react-icons/hi";

interface CreateRoleForm {
  role_name: string;
  details: string;
}

interface ValidationErrors {
  role_name?: string;
  details?: string;
}

export default function CreateRole() {
  const router = useRouter();
  const [form, setForm] = useState<CreateRoleForm>({
    role_name: "",
    details: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation function for role_name
  const validateRoleName = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Tên vai trò không được để trống";
    }

    // Check for Vietnamese characters (dấu)
    const vietnameseRegex =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (vietnameseRegex.test(value)) {
      return "Tên vai trò không được chứa dấu tiếng Việt";
    }

    // Check for spaces
    if (value.includes(" ")) {
      return "Tên vai trò không được chứa khoảng trắng";
    }

    // Check for special characters except underscore
    const specialCharRegex = /[^a-zA-Z0-9_]/;
    if (specialCharRegex.test(value)) {
      return "Tên vai trò chỉ được chứa chữ cái, số và dấu gạch dưới";
    }

    // Check if not uppercase
    if (value !== value.toUpperCase()) {
      return "Tên vai trò phải viết hoa";
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate role_name
    const roleNameError = validateRoleName(form.role_name);
    if (roleNameError) {
      newErrors.role_name = roleNameError;
    }

    // Validate details
    if (!form.details.trim()) {
      newErrors.details = "Mô tả không được để trống";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateRoleForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleRoleNameChange = (value: string) => {
    // Auto-convert to uppercase
    const upperValue = value.toUpperCase();
    handleInputChange("role_name", upperValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/admin/roles", {
        role_name: form.role_name,
        details: form.details,
      });

      // Success - redirect to roles list
      router.push("/admin/roles");
      router.refresh();
    } catch (error: any) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error creating role:", error);

      // Handle API errors
      if (error.response?.data?.message) {
        setErrors({ role_name: error.response.data.message });
      } else {
        setErrors({ role_name: "Có lỗi xảy ra khi tạo vai trò" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <HiUsers className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Tạo vai trò mới
                </h1>
                <p className="text-gray-600">
                  Thêm vai trò mới vào hệ thống quản trị
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên vai trò <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.role_name}
                  onChange={(e) => handleRoleNameChange(e.target.value)}
                  placeholder="VD: ADMIN, USER, MODERATOR"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.role_name
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  disabled={isSubmitting}
                />
                {form.role_name && !errors.role_name && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <HiCheck className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
              {errors.role_name && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <HiExclamationCircle className="w-4 h-4 mr-1" />
                  {errors.role_name}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                <p>• Không được chứa dấu tiếng Việt</p>
                <p>• Không được chứa khoảng trắng</p>
                <p>• Chỉ được chứa chữ cái, số và dấu gạch dưới</p>
                <p>• Phải viết hoa</p>
              </div>
            </div>

            {/* Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.details}
                onChange={(e) => handleInputChange("details", e.target.value)}
                placeholder="Mô tả chi tiết về vai trò này..."
                rows={6}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none ${
                  errors.details
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
                disabled={isSubmitting}
              />
              {errors.details && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <HiExclamationCircle className="w-4 h-4 mr-1" />
                  {errors.details}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors font-medium"
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Đang tạo...
                  </div>
                ) : (
                  "Tạo vai trò"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
