"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowUpDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "pulsoicon-react";
import { Button, Card, Input, Select } from "@/components/ui";
import { useDebouncedUrlSearch, useUrlQueryState } from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type { CatalogOptions } from "@/types/catalog";
import GiftTransferDialog from "../learning_detail/header/gift-transfer-dialog";
import type {
  CoursesMeItem,
  CoursesMeResponse,
  CoursesMeSortField,
  CoursesMeVariant,
  LearningListItem,
} from "@/types/user/courses-me";
import { CourseCard } from "./course-card";
import { CourseSkeletonGrid } from "./course-skeleton-grid";
import { CourseEmptyState, CourseErrorState } from "./empty-states";
import { PaginationControls } from "./pagination-controls";

const fetchCourses = async (url: string) => {
  const response = await api.get<CoursesMeResponse>(url);
  return response.data;
};

const fetchCatalogFilters = async () => {
  const response = await api.get<CatalogOptions>("/catalog/filters");
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

const COURSE_LIST_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  size: { type: "number", default: 9, min: 1, max: 100 },
  sort_by: {
    type: "string",
    default: "enrolled_at" as CoursesMeSortField,
    allowed: [
      "enrolled_at",
      "progress",
      "title",
      "created_at",
      "rating_avg",
      "views",
    ] as const,
  },
  order: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
  search: { type: "string", default: "" as string, trim: true },
  subject: { type: "string", default: "" as string },
  grade: { type: "string", default: "" as string },
  level: {
    type: "string",
    default: "" as "" | LevelKey,
    allowed: ["", "beginner", "intermediate", "advanced"] as const,
  },
  language: {
    type: "string",
    default: "",
    allowed: ["", "vi", "en"] as const,
  },
  status: {
    type: "string",
    default: "all" as StatusFilterTab,
    allowed: ["all", "in_progress", "completed", "not_started"] as const,
  },
} as const;

interface CourseListPanelProps {
  archived?: boolean;
  selectedListId?: string | null;
  layout?: "grid" | "list";
  learningLists?: LearningListItem[];
  onStatsChange?: (stats: {
    total: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  }) => void;
  onArchivedCountChange?: (count: number) => void;
  onArchiveMutated?: () => void;
  onCockpitRefresh?: () => void;
}

