"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { LecturerCoursesResponse } from "@/types/lecturer/course";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  HiAcademicCap,
  HiBookOpen,
  HiChartBar,
  HiCheckCircle,
  HiChevronLeft,
  HiChevronRight,
  HiClock,
  HiCurrencyDollar,
  HiDotsVertical,
  HiExclamation,
  HiEye,
  HiPencil,
  HiPlus,
  HiSearch,
  HiStar,
  HiTrash,
  HiUsers,
  HiX,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

const LecturerCourses = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort_by") || "revenue"
  );
  const [filterStatus, setFilterStatus] = useState(
    searchParams.get("status") || "all"
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock lecturer ID - In production, get from auth context
  const lecturerId = "a2c1069c-fb4c-41cb-9486-255f39da06ac";

  // Fetch courses
  const { data, error, isLoading, mutate } = useSWR<LecturerCoursesResponse>(
    `/lecturer/courses?lecturer_id=${lecturerId}&page=${page}&page_size=9&sort_by=${sortBy}${
      search ? `&search=${search}` : ""
    }`,
    async (url: string) => {
      const response = await api.get(url);
      return response.data;
    }
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSort = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourseToDelete(courseId);
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete || !deleteReason.trim()) {
      showToast.error("Vui lòng nhập lý do xóa khóa học!");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.delete(`/lecturer/courses/${courseToDelete}`);

      showToast.success("Đã xóa khóa học thành công!");

      // Refresh data
      mutate();

      // Close modal
      setCourseToDelete(null);
      setDeleteReason("");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Không thể xóa khóa học. Vui lòng thử lại.";

      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, isPublished: boolean) => {
    if (!isPublished) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
          <HiClock className="h-3 w-3" />
          Nháp
        </span>
      );
    }

    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            <HiCheckCircle className="h-3 w-3" />
            Đã duyệt
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
            <HiClock className="h-3 w-3" />
            Chờ duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            <HiXCircle className="h-3 w-3" />
            Bị từ chối
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  // Calculate stats
  const stats = data
    ? [
        {
          icon: HiAcademicCap,
          label: "Tổng khóa học",
          value: data.pagination.total,
          color: "from-green-400 to-emerald-500",
        },
        {
          icon: HiUsers,
          label: "Tổng học viên",
          value: formatNumber(
            data.courses.reduce((sum, course) => sum + course.total_enrolls, 0)
          ),
          color: "from-emerald-400 to-teal-500",
        },
        {
          icon: HiCurrencyDollar,
          label: "Tổng doanh thu",
          value: formatCurrency(
            data.courses.reduce((sum, course) => sum + course.revenue, 0)
          ),
          color: "from-teal-400 to-cyan-500",
        },
        {
          icon: HiStar,
          label: "Đánh giá TB",
          value:
            data.courses.length > 0
              ? (
                  data.courses.reduce(
                    (sum, course) => sum + course.rating_avg,
                    0
                  ) / data.courses.length
                ).toFixed(1)
              : "0",
          color: "from-cyan-400 to-blue-500",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Quản lý khóa học
          </h1>
          <p className="text-gray-600">
            Quản lý và theo dõi hiệu quả của các khóa học bạn đã tạo
          </p>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-md`}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Tìm kiếm khóa học..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {search && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="revenue">Doanh thu cao nhất</option>
              <option value="views">Lượt xem nhiều nhất</option>
              <option value="total_enrolls">Học viên nhiều nhất</option>
              <option value="rating_avg">Đánh giá cao nhất</option>
              <option value="created_at">Mới nhất</option>
            </select>

            {/* Create Button */}
            <button
              onClick={() => router.push("/lecturer/courses/create")}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <HiPlus className="h-5 w-5" />
              Tạo khóa học mới
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse"
              >
                <div className="h-48 bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <HiXCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">
              Không thể tải danh sách khóa học
            </p>
            <button
              onClick={() => mutate()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Courses Grid */}
        {data && data.courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {data.courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-200 group"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={getGoogleDriveImageUrl(course.thumbnail_url)}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {getStatusBadge(
                      course.approval_status,
                      course.is_published
                    )}
                  </div>
                  <div className="absolute top-3 right-3 z-10">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white transition-colors relative z-10 cursor-pointer"
                        >
                          <HiDotsVertical className="h-5 w-5 text-gray-600" />
                        </button>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-200 p-1 z-50"
                          align="end"
                          sideOffset={5}
                        >
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/courses/${course.id}/edit`
                              );
                            }}
                          >
                            <HiPencil className="h-4 w-4 text-green-600" />
                            <span>Chỉnh sửa</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/courses/${course.id}/stats`
                              );
                            }}
                          >
                            <HiChartBar className="h-4 w-4 text-green-600" />
                            <span>Thống kê</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/courses/${course.id}/users`
                              );
                            }}
                          >
                            <HiUsers className="h-4 w-4 text-green-600" />
                            <span>Danh sách học viên</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/course/${course.slug}`);
                            }}
                          >
                            <HiEye className="h-4 w-4 text-green-600" />
                            <span>Xem trước</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/chapters?course_id=${course.id}`
                              );
                            }}
                          >
                            <HiBookOpen className="h-4 w-4 text-green-600" />
                            <span>Quản lý chương và bài học</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 cursor-pointer outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(course.id);
                            }}
                          >
                            <HiTrash className="h-4 w-4" />
                            <span>Xóa</span>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Category */}
                  <p className="text-xs text-green-600 font-semibold mb-2">
                    {course.category.name}
                  </p>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">
                    {course.title}
                  </h3>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <HiUsers className="h-4 w-4" />
                        <span className="text-xs">Học viên</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {formatNumber(course.total_enrolls)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <HiEye className="h-4 w-4" />
                        <span className="text-xs">Lượt xem</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {formatNumber(course.views)}
                      </p>
                    </div>
                  </div>

                  {/* Price, Rating & Revenue */}
                  <div className="space-y-3">
                    {/* Price */}
                    <div className="flex items-center justify-between py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Giá bán</span>
                      <span className="text-lg font-bold text-gray-900">
                        {course.base_price === 0
                          ? "Miễn phí"
                          : formatCurrency(course.base_price)}
                      </span>
                    </div>

                    {/* Rating & Revenue */}
                    <div className="flex items-center justify-between py-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <HiStar className="h-5 w-5 text-yellow-400" />
                        <span className="font-bold text-gray-900">
                          {course.rating_avg.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Doanh thu</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(course.revenue)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lessons Count */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span>{course.sections_count} chương</span>
                    <span>•</span>
                    <span>{course.lessons_count} bài học</span>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/lecturer/courses/${course.id}/users`);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-green-200 text-green-700 hover:bg-green-50 rounded-lg text-sm cursor-pointer transition-colors"
                    >
                      <HiUsers className="h-4 w-4" />
                      Danh sách học viên
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/lecturer/courses/${course.id}/stats`);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm cursor-pointer transition-colors"
                    >
                      <HiChartBar className="h-4 w-4" />
                      Thống kê
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {data && data.courses.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <HiAcademicCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Chưa có khóa học nào
            </h3>
            <p className="text-gray-600 mb-6">
              Bắt đầu tạo khóa học đầu tiên của bạn ngay hôm nay
            </p>
            <button
              onClick={() => router.push("/lecturer/courses/create")}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
            >
              <HiPlus className="h-5 w-5" />
              Tạo khóa học mới
            </button>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <HiChevronLeft className="h-5 w-5" />
            </button>

            {[...Array(Math.min(5, data.pagination.total_pages))].map(
              (_, i) => {
                let pageNum;
                if (data.pagination.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= data.pagination.total_pages - 2) {
                  pageNum = data.pagination.total_pages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                      page === pageNum
                        ? "bg-green-600 text-white"
                        : "border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
            )}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.pagination.total_pages}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <HiChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Course Modal */}
      {courseToDelete && (
        <DeleteCourseModal
          course={data?.courses.find((c) => c.id === courseToDelete) || null}
          deleteReason={deleteReason}
          setDeleteReason={setDeleteReason}
          onConfirm={confirmDeleteCourse}
          onCancel={() => {
            setCourseToDelete(null);
            setDeleteReason("");
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

// Delete Course Modal Component
function DeleteCourseModal({
  course,
  deleteReason,
  setDeleteReason,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  course: {
    id: string;
    title: string;
    total_enrolls: number;
  } | null;
  deleteReason: string;
  setDeleteReason: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  if (!course) return null;

  const hasEnrolls = course.total_enrolls > 0;

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 w-screen h-screen bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-up {
            animation: slideUp 0.3s ease-out;
          }
        `}</style>
        <div className="animate-slide-up">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <HiExclamation className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">Xóa khóa học</h3>
                <p className="text-red-100 text-sm mt-0.5">
                  Hành động này cần xác nhận
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Critical Warning if has enrollments */}
            {hasEnrolls ? (
              <div className="mb-6 p-5 bg-red-50 border-4 border-red-400 rounded-2xl animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <HiXCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-black text-red-900 mb-3">
                      🚨 KHÔNG THỂ XÓA KHÓA HỌC NÀY! 🚨
                    </div>
                    <div className="text-base text-red-800 space-y-2 font-semibold">
                      <div>
                        ⚠️ Khóa học này đã có{" "}
                        <span className="text-2xl font-black text-red-900">
                          {course.total_enrolls}
                        </span>{" "}
                        học viên đăng ký!
                      </div>
                      <div className="mt-3 p-3 bg-red-100 border-2 border-red-300 rounded-xl">
                        <div className="font-black text-red-900 mb-2">
                          Không thể tự xóa khóa học đã có người đăng ký
                        </div>
                        <div className="text-sm">
                          Để đảm bảo quyền lợi của học viên, bạn cần liên hệ với{" "}
                          <span className="font-black">Quản trị viên</span> để
                          được hỗ trợ xóa khóa học này.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Course Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Khóa học</div>
                  <div className="text-lg font-bold text-gray-900">
                    {course.title}
                  </div>
                </div>

                {/* Warning */}
                <div className="mb-6 p-5 bg-red-50 border-2 border-red-300 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HiXCircle className="w-5 h-5 text-white font-bold" />
                    </div>
                    <div>
                      <div className="font-bold text-red-900 text-base mb-3">
                        🚨 CẢNH BÁO NGHIÊM TRỌNG! 🚨
                      </div>
                      <div className="text-sm text-red-800 space-y-2">
                        <div className="font-semibold">
                          Hành động này KHÔNG THỂ HOÀN TÁC!
                        </div>
                        <div>• Khóa học sẽ bị xóa vĩnh viễn khỏi hệ thống</div>
                        <div>• Tất cả bài học và tài liệu sẽ bị mất</div>
                        <div>• Không thể khôi phục sau khi xóa</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete Reason */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vui lòng nhập lý do xóa khóa học{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Ví dụ: Khóa học không còn phù hợp, cần thay thế bằng khóa học mới..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
              >
                {hasEnrolls ? "Đóng" : "Hủy"}
              </button>
              {!hasEnrolls && (
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting || !deleteReason.trim()}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default LecturerCourses;
