"use client"

import ContextMenu from "@/components/shared/context-menu";
import DataTable, { Column } from "@/components/shared/data-table";
import ExportButton from "@/components/shared/export-button";
import Pagination from "@/components/shared/pagination";
import api from "@/lib/utils/fetcher/client/axios";
import { Role, RolesQueryParams, RolesResponse } from "@/types/admin/role";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiAcademicCap,
  HiCheckCircle,
  HiCog,
  HiEye,
  HiKey,
  HiPencil,
  HiPlus,
  HiSearch,
  HiShieldCheck,
  HiTrash,
  HiUsers,
  HiX,
} from "react-icons/hi";
import useSWR from "swr";

interface PaginationInfo {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  operational_roles?: number;
}

export default function RolesManagement() {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    size: 10,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("role_name");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // Các trường có thể sắp xếp
  const sortableFields = {
    role_name: "Tên vai trò",
    details: "Mô tả",
    total_users: "Số người dùng",
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuRole, setMenuRole] = useState<Role | null>(null);
  const openContextMenuAtEvent = (e: React.MouseEvent, role: Role) => {
    e.preventDefault();
    setMenuRole(role);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };
  const openContextMenuNearEl = (el: HTMLElement, role: Role) => {
    const rect = el.getBoundingClientRect();
    setMenuRole(role);
    setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
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

  // SWR key với các tham số phân trang, tìm kiếm, sắp xếp
  const swrKey = [
    "/admin/roles",
    {
      search: searchQuery || undefined,
      sort_by: sortBy,
      order: order,
      page: pagination.page,
      size: pagination.size,
    },
  ];

  const {
    data: rolesResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<RolesResponse>(
    swrKey,
    async ([url, params]: [string, RolesQueryParams]) => {
      console.log("🔍 SWR Fetching:", { url, params });

      const response = await api.get(url, { params });
      console.log("📊 SWR Response:", response.data);
      return response.data;
    },
    {
      // Tối ưu để giảm nháy khi chuyển trang
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      // Giữ data cũ khi đang fetch data mới
      keepPreviousData: true,
      // Không hiển thị loading khi mutate
      revalidateIfStale: false,
    }
  );

  // Extract roles và pagination từ response
  const roles = rolesResponse?.items || [];
  const paginationData = rolesResponse
    ? {
        page: rolesResponse.page,
        size: rolesResponse.size,
        total_items: rolesResponse.total_items,
        total_pages: rolesResponse.total_pages,
        has_next: rolesResponse.has_next,
        has_previous: rolesResponse.has_previous,
        operational_roles: rolesResponse.operational_roles,
      }
    : pagination;

  // Debug pagination data
  console.log("📊 Pagination Data:", paginationData);
  console.log("📋 Roles:", roles);
  console.log("🔄 Loading:", isLoading);
  console.log("❌ Error:", error);
  console.log("🔀 Sort:", { sortBy, order });
  // Update pagination state when SWR data changes
  useEffect(() => {
    if (rolesResponse) {
      setPagination({
        page: rolesResponse.page,
        size: rolesResponse.size,
        total_items: rolesResponse.total_items,
        total_pages: rolesResponse.total_pages,
        has_next: rolesResponse.has_next,
        has_previous: rolesResponse.has_previous,
      });
    }
  }, [rolesResponse]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setOrder("asc");
    }
  };

  const handlePageChange = (newPage: number) => {
    console.log("📄 Page change:", newPage);
    // Sử dụng mutate để cập nhật data mà không gây nháy
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleSizeChange = (newSize: number) => {
    console.log("📏 Size change:", newSize);
    setPagination((prev) => ({ ...prev, size: newSize, page: 1 }));
  };

  const handleExportExcel = async () => {
    try {
      const params: RolesQueryParams = {
        search: searchQuery || undefined,
        sort_by: sortBy,
        order: order,
      };

      const response = await api.get("/admin/roles/export", {
        params,
        responseType: "blob",
      });

      // Download file
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `roles_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error exporting roles:", error);
    }
  };

  const handleEditRole = async (roleData: {
    role_name: string;
    details: string;
  }) => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      await api.put(`/admin/roles/${selectedRole.id}`, roleData);
      mutate(); // Refresh data
      setShowEditModal(false);
      setSelectedRole(null);
    } catch (error) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error updating role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      await api.delete(`/admin/roles/${selectedRole.id}`);
      mutate(); // Refresh data
      setShowDeleteModal(false);
      setSelectedRole(null);
    } catch (error) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error deleting role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case "admin":
      case "quản trị viên":
        return <HiShieldCheck className="w-5 h-5" />;
      case "teacher":
      case "giảng viên":
        return <HiAcademicCap className="w-5 h-5" />;
      case "student":
      case "học viên":
        return <HiUsers className="w-5 h-5" />;
      case "moderator":
        return <HiCog className="w-5 h-5" />;
      default:
        return <HiKey className="w-5 h-5" />;
    }
  };

  const getRoleColor = (roleName: string) => {
    // Hệ thống chỉ dùng xanh (green) làm chủ đạo; không phân màu theo vai trò
        return "bg-gradient-to-r from-green-500 to-green-600";
  };

  // Define table columns
  const columns: Column<Role>[] = [
    {
      key: "role_name",
      title: "Vai trò",
      sortable: true,
      render: (value: string, record: Role) => (
        <div
          className="flex items-center space-x-3"
          onContextMenu={(e) => openContextMenuAtEvent(e, record)}
        >
          <div
            className={`p-2 rounded-lg ${getRoleColor(
              record.role_name
            )} text-white`}
          >
            {getRoleIcon(record.role_name)}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">ID: {record.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "details",
      title: "Mô tả",
      sortable: true,
      render: (value: string) => (
        <div className="text-gray-700 max-w-xs truncate">{value}</div>
      ),
    },
    {
      key: "total_users",
      title: "Người dùng",
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <HiUsers className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      key: "actions",
      title: "Thao tác",
      className: "text-center sm:hidden",
      render: (_, record: Role) => {
        const hasUsers = record.total_users > 0;

        return (
          <div className="flex items-center space-x-1">
            {/* View Button - Always visible */}
            <button
              onClick={() => {
                setSelectedRole(record);
                setShowEditModal(true);
              }}
              className="p-2 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-105 group"
              title="Xem chi tiết"
            >
              <HiEye className="w-4 h-4 text-gray-500 group-hover:text-green-600 transition-colors duration-200" />
            </button>

            {/* Edit Button - Always show but with different behavior */}
            <button
              onClick={() => {
                setSelectedRole(record);
                setShowEditModal(true);
              }}
              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 group ${
                hasUsers ? "hover:bg-yellow-50" : "hover:bg-green-50"
              }`}
              title={
                hasUsers
                  ? "Chỉnh sửa mô tả (đang được sử dụng)"
                  : "Chỉnh sửa vai trò"
              }
            >
              <HiPencil
                className={`w-4 h-4 transition-colors duration-200 ${
                  hasUsers
                    ? "text-gray-500 group-hover:text-yellow-600"
                    : "text-gray-500 group-hover:text-green-600"
                }`}
              />
            </button>

            {/* Delete Button - Only show if no users */}
            {!hasUsers && (
              <button
                onClick={() => {
                  setSelectedRole(record);
                  setShowDeleteModal(true);
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105 group"
                title="Xóa vai trò"
              >
                <HiTrash className="w-4 h-4 text-gray-500 group-hover:text-red-600 transition-colors duration-200" />
              </button>
            )}

            {/* Info badge if has users */}
            {hasUsers && (
              <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                Có {record.total_users} người dùng
              </div>
            )}

            {/* Mobile 3-dot trigger */}
            <button
              type="button"
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors sm:hidden"
              title="Thao tác"
              onClick={(e) => openContextMenuNearEl(e.currentTarget as HTMLElement, record)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M10 4a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 20a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
        <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
            Quản lý quyền hạn
          </h1>
              <p className="text-gray-600 mt-1">
                {paginationData.total_items} vai trò
              </p>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-green-700 font-medium">
                  Đang tải...
                </span>
              </div>
            )}
        </div>
        <button
          onClick={() => router.push("/admin/roles/create")}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <HiPlus className="w-5 h-5" />
            Thêm vai trò
        </button>
      </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc mô tả..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sắp xếp theo
              </label>
              <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  >
                    {Object.entries(sortableFields).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                <button
                  onClick={() => setOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                  {order === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>

          {/* Status + Export */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800">
                    Sắp xếp:{" "}
                    <strong>
                      {sortableFields[sortBy as keyof typeof sortableFields]}
                  </strong>{" "}
                  <span className="ml-1">{order === "asc" ? "↑" : "↓"}</span>
                  </span>
                </div>
                {searchQuery && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm text-green-700">
                      Tìm: <strong>"{searchQuery}"</strong>
                    </span>
                    <button
                      onClick={() => setSearchQuery("")}
                    className="text-green-600 hover:text-green-800 text-sm font-bold"
                    title="Xóa tìm"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            <ExportButton onExport={handleExportExcel} variant="primary" size="md">
                  📊 Xuất Excel
                </ExportButton>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-red-700 font-medium">Lỗi tải dữ liệu</span>
          </div>
          <p className="text-red-600 text-sm mt-1">
            Không thể tải danh sách vai trò. Vui lòng thử lại sau.
          </p>
        </div>
      )}

      {/* Roles Table */}
      <DataTable
        data={roles}
        columns={columns}
        loading={isLoading}
        emptyMessage="Không tìm thấy vai trò nào"
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
      />

      {/* Pagination - hiển thị khi có dữ liệu */}
      {/* {paginationData.total_items > 0 && ( */}
      <Pagination
        currentPage={paginationData.page}
        totalPages={paginationData.total_pages}
        totalItems={paginationData.total_items}
        pageSize={paginationData.size}
        onPageChange={handlePageChange}
        onPageSizeChange={handleSizeChange}
        showPageSizeSelector={true}
        pageSizeOptions={[5, 10, 20, 50]}
      />
      {/* )} */}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <EditRoleModal
          role={selectedRole}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onSave={handleEditRole}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Role Modal */}
      {showDeleteModal && selectedRole && (
        <DeleteRoleModal
          role={selectedRole}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRole(null);
          }}
          onConfirm={handleDeleteRole}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Context Menu */}
      {menuOpen && menuRole && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Xem chi tiết",
              onClick: () => {
                setSelectedRole(menuRole);
                setShowEditModal(true);
                setMenuOpen(false);
              },
            },
            {
              label: menuRole.total_users > 0 ? "Chỉnh sửa mô tả" : "Chỉnh sửa vai trò",
              onClick: () => {
                setSelectedRole(menuRole);
                setShowEditModal(true);
                setMenuOpen(false);
              },
            },
            ...(menuRole.total_users === 0
              ? [
                  {
                    label: "Xóa vai trò",
                    onClick: () => {
                      setSelectedRole(menuRole);
                      setShowDeleteModal(true);
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}

// Edit Role Modal Component
function EditRoleModal({
  role,
  onClose,
  onSave,
  isSubmitting,
}: {
  role: Role;
  onClose: () => void;
  onSave: (data: { role_name: string; details: string }) => void;
  isSubmitting: boolean;
}) {
  const hasUsers = role.total_users > 0;
  const [formData, setFormData] = useState({
    role_name: role.role_name,
    details: role.details,
  });

  // Kiểm tra có thay đổi không
  const hasChanges = hasUsers
    ? formData.details !== role.details
    : formData.role_name !== role.role_name ||
      formData.details !== role.details;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    // Nếu có người dùng, chỉ gửi details
    const dataToSave = hasUsers
      ? { role_name: role.role_name, details: formData.details }
      : formData;
    onSave(dataToSave);
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
          transform: "scale(1)",
          opacity: 1,
          transition: "all 300ms ease-out",
        }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header với gradient */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <HiPencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Chỉnh sửa vai trò
                  </h3>
                  <p className="text-teal-100 text-sm">
                    Cập nhật thông tin vai trò
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Info Section */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-green-50/50">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                <HiKey className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-lg truncate">
                  {role.role_name}
                </h4>
                <p className="text-gray-600 text-sm truncate">{role.details}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-medium text-green-700">
                      {role.total_users} người dùng
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        hasUsers ? "bg-yellow-500" : "bg-green-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        hasUsers ? "text-yellow-700" : "text-green-700"
                      }`}
                    >
                      {hasUsers ? "Đang sử dụng" : "Có thể chỉnh sửa"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Warning for roles with users */}
              {hasUsers && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HiX className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-yellow-800 text-sm">
                        Cảnh báo!
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        Vai trò này đang được sử dụng bởi {role.total_users}{" "}
                        người dùng. Bạn chỉ có thể chỉnh sửa mô tả.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Role Name Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📝 Tên vai trò
                  {hasUsers && (
                    <span className="text-yellow-600 ml-2 text-xs">
                      (Không thể chỉnh sửa)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.role_name}
                  onChange={(e) =>
                    setFormData({ ...formData, role_name: e.target.value })
                  }
                  disabled={hasUsers}
                  className={`w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all duration-200 ${
                    hasUsers
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : ""
                  }`}
                  placeholder="Nhập tên vai trò..."
                  required
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📄 Mô tả vai trò
                  {hasUsers && (
                    <span className="text-green-600 ml-2 text-xs">
                      (Có thể chỉnh sửa)
                    </span>
                  )}
                </label>
                <textarea
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200 resize-none"
                  placeholder="Mô tả chi tiết về vai trò này..."
                  required
                />
              </div>

              {/* Change Status Indicator */}
              {hasChanges && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <HiCheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-green-800 text-sm">
                        Có thay đổi chưa được lưu
                      </div>
                      <div className="text-green-700 text-xs">
                        Nhấn "Lưu thay đổi" để cập nhật vai trò
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ID: <span className="font-mono text-gray-800">{role.id}</span>
              </div>
              <div className="text-sm text-gray-500">
                {role.total_users} người dùng
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-4">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !hasChanges}
                className="px-6 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
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

// Delete Role Modal Component
function DeleteRoleModal({
  role,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  role: Role;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
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
                    Xóa vai trò
                  </h3>
                  <p className="text-red-100 text-sm">
                    Xóa vĩnh viễn vai trò khỏi hệ thống
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Info Section */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-red-50/50">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                <HiKey className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-lg truncate">
                  {role.role_name}
                </h4>
                <p className="text-gray-600 text-sm truncate">{role.details}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-xs font-medium text-blue-700">
                      {role.total_users} người dùng
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-xs font-medium text-red-700">
                      Sẽ bị xóa vĩnh viễn
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="text-center mb-4">
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                Bạn có chắc chắn muốn xóa vai trò này?
              </h4>
              <p className="text-gray-600 text-sm">
                Hành động này không thể hoàn tác và sẽ xóa vĩnh viễn vai trò
                khỏi hệ thống.
              </p>
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HiX className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-red-800 text-sm">
                    Cảnh báo!
                  </div>
                  <div className="text-sm text-red-700 mt-1 space-y-1">
                    <div>• Vai trò sẽ bị xóa vĩnh viễn khỏi hệ thống</div>
                    <div>• Tất cả quyền hạn liên quan sẽ bị mất</div>
                    <div>• Hành động này không thể hoàn tác</div>
                    {role.total_users > 0 && (
                      <div className="font-semibold">
                        • {role.total_users} người dùng sẽ bị ảnh hưởng
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ID: <span className="font-mono text-gray-800">{role.id}</span>
              </div>
              <div className="text-sm text-gray-500">
                {role.total_users} người dùng
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-4">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={onConfirm}
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Đang xóa..." : "Xóa vai trò"}
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
