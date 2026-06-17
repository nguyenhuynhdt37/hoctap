"use client";

import api from "@/lib/utils/fetcher/client/axios";
import type {
  CoursesMeCategory,
  CoursesMeResponse,
  CoursesMeSortField,
  CoursesMeVariant,
} from "@/types/user/courses-me";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  HiOutlineAdjustments,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineSwitchVertical,
  HiX,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";

import { CourseCard } from "./course-card";
import { CourseSkeletonGrid } from "./course-skeleton-grid";
import { CourseEmptyState, CourseErrorState } from "./empty-states";

const fetchCourses = async (url: string) => {
  const response = await api.get<CoursesMeResponse>(url);
  return response.data;
};

const fetchCategories = async () => {
  const response = await api.get<CoursesMeCategory[]>("categories/all");
  return response.data;
};

type LevelKey = "beginner" | "intermediate" | "advanced";

const SORT_OPTIONS = [
  { value: "enrolled_at", label: "Thời gian thanh toán" },
  { value: "created_at", label: "Thời gian tạo khóa học" },
  { value: "title", label: "Tên khóa học" },
  { value: "rating_avg", label: "Đánh giá" },
  { value: "views", label: "Lượt xem" },
  { value: "progress", label: "Tiến độ" },
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

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

export const CourseListPanel = () => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState<CoursesMeSortField>("enrolled_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState<"" | LevelKey>("");
  const [language, setLanguage] = useState("");

  const { data: categoriesData, isLoading: isLoadingCategories } = useSWR<
    CoursesMeCategory[]
  >("categories/all", fetchCategories, {
    revalidateOnFocus: false,
  });

  const categoryOptions = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.map((cat) => ({ value: cat.id, label: cat.name }));
  }, [categoriesData]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, sortBy, sortOrder, size, categoryId, level, language]);

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

  const courses = data?.courses ?? [];
  const total = data?.total ?? 0;
  const isBusy = isLoading || isValidating;
  const isInitialLoading = isLoading && !data;

  useEffect(() => {
    if (!total) return;
    const maxPage = Math.max(1, Math.ceil(total / size));
    if (page > maxPage) setPage(maxPage);
  }, [total, size, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size]);
  const visibleRange = useMemo(() => {
    if (!total) return "Không có dữ liệu";
    const start = (page - 1) * size + 1;
    const end = Math.min(total, page * size);
    return `Hiển thị ${start}-${end} / ${total}`;
  }, [page, size, total]);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || null;
  }, [error]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryId("");
    setLevel("");
    setLanguage("");
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm kiếm khóa học..."
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <HiX className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CoursesMeSortField)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleSortOrder}
              disabled={isBusy}
              className="px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Đổi chiều sắp xếp"
            >
              <HiOutlineSwitchVertical className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Page Size */}
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}/trang
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-4 pt-4 border-t border-gray-100">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">
            <span className="flex items-center gap-1">
              <HiOutlineAdjustments className="h-4 w-4 text-green-600" />
              Danh mục
            </span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
            >
              <option value="">{isLoadingCategories ? "Đang tải..." : "Tất cả danh mục"}</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">
            <span>Cấp độ</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as "" | LevelKey)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">
            <span>Ngôn ngữ</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(categoryId || level || language) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
            >
              <HiOutlineRefresh className="h-4 w-4" />
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isInitialLoading && <CourseSkeletonGrid count={Math.min(size, 6)} />}

      {/* Error State */}
      {error && (
        <CourseErrorState
          message={errorMessage || "Đã xảy ra lỗi khi tải danh sách khóa học."}
          onRetry={() => mutate(undefined, { revalidate: true })}
        />
      )}

      {/* Courses Grid */}
      {!isInitialLoading && !error && courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} variant={VARIANT} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isInitialLoading && !error && courses.length === 0 && (
        <CourseEmptyState
          content={{
            title: "Bạn chưa mua khóa học nào",
            description: "Khám phá thư viện khóa học và bắt đầu hành trình học tập ngay hôm nay.",
            actionHref: "/courses",
            actionLabel: "Khám phá khóa học",
          }}
        />
      )}

      {/* Pagination */}
      {!isInitialLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isBusy}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <HiChevronLeft className="h-5 w-5" />
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  page === pageNum
                    ? "bg-green-600 text-white"
                    : "border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || isBusy}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <HiChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
};
