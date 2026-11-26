"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { LecturerCoursesResponse } from "@/types/lecturer/course";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Coins,
  Eye,
  FolderOpen,
  GraduationCap,
  Layers,
  LayoutGrid,
  Library,
  List,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Users,
  X,
  XCircle,
} from "pulsoicon-react";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";

type StatusFilter = "all" | "approved" | "pending" | "draft" | "rejected";

const LECTURER_COURSES_QUERY_SCHEMA = {
  search: { type: "string", default: "" as string },
  sort_by: {
    type: "string",
    default: "revenue",
    allowed: [
      "revenue",
      "views",
      "total_enrolls",
      "rating_avg",
      "created_at",
    ] as const,
  },
  status: {
    type: "string",
    default: "all",
    allowed: ["all", "approved", "pending", "draft", "rejected"] as const,
  },
  view: {
    type: "string",
    default: "grid",
    allowed: ["grid", "list"] as const,
  },
  page: { type: "number", default: 1, min: 1 },
} as const;

const formatVndApprox = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(amount || 0)) + " đ";

const formatNumber = (num: number) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("vi-VN");
};

const getCourseKeyStatus = (
  approvalStatus: string,
  isPublished: boolean,
): Exclude<StatusFilter, "all"> => {
  if (!isPublished) return "draft";
  if (approvalStatus === "approved") return "approved";
  if (approvalStatus === "rejected") return "rejected";
  return "pending";
};

