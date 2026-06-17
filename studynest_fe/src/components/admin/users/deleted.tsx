"use client";

import { showToast } from "@/lib/utils/helpers/toast";

import api from "@/lib/utils/fetcher/client/axios";
import {
  DeletedUser,
  DeletedUsersResponse,
  UsersQueryParams,
} from "@/types/admin/user";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiAcademicCap,
  HiArrowLeft,
  HiCheckCircle,
  HiCog,
  HiEye,
  HiRefresh,
  HiSearch,
  HiTrash,
  HiX,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

export default function UsersDeletedManagement() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState(""); // Input value trực tiếp
  const [search, setSearch] = useState(""); // Giá trị sau debounce
  const [sortBy, setSortBy] = useState<
    "fullname" | "email" | "created_at" | "deleted_at" | "total_courses"
  >("deleted_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [emailVerificationFilter, setEmailVerificationFilter] = useState<
    boolean | null
  >(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);

  // Ngăn scroll của body khi modal mở
  useEffect(() => {
    if (showActionsModal || showDetailsModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup khi component unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showActionsModal, showDetailsModal]);

  // Debounce search input - chống nháy
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset về trang 1 khi search
    }, 500); // Đợi 500ms sau khi user ngừng gõ

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Build query parameters
  const buildQueryParams = (): UsersQueryParams => {
    const params: UsersQueryParams = {
      page: page,
      size: pageSize,
      sort_by: sortBy,
      order: sortOrder,
    };

    if (search.trim()) {
      params.search = search.trim();
    }

    if (emailVerificationFilter !== null) {
      params.is_verified_email = emailVerificationFilter;
    }

    return params;
  };

  // Fetch deleted users data
  const { data, error, mutate, isValidating } = useSWR<DeletedUsersResponse>(
    ["/admin/users/deleted", buildQueryParams()],
    async ([url, params]: [string, UsersQueryParams]) => {
      const response = await api.get(url, { params });
      return response.data;
    },
    {
      keepPreviousData: true, // Giữ data cũ khi fetch data mới
      revalidateOnFocus: false,
    }
  );

  // Các trường có thể sắp xếp
  const sortableFields = {
    fullname: "Họ tên",
    email: "Email",
    created_at: "Ngày tạo",
    deleted_at: "Ngày xóa",
    total_courses: "Số khóa học",
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setEmailVerificationFilter(null);
    setPage(1);
  };

  const handleUserAction = (user: DeletedUser) => {
    setSelectedUser(user);
    setShowActionsModal(true);
  };

  const handleViewDetails = () => {
    if (!selectedUser) return;
    setShowActionsModal(false);
    setShowDetailsModal(true);
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get("/admin/users/deleted/export", {
        responseType: "blob",
      });

      // Download file
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deleted_users_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast.error("Lỗi khi xuất Excel");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDeleteDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Vừa xong";
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} ngày trước`;
    return formatDate(dateString);
  };

  // Helper function để xử lý deleted_until có thể chứa dữ liệu không hợp lệ
  const isValidDate = (dateString: string | null): boolean => {
    if (!dateString) return false;
    // Kiểm tra nếu là JSON string (lỗi từ backend)
    if (
      dateString.includes('"page"') ||
      dateString.includes('"items"') ||
      dateString.includes('"total_items"')
    )
      return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const formatDeleteUntil = (deleteUntil: string | null) => {
    if (!deleteUntil || !isValidDate(deleteUntil)) {
      return "Không có thời hạn";
    }
    return formatDate(deleteUntil);
  };

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

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            title="Quay lại"
          >
            <HiArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
            <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-600 bg-clip-text text-transparent">
              Người dùng đã xóa
            </h1>
                <p className="text-gray-600 mt-1">
                  {data?.total_items || 0} người dùng đã xóa
            </p>
          </div>
              {/* Loading indicator khi đang fetch data mới */}
              {isValidating && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                  <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-red-700 font-medium">
                    Đang tải...
                  </span>
        </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
          <button
            onClick={() => mutate()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
          >
            <HiRefresh className="w-4 h-4" />
              Làm mới
          </button>
            <button
              onClick={handleExportExcel}
              disabled={isValidating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📊 Xuất Excel
            </button>
        </div>
      </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  placeholder="Tìm theo họ tên hoặc email..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                {searchInput && searchInput !== search && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-gray-500">Đang tìm...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter by Email Verification */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Xác thực email
              </label>
              <select
                value={emailVerificationFilter === null ? "" : emailVerificationFilter ? "true" : "false"}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmailVerificationFilter(value === "" ? null : value === "true");
                  setPage(1);
                }}
                disabled={isValidating}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="">Tất cả</option>
                <option value="true">Đã xác thực</option>
                <option value="false">Chưa xác thực</option>
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
                        | "fullname"
                        | "email"
                        | "created_at"
                        | "deleted_at"
                        | "total_courses"
                    )
                  }
                  disabled={isValidating}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {Object.entries(sortableFields).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
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
            <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
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
                  Họ tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Khóa học
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ngày xóa
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!data ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-gray-500 text-lg">
                      Không tìm thấy người dùng đã xóa nào
                    </p>
                  </td>
                </tr>
              ) : (
                data.items.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                    >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {user.fullname.charAt(0).toUpperCase()}
                  </div>
                        <div className="font-semibold text-gray-900">
                          {user.fullname}
                </div>
              </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {user.roles.map((role: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {role}
                          </span>
                        ))}
          </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                        {user.total_courses}
                    </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <HiTrash className="w-3 h-3 mr-1" />
                          Đã xóa
                  </span>
                        {user.is_verified_email ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            ✓ Email
                    </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                            ⚠ Chưa xác thực
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        <div className="font-medium">{formatDate(user.deleted_at)}</div>
                        <div className="text-xs text-red-400">Đã xóa</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                    <button
                          onClick={() => handleUserAction(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Thao tác"
                    >
                          <HiCog className="w-5 h-5" />
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
        {data && data.total_pages > 1 && (
          <div className="px-6 py-4 border-t-2 border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, data.total_items)} trong{" "}
              {data.total_items} người dùng đã xóa
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
                  { length: data.total_pages },
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
                  setPage((p) => Math.min(data.total_pages, p + 1))
                }
                disabled={page === data.total_pages || isValidating}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
                >
                Sau
                </button>
              </div>
            </div>
        )}
      </div>

      {/* User Actions Modal */}
      {showActionsModal && selectedUser && (
        <DeletedUserActionsModal
          user={selectedUser}
          onClose={() => {
            setShowActionsModal(false);
            setSelectedUser(null);
          }}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <DeletedUserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

// Deleted User Actions Modal Component
function DeletedUserActionsModal({
  user,
  onClose,
  onViewDetails,
}: {
  user: DeletedUser;
  onClose: () => void;
  onViewDetails: () => void;
}) {
  const router = useRouter();

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
      {/* Backdrop với animation */}
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
          transition: "opacity 300ms ease-out",
        }}
        onClick={onClose}
      />

      {/* Modal Container với animation */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "28rem",
          transform: "scale(1)",
          opacity: 1,
          transition: "all 300ms ease-out",
        }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header với gradient */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <HiTrash className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Thao tác người dùng đã xóa
                  </h3>
                  <p className="text-red-100 text-sm">
                    Chọn hành động cần thực hiện
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 group"
              >
                <HiX className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
          </div>

          {/* User Info Section */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-red-50/50">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {user.fullname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-lg truncate">
                  {user.fullname}
                </h4>
                <p className="text-gray-600 text-sm truncate">{user.email}</p>
                <div className="flex items-center space-x-3 mt-2">
                  {/* Email Verification Status */}
                  <div className="flex items-center space-x-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        user.is_verified_email
                          ? "bg-green-500"
                          : "bg-orange-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        user.is_verified_email
                          ? "text-green-700"
                          : "text-orange-700"
                      }`}
                    >
                      {user.is_verified_email ? "Đã xác thực" : "Chưa xác thực"}
                    </span>
                  </div>

                  {/* Deleted Status */}
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-red-700">
                      Đã xóa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="px-6 py-4">
            <div className="space-y-3">
              {/* View Details */}
              <button
                onClick={() => router.push(`/admin/users/${user.id}`)}
                className="w-full flex items-center space-x-4 p-4 text-left hover:bg-blue-50 rounded-2xl transition-all duration-200 group border border-transparent hover:border-blue-200 hover:shadow-md"
              >
                <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-200">
                  <HiEye className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Xem chi tiết
                  </div>
                  <div className="text-sm text-gray-600">
                    Xem thông tin đầy đủ của người dùng đã xóa
                  </div>
                </div>
                <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  →
                </div>
              </button>
            </div>

            {/* Information about deleted users */}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HiTrash className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">
                    Thông tin
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    Người dùng này đã bị xóa vĩnh viễn khỏi hệ thống và không
                    thể khôi phục hay thực hiện thêm bất kỳ thao tác nào.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ID: <span className="font-mono text-gray-800">{user.id}</span>
              </div>
              <div className="text-sm text-gray-500">
                Xóa: {new Date(user.deleted_at).toLocaleDateString("vi-VN")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Sử dụng Portal để render modal ở root level
  return createPortal(modalContent, document.body);
}

