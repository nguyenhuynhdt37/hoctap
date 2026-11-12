"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { LecturerCoursesResponse } from "@/types/lecturer/course";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Eye,
  GraduationCap,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import useSWR from "swr";

const LecturerCourses = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || searchParams.get("keyword") || "";
  const [search, setSearch] = useState(urlSearch);
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort_by") || "revenue"
  );
  const [filterStatus, setFilterStatus] = useState(
    searchParams.get("status") || "all"
  );
  const initialPage = Number(searchParams.get("page") || "1");
  const [page, setPage] = useState(
    Number.isSafeInteger(initialPage) && initialPage > 0 ? initialPage : 1
  );

  const previousUrlSearch = useRef(urlSearch);
  useEffect(() => {
    if (previousUrlSearch.current === urlSearch) return;
    previousUrlSearch.current = urlSearch;
    setSearch(urlSearch);
    setPage(1);
  }, [urlSearch]);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch courses
  const { data, error, isLoading, mutate } = useSWR<LecturerCoursesResponse>(
    `/lecturer/courses?page=${page}&page_size=9&sort_by=${sortBy}${
      search ? `&search=${encodeURIComponent(search)}` : ""
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
        <Badge
          variant="neutral"
          size="sm"
          icon={<Clock className="h-3 w-3" />}
        >
          Nháp
        </Badge>
      );
    }

    switch (status) {
      case "approved":
        return (
          <Badge
            variant="success"
            size="sm"
            icon={<CheckCircle2 className="h-3 w-3" />}
          >
            Đã duyệt
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="warning"
            size="sm"
            icon={<Clock className="h-3 w-3" />}
          >
            Chờ duyệt
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="destructive"
            size="sm"
            icon={<XCircle className="h-3 w-3" />}
          >
            Bị từ chối
          </Badge>
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
          icon: GraduationCap,
          label: "Tổng khóa học",
          value: data.pagination.total,
          color: "bg-primary-light text-primary border-primary-pastel",
        },
        {
          icon: Users,
          label: "Tổng học viên",
          value: formatNumber(
            data.courses.reduce((sum, course) => sum + course.total_enrolls, 0)
          ),
          color: "bg-info-bg text-info-foreground border-info-border",
        },
        {
          icon: CircleDollarSign,
          label: "Tổng doanh thu",
          value: formatCurrency(
            data.courses.reduce((sum, course) => sum + course.revenue, 0)
          ),
          color: "bg-success-bg text-success-foreground border-success-border",
        },
        {
          icon: Star,
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
          color: "bg-warning-bg text-warning-foreground border-warning-border",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-2">
            Quản lý khóa học
          </h1>
          <p className="text-muted-foreground">
            Quản lý và theo dõi hiệu quả của các khóa học bạn đã tạo
          </p>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center ${stat.color}`}
                  >
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Tìm kiếm khóa học..."
                  className="w-full pl-10 pr-10 py-2.5 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                />
                {search && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary bg-surface text-foreground"
            >
              <option value="revenue">Doanh thu cao nhất</option>
              <option value="views">Lượt xem nhiều nhất</option>
              <option value="total_enrolls">Học viên nhiều nhất</option>
              <option value="rating_avg">Đánh giá cao nhất</option>
              <option value="created_at">Mới nhất</option>
            </select>

            {/* Create Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/lecturer/courses/create")}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Tạo khóa học mới
            </Button>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden p-0">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" title="Không thể tải danh sách khóa học">
            <div className="mt-3">
              <Button variant="destructive" size="sm" onClick={() => mutate()}>
                Thử lại
              </Button>
            </div>
          </Alert>
        )}

        {/* Courses Grid */}
        {data && data.courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {data.courses.map((course) => (
              <Card
                key={course.id}
                className="overflow-hidden hover:shadow-md transition-all duration-200 group p-0"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-surface-muted overflow-hidden">
                  <img
                    src={getImageUrl(course.thumbnail_url)}
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
                          className="w-8 h-8 bg-surface/90 backdrop-blur-sm border border-border/60 rounded-lg flex items-center justify-center hover:bg-surface transition-colors relative z-10 cursor-pointer"
                        >
                          <MoreVertical className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="min-w-[210px] bg-surface rounded-xl shadow-lg border border-border p-1.5 z-50"
                          align="end"
                          sideOffset={5}
                        >
                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/70 hover:text-primary cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/courses/${course.id}/edit`
                              );
                            }}
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                            <span>Chỉnh sửa</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/70 hover:text-primary cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/courses/${course.id}/stats`
                              );
                            }}
                          >
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <span>Thống kê</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/70 hover:text-primary cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/courses/${course.id}/users`
                              );
                            }}
                          >
                            <Users className="h-4 w-4 text-primary" />
                            <span>Danh sách học viên</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/70 hover:text-primary cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/course/${course.slug}`);
                            }}
                          >
                            <Eye className="h-4 w-4 text-primary" />
                            <span>Xem trước</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/70 hover:text-primary cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/lecturer/chapters?course_id=${course.id}`
                              );
                            }}
                          >
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span>Quản lý chương và bài học</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Separator className="h-px bg-border my-1" />

                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive-foreground rounded-lg hover:bg-destructive-bg cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(course.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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
                  <p className="text-xs text-primary font-semibold mb-2">
                    {course.category?.name || "Chưa phân loại"}
                  </p>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-foreground mb-3 line-clamp-2 leading-tight">
                    {course.title}
                  </h3>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-background/80 border border-border/60 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">Học viên</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {formatNumber(course.total_enrolls)}
                      </p>
                    </div>
                    <div className="bg-background/80 border border-border/60 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs">Lượt xem</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {formatNumber(course.views)}
                      </p>
                    </div>
                  </div>

                  {/* Price, Rating & Revenue */}
                  <div className="space-y-3">
                    {/* Price */}
                    <div className="flex items-center justify-between py-2 border-t border-border/70">
                      <span className="text-sm text-muted-foreground">Giá bán</span>
                      <span className="text-lg font-bold text-foreground">
                        {course.base_price === 0
                          ? "Miễn phí"
                          : formatCurrency(course.base_price)}
                      </span>
                    </div>

                    {/* Rating & Revenue */}
                    <div className="flex items-center justify-between py-2 border-t border-border/70">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-5 w-5 text-warning-foreground fill-current" />
                        <span className="font-bold text-foreground">
                          {course.rating_avg.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Doanh thu</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(course.revenue)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lessons Count */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span>{course.sections_count} chương</span>
                    <span>•</span>
                    <span>{course.lessons_count} bài học</span>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      variant="pastel"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/lecturer/courses/${course.id}/users`);
                      }}
                      leftIcon={<Users className="h-4 w-4" />}
                    >
                      Danh sách học viên
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/lecturer/courses/${course.id}/stats`);
                      }}
                      leftIcon={<BarChart3 className="h-4 w-4" />}
                    >
                      Thống kê
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {data && data.courses.length === 0 && (
          <Card className="p-8">
            <EmptyState
              icon={<GraduationCap className="h-10 w-10 text-primary" />}
              title="Chưa có khóa học nào"
              description="Bắt đầu tạo khóa học đầu tiên của bạn ngay hôm nay"
              action={
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push("/lecturer/courses/create")}
                  leftIcon={<Plus className="h-5 w-5" />}
                >
                  Tạo khóa học mới
                </Button>
              }
            />
          </Card>
        )}

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-border bg-surface text-foreground rounded-xl hover:bg-primary-light/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
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
                    className={`px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                      page === pageNum
                        ? "bg-primary text-white border border-primary"
                        : "border border-border bg-surface text-foreground hover:bg-primary-light/60"
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
              className="px-4 py-2 border border-border bg-surface text-foreground rounded-xl hover:bg-primary-light/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
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
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
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
          <div className="px-6 py-5 bg-destructive-bg border-b border-destructive-border">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-surface border border-destructive-border rounded-xl flex items-center justify-center text-destructive-foreground">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Xóa khóa học
                </h3>
                <p className="text-destructive-foreground text-sm mt-0.5">
                  Hành động này cần xác nhận trước khi thực hiện
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Critical Warning if has enrollments */}
            {hasEnrolls ? (
              <div className="mb-4 p-5 bg-destructive-bg/70 border border-destructive-border rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-surface border border-destructive-border rounded-full flex items-center justify-center flex-shrink-0 text-destructive-foreground">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-destructive-foreground mb-2">
                      Không thể tự xóa khóa học này
                    </div>
                    <div className="text-sm text-foreground space-y-2">
                      <div>
                        Khóa học này đã có{" "}
                        <span className="font-bold text-destructive-foreground">
                          {course.total_enrolls}
                        </span>{" "}
                        học viên đăng ký.
                      </div>
                      <div className="mt-3 p-3.5 bg-surface border border-destructive-border/70 rounded-xl">
                        <div className="font-semibold text-foreground mb-1">
                          Quy định bảo vệ quyền lợi học viên
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Để đảm bảo quyền lợi của học viên, bạn cần liên hệ với{" "}
                          <span className="font-semibold text-foreground">
                            Quản trị viên
                          </span>{" "}
                          để được hỗ trợ xóa khóa học này.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Course Info */}
                <div className="mb-5 p-4 bg-background rounded-xl border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Khóa học
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {course.title}
                  </div>
                </div>

                {/* Warning */}
                <Alert
                  variant="destructive"
                  title="Cảnh báo nghiêm trọng"
                  className="mb-5"
                >
                  <div className="space-y-1.5 text-sm">
                    <p className="font-semibold">
                      Hành động này không thể hoàn tác!
                    </p>
                    <p>• Khóa học sẽ bị xóa vĩnh viễn khỏi hệ thống</p>
                    <p>• Tất cả bài học và tài liệu sẽ bị mất</p>
                    <p>• Không thể khôi phục sau khi xóa</p>
                  </div>
                </Alert>

                {/* Delete Reason */}
                <div className="mb-2">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Vui lòng nhập lý do xóa khóa học{" "}
                    <span className="text-destructive-foreground">*</span>
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Ví dụ: Khóa học không còn phù hợp, cần thay thế bằng khóa học mới..."
                    rows={4}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive-border focus:border-destructive-foreground resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-background/70 border-t border-border">
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {hasEnrolls ? "Đóng" : "Hủy"}
              </Button>
              {!hasEnrolls && (
                <Button
                  variant="destructive"
                  onClick={onConfirm}
                  disabled={isSubmitting || !deleteReason.trim()}
                  isLoading={isSubmitting}
                  loadingText="Đang xóa..."
                >
                  Xác nhận xóa
                </Button>
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
