"use client";

import { showToast } from "@/lib/utils/helpers/toast";

import api from "@/lib/utils/fetcher/client/axios";
import { UserDetailResponse } from "@/types/admin/user-detail";
import { useEffect, useState } from "react";
import {
  HiArrowLeft,
  HiCheckCircle,
  HiMail,
  HiPencil,
  HiSave,
  HiUser,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

interface EditUserProps {
  userId: string;
}

interface EditUserData {
  email: string;
  fullname: string;
}

const EditUser = ({ userId }: EditUserProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editData, setEditData] = useState<EditUserData>({
    email: "",
    fullname: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);

  // Fetch user detail data giống như detaiUser.tsx
  const { data, error, isLoading, mutate } = useSWR<UserDetailResponse>(
    `/admin/users/${userId}`,
    async (url) => {
      console.log("🔍 SWR Fetching user detail:", url);
      const response = await api.get(url);
      console.log("📊 SWR Response:", response.data);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      keepPreviousData: true,
      revalidateIfStale: false,
      fallbackData: undefined,
    }
  );

  // Cập nhật editData khi data load xong
  useEffect(() => {
    if (data) {
      setEditData({
        email: data.profile.email,
        fullname: data.profile.fullname || "",
      });
    }
  }, [data]);

  const handleInputChange = (field: keyof EditUserData, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Validate email format
    if (field === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setIsEmailValid(emailRegex.test(value) || value === "");
    }

    // Kiểm tra có thay đổi không
    if (data) {
      const hasEmailChange = field === "email" && value !== data.profile.email;
      const hasNameChange =
        field === "fullname" && value !== (data.profile.fullname || "");
      setHasChanges(hasEmailChange || hasNameChange);
    }
  };

  const handleSave = async () => {
    if (!data || !hasChanges) return;

    // Validation
    if (!editData.email.trim()) {
      showToast.error("Email không được để trống!");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editData.email)) {
      showToast.error("Email không đúng định dạng!");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedFullname = editData.fullname?.trim();
      const payload = {
        email: editData.email.trim(),
        fullname: trimmedFullname || null, // Gửi null nếu rỗng (match API spec)
      };

      console.log("📤 Sending update request:");
      console.log("  - URL:", `/admin/users/${userId}`);
      console.log("  - Payload:", JSON.stringify(payload, null, 2));
      console.log("  - Email type:", typeof payload.email);
      console.log("  - Fullname type:", typeof payload.fullname);
      console.log("  - Fullname value:", payload.fullname);

      const response = await api.put(`/admin/users/${userId}`, payload);

      console.log("📥 Update response:", response.data);

      showToast.success("Cập nhật thông tin người dùng thành công!");

      // Refresh data
      await mutate();
      setHasChanges(false);
    } catch (error: any) {
      console.error("❌ Error updating user:", error);
      console.error("❌ Error response data:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      console.error(
        "❌ Full error response:",
        JSON.stringify(error.response, null, 2)
      );

      let errorMessage = "Có lỗi xảy ra khi cập nhật thông tin!";

      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation error format
          errorMessage = error.response.data.detail
            .map((err: any) => `${err.loc?.join(".")} : ${err.msg}`)
            .join("\n");
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (data) {
      setEditData({
        email: data.profile.email,
        fullname: data.profile.fullname || "",
      });
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <HiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Không tìm thấy người dùng
          </h2>
          <p className="text-gray-600 mb-4">
            Người dùng với ID này không tồn tại hoặc đã bị xóa.
          </p>
          <button
            onClick={() => (window.location.href = "/admin/users")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const { profile } = data;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            title="Quay lại"
          >
            <HiArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Chỉnh sửa người dùng
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Cập nhật thông tin của {profile.fullname}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCancel}
            disabled={!hasChanges || isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
          >
            <HiXCircle className="w-4 h-4" />
            <span>Hủy</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSubmitting || !isEmailValid}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <HiSave className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <HiPencil className="w-5 h-5" />
            <span>Thông tin có thể chỉnh sửa</span>
          </h3>
          <p className="text-green-100 text-sm mt-1">
            Chỉ có thể sửa email và họ tên
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Email Field */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <HiMail className="w-4 h-4 text-emerald-600" />
              <span>Email</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={editData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:bg-white transition-all duration-200 ${
                !isEmailValid && editData.email
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              }`}
              placeholder="Nhập email..."
              required
            />
            {!isEmailValid && editData.email && (
              <p className="text-xs text-red-500 mt-1">
                ❌ Email không đúng định dạng
              </p>
            )}
            {isEmailValid && (
              <p className="text-xs text-gray-500 mt-1">
                Email phải hợp lệ và duy nhất trong hệ thống
              </p>
            )}
          </div>

          {/* Full Name Field */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <HiUser className="w-4 h-4 text-green-600" />
              <span>Họ và tên</span>
            </label>
            <input
              type="text"
              value={editData.fullname || ""}
              onChange={(e) => handleInputChange("fullname", e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all duration-200"
              placeholder="Nhập họ và tên..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Tên hiển thị của người dùng
            </p>
          </div>

          {/* Read-only Information */}
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
              <HiCheckCircle className="w-4 h-4 text-gray-500" />
              <span>Thông tin không thể chỉnh sửa</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-600">
                  ID người dùng
                </label>
                <p className="text-sm text-gray-900 font-mono mt-1">
                  {profile.id}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-600">
                  Ngày tạo
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(profile.created_at).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-600">
                  Ngày sinh
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {profile.birthday
                    ? new Date(profile.birthday).toLocaleDateString("vi-VN")
                    : "Chưa cập nhật"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-600">
                  Cập nhật lần cuối
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(profile.updated_at).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Changes Indicator */}
          {hasChanges && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-yellow-800">
                  Có thay đổi chưa được lưu
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditUser;
