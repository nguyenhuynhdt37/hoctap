"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { Category } from "@/types/admin/category";
import { TopicsResponse } from "@/types/admin/topic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HiCheckCircle, HiPlus, HiSearch, HiXCircle } from "react-icons/hi";
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

const Topics = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isActive, setIsActive] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "order_index" | "name" | "created_at" | "total_courses"
  >("order_index");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (search) params.append("search", search);
    if (categoryId) params.append("category_id", categoryId);
    if (isActive) params.append("is_active", isActive);
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    return params.toString();
  };

  const { data, error, mutate, isValidating } = useSWR<TopicsResponse>(
    `/admin/topics?${buildQuery()}`,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      loadingTimeout: 3000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      shouldRetryOnError: true,
    }
  );

  const { data: categoriesData } = useSWR<CategoriesPaginatedResponse>(
    "/admin/categories?page=1&page_size=100&sort_by=name&sort_order=asc",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      loadingTimeout: 3000,
    }
  );

  const allCategories = categoriesData?.items || [];

  // Context menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuTopic, setMenuTopic] = useState<
    TopicsResponse["data"][number] | null
  >(null);
  const openContextMenu = (
    e: React.MouseEvent,
    topic: TopicsResponse["data"][number]
  ) => {
    e.preventDefault();
    setMenuTopic(topic);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  if (error) {
    return (
      <div className="p-6 text-center py-12">
        <div className="text-red-500 text-xl mb-4">❌ Lỗi tải dữ liệu</div>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    const topic = data?.data.find((t) => t.id === id);
    if (!topic) return;

    if (
      !confirm(
        `⚠️ XÁC NHẬN XÓA\n\nBạn sắp xóa topic "${topic.name}".\n\n${
          topic.total_courses > 0
            ? `⚠️ Lưu ý: Topic này có ${topic.total_courses} khóa học. Các khóa học sẽ được giữ nguyên.\n\n`
            : ""
        }Hành động này KHÔNG THỂ HOÀN TÁC!\n\nBạn có chắc chắn muốn tiếp tục?`
      )
    )
      return;

    setIsDeleting(id);
    try {
      console.log("📤 Gửi request xóa topic:", id);

      const response = await api.delete(`/admin/topics/${id}`);

      console.log("✅ Response từ server:", response.data);

      // Lấy message từ response
      const successMessage =
        response.data?.message || `✅ Đã xóa topic "${topic.name}" thành công!`;

      mutate();
      showToast.success(successMessage);
    } catch (error: any) {
      console.error("❌ Lỗi khi xóa topic:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi xóa topic";
      showToast.error(errorMessage);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Quản lý Topic
              </h1>
              <p className="text-gray-600 mt-1">
                {data?.meta.total || 0} topic
              </p>
            </div>
            {/* Loading indicator khi đang fetch data mới */}
            {isValidating && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-green-700 font-medium">
                  Đang tải...
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => router.push("/admin/topics/create")}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HiPlus className="w-5 h-5" />
            Thêm topic
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo tên, slug, mô tả..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
                {searchInput && searchInput !== search && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-gray-500">Đang tìm...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter by Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lọc theo danh mục
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                disabled={isValidating}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="">Tất cả danh mục</option>
                {allCategories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent_id ? `  → ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={isActive}
                onChange={(e) => {
                  setIsActive(e.target.value);
                  setPage(1);
                }}
                disabled={isValidating}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="">Tất cả</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Không hoạt động</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sắp xếp theo
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | "order_index"
                        | "name"
                        | "created_at"
                        | "total_courses"
                    )
                  }
                  disabled={isValidating}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <option value="order_index">Thứ tự</option>
                  <option value="name">Tên</option>
                  <option value="created_at">Ngày tạo</option>
                  <option value="total_courses">Số khóa học</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                  disabled={isValidating}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden relative">
        {/* Overlay mờ khi đang fetch - không block UI */}
        {isValidating && data && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 pointer-events-none flex items-start justify-center pt-8 transition-opacity duration-200">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold">Đang cập nhật...</span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tên topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Thứ tự
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Khóa học
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider sm:hidden">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!data ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : data.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-gray-600">Không có topic nào</p>
                  </td>
                </tr>
              ) : (
                data.data.map((topic, index) => (
                  <tr
                    key={topic.id}
                    className="hover:bg-gray-50 transition-colors"
                    onContextMenu={(e) => openContextMenu(e, topic)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {topic.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {topic.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {topic.category_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {topic.order_index}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          topic.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {topic.is_active ? (
                          <>
                            <HiCheckCircle className="w-3 h-3 mr-1" />
                            Hoạt động
                          </>
                        ) : (
                          <>
                            <HiXCircle className="w-3 h-3 mr-1" />
                            Không hoạt động
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {topic.total_courses}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center sm:hidden">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            const rect = (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                            setMenuTopic(topic);
                            setMenuPos({
                              x: rect.left + rect.width / 2,
                              y: rect.bottom + 8,
                            });
                            setMenuOpen(true);
                          }}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors sm:hidden"
                          title="Thao tác"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-5 h-5"
                          >
                            <path d="M10 4a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 20a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.meta.pages > 1 && (
          <div className="px-6 py-4 border-t-2 border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {(page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, data.meta.total)} trong {data.meta.total}{" "}
              topic
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isValidating}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
              >
                Trước
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: data.meta.pages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      disabled={isValidating}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        p === page
                          ? "bg-green-600 text-white"
                          : "border-2 border-gray-300 hover:bg-gray-50"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))}
                disabled={page === data.meta.pages || isValidating}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Context Menu */}
      {menuOpen && menuTopic && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Chỉnh sửa",
              onClick: () => {
                router.push(`/admin/topics/${menuTopic.id}/edit`);
                setMenuOpen(false);
              },
            },
            {
              label: "Xóa",
              onClick: () => {
                handleDelete(menuTopic.id);
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}
    </div>
  );
};

export default Topics;
