"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { Category } from "@/types/admin/category";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiChevronDown,
  HiChevronUp,
  HiPencil,
  HiPlus,
  HiSearch,
  HiX,
} from "react-icons/hi";
import useSWR from "swr";

interface PaginatedResponse {
  items: Category[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

const Categories = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState(""); // Input value trực tiếp
  const [search, setSearch] = useState(""); // Giá trị sau debounce
  const [parentId, setParentId] = useState<string>("");
  const [level, setLevel] = useState<string>(""); // Filter by level
  const [sortBy, setSortBy] = useState<
    "name" | "order_index" | "course_count" | "created_at"
  >("order_index");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [editOrderIndex, setEditOrderIndex] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false); // Chống spam click
  const [isDeleting, setIsDeleting] = useState(false); // Chống spam delete

  // Debounce search input - chống nháy
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset về trang 1 khi search
    }, 500); // Đợi 500ms sau khi user ngừng gõ

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Build query params
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", pageSize.toString());
    if (search) params.append("search", search);
    if (parentId) params.append("parent_id", parentId);
    if (level) params.append("level", level);
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    return params.toString();
  };

  const { data, error, mutate, isValidating } = useSWR<PaginatedResponse>(
    `/admin/categories?${buildQuery()}`,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      keepPreviousData: true, // Giữ data cũ khi fetch data mới
      revalidateOnFocus: false,
    }
  );

  // Fetch all categories for parent dropdown (2 levels)
  const { data: allCategories } = useSWR<Category[]>(
    "/admin/categories/two_level",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  if (error) {
    return (
      <div className="p-6 text-center py-12">
        <div className="text-red-500 text-xl mb-4">❌ Lỗi tải dữ liệu</div>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditParentId(category.parent_id || "");
    setEditOrderIndex(category.order_index);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await api.put(`/admin/categories/${editingCategory.id}`, {
        name: editName.trim(),
        parent_id: editParentId || null,
        order_index: editOrderIndex,
      });
      mutate();
      setEditingCategory(null);
      setEditName("");
      setEditParentId("");
      setEditOrderIndex(1);
      showToast.success("Đã cập nhật danh mục");
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeleting) return; // Chống spam delete

    const category = data?.items.find((c) => c.id === id);
    if (!category) return;

    // Lấy tất cả categories để kiểm tra con cháu
    if (!allCategories) {
      showToast.error("Đang tải dữ liệu, vui lòng thử lại");
      return;
    }

    // Tìm tất cả con cháu (recursive)
    const getAllDescendants = (parentId: string): Category[] => {
      const children = allCategories.filter((c) => c.parent_id === parentId);
      const result: Category[] = [...children];
      children.forEach((child) => {
        result.push(...getAllDescendants(child.id));
      });
      return result;
    };

    const descendants = getAllDescendants(id);
    const allAffected = [category, ...descendants];

    // Tính tổng số khóa học của danh mục và tất cả con cháu
    const totalCourses = allAffected.reduce(
      (sum, cat) => sum + cat.course_count,
      0
    );

    // Nếu có khóa học → không cho xóa
    if (totalCourses > 0) {
      const affectedList = allAffected
        .filter((cat) => cat.course_count > 0)
        .map((cat) => `  - ${cat.name}: ${cat.course_count} khóa học`)
        .join("\n");

      showToast.error(
        `KHÔNG THỂ XÓA! Danh mục "${category.name}" và các danh mục con có tổng cộng ${totalCourses} khóa học. Vui lòng di chuyển hoặc xóa các khóa học trước khi xóa danh mục.`
      );
      return;
    }

    // Nếu không có khóa học → xác nhận xóa
    const totalCategories = allAffected.length;
    const descendantsList =
      descendants.length > 0
        ? `\n\nCác danh mục con sẽ bị xóa:\n${descendants
            .map((cat) => `  - ${cat.name}`)
            .join("\n")}`
        : "";

    if (
      !confirm(
        `⚠️ XÁC NHẬN XÓA\n\nBạn sắp xóa "${category.name}" và TẤT CẢ ${descendants.length} danh mục con (tổng ${totalCategories} danh mục).${descendantsList}\n\nHành động này KHÔNG THỂ HOÀN TÁC!\n\nBạn có chắc chắn muốn tiếp tục?`
      )
    )
      return;

    setIsDeleting(true);
    try {
      await api.delete(`/admin/categories/${id}`);
      mutate();
      showToast.success(
        `Đã xóa thành công! Đã xóa ${totalCategories} danh mục.`
      );
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId || !allCategories) return "—";
    const parent = allCategories.find((c) => c.id === parentId);
    return parent ? parent.name : "—";
  };

  // Context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuCategory, setMenuCategory] = useState<Category | null>(null);
  const openContextMenu = (e: React.MouseEvent, category: Category) => {
    e.preventDefault();
    setMenuCategory(category);
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

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Quản lý Danh mục
              </h1>
              <p className="text-gray-600 mt-1">
                {data?.pagination.total_items || 0} danh mục
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
            onClick={() => router.push("/admin/categories/create")}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HiPlus className="w-5 h-5" />
            Thêm danh mục
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  placeholder="Tìm theo tên hoặc slug..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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

            {/* Filter by Parent */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lọc theo danh mục cha
              </label>
              <select
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  setPage(1);
                }}
                disabled={isValidating}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="">Tất cả</option>
                {allCategories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent_id ? `  → ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lọc theo cấp
              </label>
              <select
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  setPage(1);
                }}
                disabled={isValidating}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="">Tất cả cấp</option>
                <option value="0">Cấp 0 (Gốc)</option>
                <option value="1">Cấp 1</option>
                <option value="2">Cấp 2</option>
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
                        | "name"
                        | "order_index"
                        | "course_count"
                        | "created_at"
                    )
                  }
                  disabled={isValidating}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <option value="order_index">Thứ tự</option>
                  <option value="name">Tên</option>
                  <option value="course_count">Số khóa học</option>
                  <option value="created_at">Ngày tạo</option>
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
                  Tên danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Danh mục cha
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Thứ tự
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
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500 text-lg">
                      Không tìm thấy danh mục nào
                    </p>
                  </td>
                </tr>
              ) : (
                data.items.map((category, idx) => (
                  <tr
                    key={category.id}
                    className="hover:bg-gray-50 transition-colors"
                    onContextMenu={(e) => openContextMenu(e, category)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        /{category.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getParentName(category.parent_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                        {category.order_index}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                        {category.course_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center sm:hidden">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            const rect = (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                            setMenuCategory(category);
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
        {data && data.pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t-2 border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, data.pagination.total_items)} trong{" "}
              {data.pagination.total_items} danh mục
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
                {Array.from(
                  { length: data.pagination.total_pages },
                  (_, i) => i + 1
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    disabled={isValidating}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      p === page
                        ? "bg-teal-600 text-white"
                        : "border-2 border-gray-300 hover:bg-gray-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.pagination.total_pages, p + 1))
                }
                disabled={page === data.pagination.total_pages || isValidating}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {menuOpen && menuCategory && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Chỉnh sửa",
              onClick: () => {
                handleEdit(menuCategory);
                setMenuOpen(false);
              },
            },
            {
              label: "Xóa",
              onClick: () => {
                handleDelete(menuCategory.id);
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}

      {/* Edit Modal */}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          allCategories={allCategories || []}
          editName={editName}
          editParentId={editParentId}
          editOrderIndex={editOrderIndex}
          isSaving={isSaving}
          onNameChange={setEditName}
          onParentIdChange={setEditParentId}
          onOrderIndexChange={setEditOrderIndex}
          onSave={handleSaveEdit}
          onClose={() => {
            setEditingCategory(null);
            setEditName("");
            setEditParentId("");
            setEditOrderIndex(1);
          }}
        />
      )}
    </div>
  );
};

// Edit Category Modal Component
function EditCategoryModal({
  category,
  allCategories,
  editName,
  editParentId,
  editOrderIndex,
  isSaving,
  onNameChange,
  onParentIdChange,
  onOrderIndexChange,
  onSave,
  onClose,
}: {
  category: Category;
  allCategories: Category[];
  editName: string;
  editParentId: string;
  editOrderIndex: number;
  isSaving: boolean;
  onNameChange: (name: string) => void;
  onParentIdChange: (id: string) => void;
  onOrderIndexChange: (index: number) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const [showParentInfo, setShowParentInfo] = useState(false);
  const [maxOrderIndex, setMaxOrderIndex] = useState<number | null>(null);
  const [isFetchingLastOrder, setIsFetchingLastOrder] = useState(false);

  // Find selected parent category
  const selectedParent = editParentId
    ? allCategories.find((cat) => cat.id === editParentId)
    : null;

  // Fetch max order index on mount
  const fetchMaxOrderIndex = async () => {
    setIsFetchingLastOrder(true);
    try {
      const res = await api.get(
        `/admin/categories/${category.id}/last_order_index_same_level`
      );
      const lastOrder = res.data;
      setMaxOrderIndex(lastOrder);
    } catch (error: any) {
      showToast.error(error.response?.data?.detail || error.message);
    } finally {
      setIsFetchingLastOrder(false);
    }
  };

  // Fetch max order index when modal opens
  useEffect(() => {
    fetchMaxOrderIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set order to max value
  const setToMaxOrder = () => {
    if (maxOrderIndex !== null) {
      onOrderIndexChange(maxOrderIndex);
    }
  };
  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "28rem",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <HiPencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Chỉnh sửa danh mục
                  </h3>
                  <p className="text-teal-100 text-sm">
                    Cập nhật thông tin danh mục
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <HiX className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Body - Scrollable */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Tên danh mục
                </label>
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="Tên danh mục..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📂 Danh mục cha
                </label>
                <select
                  value={editParentId}
                  onChange={(e) => onParentIdChange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                >
                  <option value="">Không có (danh mục gốc)</option>
                  {allCategories
                    .filter((c) => c.id !== category.id)
                    .map((cat) => {
                      // Indent based on parent
                      const indent = cat.parent_id ? "  └─ " : "";
                      return (
                        <option key={cat.id} value={cat.id}>
                          {indent}
                          {cat.name}
                        </option>
                      );
                    })}
                </select>

                {/* Parent Category Info - Collapsible */}
                {selectedParent && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowParentInfo(!showParentInfo)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-semibold text-blue-700">
                        📋 Thông tin danh mục cha đã chọn
                      </span>
                      {showParentInfo ? (
                        <HiChevronUp className="w-5 h-5 text-blue-600" />
                      ) : (
                        <HiChevronDown className="w-5 h-5 text-blue-600" />
                      )}
                    </button>

                    {showParentInfo && (
                      <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2 transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tên:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedParent.name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Slug:</span>
                          <span className="text-xs font-mono text-gray-800 bg-white px-2 py-1 rounded">
                            {selectedParent.slug}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">ID:</span>
                          <span
                            className="text-xs font-mono text-gray-800 bg-white px-2 py-1 rounded truncate max-w-[200px]"
                            title={selectedParent.id}
                          >
                            {selectedParent.id}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Thứ tự:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedParent.order_index}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Số khóa học:
                          </span>
                          <span className="text-sm font-semibold text-teal-600">
                            {selectedParent.course_count}
                          </span>
                        </div>
                        {selectedParent.parent_id && (
                          <div className="pt-2 border-t border-blue-200">
                            <span className="text-xs text-blue-600">
                              ℹ️ Đây là danh mục cấp 2 (có danh mục cha)
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Index Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    🔢 Thứ tự (Order Index)
                  </label>
                  {maxOrderIndex !== null && (
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      Max: {maxOrderIndex}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max={maxOrderIndex || undefined}
                      value={editOrderIndex}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        const clamped =
                          maxOrderIndex !== null
                            ? Math.min(Math.max(val, 1), maxOrderIndex)
                            : Math.max(val, 1);
                        onOrderIndexChange(clamped);
                      }}
                      className={`w-full py-3 bg-gray-50 border-2 rounded-lg focus:ring-2 transition-all ${
                        maxOrderIndex !== null &&
                        editOrderIndex === maxOrderIndex
                          ? "border-purple-400 focus:border-purple-500 focus:ring-purple-500/20 px-4 pr-16"
                          : "border-gray-300 focus:border-teal-500 focus:ring-teal-500/20 px-4"
                      }`}
                      placeholder="Thứ tự..."
                      disabled={isFetchingLastOrder}
                    />
                    {maxOrderIndex !== null &&
                      editOrderIndex === maxOrderIndex && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-purple-600">
                          <span className="text-xs font-bold">MAX</span>
                        </div>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={setToMaxOrder}
                    disabled={isFetchingLastOrder || maxOrderIndex === null}
                    className="px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    title={`Đặt về Max (${maxOrderIndex})`}
                  >
                    {isFetchingLastOrder ? "..." : "Max"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Giá trị từ 1 đến {maxOrderIndex || "..."}. Nhấn "Max" để
                  đặt về giá trị lớn nhất.
                </p>
              </div>

              {/* Category Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between py-1">
                    <span>ID:</span>
                    <span className="font-mono text-gray-800">
                      {category.id}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Thứ tự:</span>
                    <span className="font-semibold text-gray-800">
                      {category.order_index}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Số khóa học:</span>
                    <span className="font-semibold text-gray-800">
                      {category.course_count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Categories;
