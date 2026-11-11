"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowUpDown,
  Filter,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  BrowseFilters,
  BrowseGradeOption,
  BrowseSubjectOption,
  CatalogCourse,
  CatalogResult,
} from "@/types/catalog";
import { CatalogCard } from "./catalog-card";
import { FilterSidebar, type FilterValues } from "./filter-sidebar";
import { SubjectHero } from "./subject-hero";
import { SubjectPills } from "./subject-pills";

// Re-export CatalogCard để tương thích với các trang dùng lại (provider pages)
export { CatalogCard } from "./catalog-card";

const SORTS = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến nhất" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
] as const;

// Danh mục params công khai hợp lệ cho trang catalog (URL whitelist)
const WHITELIST_PARAMS = [
  "level",
  "grade",
  "subject",
  "goal",
  "exam",
  "provider",
  "delivery_type",
  "currency",
  "min_price",
  "max_price",
  "rating",
  "keyword",
  "sort",
] as const;

const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

export default function CatalogBrowser({ provider }: { provider?: string }) {
  const router = useRouter();
  const current = useSearchParams();
  const searchInputId = useId();

  // Local UI state (viewMode chỉ lưu ở client, không đẩy lên URL)
  const [keyword, setKeyword] = useState(current.get("keyword") ?? "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Phân trang tải thêm (load more) với queryKey và cờ hasLoadedMore rõ ràng
  const [extraState, setExtraState] = useState<{
    queryKey: string;
    items: CatalogCourse[];
    cursor: string | null;
    hasLoadedMore: boolean;
  }>({
    queryKey: "",
    items: [],
    cursor: null,
    hasLoadedMore: false,
  });

  // Quản lý loadingMore gắn liền với filter query key và AbortController
  const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null);
  const loadingMoreKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [moreError, setMoreError] = useState(false);

  // Đồng bộ ô search khi URL param thay đổi (hỗ trợ back/forward)
  useEffect(() => {
    setKeyword(current.get("keyword") ?? "");
  }, [current]);

  // Bảo vệ URL công khai: loại bỏ các params cấm (cursor, limit, include_total...) khỏi URL thanh địa chỉ
  useEffect(() => {
    let hasDirty = false;
    const next = new URLSearchParams();
    for (const [key, value] of current.entries()) {
      if ((WHITELIST_PARAMS as readonly string[]).includes(key)) {
        next.set(key, value);
      } else {
        hasDirty = true;
      }
    }
    if (hasDirty) {
      const query = next.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }
  }, [current, router]);

  // Bộ lọc chuẩn hóa (deterministic sorted key) cho query API
  const filtersQuery = useMemo(() => {
    const q = new URLSearchParams();
    for (const key of WHITELIST_PARAMS) {
      const val = current.get(key);
      if (val !== null && val.trim() !== "") {
        q.set(key, val.trim());
      }
    }
    if (provider) {
      q.set("provider", provider);
    }
    q.sort();
    return q.toString();
  }, [current, provider]);

  // Trạng thái loadingMore chỉ TRUE khi key đang tải trùng khớp hoàn toàn với filtersQuery hiện tại
  const isLoadingMore = Boolean(loadingMoreKey && loadingMoreKey === filtersQuery);

  // Quản lý thế hệ request và ref lock để hủy stale response khi đổi filter (kể cả A -> B -> A)
  const activeFilterKeyRef = useRef(filtersQuery);
  const loadMoreGenRef = useRef(0);

  // Khi filtersQuery thay đổi: abort request cũ, reset generation, giải phóng lock và làm sạch extraState
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    activeFilterKeyRef.current = filtersQuery;
    loadMoreGenRef.current += 1;
    loadingMoreKeyRef.current = null;
    setLoadingMoreKey(null);
    setMoreError(false);
    setExtraState({
      queryKey: filtersQuery,
      items: [],
      cursor: null,
      hasLoadedMore: false,
    });
  }, [filtersQuery]);

  // 1. Fetch compact browse filters gọn nhẹ (dùng error/retry thật)
  const {
    data: options,
    error: optionError,
    mutate: reloadOptions,
  } = useSWR<BrowseFilters>("/catalog/browse-filters", fetcher, {
    revalidateOnFocus: false,
  });

  // 2. Fetch danh sách khóa học (trang đầu tiên luôn gọi include_total=true)
  // Bỏ keepPreviousData: true để không hiện môn cũ khi chuyển sang môn mới
  const coursesUrl = `/catalog/courses?${filtersQuery ? `${filtersQuery}&` : ""}limit=20&include_total=true`;
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<CatalogResult>(coursesUrl, fetcher, {
    revalidateOnFocus: false,
  });

  // SWR đã cache theo coursesUrl và trang đầu luôn trả data.total
  const totalDisplay = data?.total ?? null;

  // Tổng hợp danh sách khóa học: trang 1 + các trang tải thêm (chỉ nhận khi khớp queryKey)
  const items = useMemo(() => {
    const firstPageItems = data?.items ?? [];
    const extraItems = extraState.queryKey === filtersQuery ? extraState.items : [];
    return [...firstPageItems, ...extraItems];
  }, [data?.items, extraState.queryKey, extraState.items, filtersQuery]);

  // Xác định cursor tiếp theo: phân biệt rõ ràng giữa "chưa tải thêm" và "đã tải thêm"
  const nextCursor = useMemo(() => {
    if (extraState.queryKey === filtersQuery && extraState.hasLoadedMore) {
      return extraState.cursor;
    }
    return data?.next_cursor ?? null;
  }, [extraState.queryKey, extraState.hasLoadedMore, extraState.cursor, data?.next_cursor, filtersQuery]);

  // Số lượng bộ lọc đang active (không tính sort)
  const activeCount = useMemo(() => {
    return Array.from(current.keys()).filter(
      (key) => (WHITELIST_PARAMS as readonly string[]).includes(key) && key !== "sort"
    ).length;
  }, [current]);

  // Cập nhật nhiều tham số URL trong MỘT router.push duy nhất (ngăn ngừa mất min_price)
  const setParams = useCallback(
    (patch: Record<string, string>) => {
      // Hủy ngay request tải thêm cũ nếu người dùng đổi bộ lọc
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      loadingMoreKeyRef.current = null;
      setLoadingMoreKey(null);

      const next = new URLSearchParams();
      for (const key of WHITELIST_PARAMS) {
        const val = current.get(key);
        if (val !== null && val.trim() !== "") {
          next.set(key, val.trim());
        }
      }

      // Áp dụng các thay đổi từ patch
      for (const [key, value] of Object.entries(patch)) {
        if (value && value.trim() !== "") {
          next.set(key, value.trim());
        } else {
          next.delete(key);
        }
      }

      if ("currency" in patch) {
        next.delete("min_price");
        next.delete("max_price");
      }

      // Kiểm tra tương thích grade khi subject hoặc level thay đổi
      if (("subject" in patch || "level" in patch) && next.has("grade") && options?.grades) {
        const targetSubject = next.get("subject") ?? "";
        const targetLevel = next.get("level") ?? "";
        const currentGradeNum = next.get("grade");

        let validGrades: BrowseGradeOption[] = options.grades;

        if (targetLevel && options.levels) {
          const lvl = options.levels.find((l) => l.code === targetLevel || l.id === targetLevel);
          if (lvl) {
            validGrades = validGrades.filter((g) => g.education_level_id === lvl.id);
          }
        }

        if (targetSubject && options.subjects && options.grade_subjects) {
          const sub = options.subjects.find((s) => s.slug === targetSubject || s.code === targetSubject);
          if (sub) {
            validGrades = validGrades.filter((grade) =>
              options.grade_subjects.some(
                (link) => link.grade_id === grade.id && link.subject_id === sub.id
              )
            );
          }
        }

        const isCompatible = validGrades.some((g) => String(g.grade_number) === currentGradeNum);
        if (!isCompatible) {
          next.delete("grade");
        }
      }

      const query = next.toString();
      router.push(query ? `?${query}` : "?", { scroll: false });
    },
    [current, router, options]
  );

  // Cập nhật 1 tham số
  const setParam = useCallback(
    (name: string, value: string) => {
      setParams({ [name]: value });
    },
    [setParams]
  );

  // Đặt lại toàn bộ bộ lọc
  const resetAllFilters = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    loadingMoreKeyRef.current = null;
    setLoadingMoreKey(null);
    setKeyword("");
    router.push("?", { scroll: false });
  }, [router]);

  // Submit form tìm kiếm
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setParam("keyword", keyword.trim());
  };

  // Tải thêm (Load More) với AbortController và key binding an toàn tuyệt đối
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMoreKeyRef.current === filtersQuery) return;

    const requestFilterKey = filtersQuery;
    const currentGen = ++loadMoreGenRef.current;

    loadingMoreKeyRef.current = requestFilterKey;
    setLoadingMoreKey(requestFilterKey);
    setMoreError(false);

    // Tạo AbortController để có thể cancel khi người dùng đổi filter giữa chừng
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const page = await api.get<CatalogResult>(
        `/catalog/courses?${requestFilterKey ? `${requestFilterKey}&` : ""}limit=20&cursor=${encodeURIComponent(
          nextCursor
        )}&include_total=false`,
        { signal: controller.signal }
      );

      // Bỏ qua stale response nếu generation hoặc filter key đã thay đổi (kể cả đổi A -> B -> A)
      if (
        currentGen !== loadMoreGenRef.current ||
        requestFilterKey !== activeFilterKeyRef.current
      ) {
        return;
      }

      const firstPageItems = data?.items ?? [];
      const newItems = page.data.items ?? [];

      // Dedupe ID và cập nhật extraState functional
      setExtraState((prev) => {
        if (prev.queryKey !== requestFilterKey) {
          return {
            queryKey: requestFilterKey,
            items: newItems,
            cursor: page.data.next_cursor ?? null,
            hasLoadedMore: true,
          };
        }
        const existingIds = new Set([
          ...firstPageItems.map((c) => c.id),
          ...prev.items.map((c) => c.id),
        ]);
        const uniqueNew = newItems.filter((c) => !existingIds.has(c.id));
        return {
          queryKey: requestFilterKey,
          items: [...prev.items, ...uniqueNew],
          cursor: page.data.next_cursor ?? null,
          hasLoadedMore: true,
        };
      });
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string })?.name === "CanceledError" ||
        (err as { name?: string })?.name === "AbortError" ||
        (err as { code?: string })?.code === "ERR_CANCELED";

      if (
        !isCanceled &&
        currentGen === loadMoreGenRef.current &&
        requestFilterKey === activeFilterKeyRef.current
      ) {
        setMoreError(true);
      }
    } finally {
      if (currentGen === loadMoreGenRef.current) {
        loadingMoreKeyRef.current = null;
        setLoadingMoreKey(null);
      }
    }
  };

  // Môn học đang chọn hiện tại
  const currentSubjectSlug = current.get("subject") ?? "";
  const currentSubject: BrowseSubjectOption | null = useMemo(() => {
    if (!options?.subjects || !currentSubjectSlug) return null;
    return (
      options.subjects.find(
        (s) => s.slug === currentSubjectSlug || s.code === currentSubjectSlug
      ) || null
    );
  }, [options?.subjects, currentSubjectSlug]);

  // Gom giá trị bộ lọc hiện tại
  const filterValues: FilterValues = useMemo(
    () => ({
      level: current.get("level") ?? "",
      grade: current.get("grade") ?? "",
      subject: current.get("subject") ?? "",
      goal: current.get("goal") ?? "",
      exam: current.get("exam") ?? "",
      provider: current.get("provider") ?? "",
      delivery_type: current.get("delivery_type") ?? "",
      rating: current.get("rating") ?? "",
      currency: current.get("currency") ?? "VND",
      min_price: current.get("min_price") ?? "",
      max_price: current.get("max_price") ?? "",
    }),
    [current]
  );

  // Active keyword lấy trực tiếp từ URL đã submit, không lấy text đang gõ
  const activeKeyword = current.get("keyword") ?? "";

  // Danh sách Active Filter Chips có nhãn thật
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];

    if (filterValues.subject && currentSubject) {
      chips.push({ key: "subject", label: `Môn: ${currentSubject.name}` });
    }
    if (filterValues.grade) {
      chips.push({ key: "grade", label: `Lớp: ${filterValues.grade}` });
    }
    if (filterValues.level && options?.levels) {
      const lvl = options.levels.find((l) => l.code === filterValues.level);
      if (lvl) chips.push({ key: "level", label: `Cấp: ${lvl.name}` });
    }
    if (filterValues.min_price || filterValues.max_price) {
      const min = filterValues.min_price;
      const max = filterValues.max_price;
      if (min === "0" && max === "0") {
        chips.push({ key: "price", label: "Giá: Miễn phí" });
      } else if (min && max) {
        chips.push({
          key: "price",
          label: `Giá: ${Number(min).toLocaleString("vi-VN")} - ${Number(
            max
          ).toLocaleString("vi-VN")} ₫`,
        });
      } else if (max) {
        chips.push({
          key: "price",
          label: `Giá: Dưới ${Number(max).toLocaleString("vi-VN")} ₫`,
        });
      } else if (min) {
        chips.push({
          key: "price",
          label: `Giá: Trên ${Number(min).toLocaleString("vi-VN")} ₫`,
        });
      }
    }
    if (filterValues.rating) {
      chips.push({ key: "rating", label: `Đánh giá: Từ ${filterValues.rating}★` });
    }
    if (filterValues.goal && options?.learning_goals) {
      const g = options.learning_goals.find((item) => item.code === filterValues.goal);
      if (g) chips.push({ key: "goal", label: `Mục tiêu: ${g.name}` });
    }
    if (filterValues.exam && options?.exams) {
      const ex = options.exams.find((item) => item.code === filterValues.exam);
      if (ex) chips.push({ key: "exam", label: `Kỳ thi: ${ex.name}` });
    }
    if (filterValues.provider && options?.providers) {
      const p = options.providers.find((item) => item.slug === filterValues.provider);
      if (p) chips.push({ key: "provider", label: `Đơn vị: ${p.name}` });
    }
    if (activeKeyword) {
      chips.push({ key: "keyword", label: `Từ khóa: "${activeKeyword}"` });
    }

    return chips;
  }, [filterValues, currentSubject, options, activeKeyword]);

  return (
    <div className="space-y-8 text-foreground">
      {/* 1. Hero Chuyên đề Môn học (Dynamic Subject Hero) */}
      <SubjectHero currentSubject={currentSubject} totalCourses={totalDisplay} />

      {/* Thông báo lỗi khi không nạp được browse-filters kèm nút retry */}
      {optionError && (
        <div className="rounded-[20px] border border-destructive-border bg-destructive-bg/30 p-4 text-center">
          <p className="text-xs font-medium text-destructive-foreground mb-2">
            Không thể tải danh mục bộ lọc. Vui lòng kiểm tra kết nối mạng.
          </p>
          <Button variant="outline" size="sm" onClick={() => reloadOptions()}>
            Thử tải lại bộ lọc
          </Button>
        </div>
      )}

      {/* 2. Thanh Chọn Nhanh Môn Học Dạng Pills */}
      {options?.subjects && options.subjects.length > 0 && (
        <div className="pt-1">
          <SubjectPills
            subjects={options.subjects}
            selectedSubjectSlug={currentSubjectSlug}
            onSelectSubject={(slug) => setParam("subject", slug)}
          />
        </div>
      )}

      {/* 3. Toolbar: Ô Tìm Kiếm, Sắp Xếp, Chuyển Chế Độ Xem (Grid/List) & Nút Lọc Mobile */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Form tìm kiếm với label accessible */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg flex items-center gap-2">
          <label htmlFor={searchInputId} className="sr-only">
            Tìm kiếm khóa học
          </label>
          <div className="relative flex-1">
            <Input
              id={searchInputId}
              name="keyword"
              maxLength={160}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                currentSubject
                  ? `Tìm khóa học ${currentSubject.name}...`
                  : "Tìm kiếm khóa học..."
              }
              leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
              rightIcon={
                keyword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword("");
                      setParam("keyword", "");
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null
              }
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Tìm
          </Button>
        </form>

        {/* Cụm điều khiển sắp xếp & View mode */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          {/* Nút bật Drawer bộ lọc trên mobile */}
          <Button
            variant="outline"
            size="md"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5"
            leftIcon={<SlidersHorizontal className="w-4 h-4 text-primary" />}
          >
            <span>Bộ lọc</span>
            {activeCount > 0 && (
              <Badge variant="primary" className="ml-1 text-[11px] px-1.5 py-0.2">
                {activeCount}
              </Badge>
            )}
          </Button>

          {/* Dropdown sắp xếp */}
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Sắp xếp kết quả"
              value={current.get("sort") ?? "newest"}
              onChange={(e) => setParam("sort", e.target.value)}
              className="h-10 px-3 rounded-xl border border-input bg-surface text-xs font-semibold text-foreground hover:border-primary-pastel focus:outline-none focus:border-ring cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher (Grid / List) với aria-pressed */}
          <div
            role="group"
            aria-label="Chế độ hiển thị danh sách"
            className="hidden sm:flex items-center rounded-xl border border-border bg-surface p-1 shadow-2xs"
          >
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              aria-label="Xem dạng lưới"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-primary-light text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              aria-label="Xem dạng danh sách"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-primary-light text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Active Filter Chips với nhãn thật */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-150">
          <span className="text-xs font-medium text-muted-foreground">Đang lọc theo:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (chip.key === "price") {
                  setParams({ min_price: "", max_price: "" });
                } else if (chip.key === "keyword") {
                  setKeyword("");
                  setParam("keyword", "");
                } else {
                  setParam(chip.key, "");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary-pastel/80 bg-primary-light/70 text-xs font-medium text-foreground hover:bg-primary-light hover:border-primary transition-colors cursor-pointer group"
            >
              <span>{chip.label}</span>
              <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive-foreground transition-colors" />
            </button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={resetAllFilters}
            className="text-xs text-muted-foreground hover:text-destructive-foreground"
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Đặt lại tất cả
          </Button>
        </div>
      )}

      {/* 5. Khu Vực Bố Cục Chính: Sidebar Bên Trái + Lưới Khóa Học Bên Phải */}
      <div className="grid items-start gap-8 lg:grid-cols-[270px_1fr]">
        {/* Sidebar Trên Desktop */}
        <div className="hidden lg:block">
          <FilterSidebar
            options={options}
            values={filterValues}
            onFilterChange={setParam}
            onFiltersChange={setParams}
            onResetFilters={resetAllFilters}
            activeCount={activeCount}
          />
        </div>

        {/* Drawer Trên Mobile sử dụng Shared Modal - Chỉ mount khi mobileFilterOpen=true */}
        {mobileFilterOpen && (
          <FilterSidebar
            options={options}
            values={filterValues}
            onFilterChange={setParam}
            onFiltersChange={setParams}
            onResetFilters={resetAllFilters}
            activeCount={activeCount}
            isMobileDrawer={true}
            onCloseMobileDrawer={() => setMobileFilterOpen(false)}
          />
        )}

        {/* Danh Sách Khóa Học */}
        <section aria-label="Kết quả tìm kiếm khóa học" aria-busy={isLoading}>
          {/* Thông tin số lượng hiển thị */}
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {totalDisplay !== null
                ? `Hiển thị ${items.length} trên tổng số ${totalDisplay} khóa học`
                : `Hiển thị ${items.length} khóa học`}
            </span>
          </div>

          {/* Trạng thái Đang Tải (Skeleton Grid) */}
          {isLoading && items.length === 0 ? (
            <div
              role="status"
              className={
                viewMode === "grid"
                  ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                  : "flex flex-col gap-4"
              }
            >
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-xs p-0 animate-pulse"
                >
                  <Skeleton variant="rect" className="aspect-video w-full rounded-none" />
                  <div className="p-5 space-y-3">
                    <Skeleton variant="text" className="h-3.5 w-1/3 rounded-md" />
                    <Skeleton variant="text" className="h-4 w-full rounded-md" />
                    <Skeleton variant="text" className="h-4 w-3/4 rounded-md" />
                    <div className="pt-3 border-t border-border/70 flex justify-between">
                      <Skeleton variant="text" className="h-3 w-16 rounded-md" />
                      <Skeleton variant="text" className="h-4 w-20 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error && items.length === 0 ? (
            /* Trạng thái Báo Lỗi */
            <Card className="rounded-[24px] border-destructive-border bg-destructive-bg/30 p-8 text-center">
              <h3 className="text-base font-semibold text-destructive-foreground mb-1">
                Không thể tải danh sách khóa học
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng kiểm tra lại đường truyền.
              </p>
              <Button variant="outline" size="sm" onClick={() => mutate()}>
                Thử tải lại
              </Button>
            </Card>
          ) : items.length === 0 ? (
            /* Trạng thái Rỗng (Empty State) - Trung thực, không gợi khóa mẫu khi rỗng */
            <EmptyState
              title="Chưa có khóa học công khai phù hợp"
              description="Hãy thử thay đổi điều kiện lọc, từ khóa tìm kiếm hoặc chọn khối lớp khác."
              action={
                activeCount > 0 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={resetAllFilters}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Đặt lại bộ lọc
                  </Button>
                ) : null
              }
            />
          ) : (
            /* Danh sách hiển thị khóa học */
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                    : "flex flex-col gap-4"
                }
              >
                {items.map((course) => (
                  <CatalogCard key={course.id} course={course} viewMode={viewMode} />
                ))}
              </div>

              {/* Nút Xem Thêm (Load More) */}
              {nextCursor && (
                <div className="mt-10 flex flex-col items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLoadMore}
                    isLoading={isLoadingMore}
                    loadingText="Đang tải thêm..."
                    className="min-w-[180px] shadow-xs"
                  >
                    Xem thêm khóa học
                  </Button>
                  {moreError && (
                    <p role="alert" className="text-xs text-destructive-foreground">
                      Không thể tải thêm khóa học. Vui lòng bấm thử lại.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
