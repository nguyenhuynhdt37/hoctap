"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { UserDetailResponse } from "@/types/admin/user-detail";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  HiAcademicCap,
  HiArrowLeft,
  HiBan,
  HiCalendar,
  HiChartBar,
  HiCheckCircle,
  HiClock,
  HiCurrencyDollar,
  HiPlay,
  HiShieldCheck,
  HiTrash,
  HiUser,
  HiUserAdd,
  HiUsers,
  HiX,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

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

const handleError = (error: any, defaultMsg: string) => {
  const status = error.response?.status;
  const detail = error.response?.data?.detail || error.message;
  const messages: Record<number, string> = {
    403: detail || "Bạn không có quyền thực hiện hành động này.",
    404: detail || "Không tìm thấy dữ liệu.",
    409: detail || "Hành động không thể thực hiện.",
    400: detail || "Thông tin không hợp lệ.",
    500: detail || "Có lỗi xảy ra trên server.",
  };
  return messages[status] || detail || defaultMsg;
};

export default function DetaiUser({ userId }: { userId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<"permanent" | "temporary">("temporary");
  const [banReason, setBanReason] = useState("");
  const [banUntilDate, setBanUntilDate] = useState("");
  const [banUntilTime, setBanUntilTime] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const { data, error, isLoading, mutate } = useSWR<UserDetailResponse>(
    `/admin/users/${userId}`,
    (url) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false }
  );

  const handleBanUser = async () => {
    if (!data) return;
    if (data.status.is_banned) {
      setIsSubmitting(true);
      try {
        await api.post(`/admin/users/${userId}/unlock_ban`);
        showToast.success("Bỏ cấm người dùng thành công!");
        await mutate();
      } catch (error: any) {
        showToast.error(handleError(error, "Có lỗi xảy ra khi bỏ cấm"));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setShowBanModal(true);
    }
  };

  const handleConfirmBan = async () => {
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
      let bannedUntil = null;
      if (banType === "temporary") {
        bannedUntil = new Date(`${banUntilDate}T${banUntilTime}`);
        if (bannedUntil <= new Date()) {
          showToast.error("Ngày kết thúc cấm phải sau thời điểm hiện tại!");
          setIsSubmitting(false);
          return;
        }
      }
      await api.post(`/admin/users/${userId}/ban`, {
        is_block_permanently: banType === "permanent",
        banned_reason: banReason.trim(),
        banned_until: bannedUntil ? bannedUntil.toISOString() : null,
      });
      showToast.success(
        `Cấm người dùng ${banType === "permanent" ? "vĩnh viễn" : "tạm thời"} thành công!`
      );
      setShowBanModal(false);
      setBanReason("");
      setBanUntilDate("");
      setBanUntilTime("");
      await mutate();
    } catch (error: any) {
      showToast.error(handleError(error, "Có lỗi xảy ra khi cấm người dùng"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!data) return;
    if (data.status.is_verified_email) {
      showToast.error("Không thể xóa người dùng đã xác thực email");
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!data || !deleteReason.trim()) {
      showToast.error("Vui lòng nhập lý do xóa!");
      return;
    }
    if (
      prompt(`Nhập "XÓA" để xác nhận xóa "${data.profile.fullname}":`) !== "XÓA"
    ) {
      showToast.error("Đã hủy thao tác xóa");
      setShowDeleteModal(false);
      setDeleteReason("");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.delete(`/admin/users/${userId}`, {
        params: { reason: deleteReason.trim() },
      });
      showToast.success("Xóa người dùng thành công");
      router.push("/admin/users");
    } catch (error: any) {
      showToast.error(handleError(error, "Có lỗi xảy ra khi xóa người dùng"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRoleLecturer = async () => {
    if (!data || !window.confirm(`Xác nhận cấp quyền giảng viên cho "${data.profile.fullname}"?`))
      return;
    setIsSubmitting(true);
    try {
      await api.post(`/admin/lecturers/${userId}/add_role_lecturer`);
      showToast.success("Đã cấp quyền giảng viên thành công");
      router.push(`/admin/lecturers/${userId}`);
    } catch (error: any) {
      showToast.error(handleError(error, "Có lỗi xảy ra khi cấp quyền"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center py-12">
        <HiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Không tìm thấy người dùng
        </h2>
        <button
          onClick={() => router.push("/admin/users")}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const { profile, status, roles, statistics, transactions, recent_activity } =
    data;
  const isDeletedUser = status.deleted_at !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <HiArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Chi tiết người dùng
              </h1>
              <p className="text-gray-600 mt-1">{profile.fullname}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isDeletedUser ? (
              <div className="px-4 py-2 bg-red-100 text-red-800 rounded-lg border border-red-200 flex items-center gap-2">
                <HiTrash className="w-4 h-4" />
                <span>Đã xóa vĩnh viễn</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleBanUser}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                    status.is_banned
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {status.is_banned ? (
                    <>
                      <HiShieldCheck className="w-4 h-4" />
                      Bỏ cấm
                    </>
                  ) : (
                    <>
                      <HiBan className="w-4 h-4" />
                      Cấm người dùng
                    </>
                  )}
                </button>
                <button
                  onClick={handleAddRoleLecturer}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <HiUserAdd className="w-4 h-4" />
                  Cấp quyền GV
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isSubmitting || status.is_verified_email}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                    status.is_verified_email
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                  title={
                    status.is_verified_email
                      ? "Không thể xóa người dùng đã xác thực email"
                      : ""
                  }
                >
                  <HiTrash className="w-4 h-4" />
                  Xóa người dùng
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiUser className="w-5 h-5 text-green-600" />
                Thông tin cá nhân
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">ID</label>
                  <p className="text-sm font-mono text-gray-900">{profile.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Họ và tên</label>
                  <p className="text-sm text-gray-900">{profile.fullname}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <p className="text-sm text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Ngày sinh</label>
                  <p className="text-sm text-gray-900">
                    {profile.birthday
                      ? new Date(profile.birthday).toLocaleDateString("vi-VN")
                      : "Chưa cập nhật"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiCheckCircle className="w-5 h-5 text-green-600" />
                Trạng thái
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Xác thực email</label>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        status.is_verified_email ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-sm text-gray-900">
                      {status.is_verified_email ? "Đã xác thực" : "Chưa xác thực"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Trạng thái tài khoản</label>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isDeletedUser
                          ? "bg-red-500"
                          : status.is_banned
                          ? "bg-red-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="text-sm text-gray-900">
                      {isDeletedUser
                        ? "Đã xóa vĩnh viễn"
                        : status.is_banned
                        ? "Bị cấm"
                        : "Bình thường"}
                    </span>
                  </div>
                  {isDeletedUser && status.deleted_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Xóa lúc: {formatDate(status.deleted_at)}
                    </p>
                  )}
                  {status.is_banned && !isDeletedUser && (
                    <div className="mt-2 space-y-2">
                      {status.banned_reason && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          Lý do: {status.banned_reason}
                        </div>
                      )}
                      {status.banned_until && (
                        <p className="text-xs text-gray-500">
                          Cấm đến: {formatDate(status.banned_until)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Đăng nhập lần cuối</label>
                  <p className="text-sm text-gray-900">
                    {formatLastLogin(status.last_login_at)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiUsers className="w-5 h-5 text-green-600" />
                Vai trò
              </h3>
              <div className="flex flex-wrap gap-2">
                {roles.map((role: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Khóa học đã đăng ký</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.total_courses_enrolled}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <HiAcademicCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Khóa học đã hoàn thành</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.total_courses_completed}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <HiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tiến độ trung bình</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.average_progress}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <HiChartBar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tổng chi tiêu</p>
                <p className="text-2xl font-bold text-gray-900">
                  {transactions.total_spent.toLocaleString("en-US")}{" "}
                  {transactions.currency}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <HiCurrencyDollar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HiCalendar className="w-5 h-5 text-green-600" />
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Tài khoản được tạo</p>
                  <p className="text-xs text-gray-500">{formatDate(profile.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cập nhật lần cuối</p>
                  <p className="text-xs text-gray-500">{formatDate(profile.updated_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Đăng nhập lần cuối</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(status.last_login_at)}
                  </p>
                </div>
              </div>
              {transactions.last_payment_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Thanh toán lần cuối</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(transactions.last_payment_at)}
                    </p>
                  </div>
                </div>
              )}
              {isDeletedUser && status.deleted_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Tài khoản bị xóa vĩnh viễn
                    </p>
                    <p className="text-xs text-red-500">
                      {formatDate(status.deleted_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HiPlay className="w-5 h-5 text-green-600" />
              Hoạt động gần đây
            </h3>
            {isDeletedUser ? (
              <div className="text-center py-8">
                <HiTrash className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-500 text-sm">Tài khoản đã bị xóa vĩnh viễn</p>
              </div>
            ) : recent_activity.last_watched_course ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Khóa học xem gần nhất
                    </p>
                    <p className="text-xs text-gray-500">
                      {recent_activity.last_watched_course}
                    </p>
                  </div>
                </div>
                {recent_activity.last_watched_time && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Thời gian xem</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(recent_activity.last_watched_time)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <HiClock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Chưa có hoạt động nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showBanModal && (
          <BanModal
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

        {showDeleteModal && (
          <DeleteModal
            deleteReason={deleteReason}
            setDeleteReason={setDeleteReason}
            onConfirm={handleConfirmDelete}
            onCancel={() => {
              setShowDeleteModal(false);
              setDeleteReason("");
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

function BanModal({
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
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cấm người dùng</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
            <HiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại cấm
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBanType("temporary")}
                className={`px-4 py-2 rounded-lg border-2 ${
                  banType === "temporary"
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                    : "border-gray-200"
                }`}
              >
                Tạm thời
              </button>
              <button
                onClick={() => setBanType("permanent")}
                className={`px-4 py-2 rounded-lg border-2 ${
                  banType === "permanent"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200"
                }`}
              >
                Vĩnh viễn
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do cấm
            </label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Nhập lý do cấm..."
            />
          </div>

          {banType === "temporary" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày
                </label>
                <input
                  type="date"
                  value={banUntilDate}
                  onChange={(e) => setBanUntilDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giờ
                </label>
                <input
                  type="time"
                  value={banUntilTime}
                  onChange={(e) => setBanUntilTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting || !banReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DeleteModal({
  deleteReason,
  setDeleteReason,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  deleteReason: string;
  setDeleteReason: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Xóa người dùng</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
            <HiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do xóa
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Nhập lý do xóa..."
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Cảnh báo: Hành động này không thể hoàn tác!
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting || !deleteReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
