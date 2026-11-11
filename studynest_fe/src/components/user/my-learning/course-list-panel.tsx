"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowUpDown,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button, Card, Input, Select } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  CoursesMeCategory,
  CoursesMeItem,
  CoursesMeResponse,
  CoursesMeSortField,
  CoursesMeVariant,
} from "@/types/user/courses-me";
import { CourseCard } from "./course-card";
import { CourseSkeletonGrid } from "./course-skeleton-grid";
import { CourseEmptyState, CourseErrorState } from "./empty-states";
import { PaginationControls } from "./pagination-controls";

const fetchCourses = async (url: string) => {
  const response = await api.get<CoursesMeResponse>(url);
  return response.data;
};

const fetchCategories = async () => {
  const response = await api.get<CoursesMeCategory[]>("categories/all");
  return response.data;
};

type LevelKey = "beginner" | "intermediate" | "advanced";
type StatusFilterTab = "all" | "in_progress" | "completed" | "not_started";

const SORT_OPTIONS: { value: CoursesMeSortField; label: string }[] = [
  { value: "enrolled_at", label: "Thời gian đăng ký" },
  { value: "progress", label: "Tiến độ học tập" },
  { value: "title", label: "Tên khóa học (A-Z)" },
  { value: "created_at", label: "Thời gian tạo" },
  { value: "rating_avg", label: "Đánh giá cao nhất" },
  { value: "views", label: "Lượt xem" },
];

const PAGE_SIZE_OPTIONS = [9, 18, 27] as const;

const LEVEL_OPTIONS = [
  { value: "", label: "Tất cả cấp độ" },
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "", label: "Tất cả ngôn ngữ" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
] as const;

const BASE_PATH = "purchases/courses";
const VARIANT: CoursesMeVariant = "purchased";

interface CourseListPanelProps {
  onStatsChange?: (stats: {
    total: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  }) => void;
}

