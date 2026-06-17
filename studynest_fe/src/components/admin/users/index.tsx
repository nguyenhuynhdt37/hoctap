"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { User, UsersQueryParams, UsersResponse } from "@/types/admin/user";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiBan,
  HiClock,
  HiCog,
  HiEye,
  HiPencil,
  HiSearch,
  HiShieldCheck,
  HiTrash,
  HiUserAdd,
  HiX,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

export default function UsersManagement() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState(""); // Input value trực tiếp
  const [search, setSearch] = useState(""); // Giá trị sau debounce
  const [sortBy, setSortBy] = useState<
    | "fullname"
    | "email"
    | "created_at"
    | "updated_at"
    | "last_login_at"
    | "total_courses"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [emailVerificationFilter, setEmailVerificationFilter] = useState<
    boolean | null
  >(null);
  const [bannedFilter, setBannedFilter] = useState<boolean | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<"permanent" | "temporary">(
    "temporary"
  );
  const [banReason, setBanReason] = useState("");
  const [banUntilDate, setBanUntilDate] = useState("");
  const [banUntilTime, setBanUntilTime] = useState("");

  // Context menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuUser, setMenuUser] = useState<User | null>(null);
  const openContextMenu = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    setMenuUser(user);
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
  const copy = async (text?: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {}
  };

  // Ngăn scroll của body khi modal mở
  useEffect(() => {
    if (showActionsModal || showBanModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup khi component unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showActionsModal, showBanModal]);

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

    if (bannedFilter !== null) {
      params.is_banned = bannedFilter;
    }

    return params;
  };

  // Fetch users data
  const { data, error, mutate, isValidating } = useSWR<UsersResponse>(
    ["/admin/users", buildQueryParams()],
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
    updated_at: "Ngày cập nhật",
    last_login_at: "Lần cuối đăng nhập",
    total_courses: "Số khóa học",
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setEmailVerificationFilter(null);
    setBannedFilter(null);
    setPage(1);
  };

  const handleUserAction = (user: User) => {
    setSelectedUser(user);
    setShowActionsModal(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Kiểm tra điều kiện xóa
    if (selectedUser.is_verified_email) {
      showToast.error(
        "KHÔNG THỂ XÓA! Người dùng đã xác thực email không thể xóa. Chỉ có thể xóa tài khoản chưa xác thực email."
      );
      return;
    }

    // Cảnh báo chi tiết và yêu cầu nhập lý do
    const reason = prompt(`🚨 CẢNH BÁO NGHIÊM TRỌNG! 🚨

Bạn đang chuẩn bị XÓA VĨNH VIỄN người dùng:

👤 Tên: ${selectedUser.fullname}
📧 Email: ${selectedUser.email}
🆔 ID: ${selectedUser.id}
📅 Ngày tạo: ${formatDate(selectedUser.created_at)}
📊 Số khóa học: ${selectedUser.total_courses}

⚠️  HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!

Tất cả dữ liệu sẽ bị xóa vĩnh viễn:
• Thông tin cá nhân
• Lịch sử học tập
• Dữ liệu khóa học
• Tất cả hoạt động liên quan

VUI LÒNG NHẬP LÝ DO XÓA:`);

    if (!reason || !reason.trim()) {
      showToast.error(
        "Đã hủy thao tác xóa. Vui lòng nhập lý do xóa người dùng."
      );
      return;
    }

    // Xác nhận cuối cùng
    const finalConfirm = confirm(`🔥 XÁC NHẬN CUỐI CÙNG 🔥

Bạn có THỰC SỰ muốn xóa người dùng "${selectedUser.fullname}"?

Lý do: ${reason.trim()}

Đây là lần cảnh báo cuối cùng!
Sau khi nhấn OK, người dùng sẽ bị xóa VĨNH VIỄN!`);

    if (!finalConfirm) {
      showToast.error("Đã hủy thao tác xóa. Người dùng vẫn an toàn.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.delete(`/admin/users/${selectedUser.id}`, {
        params: {
          reason: reason.trim(),
        },
      });

      // Xử lý response mới từ API
      const { message, user_id, deleted_at, deleted_until } = response.data;

      showToast.success(
        `XÓA THÀNH CÔNG! ${message} - Người dùng: ${selectedUser.fullname}`
      );

      mutate(); // Refresh data
      setShowActionsModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error deleting user:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Có lỗi xảy ra khi xóa người dùng!";
      showToast.error(`LỖI KHI XÓA! ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    if (selectedUser.is_banned) {
      // Unban user
      setIsSubmitting(true);
      try {
        await api.post(`/admin/users/${selectedUser.id}/unlock_ban`);
        showToast.success("Bỏ cấm người dùng thành công!");
        mutate(); // Refresh data
        setShowActionsModal(false);
        setSelectedUser(null);
      } catch (error: any) {
        // Suppress console error để không ảnh hưởng UX
        // console.error("Error unbanning user:", error);
        const errorMessage =
          error.response?.data?.detail ||
          error.message ||
          "Có lỗi xảy ra khi bỏ cấm người dùng!";
        showToast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Show ban modal
      setShowBanModal(true);
    }
  };

  const handleConfirmBan = async () => {
    if (!selectedUser) return;

    if (!banReason.trim()) {
      showToast.error("Vui lòng nhập lý do cấm!");
      return;
    }

    if (banType === "temporary" && (!banUntilDate || !banUntilTime)) {
      showToast.error("Vui lòng chọn ngày và giờ kết thúc cấm!");
      return;
    }

    setIsSubmitting(true);
    try {
      const isPermanent = banType === "permanent";
      let bannedUntil = null;

      if (!isPermanent) {
        bannedUntil = new Date(`${banUntilDate}T${banUntilTime}`);
        // Kiểm tra ngày không được trong quá khứ
        if (bannedUntil <= new Date()) {
          showToast.error("Ngày kết thúc cấm phải sau thời điểm hiện tại!");
          setIsSubmitting(false);
          return;
        }
      }

      await api.post(`/admin/users/${selectedUser.id}/ban`, {
        is_block_permanently: isPermanent,
        banned_reason: banReason.trim(),
        banned_until: bannedUntil ? bannedUntil.toISOString() : null,
      });

      const banTypeText = isPermanent ? "vĩnh viễn" : "tạm thời";
      showToast.success(`Cấm người dùng ${banTypeText} thành công!`);

      // Reset form
      setShowBanModal(false);
      setBanReason("");
      setBanUntilDate("");
      setBanUntilTime("");

      // Refresh data
      mutate();
      setShowActionsModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error banning user:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Có lỗi xảy ra khi cấm người dùng!";
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleAddRoleLecturer = async () => {
    if (!selectedUser) return;

    const confirm = window.confirm(
      `🎓 XÁC NHẬN CÁP QUYỀN GIẢNG VIÊN\n\nBạn có chắc chắn muốn cấp quyền giảng viên cho "${selectedUser.fullname}"?\n\n✅ Sau khi cấp quyền:\n• Người dùng sẽ có quyền giảng viên\n• Có thể tạo và quản lý khóa học\n• Tài khoản sẽ được nâng cấp lên giảng viên\n\nĐây là hành động quan trọng, vui lòng xác nhận!`
    );

    if (!confirm) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(
        `/admin/lecturers/${selectedUser.id}/add_role_lecturer`
      );

      showToast.success(
        response.data.message || "Đã cấp quyền giảng viên thành công"
      );

      mutate(); // Refresh data
      setShowActionsModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error adding lecturer role:", error);

      const status = error.response?.status;
      const detail = error.response?.data?.detail || error.message;

      let errorMessage = "";

      switch (status) {
        case 403:
          errorMessage =
            detail ||
            "Bạn không có quyền cấp quyền giảng viên hoặc người dùng không hợp lệ.";
          break;
        case 404:
          errorMessage = detail || "Người dùng không tồn tại hoặc đã bị xóa.";
          break;
        case 409:
          errorMessage =
            detail ||
            "Không thể cấp quyền giảng viên. Có thể người dùng đã có quyền giảng viên.";
          break;
        case 400:
          errorMessage =
            detail || "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.";
          break;
        case 500:
          errorMessage =
            detail || "Có lỗi xảy ra trên server. Vui lòng thử lại sau.";
          break;
        default:
          errorMessage = detail || "Có lỗi xảy ra khi cấp quyền giảng viên!";
      }

      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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

  const formatLastLogin = (dateString: string) => {
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

  const handleExportExcel = async () => {
    try {
      const response = await api.get("/admin/users/export", {
        responseType: "blob",
      });

      // Download file
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast.error("Lỗi khi xuất Excel");
    }
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
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Quản lý Người dùng
              </h1>
              <p className="text-gray-600 mt-1">
                {data?.total_items || 0} người dùng
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/admin/users/deleted")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiTrash className="w-4 h-4" />
              Người dùng đã xóa
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isValidating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 Xuất Excel
            </button>
          </div>
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
                  placeholder="Tìm theo họ tên hoặc email..."
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

            {/* Filter by Email Verification */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Xác thực email
              </label>
              <select
                value={
                  emailVerificationFilter === null
                    ? ""
                    : emailVerificationFilter
                    ? "true"
                    : "false"
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setEmailVerificationFilter(
                    value === "" ? null : value === "true"
                  );
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

            {/* Filter by Banned Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Trạng thái bị cấm
              </label>
              <select
                value={
                  bannedFilter === null ? "" : bannedFilter ? "true" : "false"
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setBannedFilter(value === "" ? null : value === "true");
                  setPage(1);
                }}
                disabled={isValidating}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="">Tất cả</option>
                <option value="false">Bình thường</option>
                <option value="true">Bị cấm</option>
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
                        | "updated_at"
                        | "last_login_at"
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
                  Lần cuối đăng nhập
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
                    <div className="animate-spin h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-gray-500 text-lg">
                      Không tìm thấy người dùng nào
                    </p>
                  </td>
                </tr>
              ) : (
                data.items.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                    onContextMenu={(e) => openContextMenu(e, user)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
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
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Chưa phân quyền
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                        {user.total_courses}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {user.is_verified_email ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            ✓ Email
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                            ⚠ Chưa xác thực
                          </span>
                        )}
                        {user.is_banned && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                            🚫 Bị cấm
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        <div className="font-medium">
                          {formatLastLogin(user.last_login_at)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(user.last_login_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center sm:hidden">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            const rect = (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                            setMenuUser(user);
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

        {menuOpen && menuUser && (
          <ContextMenu
            x={menuPos.x}
            y={menuPos.y}
            onClose={() => setMenuOpen(false)}
            items={[
              {
                label: "Mở hành động",
                onClick: () => {
                  setSelectedUser(menuUser);
                  setShowActionsModal(true);
                  setMenuOpen(false);
                },
              },
              {
                label: "Sao chép User ID",
                onClick: () => {
                  copy(menuUser.id);
                  setMenuOpen(false);
                },
              },
              {
                label: "Sao chép Email",
                onClick: () => {
                  copy(menuUser.email);
                  setMenuOpen(false);
                },
              },
              {
                label: "Sao chép Họ tên",
                onClick: () => {
                  copy(menuUser.fullname);
                  setMenuOpen(false);
                },
              },
            ]}
          />
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="px-6 py-4 border-t-2 border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, data.total_items)} trong{" "}
              {data.total_items} người dùng
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
                {Array.from({ length: data.total_pages }, (_, i) => i + 1).map(
                  (p) => (
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
                  )
                )}
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
        <UserActionsModal
          user={selectedUser}
          onClose={() => {
            setShowActionsModal(false);
            setSelectedUser(null);
          }}
          onDelete={handleDeleteUser}
          onBan={handleBanUser}
          onAddRoleLecturer={handleAddRoleLecturer}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Ban User Modal */}
      {showBanModal && selectedUser && (
        <BanUserModal
          banType={banType}
          setBanType={setBanType}
          banReason={banReason}
          setBanReason={setBanReason}
          banUntilDate={banUntilDate}
          setBanUntilDate={setBanUntilDate}
          banUntilTime={banUntilTime}
          setBanUntilTime={setBanUntilTime}
          onConfirm={handleConfirmBan}
          onCancel={() => {
            setShowBanModal(false);
            setBanReason("");
            setBanUntilDate("");
            setBanUntilTime("");
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

// User Actions Modal Component
function UserActionsModal({
  user,
  onClose,
  onDelete,
  onBan,
  onAddRoleLecturer,
  isSubmitting,
}: {
  user: User;
  onClose: () => void;
  onDelete: () => void;
  onBan: () => void;
  onAddRoleLecturer: () => void;
  isSubmitting: boolean;
}) {
  const canDelete = !user.is_verified_email;
  const isBanned = user.is_banned;

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
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <HiCog className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Thao tác người dùng
                  </h3>
                  <p className="text-green-100 text-sm">
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
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-emerald-50/50">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
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

                  {/* Banned Status */}
                  <div className="flex items-center space-x-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        user.is_banned ? "bg-red-500" : "bg-green-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        user.is_banned ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {user.is_banned ? "Bị cấm" : "Bình thường"}
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
                className="w-full flex items-center space-x-4 p-4 text-left hover:bg-emerald-50 rounded-2xl transition-all duration-200 group border border-transparent hover:border-emerald-200 hover:shadow-md"
                onClick={() => {
                  window.location.href = `/admin/users/${user.id}`;
                }}
              >
                <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors duration-200">
                  <HiEye className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Xem chi tiết
                  </div>
                  <div className="text-sm text-gray-600">
                    Xem thông tin đầy đủ của người dùng
                  </div>
                </div>
                <div className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  →
                </div>
              </button>

              {/* Edit User */}
              <button
                className="w-full flex items-center space-x-4 p-4 text-left hover:bg-green-50 rounded-2xl transition-all duration-200 group border border-transparent hover:border-green-200 hover:shadow-md"
                onClick={() => {
                  window.location.href = `/admin/users/${user.id}/edit`;
                }}
              >
                <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors duration-200">
                  <HiPencil className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Chỉnh sửa thông tin
                  </div>
                  <div className="text-sm text-gray-600">
                    Cập nhật thông tin cá nhân và vai trò
                  </div>
                </div>
                <div className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  →
                </div>
              </button>

              {/* Ban/Unban */}
              <button
                onClick={onBan}
                disabled={isSubmitting}
                className={`w-full flex items-center space-x-4 p-4 text-left rounded-2xl transition-all duration-200 group border border-transparent hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  isBanned
                    ? "hover:bg-green-50 hover:border-green-200"
                    : "hover:bg-red-50 hover:border-red-200"
                }`}
              >
                <div
                  className={`p-3 rounded-xl transition-colors duration-200 ${
                    isBanned
                      ? "bg-green-100 group-hover:bg-green-200"
                      : "bg-red-100 group-hover:bg-red-200"
                  }`}
                >
                  {isBanned ? (
                    <HiShieldCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <HiBan className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {isBanned ? "Bỏ cấm người dùng" : "Cấm người dùng"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isBanned
                      ? "Khôi phục quyền truy cập của người dùng"
                      : "Tạm thời vô hiệu hóa tài khoản"}
                  </div>
                </div>
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                    isBanned ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {isSubmitting ? "..." : "→"}
                </div>
              </button>

              {/* Add Lecturer Role */}
              <button
                onClick={onAddRoleLecturer}
                disabled={isSubmitting}
                className="w-full flex items-center space-x-4 p-4 text-left hover:bg-teal-50 rounded-2xl transition-all duration-200 group border border-transparent hover:border-teal-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-3 bg-teal-100 rounded-xl group-hover:bg-teal-200 transition-colors duration-200">
                  <HiUserAdd className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Cấp quyền giảng viên
                  </div>
                  <div className="text-sm text-gray-600">
                    Nâng cấp tài khoản lên giảng viên
                  </div>
                </div>
                <div className="text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {isSubmitting ? "..." : "→"}
                </div>
              </button>

              {/* Delete User */}
              <button
                onClick={onDelete}
                disabled={isSubmitting || !canDelete}
                className={`w-full flex items-center space-x-4 p-4 text-left rounded-2xl transition-all duration-200 group border border-transparent ${
                  canDelete
                    ? "hover:bg-red-50 hover:border-red-200 hover:shadow-md"
                    : "opacity-50 cursor-not-allowed"
                }`}
                title={
                  !canDelete ? "Không thể xóa người dùng đã xác thực email" : ""
                }
              >
                <div
                  className={`p-3 rounded-xl transition-colors duration-200 ${
                    canDelete
                      ? "bg-red-100 group-hover:bg-red-200"
                      : "bg-gray-100"
                  }`}
                >
                  <HiTrash
                    className={`w-5 h-5 ${
                      canDelete ? "text-red-600" : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div
                    className={`font-semibold ${
                      canDelete ? "text-red-900" : "text-gray-500"
                    }`}
                  >
                    🗑️ XÓA VĨNH VIỄN
                  </div>
                  <div
                    className={`text-sm ${
                      canDelete ? "text-red-700" : "text-gray-400"
                    }`}
                  >
                    {canDelete
                      ? "⚠️ XÓA VĨNH VIỄN - KHÔNG THỂ HOÀN TÁC!"
                      : "❌ Chỉ có thể xóa tài khoản chưa xác thực email"}
                  </div>
                </div>
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                    canDelete ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  {isSubmitting ? "..." : "→"}
                </div>
              </button>
            </div>

            {/* Warning for delete action */}
            {canDelete && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-300 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <HiX className="w-4 h-4 text-white font-bold" />
                  </div>
                  <div>
                    <div className="font-bold text-red-900 text-sm">
                      🚨 CẢNH BÁO NGHIÊM TRỌNG! 🚨
                    </div>
                    <div className="text-sm text-red-800 mt-2 space-y-1">
                      <div className="font-semibold">
                        Hành động này KHÔNG THỂ HOÀN TÁC!
                      </div>
                      <div>• Tất cả thông tin cá nhân sẽ bị xóa vĩnh viễn</div>
                      <div>• Lịch sử học tập và tiến độ sẽ mất</div>
                      <div>• Dữ liệu khóa học liên quan sẽ bị xóa</div>
                      <div>• Không thể khôi phục sau khi xóa</div>
                    </div>
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                      <div className="text-xs font-bold text-red-900">
                        ⚠️ Chỉ xóa khi CHẮC CHẮN không cần dữ liệu này!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ID: <span className="font-mono text-gray-800">{user.id}</span>
              </div>
              <div className="text-sm text-gray-500">
                {user.total_courses} khóa học
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

// Ban User Modal Component
function BanUserModal({
  banType,
  setBanType,
  banReason,
  setBanReason,
  banUntilDate,
  setBanUntilDate,
  banUntilTime,
  setBanUntilTime,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  banType: "permanent" | "temporary";
  setBanType: (type: "permanent" | "temporary") => void;
  banReason: string;
  setBanReason: (reason: string) => void;
  banUntilDate: string;
  setBanUntilDate: (date: string) => void;
  banUntilTime: string;
  setBanUntilTime: (time: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
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
        onClick={onCancel}
      />

      {/* Modal Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "32rem",
          transform: "scale(1)",
          opacity: 1,
          transition: "all 300ms ease-out",
        }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <HiBan className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Cấm người dùng
                  </h3>
                  <p className="text-red-100 text-sm">
                    Chọn loại cấm và nhập thông tin
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 group"
              >
                <HiXCircle className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Ban Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🚫 Loại cấm
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBanType("temporary")}
                  className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                    banType === "temporary"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-25"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <HiClock className="w-4 h-4" />
                    <span>Cấm tạm thời</span>
                  </div>
                </button>
                <button
                  onClick={() => setBanType("permanent")}
                  className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                    banType === "permanent"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-25"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <HiBan className="w-4 h-4" />
                    <span>Cấm vĩnh viễn</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Ban Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📝 Lý do cấm
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Nhập lý do cấm người dùng..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all duration-200 placeholder-gray-500 resize-none"
                rows={3}
              />
            </div>

            {/* Time Settings (only for temporary ban) */}
            {banType === "temporary" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📅 Thời gian kết thúc cấm
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={banUntilDate}
                      onChange={(e) => setBanUntilDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      value={banUntilTime}
                      onChange={(e) => setBanUntilTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>
                {banUntilDate && banUntilTime && (
                  <div className="mt-2 text-sm text-gray-600">
                    Cấm đến:{" "}
                    {new Date(`${banUntilDate}T${banUntilTime}`).toLocaleString(
                      "vi-VN"
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Warning */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HiBan className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-red-800 text-sm">
                    Cảnh báo!
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {banType === "permanent"
                      ? "Người dùng sẽ bị cấm vĩnh viễn và không thể đăng nhập."
                      : banUntilDate && banUntilTime
                      ? `Người dùng sẽ bị cấm đến ${new Date(
                          `${banUntilDate}T${banUntilTime}`
                        ).toLocaleString("vi-VN")}.`
                      : "Vui lòng chọn ngày và giờ kết thúc cấm."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={onConfirm}
                disabled={isSubmitting || !banReason.trim()}
                className={`px-6 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  banType === "permanent"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận cấm"}
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