// Deleted User Details Modal Component
function DeletedUserDetailsModal({
  user,
  onClose,
}: {
  user: DeletedUser;
  onClose: () => void;
}) {
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
      {/* Backdrop với animation */}
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
          transition: "opacity 300ms ease-out",
        }}
        onClick={onClose}
      />

      {/* Modal Container với animation */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "48rem",
          transform: "scale(1)",
          opacity: 1,
          transition: "all 300ms ease-out",
        }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header với gradient */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <HiEye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Chi tiết người dùng đã xóa
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Thông tin đầy đủ về người dùng
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 group"
              >
                <HiX className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
          </div>

          {/* User Info Section */}
          <div className="px-6 py-6 bg-gradient-to-r from-gray-50 to-teal-50/50">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user.fullname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-xl truncate">
                  {user.fullname}
                </h4>
                <p className="text-gray-600 text-sm truncate">{user.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  {/* Email Verification Status */}
                  <div className="flex items-center space-x-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        user.is_verified_email
                          ? "bg-green-500"
                          : "bg-orange-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        user.is_verified_email
                          ? "text-green-700"
                          : "text-orange-700"
                      }`}
                    >
                      {user.is_verified_email ? "Đã xác thực" : "Chưa xác thực"}
                    </span>
                  </div>

                  {/* Deleted Status */}
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-red-700">
                      Đã xóa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                  📋 Thông tin cơ bản
                </h5>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      ID người dùng
                    </label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-lg">
                      {user.id}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Họ và tên
                    </label>
                    <p className="text-sm text-gray-900">{user.fullname}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Email
                    </label>
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Số khóa học
                    </label>
                    <div className="flex items-center space-x-2">
                      <HiAcademicCap className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 font-medium">
                        {user.total_courses}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                  📅 Thông tin thời gian
                </h5>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Ngày tạo tài khoản
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Ngày xóa
                    </label>
                    <p className="text-sm text-red-600 font-medium">
                      {new Date(user.deleted_at).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Xóa đến
                    </label>
                    <p className="text-sm text-orange-600 font-medium">
                      {user.deleted_until &&
                      !user.deleted_until.includes('"page"') &&
                      !user.deleted_until.includes('"items"') &&
                      !user.deleted_until.includes('"total_items"')
                        ? new Date(user.deleted_until).toLocaleDateString(
                            "vi-VN",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Không có thời hạn"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Roles Section */}
            <div className="mt-6">
              <h5 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2 mb-4">
                🎭 Vai trò
              </h5>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Đã xóa: {new Date(user.deleted_at).toLocaleDateString("vi-VN")}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Sử dụng Portal để render modal ở root level
  return createPortal(modalContent, document.body);
}
