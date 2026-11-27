"use client";

import { Button, Card, Input, Select } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useDebouncedUrlSearch, useUrlQueryState } from "@/hooks/useUrlQueryState";
import type { CatalogOptions } from "@/types/catalog";
import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  SlidersHorizontal,
  RefreshCw,
  Search,
  ArrowUpDown,
  X,
  ChevronLeft,
  ChevronRight,
} from "pulsoicon-react";

import { CourseSkeletonGrid } from "../my-learning/course-skeleton-grid";
import { CourseEmptyState, CourseErrorState } from "../my-learning/empty-states";
import type {
  FavouriteCoursesResponse,
  FavouriteLevel,
  FavouriteSortField,
} from "@/types/user/favourites";
import { FavoriteCard } from "./favorite-card";

const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

const SORT_OPTIONS = [
  { value: "created_at", label: "Thời gian thêm" },
  { value: "title", label: "Tên khóa học" },
  { value: "rating_avg", label: "Đánh giá" },
  { value: "views", label: "Lượt xem" },
] as const;

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

const fetchFavourites = async (url: string) => {
  const response = await api.get<FavouriteCoursesResponse>(url);
  return response.data;
};

const fetchCatalogFilters = async () => {
  const response = await api.get<CatalogOptions>("/catalog/filters");
  return response.data;
};

const FAVORITES_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  size: { type: "number", default: 10, min: 1, max: 100 },
  sort_by: {
    type: "string",
    default: "created_at" as FavouriteSortField,
    allowed: ["created_at", "title", "rating_avg", "views"] as const,
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
    default: "" as "" | FavouriteLevel,
    allowed: ["", "beginner", "intermediate", "advanced"] as const,
  },
  language: {
    type: "string",
    default: "",
    allowed: ["", "vi", "en"] as const,
  },
} as const;

export const FavoritesPanel = () => {
  const { values, setParam, resetParams } = useUrlQueryState(
    FAVORITES_QUERY_SCHEMA,
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
  } = values;

  const {
    inputValue: keyword,
    setInputValue: setKeyword,
    commitNow: commitKeywordNow,
  } = useDebouncedUrlSearch(debouncedKeyword, (val) => setParam("search", val));

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

  const swrKey = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort_by: sortBy,
      order: sortOrder,
    });
    if (debouncedKeyword) params.set("keyword", debouncedKeyword);
    if (subjectId) params.set("subject_id", subjectId);
    if (gradeId) params.set("grade_id", gradeId);
    if (level) params.set("level", level);
    if (language) params.set("language", language);
    return `favourites?${params.toString()}`;
  }, [
    page,
    size,
    sortBy,
    sortOrder,
    debouncedKeyword,
    subjectId,
    gradeId,
    level,
    language,
  ]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<FavouriteCoursesResponse>(swrKey, fetchFavourites, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const favourites = data?.favourites ?? [];
  const total = data?.total ?? 0;
  const isBusy = isLoading || isValidating;
  const isInitialLoading = isLoading && !data;

  useEffect(() => {
    if (!total) return;
    const maxPage = Math.max(1, Math.ceil(total / size));
    if (page > maxPage) setParam("page", maxPage);
  }, [total, size, page, setParam]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size]);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || null;
  }, [error]);

  const toggleSortOrder = useCallback(() => {
    setParam("order", sortOrder === "desc" ? "asc" : "desc");
  }, [setParam, sortOrder]);

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
      {/* Filters */}
      <Card className="rounded-[24px] p-5 md:p-6 border-border bg-surface shadow-xs mb-6">
        <div className="flex flex-col md:flex-row gap-3.5">
          {/* Search */}
          <div className="flex-1">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm khóa học..."
              leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
              rightIcon={
                keyword ? (
                  <button
                    type="button"
                    aria-label="Xóa nội dung tìm kiếm"
                    onClick={() => commitKeywordNow("")}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary-light/50 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onChange={(e) => setParam("sort_by", e.target.value as FavouriteSortField)}
              aria-label="Tiêu chí sắp xếp"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={toggleSortOrder}
              disabled={isBusy}
              className="shrink-0 px-3"
              aria-label="Đổi chiều sắp xếp"
            >
              <ArrowUpDown
                className={`h-4 w-4 transition-transform ${
                  sortOrder === "asc" ? "rotate-180 text-primary" : "text-muted-foreground"
                }`}
              />
            </Button>
          </div>

          {/* Page Size */}
          <Select
            value={size}
            onChange={(e) => setParam("size", Number(e.target.value))}
            aria-label="Số khóa học mỗi trang"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}/trang
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4 pt-4 border-t border-border/70">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Môn học
            </span>
            <Select
              value={subjectId}
              onChange={(e) => setParam("subject", e.target.value)}
            >
              <option value="">
                {isLoadingCatalogFilters ? "Đang tải..." : "Tất cả môn học"}
              </option>
              {subjectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span>Khối lớp</span>
            <Select
              value={gradeId}
              onChange={(e) => setParam("grade", e.target.value)}
            >
              <option value="">
                {isLoadingCatalogFilters ? "Đang tải..." : "Tất cả khối lớp"}
              </option>
              {gradeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span>Cấp độ</span>
            <Select
              value={level}
              onChange={(e) => setParam("level", e.target.value as "" | FavouriteLevel)}
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span>Ngôn ngữ</span>
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
          </label>
        </div>

        {(subjectId || gradeId || level || language || keyword || debouncedKeyword) && (
          <div className="mt-4 pt-4 border-t border-border/70">
            <Button
              type="button"
              variant="pastel"
              size="sm"
              onClick={clearFilters}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </Card>

      {/* Loading State */}
      {isInitialLoading && <CourseSkeletonGrid count={Math.min(size, 6)} />}

      {/* Error State */}
      {error && (
        <CourseErrorState
          message={errorMessage || "Đã xảy ra lỗi khi tải danh sách yêu thích."}
          onRetry={() => mutate(undefined, { revalidate: true })}
        />
      )}

      {/* Courses Grid */}
      {!isInitialLoading && !error && favourites.length > 0 && (
        <div className="mb-8 user-card-grid">
          {favourites.map((course) => (
            <FavoriteCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isInitialLoading && !error && favourites.length === 0 && (
        <CourseEmptyState
          content={{
            title: "Bạn chưa yêu thích khóa học nào",
            description: "Khám phá kho khóa học phong phú và nhấn trái tim để lưu những khóa học bạn thích.",
            actionHref: "/courses",
            actionLabel: "Khám phá khóa học",
          }}
        />
      )}

      {/* Pagination */}
      {!isInitialLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            aria-label="Trang trước"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isBusy}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }

            return (
              <button
                key={i}
                onClick={() => handlePageChange(pageNum)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                  page === pageNum
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-surface text-foreground hover:bg-primary-light/60"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            aria-label="Trang sau"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || isBusy}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
};