export const CourseListPanel = ({
  archived = false,
  selectedListId = null,
  layout = "grid",
  learningLists = [],
  onStatsChange,
  onArchivedCountChange,
  onArchiveMutated,
  onCockpitRefresh,
}: CourseListPanelProps) => {
  const { values, setParam, resetParams } = useUrlQueryState(
    COURSE_LIST_QUERY_SCHEMA,
  );
  const {
    page,
    size,
    sort_by: sortBy,
    order: sortOrder,
    search: debouncedKeyword,
    subject: subjectId,
    grade: gradeId,
    level,
    language,
    status: statusTab,
  } = values;

  const {
    inputValue: keyword,
    setInputValue: setKeyword,
    commitNow: commitKeywordNow,
  } = useDebouncedUrlSearch(debouncedKeyword, (val) => setParam("search", val));

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() =>
    Boolean(subjectId || gradeId || level || language),
  );
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [giftCourse, setGiftCourse] = useState<CoursesMeItem | null>(null);

  // Lấy danh sách Môn học & Khối lớp chuẩn hóa
  const { data: catalogFilters, isLoading: isLoadingCatalogFilters } =
    useSWR<CatalogOptions>("/catalog/filters", fetchCatalogFilters, {
      revalidateOnFocus: false,
    });

  const subjectOptions = useMemo(() => {
    if (!catalogFilters?.subjects) return [];
    return catalogFilters.subjects.map((sub) => ({
      value: sub.id,
      label: sub.name,
    }));
  }, [catalogFilters?.subjects]);

  const gradeOptions = useMemo(() => {
    if (!catalogFilters?.grades) return [];
    return catalogFilters.grades.map((grade) => ({
      value: grade.id,
      label: grade.name,
    }));
  }, [catalogFilters?.grades]);

  // Query Key cho SWR
  const swrKey = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort_by: sortBy,
      order: sortOrder,
      archived: archived ? "true" : "false",
    });
    if (selectedListId && !archived) params.set("list_id", selectedListId);
    if (debouncedKeyword) params.set("keyword", debouncedKeyword);
    if (subjectId) params.set("subject_id", subjectId);
    if (gradeId) params.set("grade_id", gradeId);
    if (level) params.set("level", level);
    if (language) params.set("language", language);
    return `${BASE_PATH}?${params.toString()}`;
  }, [
    page,
    size,
    sortBy,
    sortOrder,
    archived,
    selectedListId,
    debouncedKeyword,
    subjectId,
    gradeId,
    level,
    language,
  ]);

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

  // Đồng bộ số lượng khóa đã lưu trữ lên header
  useEffect(() => {
    if (typeof data?.archived_count === "number") {
      onArchivedCountChange?.(data.archived_count);
    }
  }, [data?.archived_count, onArchivedCountChange]);

  const handleToggleArchive = useCallback(
    async (course: CoursesMeItem) => {
      if (archivingId) return;
      setArchivingId(course.id);
      const nextArchived = !archived;
      try {
        await api.post(`/learning/player/${course.id}/archive`, {
          archived: nextArchived,
        });
        showToast.success(
          nextArchived
            ? `Đã chuyển “${course.title}” vào Kho lưu trữ.`
            : `Đã khôi phục “${course.title}” về danh sách đang học.`,
        );
        await mutate();
        onArchiveMutated?.();
        onCockpitRefresh?.();
      } catch {
        showToast.error("Không thể cập nhật trạng thái lưu trữ lúc này.");
      } finally {
        setArchivingId(null);
      }
    },
    [archived, archivingId, mutate, onArchiveMutated, onCockpitRefresh],
  );

  const handleTogglePin = useCallback(
    async (course: CoursesMeItem) => {
      if (pinningId) return;
      setPinningId(course.id);
      try {
        const res = await api.post<{ is_pinned: boolean }>(`/purchases/courses/${course.id}/pin`);
        showToast.success(
          res.data.is_pinned
            ? `Đã ghim “${course.title}” lên đầu danh sách!`
            : `Đã bỏ ghim “${course.title}”.`,
        );
        await mutate();
        onCockpitRefresh?.();
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        showToast.error(
          typeof detail === "string" && detail.trim() ? detail : "Không thể ghim khóa học lúc này.",
        );
      } finally {
        setPinningId(null);
      }
    },
    [pinningId, mutate, onCockpitRefresh],
  );

  const handleToggleCourseInList = useCallback(
    async (listId: string, courseId: string) => {
      try {
        const res = await api.post<{ in_list: boolean }>(
          `/purchases/lists/${listId}/courses/${courseId}`,
        );
        showToast.success(
          res.data.in_list ? "Đã thêm khóa học vào tủ sách." : "Đã gỡ khóa học khỏi tủ sách.",
        );
        await mutate();
        onCockpitRefresh?.();
      } catch {
        showToast.error("Không thể cập nhật tủ sách lúc này.");
      }
    },
    [mutate, onCockpitRefresh],
  );

  // Cập nhật thống kê nhanh cho Header (chỉ khi ở tab Đang học)
  useEffect(() => {
    if (archived || !rawCourses || !onStatsChange) return;
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
    setParam("order", sortOrder === "desc" ? "asc" : "desc");
  }, [setParam, sortOrder]);

  const hasActiveFilters = Boolean(
    keyword ||
      debouncedKeyword ||
      subjectId ||
      gradeId ||
      level ||
      language ||
      statusTab !== "all"
  );

  const clearFilters = useCallback(() => {
    setKeyword("");
    resetParams();
  }, [resetParams, setKeyword]);

  const handlePageChange = (newPage: number) => {
    setParam("page", newPage);
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
              onClick={() => setParam("status", "all")}
              className="rounded-full text-xs"
            >
              Tất cả khóa học
            </Button>
            <Button
              variant={statusTab === "in_progress" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setParam("status", "in_progress")}
              className="rounded-full text-xs"
            >
              Đang học
            </Button>
            <Button
              variant={statusTab === "completed" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setParam("status", "completed")}
              className="rounded-full text-xs"
            >
              Đã hoàn thành
            </Button>
            <Button
              variant={statusTab === "not_started" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setParam("status", "not_started")}
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
                    onClick={() => commitKeywordNow("")}
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
                  setParam(
                    "sort_by",
                    e.target.value as (typeof COURSE_LIST_QUERY_SCHEMA.sort_by.allowed)[number]
                  )
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
              onChange={(e) => setParam("size", Number(e.target.value))}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4 pt-4 border-t border-border/70 animate-in fade-in duration-200">
            {/* Lọc Môn học */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Môn học
              </label>
              <Select
                value={subjectId}
                onChange={(e) => setParam("subject", e.target.value)}
              >
                <option value="">
                  {isLoadingCatalogFilters
                    ? "Đang tải môn học..."
                    : "Tất cả môn học"}
                </option>
                {subjectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Lọc Khối lớp */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Khối lớp
              </label>
              <Select
                value={gradeId}
                onChange={(e) => setParam("grade", e.target.value)}
              >
                <option value="">
                  {isLoadingCatalogFilters
                    ? "Đang tải khối lớp..."
                    : "Tất cả khối lớp"}
                </option>
                {gradeOptions.map((opt) => (
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
                onChange={(e) => setParam("level", e.target.value as "" | LevelKey)}
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
                onChange={(e) =>
                  setParam("language", e.target.value as "" | "vi" | "en")
                }
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
          <div
            className={
              layout === "list"
                ? "mb-8 flex flex-col gap-4"
                : "mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            }
          >
            {displayedCourses.map((course: CoursesMeItem) => (
              <CourseCard
                key={course.id}
                course={course}
                variant={VARIANT}
                layout={layout}
                isArchived={archived}
                isArchiving={archivingId === course.id}
                isPinning={pinningId === course.id}
                learningLists={learningLists}
                onTogglePin={(item) => void handleTogglePin(item)}
                onToggleArchive={(item) => void handleToggleArchive(item)}
                onOpenGift={archived ? undefined : (item) => setGiftCourse(item)}
                onToggleCourseInList={(listId, cid) => void handleToggleCourseInList(listId, cid)}
              />
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
              : archived
                ? {
                    title: "Kho lưu trữ đang trống",
                    description:
                      "Các khóa học bạn chọn lưu trữ từ trang học bài hoặc thẻ khóa học sẽ nằm gọn tại đây để bạn khôi phục bất cứ lúc nào.",
                  }
                : {
                    title: "Bạn chưa sở hữu khóa học nào",
                    description:
                      "Khám phá ngay kho tàng tri thức phong phú trên Mây Mây để bắt đầu lộ trình bứt phá điểm số nhé!",
                    actionHref: "/courses",
                    actionLabel: "Khám phá khóa học ngay",
                  }
          }
        />
      )}

      {giftCourse && (
        <GiftTransferDialog
          open={Boolean(giftCourse)}
          courseId={giftCourse.id}
          courseTitle={giftCourse.title}
          onClose={() => setGiftCourse(null)}
          onTransferred={() => {
            setGiftCourse(null);
            void mutate();
          }}
        />
      )}
    </>
  );
};