export const CourseListPanel = ({ onStatsChange }: CourseListPanelProps) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(9);
  const [sortBy, setSortBy] = useState<CoursesMeSortField>("enrolled_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState<"" | LevelKey>("");
  const [language, setLanguage] = useState("");
  const [statusTab, setStatusTab] = useState<StatusFilterTab>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Lấy danh mục khóa học
  const { data: categoriesData, isLoading: isLoadingCategories } = useSWR<
    CoursesMeCategory[]
  >("categories/all", fetchCategories, {
    revalidateOnFocus: false,
  });

  const categoryOptions = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.map((cat) => ({ value: cat.id, label: cat.name }));
  }, [categoriesData]);

  // Debounce ô tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Tự động về trang 1 khi thay đổi bất kỳ bộ lọc nào
  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, sortBy, sortOrder, size, categoryId, level, language, statusTab]);

  // Query Key cho SWR
  const swrKey = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort_by: sortBy,
      order: sortOrder,
    });
    if (debouncedKeyword) params.set("keyword", debouncedKeyword);
    if (categoryId) params.set("category_id", categoryId);
    if (level) params.set("level", level);
    if (language) params.set("language", language);
    return `${BASE_PATH}?${params.toString()}`;
  }, [page, size, sortBy, sortOrder, debouncedKeyword, categoryId, level, language]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<CoursesMeResponse>(swrKey, fetchCourses, {
      keepPreviousData: true,
      revalidateOnFocus: false,
    });

  const rawCourses = useMemo(() => data?.courses ?? [], [data?.courses]);
  const total = data?.total ?? 0;
  const isBusy = isLoading || isValidating;
  const isInitialLoading = isLoading && !data;

  // Lọc theo Status Tab (Tất cả / Đang học / Đã hoàn thành / Chưa học)
  const displayedCourses = useMemo(() => {
    if (statusTab === "all") return rawCourses;
    return rawCourses.filter((course: CoursesMeItem) => {
      const progress = Math.round(course.progress_percent || 0);
      if (statusTab === "completed") return progress === 100;
      if (statusTab === "in_progress") return progress > 0 && progress < 100;
      if (statusTab === "not_started") return progress === 0;
      return true;
    });
  }, [rawCourses, statusTab]);

  // Cập nhật thống kê nhanh cho Header
  useEffect(() => {
    if (!rawCourses || !onStatsChange) return;
    const completedCount = rawCourses.filter(
      (c) => Math.round(c.progress_percent || 0) === 100
    ).length;
    const inProgressCount = rawCourses.filter((c) => {
      const p = Math.round(c.progress_percent || 0);
      return p > 0 && p < 100;
    }).length;
    const totalProgress = rawCourses.reduce(
      (acc, c) => acc + Math.round(c.progress_percent || 0),
      0
    );
    const avgProgress =
      rawCourses.length > 0 ? Math.round(totalProgress / rawCourses.length) : 0;

    onStatsChange({
      total,
      inProgress: inProgressCount,
      completed: completedCount,
      avgProgress,
    });
  }, [rawCourses, total, onStatsChange]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / size)),
    [total, size]
  );

  const visibleRange = useMemo(() => {
    if (!total) return "Chưa có khóa học nào";
    const start = (page - 1) * size + 1;
    const end = Math.min(total, page * size);
    return `Hiển thị ${start}–${end} trên tổng số ${total} khóa học`;
  }, [page, size, total]);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return (
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || null
    );
  }, [error]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  }, []);

  const hasActiveFilters = Boolean(
    keyword || categoryId || level || language || statusTab !== "all"
  );

  const clearFilters = useCallback(() => {
    setKeyword("");
    setDebouncedKeyword("");
    setCategoryId("");
    setLevel("");
    setLanguage("");
    setStatusTab("all");
    setSortBy("enrolled_at");
    setSortOrder("desc");
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Thanh Điều Khiển & Bộ Lọc Chuẩn Cloudy Blue */}
      <Card className="rounded-[24px] border-border bg-surface p-5 md:p-6 shadow-xs mb-8">
        {/* Hàng 1: Quick Status Tabs & Toggle Bộ Lọc Nâng Cao */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-5 border-b border-border/70">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Button
              variant={statusTab === "all" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("all")}
              className="rounded-full text-xs"
            >
              Tất cả khóa học
            </Button>
            <Button
              variant={statusTab === "in_progress" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("in_progress")}
              className="rounded-full text-xs"
            >
              Đang học
            </Button>
            <Button
              variant={statusTab === "completed" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("completed")}
              className="rounded-full text-xs"
            >
              Đã hoàn thành
            </Button>
            <Button
              variant={statusTab === "not_started" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("not_started")}
              className="rounded-full text-xs"
            >
              Chưa bắt đầu
            </Button>
          </div>

          {/* Nút bật/tắt bộ lọc bổ sung */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-destructive-foreground"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Đặt lại
              </Button>
            )}

            <Button
              variant={showAdvancedFilters ? "pastel" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className="text-xs"
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              {showAdvancedFilters ? "Thu gọn lọc" : "Lọc chi tiết"}
            </Button>
          </div>
        </div>

        {/* Hàng 2: Ô tìm kiếm, Sắp xếp và Số lượng trên trang */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Ô Tìm kiếm */}
          <div className="md:col-span-6">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm theo tên khóa học..."
              leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
              rightIcon={
                keyword ? (
                  <button
                    type="button"
                    onClick={() => setKeyword("")}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary-light/50 transition-colors"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Sắp xếp tiêu chí */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as CoursesMeSortField)
                }
                aria-label="Tiêu chí sắp xếp"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Nút Đổi chiều sắp xếp */}
            <Button
              variant="outline"
              size="md"
              onClick={toggleSortOrder}
              disabled={isBusy}
              aria-label={
                sortOrder === "desc"
                  ? "Sắp xếp giảm dần (bấm để đổi tăng dần)"
                  : "Sắp xếp tăng dần (bấm để đổi giảm dần)"
              }
              title={
                sortOrder === "desc" ? "Thứ tự: Giảm dần" : "Thứ tự: Tăng dần"
              }
              className="shrink-0 px-3"
            >
              <ArrowUpDown
                className={`w-4 h-4 transition-transform ${
                  sortOrder === "asc" ? "rotate-180 text-primary" : "text-muted-foreground"
                }`}
              />
            </Button>
          </div>

          {/* Kích thước trang */}
          <div className="md:col-span-2">
            <Select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Số khóa học mỗi trang"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} khóa/trang
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Hàng 3: Bộ lọc chi tiết (Collapsible) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4 pt-4 border-t border-border/70 animate-in fade-in duration-200">
            {/* Lọc Danh mục */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Danh mục môn học
              </label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">
                  {isLoadingCategories
                    ? "Đang tải danh mục..."
                    : "Tất cả danh mục"}
                </option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Lọc Cấp độ */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Cấp độ khóa học
              </label>
              <Select
                value={level}
                onChange={(e) => setLevel(e.target.value as "" | LevelKey)}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Lọc Ngôn ngữ */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Ngôn ngữ giảng dạy
              </label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Card>

      {/* Trạng thái Đang tải ban đầu */}
      {isInitialLoading && <CourseSkeletonGrid count={Math.min(size, 6)} />}

      {/* Trạng thái Báo lỗi */}
      {error && (
        <CourseErrorState
          message={
            errorMessage ||
            "Không thể kết nối đến máy chủ để tải danh sách khóa học của bạn."
          }
          onRetry={() => mutate(undefined, { revalidate: true })}
        />
      )}

      {/* Lưới danh sách khóa học */}
      {!isInitialLoading && !error && displayedCourses.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayedCourses.map((course: CoursesMeItem) => (
              <CourseCard key={course.id} course={course} variant={VARIANT} />
            ))}
          </div>

          {/* Phân trang */}
          <PaginationControls
            page={page}
            totalPages={totalPages}
            visibleRangeLabel={visibleRange}
            onPrev={() => handlePageChange(page - 1)}
            onNext={() => handlePageChange(page + 1)}
            onPageChange={handlePageChange}
            isBusy={isBusy}
          />
        </>
      )}

      {/* Trạng thái Rỗng */}
      {!isInitialLoading && !error && displayedCourses.length === 0 && (
        <CourseEmptyState
          content={
            hasActiveFilters
              ? {
                  title: "Không tìm thấy khóa học phù hợp",
                  description:
                    "Không có khóa học nào khớp với bộ lọc hoặc từ khóa bạn vừa chọn. Hãy thử điều chỉnh hoặc đặt lại bộ lọc.",
                  onResetFilters: clearFilters,
                }
              : {
                  title: "Bạn chưa sở hữu khóa học nào",
                  description:
                    "Khám phá ngay kho tàng tri thức THPT phong phú trên Mây Mây để bắt đầu lộ trình bứt phá điểm số nhé!",
                  actionHref: "/courses",
                  actionLabel: "Khám phá khóa học ngay",
                }
          }
        />
      )}
    </>
  );
};