const LecturerCourses = () => {
  const router = useRouter();
  const { values, setParam, resetParams, searchParams } = useUrlQueryState(
    LECTURER_COURSES_QUERY_SCHEMA,
  );
  const search =
    values.search ||
    (!searchParams.has("search") ? searchParams.get("keyword") || "" : "");
  const sortBy = values.sort_by;
  const filterStatus = values.status;
  const viewMode = values.view;
  const page = values.page;

  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    commitNow: commitSearchNow,
  } = useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);

  const handleResubmitCourse = async (courseId: string) => {
    setResubmittingId(courseId);
    try {
      const res = await api.post(`/lecturer/courses/${courseId}/resubmit`);
      showToast.success(
        res.data?.message || "Đã gửi khóa học vào hàng đợi thẩm định lại!",
      );
      await mutate();
    } catch {
      showToast.error("Không thể gửi duyệt lại khóa học. Vui lòng thử lại.");
    } finally {
      setResubmittingId(null);
    }
  };

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<LecturerCoursesResponse>(
      `/lecturer/courses?page=${page}&page_size=9&sort_by=${sortBy}${
        search ? `&search=${encodeURIComponent(search)}` : ""
      }`,
      async (url: string) => {
        const response = await api.get(url);
        return response.data;
      },
      { revalidateOnFocus: false },
    );

  const allCourses = useMemo(() => data?.courses ?? [], [data]);

  // Tính số lượng từng trạng thái & chỉ số Bento
  const metrics = useMemo(() => {
    const total = data?.pagination.total ?? allCourses.length;
    let approvedCount = 0;
    let pendingCount = 0;
    let draftCount = 0;
    let rejectedCount = 0;

    for (const c of allCourses) {
      const k = getCourseKeyStatus(c.approval_status, c.is_published);
      if (k === "approved") approvedCount++;
      else if (k === "pending") pendingCount++;
      else if (k === "draft") draftCount++;
      else rejectedCount++;
    }

    const totalEnrolls = allCourses.reduce(
      (sum, c) => sum + (c.total_enrolls || 0),
      0,
    );
    const totalRevenue = allCourses.reduce(
      (sum, c) => sum + (c.revenue || 0),
      0,
    );
    const avgRating =
      allCourses.length > 0
        ? allCourses.reduce((sum, c) => sum + (c.rating_avg || 0), 0) /
          allCourses.length
        : 0;
    const maxRevenue = Math.max(1, ...allCourses.map((c) => c.revenue || 0));

    return {
      total,
      approvedCount,
      pendingCount,
      draftCount,
      rejectedCount,
      totalEnrolls,
      totalRevenue,
      avgRating,
      maxRevenue,
    };
  }, [data, allCourses]);

  // Lọc theo tab trạng thái ngay trên trang hiện tại
  const visibleCourses = useMemo(() => {
    if (filterStatus === "all") return allCourses;
    return allCourses.filter(
      (c) => getCourseKeyStatus(c.approval_status, c.is_published) === filterStatus,
    );
  }, [allCourses, filterStatus]);

  const handleSort = (value: string) => {
    setParam(
      "sort_by",
      value as (typeof LECTURER_COURSES_QUERY_SCHEMA.sort_by.allowed)[number],
    );
  };

  const handlePageChange = (newPage: number) => {
    setParam("page", newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      await mutate();
      setCourseToDelete(null);
      setDeleteReason("");
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { detail?: string; message?: string } };
      };
      const errorMessage =
        errObj?.response?.data?.detail ||
        errObj?.response?.data?.message ||
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
          icon={<Clock animated={false} className="h-3 w-3" />}
        >
          Bản nháp
        </Badge>
      );
    }
    switch (status) {
      case "approved":
        return (
          <Badge
            variant="success"
            size="sm"
            icon={<CheckCircle2 animated={false} className="h-3 w-3" />}
          >
            Đã duyệt
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="warning"
            size="sm"
            icon={<Clock animated={false} className="h-3 w-3" />}
          >
            Chờ duyệt
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="destructive"
            size="sm"
            icon={<XCircle animated={false} className="h-3 w-3" />}
          >
            Bị từ chối
          </Badge>
        );
      default:
        return null;
    }
  };

  const statusTabs: Array<{ key: StatusFilter; label: string; count: number }> =
    [
      { key: "all", label: "Tất cả", count: allCourses.length },
      { key: "approved", label: "Đã duyệt", count: metrics.approvedCount },
      { key: "pending", label: "Chờ duyệt", count: metrics.pendingCount },
      { key: "draft", label: "Bản nháp", count: metrics.draftCount },
      { key: "rejected", label: "Bị từ chối", count: metrics.rejectedCount },
    ];

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero Xưởng Giáo Trình Giảng Viên */}
        <section className="relative overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light via-surface to-accent-vanilla/75 p-6 shadow-sm sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-primary-pastel/45 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-secondary-pastel/40 blur-3xl"
          />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-2 h-44 w-44 text-primary/12"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle
              cx="100"
              cy="100"
              r="84"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />
            <circle cx="100" cy="100" r="54" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="100" cy="100" r="28" stroke="currentColor" strokeWidth="1.2" />
          </svg>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-2xs backdrop-blur-xs">
                <GraduationCap animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Xưởng giáo trình giảng viên</span>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Quản lý Khóa học &amp; Nội dung
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Biên tập chương bài giảng, tài nguyên học tập, ngân hàng câu hỏi
                và theo dõi doanh thu từng khóa học ngay tại một nơi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface/90"
                disabled={isValidating}
                onClick={() => void mutate()}
                leftIcon={
                  <RefreshCw
                    className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
                  />
                }
              >
                Làm mới
              </Button>
              <Link href="/lecturer/combos/create">
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  className="rounded-full border border-primary-pastel/80"
                  leftIcon={<Library className="h-4 w-4" />}
                >
                  Đóng gói Combo
                </Button>
              </Link>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="rounded-full shadow-sm"
                onClick={() => router.push("/lecturer/courses/create")}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Tạo khóa học mới
              </Button>
            </div>
          </div>

          {/* Bento 4 Chỉ số Đa Sắc Mây */}
          <div className="relative mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-primary-pastel/80 bg-surface/90 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-primary">
                <span>Tổng khóa học</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <GraduationCap animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                {metrics.total.toLocaleString("vi-VN")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.approvedCount} đã duyệt · {metrics.pendingCount} chờ duyệt
              </p>
            </div>

            <div className="rounded-2xl border border-secondary-pastel/80 bg-secondary-light/55 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-secondary-foreground">
                <span>Học viên (trang này)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-secondary-foreground">
                  <Users animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                {formatNumber(metrics.totalEnrolls)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Tổng lượt ghi danh hiển thị
              </p>
            </div>

            <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/75 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-warning-foreground">
                <span>Doanh thu (trang này)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-[#C98A2C]">
                  <Coins animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" aria-hidden="true" />
                {formatVndAsCoin(metrics.totalRevenue)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                ≈ {formatVndApprox(metrics.totalRevenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-success-foreground">
                <span>Đánh giá trung bình</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-accent-vanilla-foreground">
                  <Star animated={false} className="h-4 w-4 fill-current" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                {metrics.avgRating.toFixed(1)}{" "}
                <span className="font-sans text-xs font-normal text-muted-foreground">
                  / 5.0
                </span>
              </div>
              <div className="mt-1 flex items-center gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    animated={false}
                    className={`h-3.5 w-3.5 ${
                      n <= Math.round(metrics.avgRating)
                        ? "fill-current text-accent-vanilla-foreground"
                        : "text-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Thanh Lọc Kính Mờ */}
        <Card
          variant="surface"
          density="none"
          className="rounded-[22px] border border-border/90 bg-surface/95 p-4 shadow-2xs backdrop-blur-xs"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Segmented Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {statusTabs.map((tab) => {
                const active = filterStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setParam("status", tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-primary-light/60 hover:text-primary"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        active
                          ? "bg-surface/20 text-primary-foreground"
                          : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm + Sắp xếp + Chuyển chế độ xem */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-60 sm:flex-initial">
                <Search
                  animated={false}
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm tên khóa học..."
                  className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Xóa nội dung tìm kiếm"
                    onClick={() => commitSearchNow("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                aria-label="Sắp xếp khóa học"
                className="h-9 rounded-full border border-border bg-background px-3.5 text-xs font-semibold text-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="revenue">Doanh thu cao nhất</option>
                <option value="views">Lượt xem nhiều nhất</option>
                <option value="total_enrolls">Học viên nhiều nhất</option>
                <option value="rating_avg">Đánh giá cao nhất</option>
                <option value="created_at">Mới nhất</option>
              </select>

              <div
                className="inline-flex items-center rounded-full border border-border bg-background p-1"
                role="group"
                aria-label="Chế độ hiển thị"
              >
                <button
                  type="button"
                  onClick={() => setParam("view", "grid", { resetPage: false })}
                  aria-pressed={viewMode === "grid"}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-surface text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lưới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParam("view", "list", { resetPage: false })}
                  aria-pressed={viewMode === "list"}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-surface text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Danh sách</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                : "space-y-4"
            }
          >
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-[24px] p-0">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" title="Không thể tải danh sách khóa học">
            <div className="mt-3">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full"
                onClick={() => void mutate()}
              >
                Thử lại
              </Button>
            </div>
          </Alert>
        )}

        {/* Danh sách Khóa học (Lưới hoặc Danh sách ngang) */}
        {!isLoading && visibleCourses.length > 0 && (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                : "space-y-4"
            }
          >
            {visibleCourses.map((course) => {
              const revPct = Math.min(
                100,
                Math.max(
                  4,
                  Math.round(((course.revenue || 0) / metrics.maxRevenue) * 100),
                ),
              );
              const isGrid = viewMode === "grid";

              return (
                <Card
                  key={course.id}
                  density="none"
                  className="group overflow-hidden rounded-[24px] border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-md"
                >
                  <div
                    className={
                      isGrid
                        ? "flex h-full flex-col"
                        : "flex flex-col md:flex-row"
                    }
                  >
                    {/* Thumbnail 16:9 */}
                    <div
                      className={`relative aspect-video shrink-0 overflow-hidden bg-primary-light/50 ${
                        isGrid
                          ? "w-full border-b border-border/60"
                          : "w-full md:m-4 md:mr-0 md:w-72 md:self-start md:rounded-2xl md:border md:border-border/70"
                      }`}
                    >
                      <img
                        src={getImageUrl(course.thumbnail_url)}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Badge trạng thái góc trên trái */}
                      <div className="absolute left-3 top-3">
                        {getStatusBadge(
                          course.approval_status,
                          course.is_published,
                        )}
                      </div>

                      {/* Menu tùy chọn góc trên phải */}
                      <div className="absolute right-3 top-3 z-10">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              type="button"
                              aria-label="Tùy chọn khóa học"
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface/95 text-muted-foreground shadow-2xs backdrop-blur-xs transition-colors hover:text-primary cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenu.Trigger>

                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="z-50 min-w-[220px] rounded-2xl border border-primary-pastel bg-surface p-1.5 shadow-ambient-lg"
                              align="end"
                              sideOffset={5}
                            >
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-primary-light/70 hover:text-primary"
                                onClick={() =>
                                  router.push(
                                    `/lecturer/courses/${course.id}/edit`,
                                  )
                                }
                              >
                                <Pencil animated={false} className="h-4 w-4 text-primary" />
                                <span>Chỉnh sửa khóa học</span>
                              </DropdownMenu.Item>

                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-primary-light/70 hover:text-primary"
                                onClick={() =>
                                  router.push(
                                    `/lecturer/chapters?course_id=${course.id}`,
                                  )
                                }
                              >
                                <Layers animated={false} className="h-4 w-4 text-primary" />
                                <span>Chương và bài học</span>
                              </DropdownMenu.Item>

                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-primary-light/70 hover:text-primary"
                                onClick={() =>
                                  router.push(
                                    `/lecturer/resources?course_id=${course.id}`,
                                  )
                                }
                              >
                                <FolderOpen animated={false} className="h-4 w-4 text-primary" />
                                <span>Tài nguyên khóa học</span>
                              </DropdownMenu.Item>

                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-primary-light/70 hover:text-primary"
                                onClick={() =>
                                  router.push(
                                    `/lecturer/quizzes-lesson?course_id=${course.id}`,
                                  )
                                }
                              >
                                <CircleHelp animated={false} className="h-4 w-4 text-primary" />
                                <span>Câu hỏi trắc nghiệm</span>
                              </DropdownMenu.Item>

                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-primary-light/70 hover:text-primary"
                                onClick={() =>
                                  router.push(`/course/${course.slug}`)
                                }
                              >
                                <Eye animated={false} className="h-4 w-4 text-primary" />
                                <span>Xem trang học viên</span>
                              </DropdownMenu.Item>

                              <DropdownMenu.Separator className="my-1 h-px bg-border" />

                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive-foreground outline-none transition-colors hover:bg-destructive-bg"
                                onClick={() => setCourseToDelete(course.id)}
                              >
                                <Trash2 animated={false} className="h-4 w-4" />
                                <span>Xóa khóa học</span>
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>

                      {/* Pill cấu trúc chương/bài + Giá Coin nổi góc dưới ảnh */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/95 px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-2xs backdrop-blur-xs">
                          <BookOpen
                            animated={false}
                            className="h-3 w-3 text-primary"
                            aria-hidden="true"
                          />
                          {course.sections_count} chương · {course.lessons_count}{" "}
                          bài
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/95 px-2.5 py-0.5 text-[11px] font-bold text-warning-foreground shadow-2xs">
                          {course.base_price === 0 ? (
                            "Miễn phí"
                          ) : (
                            <>
                              <Coins
                                animated={false}
                                className="h-3 w-3 text-[#C98A2C]"
                                aria-hidden="true"
                              />
                              {formatVndAsCoin(course.base_price)}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Nội dung thẻ */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate rounded-full bg-primary-light/60 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            {course.category?.name || "Chưa phân loại"}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-foreground tabular-nums">
                            <Star
                              animated={false}
                              className="h-3.5 w-3.5 fill-current text-accent-vanilla-foreground"
                              aria-hidden="true"
                            />
                            {course.rating_avg.toFixed(1)}
                          </span>
                        </div>

                        <Link
                          href={`/lecturer/courses/${course.id}/edit`}
                          className="block font-display text-lg font-semibold leading-snug text-foreground transition-colors hover:text-primary line-clamp-2"
                        >
                          {course.title}
                        </Link>

                        {course.approval_status === "rejected" && (
                          <div className="space-y-2 rounded-2xl border border-destructive-border/80 bg-destructive-bg/65 p-3 text-xs text-destructive-foreground">
                            <p className="flex items-center gap-1.5 font-bold">
                              <AlertTriangle
                                animated={false}
                                className="h-3.5 w-3.5 shrink-0"
                              />
                              Cần chỉnh sửa (Vòng #{course.review_round || 1})
                            </p>
                            {course.approval_note && (
                              <p className="line-clamp-2 text-[11px] leading-relaxed opacity-90">
                                {course.approval_note}
                              </p>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              fullWidth
                              disabled={resubmittingId === course.id}
                              onClick={() => void handleResubmitCourse(course.id)}
                              leftIcon={
                                <RefreshCw
                                  className={`h-3.5 w-3.5 ${
                                    resubmittingId === course.id
                                      ? "animate-spin"
                                      : ""
                                  }`}
                                />
                              }
                            >
                              {resubmittingId === course.id
                                ? "Đang gửi..."
                                : "Đã sửa xong · Gửi duyệt lại"}
                            </Button>
                          </div>
                        )}

                        {/* 3 chỉ số nhỏ + Doanh thu Coin vàng */}
                        <div className="rounded-2xl border border-border/80 bg-background/70 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Users
                                  animated={false}
                                  className="h-3.5 w-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                <strong className="text-foreground tabular-nums">
                                  {formatNumber(course.total_enrolls)}
                                </strong>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Eye
                                  animated={false}
                                  className="h-3.5 w-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                <strong className="text-foreground tabular-nums">
                                  {formatNumber(course.views)}
                                </strong>
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-1 font-display text-base font-bold tabular-nums text-warning-foreground">
                              <Coins
                                animated={false}
                                className="h-4 w-4 text-[#C98A2C]"
                                aria-hidden="true"
                              />
                              {formatVndAsCoin(course.revenue)}
                            </div>
                          </div>

                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full bg-[#C98A2C]/80 transition-all duration-300"
                              style={{ width: `${revPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Lối tắt nội dung bên trong khóa học: Chương bài · Tài nguyên · Câu hỏi */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <Link
                            href={`/lecturer/chapters?course_id=${course.id}`}
                            className="flex items-center justify-center gap-1 rounded-xl border border-primary-pastel/70 bg-primary-light/40 px-2 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-light"
                          >
                            <Layers animated={false} className="h-3 w-3 shrink-0" />
                            <span className="truncate">Chương bài</span>
                          </Link>
                          <Link
                            href={`/lecturer/resources?course_id=${course.id}`}
                            className="flex items-center justify-center gap-1 rounded-xl border border-secondary-pastel/70 bg-secondary-light/40 px-2 py-1.5 text-[11px] font-semibold text-secondary-foreground transition-colors hover:bg-secondary-light"
                          >
                            <FolderOpen animated={false} className="h-3 w-3 shrink-0" />
                            <span className="truncate">Tài nguyên</span>
                          </Link>
                          <Link
                            href={`/lecturer/quizzes-lesson?course_id=${course.id}`}
                            className="flex items-center justify-center gap-1 rounded-xl border border-accent-vanilla-border/70 bg-accent-vanilla/50 px-2 py-1.5 text-[11px] font-semibold text-warning-foreground transition-colors hover:bg-accent-vanilla"
                          >
                            <CircleHelp animated={false} className="h-3 w-3 shrink-0" />
                            <span className="truncate">Câu hỏi</span>
                          </Link>
                        </div>
                      </div>

                      {/* Footer hành động */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="pastel"
                            size="sm"
                            className="rounded-full text-xs"
                            onClick={() =>
                              router.push(`/lecturer/courses/${course.id}/users`)
                            }
                            leftIcon={<Users className="h-3.5 w-3.5" />}
                          >
                            Học viên
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs"
                            onClick={() =>
                              router.push(`/lecturer/courses/${course.id}/stats`)
                            }
                            leftIcon={<BarChart3 className="h-3.5 w-3.5" />}
                          >
                            Thống kê
                          </Button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-xs text-primary"
                          onClick={() =>
                            router.push(`/lecturer/courses/${course.id}/edit`)
                          }
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                        >
                          Sửa
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && visibleCourses.length === 0 && (
          <Card variant="surface" className="rounded-[24px] p-10">
            <EmptyState
              icon={<GraduationCap className="h-10 w-10 text-primary" />}
              title={
                search || filterStatus !== "all"
                  ? "Không tìm thấy khóa học phù hợp"
                  : "Chưa có khóa học nào"
              }
              description={
                search || filterStatus !== "all"
                  ? "Hãy thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
                  : "Bắt đầu thiết kế khóa học đầu tiên để chia sẻ kiến thức và tạo nguồn thu nhập bền vững."
              }
              action={
                search || filterStatus !== "all" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setSearchInput("");
                      resetParams();
                    }}
                  >
                    Đặt lại bộ lọc
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    className="rounded-full"
                    onClick={() => router.push("/lecturer/courses/create")}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Tạo khóa học mới
                  </Button>
                )
              }
            />
          </Card>
        )}

        {/* Phân trang */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              aria-label="Trang trước"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {[...Array(Math.min(5, data.pagination.total_pages))].map((_, i) => {
              let pageNum: number;
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
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-10 min-w-10 rounded-full px-3.5 text-sm font-semibold tabular-nums transition-colors cursor-pointer ${
                    page === pageNum
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-surface text-foreground hover:border-primary-pastel hover:text-primary"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              aria-label="Trang sau"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.pagination.total_pages}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal xóa khóa học */}
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
    <div className="fixed inset-0 z-[1000] flex h-screen w-screen items-center justify-center p-4">
      <div
        className="absolute inset-0 h-screen w-screen bg-foreground/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[26px] border border-border bg-surface shadow-ambient-lg">
        <div className="border-b border-destructive-border bg-destructive-bg/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-destructive-border bg-surface text-destructive-foreground">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground">
                Xóa khóa học
              </h3>
              <p className="mt-0.5 text-xs text-destructive-foreground">
                Hành động này cần xác nhận trước khi thực hiện
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {hasEnrolls ? (
            <div className="rounded-2xl border border-destructive-border bg-destructive-bg/60 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-destructive-border bg-surface text-destructive-foreground">
                  <XCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2 text-sm text-foreground">
                  <p className="text-base font-bold text-destructive-foreground">
                    Không thể tự xóa khóa học này
                  </p>
                  <p>
                    Khóa học này đã có{" "}
                    <strong className="text-destructive-foreground">
                      {course.total_enrolls}
                    </strong>{" "}
                    học viên đăng ký.
                  </p>
                  <div className="rounded-xl border border-destructive-border/70 bg-surface p-3.5 text-xs text-muted-foreground">
                    <strong className="mb-1 block text-foreground">
                      Quy định bảo vệ quyền lợi học viên
                    </strong>
                    Để đảm bảo quyền lợi học viên đã đăng ký, vui lòng liên hệ
                    Quản trị viên để được hỗ trợ xử lý.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Khóa học sẽ xóa
                </p>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  {course.title}
                </p>
              </div>

              <Alert
                variant="destructive"
                title="Cảnh báo nghiêm trọng"
                className="mb-4"
              >
                <div className="space-y-1 text-xs">
                  <p className="font-semibold">
                    Hành động này không thể hoàn tác!
                  </p>
                  <p>• Khóa học cùng toàn bộ bài học và tài liệu sẽ bị xóa vĩnh viễn.</p>
                </div>
              </Alert>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Lý do xóa khóa học{" "}
                  <span className="text-destructive-foreground">*</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ví dụ: Khóa học không còn phù hợp, cần thay thế bằng giáo trình mới..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-destructive-foreground focus:outline-none focus:ring-2 focus:ring-destructive-border"
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-background/70 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {hasEnrolls ? "Đóng" : "Hủy"}
          </Button>
          {!hasEnrolls && (
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
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
  );

  return createPortal(modalContent, document.body);
}

export default LecturerCourses;
