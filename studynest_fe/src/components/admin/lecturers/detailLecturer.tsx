"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import Pagination from "@/components/shared/pagination";
import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  LecturerCoursesResponse,
  LecturerDetailResponse,
} from "@/types/admin/lecturer-detail";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  HiAcademicCap,
  HiArrowLeft,
  HiBan,
  HiCheckCircle,
  HiCurrencyDollar,
  HiEye,
  HiPencil,
  HiStar,
  HiTrash,
  HiUser,
  HiUserRemove,
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

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

export default function DetailLecturer({ lecturerId }: { lecturerId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<"permanent" | "temporary">(
    "temporary"
  );
  const [banReason, setBanReason] = useState("");
  const [banUntilDate, setBanUntilDate] = useState("");
  const [banUntilTime, setBanUntilTime] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesSize, setCoursesSize] = useState(4);
  const [coursesSortBy, setCoursesSortBy] = useState("created_at");
  const [coursesOrder, setCoursesOrder] = useState<"asc" | "desc">("desc");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsSize, setTransactionsSize] = useState(5);

  const { data, error, isLoading, mutate } = useSWR<LecturerDetailResponse>(
    `/admin/lecturers/${lecturerId}?page=${transactionsPage}&size=${transactionsSize}`,
    (url) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false }
  );

  const { data: coursesData, isLoading: isLoadingCourses } =
    useSWR<LecturerCoursesResponse>(
      `/admin/lecturers/${lecturerId}/courses?page=${coursesPage}&size=${coursesSize}&sort_by=${coursesSortBy}&order=${coursesOrder}`,
      (url) => api.get(url).then((res) => res.data),
      { revalidateOnFocus: false }
    );

  const handleUnban = async () => {
    if (!data || !window.confirm(`Xác nhận mở chặn "${data.fullname}"?`))
      return;
    setIsSubmitting(true);
    try {
      await api.post(`/admin/lecturers/${data.id}/unban`);
      showToast.success("Đã mở chặn giảng viên thành công");
      await mutate();
    } catch (error: any) {
      showToast.error(handleError(error, "Có lỗi xảy ra khi mở chặn"));
    } finally {
      setIsSubmitting(false);
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
      await api.post(`/admin/lecturers/${lecturerId}/ban`, {
        is_block_permanently: banType === "permanent",
        banned_reason: banReason.trim(),
        banned_until: bannedUntil ? bannedUntil.toISOString() : null,
      });
      showToast.success("Cấm giảng viên thành công!");
      setShowBanModal(false);
      setBanReason("");
      setBanUntilDate("");
      setBanUntilTime("");
      await mutate();
    } catch (error: any) {
      showToast.error(handleError(error, "Có lỗi xảy ra khi cấm giảng viên"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    if (data.is_verified_email) {
      showToast.error("Không thể xóa giảng viên đã xác thực email");
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!data || !deleteReason.trim()) {
      showToast.error("Vui lòng nhập lý do xóa!");
      return;
    }
    if (prompt(`Nhập "XÓA" để xác nhận xóa "${data.fullname}":`) !== "XÓA") {
      showToast.error("Đã hủy thao tác xóa");
      setShowDeleteModal(false);
      setDeleteReason("");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.delete(`/admin/lecturers/${lecturerId}`, {
        params: { reason: deleteReason.trim() },
      });
      showToast.success("Xóa giảng viên thành công");
      router.push("/admin/lecturers");
    } catch (error: any) {
      showToast.error(handleError(error, "Có lỗi xảy ra khi xóa giảng viên"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRole = async () => {
    if (
      !data ||
      !window.confirm(`Xác nhận gỡ quyền giảng viên của "${data.fullname}"?`)
    )
      return;
    setIsSubmitting(true);
    try {
      await api.delete(`/admin/lecturers/${lecturerId}/remove_role_lecturer`);
      showToast.success("Đã gỡ quyền giảng viên thành công");
      router.push("/admin/users");
    } catch (error: any) {
      showToast.error(handleError(error, "Có lỗi xảy ra khi gỡ quyền"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <HiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Không tìm thấy giảng viên
          </h2>
          <button
            onClick={() => router.push("/admin/lecturers")}
            className="px-4 py-2 bg-[#00bba7] text-white rounded-lg hover:bg-[#00a896] transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const totalStudents =
    coursesData?.items?.reduce((sum, c) => sum + c.total_enrolls, 0) || 0;
  const avgRating = coursesData?.items?.length
    ? (
        coursesData.items.reduce((sum, c) => sum + c.rating_avg, 0) /
        coursesData.items.length
      ).toFixed(1)
    : "0";
  const totalViews =
    coursesData?.items?.reduce((sum, c) => sum + c.views, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00bba7] to-emerald-600 bg-clip-text text-transparent">
                Chi tiết giảng viên
              </h1>
              <p className="text-gray-600 mt-1">{data.fullname}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data.is_banned ? (
              <button
                onClick={handleUnban}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#00bba7] text-white rounded-lg hover:bg-[#00a896] disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <HiBan className="w-4 h-4" />
                Mở chặn
              </button>
            ) : (
              <button
                onClick={() => setShowBanModal(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <HiBan className="w-4 h-4" />
                Cấm giảng viên
              </button>
            )}
            <button
              onClick={handleRemoveRole}
              disabled={isSubmitting}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <HiUserRemove className="w-4 h-4" />
              Gỡ quyền GV
            </button>
            <button
              onClick={() => router.push(`/admin/lecturers/${lecturerId}/edit`)}
              className="px-4 py-2 bg-[#00bba7] text-white rounded-lg hover:bg-[#00a896] flex items-center gap-2 transition-colors"
            >
              <HiPencil className="w-4 h-4" />
              Chỉnh sửa
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting || data.is_verified_email}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <HiTrash className="w-4 h-4" />
              Xóa
            </button>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-gradient-to-r from-[#00bba7] to-emerald-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold">
              {data.fullname.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-2">{data.fullname}</h2>
              <p className="text-white/90 mb-3">{data.email}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      data.is_verified_email ? "bg-green-300" : "bg-yellow-300"
                    }`}
                  />
                  <span className="text-sm">
                    {data.is_verified_email
                      ? "Email đã xác thực"
                      : "Email chưa xác thực"}
                  </span>
                </div>
                {data.is_banned && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-300" />
                    <span className="text-sm">Bị cấm</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={HiAcademicCap}
            label="Tổng khóa học"
            value={coursesData?.total_items || 0}
          />
          <StatCard
            icon={HiUsers}
            label="Tổng học viên"
            value={totalStudents}
          />
          <StatCard icon={HiStar} label="Đánh giá TB" value={avgRating} />
          <StatCard icon={HiEye} label="Tổng lượt xem" value={totalViews} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HiUser className="w-5 h-5 text-[#00bba7]" />
              Thông tin cá nhân
            </h3>
            <div className="space-y-3">
              <InfoRow label="ID" value={data.id} />
              <InfoRow label="Họ và tên" value={data.fullname} />
              <InfoRow label="Email" value={data.email} />
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Giới thiệu
                </label>
                <div className="text-sm text-gray-900">
                  {data.bio ? (
                    <MarkdownRenderer content={data.bio} />
                  ) : (
                    <span className="text-gray-400">Chưa cập nhật</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Info */}
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HiCurrencyDollar className="w-5 h-5 text-[#00bba7]" />
              Thông tin ví
            </h3>
            <div className="space-y-3">
              <InfoRow
                label="Số dư"
                value={formatCurrency(data.wallet.balance)}
                highlight
              />
              <InfoRow
                label="Tổng nạp"
                value={formatCurrency(data.wallet.total_in)}
              />
              <InfoRow
                label="Tổng chi"
                value={formatCurrency(data.wallet.total_out)}
              />
              <InfoRow
                label="Giao dịch cuối"
                value={formatDate(data.wallet.last_transaction_at)}
              />
            </div>
          </div>

          {/* Upgrade Payment */}
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HiCheckCircle className="w-5 h-5 text-[#00bba7]" />
              Nâng cấp giảng viên
            </h3>
            <div className="space-y-3">
              <InfoRow
                label="Phí nâng cấp"
                value={formatCurrency(data.upgrade_payment.amount)}
                highlight
              />
              <InfoRow
                label="Thời gian thanh toán"
                value={formatDate(data.upgrade_payment.paid_time)}
              />
              <InfoRow
                label="Trạng thái"
                value={data.upgrade_payment.payment_status}
              />
              <InfoRow
                label="Ghi chú"
                value={data.upgrade_payment.note || "Không có"}
              />
            </div>
          </div>
        </div>

        {/* Courses & Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Courses */}
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <HiAcademicCap className="w-5 h-5 text-[#00bba7]" />
                Khóa học
              </h3>
              <span className="text-sm text-gray-600">
                Tổng: {coursesData?.total_items || 0}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <select
                value={coursesSortBy}
                onChange={(e) => {
                  setCoursesSortBy(e.target.value);
                  setCoursesPage(1);
                }}
                className="flex-1 px-3 py-2 text-sm border-2 border-green-200 rounded-lg focus:border-[#00bba7] focus:outline-none focus:ring-2 focus:ring-green-500/20"
              >
                <option value="created_at">Ngày tạo</option>
                <option value="title">Tên</option>
                <option value="views">Lượt xem</option>
                <option value="price">Giá</option>
              </select>
              <select
                value={coursesOrder}
                onChange={(e) => {
                  setCoursesOrder(e.target.value as "asc" | "desc");
                  setCoursesPage(1);
                }}
                className="px-3 py-2 text-sm border-2 border-green-200 rounded-lg focus:border-[#00bba7] focus:outline-none focus:ring-2 focus:ring-green-500/20"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>

            {isLoadingCourses && !coursesData ? (
              <div className="animate-pulse space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : coursesData?.items?.length ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {coursesData.items.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowCourseModal(true);
                      }}
                      className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-green-50 hover:border-green-200 border border-transparent transition-all"
                    >
                      <img
                        src={getGoogleDriveImageUrl(course.thumbnail)}
                        alt={course.title}
                        className="aspect-video rounded-lg mb-2 object-cover w-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">
                        {course.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{course.total_enrolls} học viên</span>
                        <span className="font-bold text-[#00bba7]">
                          {formatCurrency(course.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={coursesData.page}
                  totalPages={coursesData.total_pages}
                  totalItems={coursesData.total_items}
                  pageSize={coursesData.size}
                  onPageChange={setCoursesPage}
                  onPageSizeChange={(size) => {
                    setCoursesSize(size);
                    setCoursesPage(1);
                  }}
                  pageSizeOptions={[4, 8, 12, 16]}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <HiAcademicCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Chưa có khóa học</p>
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <HiCurrencyDollar className="w-5 h-5 text-[#00bba7]" />
                Giao dịch
              </h3>
              <span className="text-sm text-gray-600">
                Tổng: {data.pagination.total}
              </span>
            </div>

            {data.transactions?.length ? (
              <>
                <div className="space-y-3 mb-4">
                  {data.transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {txn.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {txn.transaction_code} • {formatDate(txn.created_at)}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p
                          className={`text-sm font-semibold ${
                            txn.amount > 0 ? "text-[#00bba7]" : "text-red-600"
                          }`}
                        >
                          {txn.amount > 0 ? "+" : ""}
                          {formatCurrency(txn.amount)}
                        </p>
                        <p className="text-xs text-gray-500">{txn.method}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={data.pagination.page}
                  totalPages={data.pagination.total_pages}
                  totalItems={data.pagination.total}
                  pageSize={data.pagination.page_size}
                  onPageChange={setTransactionsPage}
                  onPageSizeChange={(size) => {
                    setTransactionsSize(size);
                    setTransactionsPage(1);
                  }}
                  pageSizeOptions={[5, 10, 15, 20]}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <HiCurrencyDollar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Chưa có giao dịch</p>
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

        {showCourseModal && selectedCourse && (
          <CourseModal
            course={selectedCourse}
            onClose={() => {
              setShowCourseModal(false);
              setSelectedCourse(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-[#00bba7]" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      <p
        className={`text-sm ${
          highlight
            ? "font-bold text-[#00bba7] text-lg"
            : "text-gray-900 font-mono"
        }`}
      >
        {value}
      </p>
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
          <h3 className="text-lg font-semibold text-gray-900">
            Cấm giảng viên
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
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
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  banType === "temporary"
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                    : "border-gray-200 hover:border-yellow-300"
                }`}
              >
                Tạm thời
              </button>
              <button
                onClick={() => setBanType("permanent")}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  banType === "permanent"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 hover:border-red-300"
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
              className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:border-[#00bba7] focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:border-[#00bba7] focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:border-[#00bba7] focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting || !banReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
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
          <h3 className="text-lg font-semibold text-gray-900">
            Xóa giảng viên
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
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
              className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:border-[#00bba7] focus:outline-none focus:ring-2 focus:ring-green-500/20"
              rows={3}
              placeholder="Nhập lý do xóa..."
            />
          </div>

          <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Cảnh báo: Hành động này không thể hoàn tác!
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting || !deleteReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
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

function CourseModal({
  course,
  onClose,
}: {
  course: any;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {course.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <HiStar className="w-4 h-4 text-yellow-500" />
                {course.rating_avg}
              </span>
              <span className="flex items-center gap-1">
                <HiUsers className="w-4 h-4" />
                {course.total_enrolls} học viên
              </span>
              <span className="flex items-center gap-1">
                <HiEye className="w-4 h-4" />
                {course.views} lượt xem
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <img
              src={getGoogleDriveImageUrl(course.thumbnail)}
              alt={course.title}
              className="rounded-lg w-full aspect-video object-cover"
            />
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Giá</span>
                <span className="font-bold text-[#00bba7]">
                  {formatCurrency(course.price)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Ngôn ngữ</span>
                <span className="text-sm text-gray-900 capitalize">
                  {course.language}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Cấp độ</span>
                <span className="text-sm text-gray-900 capitalize">
                  {course.level}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Trạng thái</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    course.is_published
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {course.is_published ? "Đã xuất bản" : "Nháp"}
                </span>
              </div>
            </div>
          </div>

          {course.sections?.length ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Chương và bài học</h4>
              {course.sections.map((section: any, idx: number) => (
                <div
                  key={section.id || idx}
                  className="border border-green-200 rounded-lg"
                >
                  <div className="px-4 py-3 bg-green-50 border-b border-green-200">
                    <h5 className="font-medium text-gray-900">
                      Chương {idx + 1}: {section.title || `Chương ${idx + 1}`}
                    </h5>
                    <p className="text-xs text-gray-600 mt-1">
                      {section.lessons?.length || 0} bài học
                    </p>
                  </div>
                  {section.lessons?.length ? (
                    <div className="p-3 space-y-2">
                      {section.lessons.map((lesson: any, lidx: number) => (
                        <div
                          key={lesson.id || lidx}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                        >
                          <div className="w-6 h-6 bg-[#00bba7] text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {lidx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {lesson.title || `Bài ${lidx + 1}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Chưa có nội dung khóa học
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#00bba7] text-white rounded-lg hover:bg-[#00a896] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
