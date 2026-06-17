"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { Category } from "@/types/admin/category";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiArrowLeft, HiCheckCircle, HiPlus, HiXCircle } from "react-icons/hi";
import useSWR from "swr";

const CreateCategory = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all categories for parent dropdown (2 levels)
  const { data: allCategories } = useSWR<Category[]>(
    "/admin/categories/two_level",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast.error("Vui lòng nhập tên danh mục");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/admin/categories", {
        name: name.trim(),
        parent_id: parentId || null,
      });

      showToast.success("Đã tạo danh mục thành công!");
      router.push("/admin/categories");
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      name.trim() &&
      !confirm("Bạn có chắc muốn hủy? Dữ liệu sẽ không được lưu.")
    ) {
      return;
    }
    router.push("/admin/categories");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/categories")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Tạo danh mục mới
              </h1>
              <p className="text-gray-600 mt-1">
                Thêm danh mục mới vào hệ thống
              </p>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <HiPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Thông tin danh mục
                </h2>
                <p className="text-green-100 text-sm">
                  Điền thông tin chi tiết bên dưới
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Nhập tên danh mục..."
                  required
                  autoFocus
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tên danh mục nên rõ ràng và dễ hiểu
                </p>
              </div>

              {/* Parent Category Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📂 Danh mục cha (Tùy chọn)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  disabled={isSubmitting}
                >
                  <option value="">Không có (Danh mục gốc - Cấp 0)</option>
                  {allCategories?.map((cat) => {
                    // Indent based on parent
                    const indent = cat.parent_id ? "  └─ " : "";
                    const level = cat.parent_id ? "Cấp 2" : "Cấp 1";
                    return (
                      <option key={cat.id} value={cat.id}>
                        {indent}
                        {cat.name} ({level})
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Để trống nếu đây là danh mục cấp cao nhất
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">ℹ️</span>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-800 text-sm">
                      Lưu ý quan trọng
                    </div>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Danh mục mới sẽ được thêm vào cuối danh sách</li>
                      <li>Bạn có thể điều chỉnh thứ tự sau khi tạo</li>
                      <li>Slug sẽ được tự động tạo từ tên danh mục</li>
                      <li>Danh mục có tối đa 3 cấp (0, 1, 2)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Preview Box */}
              {name.trim() && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HiCheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">
                      Xem trước danh mục
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tên:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Danh mục cha:
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {parentId
                          ? allCategories?.find((c) => c.id === parentId)
                              ?.name || "..."
                          : "Không có (Cấp 0)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cấp:</span>
                      <span className="text-sm font-semibold text-teal-600">
                        {!parentId
                          ? "Cấp 0 (Gốc)"
                          : allCategories?.find((c) => c.id === parentId)
                              ?.parent_id
                          ? "Cấp 2"
                          : "Cấp 1"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiXCircle className="w-5 h-5" />
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiPlus className="w-5 h-5" />
                {isSubmitting ? "Đang tạo..." : "Tạo danh mục"}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">❓</span>
            Hướng dẫn tạo danh mục
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Bước 1:</strong> Nhập tên danh mục rõ ràng và dễ hiểu
            </p>
            <p>
              <strong>Bước 2:</strong> Chọn danh mục cha nếu đây là danh mục con
            </p>
            <p>
              <strong>Bước 3:</strong> Kiểm tra xem trước và nhấn "Tạo danh mục"
            </p>
            <p className="text-xs text-gray-500 mt-3">
              💡 <strong>Mẹo:</strong> Bạn có thể chỉnh sửa thứ tự (order_index)
              sau khi tạo trong trang quản lý danh mục.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCategory;
