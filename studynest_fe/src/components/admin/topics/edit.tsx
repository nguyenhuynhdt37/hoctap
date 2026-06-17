"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { Category } from "@/types/admin/category";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiArrowLeft,
  HiCheckCircle,
  HiPencil,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

interface CategoriesPaginatedResponse {
  items: Category[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

interface TopicDetail {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  has_embedding: boolean;
  course_count: number;
  created_at: string;
  updated_at: string;
}

const EditTopic = ({ topicId }: { topicId: string }) => {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch topic detail
  const {
    data: topicData,
    isLoading: isLoadingTopic,
    mutate: mutateTopic,
  } = useSWR<TopicDetail>(
    topicId ? `/admin/topics/${topicId}` : null,
    async (url: string) => {
      console.log("🔍 Fetching topic detail:", url);
      const res = await api.get(url);
      console.log("✅ Topic detail response:", res.data);
      return res.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
    }
  );

  // Fetch all categories for dropdown
  const { data: categoriesData } = useSWR<CategoriesPaginatedResponse>(
    "/admin/categories?page=1&page_size=100&sort_by=name&sort_order=asc",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    }
  );

  const allCategories = categoriesData?.items || [];

  // Pre-fill form when topic data is loaded
  useEffect(() => {
    if (topicData) {
      setName(topicData.name || "");
      setDescription(topicData.description || "");
      setCategoryId(topicData.category_id || "");
      setIsActive(topicData.is_active ?? true);
    }
  }, [topicData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId.trim()) {
      setError("Vui lòng chọn danh mục");
      return;
    }

    if (!name.trim()) {
      setError("Vui lòng nhập tên topic");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category_id: categoryId.trim(),
        name: name.trim(),
        description: description.trim() || null,
        is_active: isActive,
      };

      console.log("📤 Gửi request cập nhật topic:", payload);

      const response = await api.put(`/admin/topics/${topicId}`, payload);

      console.log("✅ Response từ server:", response.data);

      const successMessage =
        response.data?.message || "✅ Đã cập nhật topic thành công!";

      showToast.success(successMessage);
      router.push("/admin/topics");
    } catch (error: any) {
      console.error("❌ Lỗi khi cập nhật topic:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      (name.trim() !== topicData?.name ||
        description.trim() !== (topicData?.description || "") ||
        categoryId !== topicData?.category_id ||
        isActive !== topicData?.is_active) &&
      !confirm("Bạn có chắc muốn hủy? Thay đổi sẽ không được lưu.")
    ) {
      return;
    }
    router.push("/admin/topics");
  };

  const handleGenerateDescription = async () => {
    if (!name.trim() || !selectedCategory) {
      setError("Vui lòng nhập tên topic và chọn category trước");
      return;
    }

    setIsGeneratingDescription(true);
    setError(null);

    try {
      const response = await api.post("/admin/chat/topics/create/description", {
        name: name.trim(),
        category_name: selectedCategory.name,
      });

      // API trả về markdown string trực tiếp
      const generatedDescription = response.data;

      if (generatedDescription && typeof generatedDescription === "string") {
        setDescription(generatedDescription);
      } else {
        setError("Không thể tạo mô tả tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Không thể tạo mô tả tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const selectedCategory = allCategories.find((cat) => cat.id === categoryId);

  if (isLoadingTopic) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu topic...</p>
        </div>
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <HiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-semibold">
            Không tìm thấy topic
          </p>
          <button
            onClick={() => router.push("/admin/topics")}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/topics")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Chỉnh sửa topic
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Cập nhật thông tin topic
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <HiXCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* Category Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {allCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent_id ? "  └─ " : ""}
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Nhập tên topic..."
                    required
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mô tả
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={
                        isGeneratingDescription ||
                        !name.trim() ||
                        !selectedCategory
                      }
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Tự động tạo mô tả từ AI"
                    >
                      {isGeneratingDescription ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          Tạo mô tả tự động
                        </>
                      )}
                    </button>
                  </div>
                  <TiptapEditor
                    value={description}
                    onChange={(content) => setDescription(content)}
                    placeholder="Nhập mô tả về topic..."
                  />
                </div>

                {/* Is Active Field */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Trạng thái hoạt động
                  </label>
                </div>

                {/* Preview Box */}
                {name.trim() && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <HiCheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-medium text-gray-900">Xem trước</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tên:</span>
                        <span className="font-medium text-gray-900">
                          {name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Danh mục:</span>
                        <span className="font-medium text-gray-900">
                          {selectedCategory?.name || "Chưa chọn"}
                        </span>
                      </div>
                      {description && (
                        <div>
                          <span className="text-gray-600 block mb-1">
                            Mô tả:
                          </span>
                          <div className="text-gray-700 line-clamp-3">
                            <MarkdownRenderer content={description} />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trạng thái:</span>
                        <span
                          className={`font-medium ${
                            isActive ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {isActive ? "Hoạt động" : "Không hoạt động"}
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
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !categoryId || !name.trim()}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <HiPencil className="w-5 h-5" />
                      Cập nhật topic
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTopic;
