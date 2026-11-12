"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowUpDown,
  GraduationCap,
  LayoutGrid,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useSavedInstructors } from "@/hooks/user/use-saved-instructors";
import type {
  BrowseGradeOption,
  InstructorDirectoryEnvelope,
  InstructorFilterOptions,
  InstructorItem,
} from "@/types/user/instructor";
import { InstructorCard } from "./instructor-card";
import {
  InstructorFilterSidebar,
  type InstructorFilterValues,
} from "./instructor-filter-sidebar";
import { SubjectPills } from "@/components/catalog/subject-pills";

const SORTS = [
  { value: "rating", label: "Đánh giá khóa học cao nhất" },
  { value: "relevant", label: "Phù hợp nhất" },
  { value: "popular", label: "Nhiều học viên nhất" },
  { value: "courses", label: "Nhiều khóa học nhất" },
  { value: "newest", label: "Mới tham gia" },
  { value: "name", label: "Tên A-Z" },
] as const;

const WHITELIST_PARAMS = [
  "q",
  "level",
  "grade",
  "subject",
  "goal",
  "exam",
  "provider",
  "min_rating",
  "has_courses",
  "sort",
] as const;

const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

export function InstructorDirectory() {
  const router = useRouter();
  const current = useSearchParams();
  const searchInputId = useId();

  // Local state
  const [keyword, setKeyword] = useState(current.get("q") ?? "");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Phân trang tải thêm (load more)
  const [extraState, setExtraState] = useState<{
    queryKey: string;
    items: InstructorItem[];
    cursor: string | null;
    hasLoadedMore: boolean;
  }>({
    queryKey: "",
    items: [],
    cursor: null,
    hasLoadedMore: false,
  });

  const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null);
  const loadingMoreKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [moreError, setMoreError] = useState(false);

  // Dọn dẹp search timeout khi unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Đồng bộ ô search khi URL param thay đổi (hỗ trợ back/forward)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setKeyword(current.get("q") ?? "");
  }, [current]);

  // Bảo vệ URL: dọn dẹp các params cấm (cursor, limit, include_total...)
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

  // Bộ lọc chuẩn hóa (sorted deterministic key)
  const filtersQuery = useMemo(() => {
    const q = new URLSearchParams();
    for (const key of WHITELIST_PARAMS) {
      const val = current.get(key);
      if (val !== null && val.trim() !== "") {
        q.set(key, val.trim());
      }
    }
    q.sort();
    return q.toString();
  }, [current]);

  const isLoadingMore = Boolean(loadingMoreKey && loadingMoreKey === filtersQuery);
  const activeFilterKeyRef = useRef(filtersQuery);
  const loadMoreGenRef = useRef(0);

  // Khi filtersQuery thay đổi: abort request cũ, reset generation và extraState
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

  // 1. Fetch filter options
  const {
    data: options,
    error: optionError,
    mutate: reloadOptions,
  } = useSWR<InstructorFilterOptions>("/users/instructors/filter-options", fetcher, {
    revalidateOnFocus: false,
  });

  // 2. Fetch danh sách giảng viên (trang đầu limit=12, include_total=true)
  const directoryUrl = `/users/instructors?${filtersQuery ? `${filtersQuery}&` : ""}limit=12&include_total=true`;
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<InstructorDirectoryEnvelope>(directoryUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const totalDisplay = data?.total ?? null;

  // Tổng hợp danh sách giảng viên
  const items = useMemo(() => {
    const firstPageItems = data?.items ?? [];
    const extraItems = extraState.queryKey === filtersQuery ? extraState.items : [];
    return [...firstPageItems, ...extraItems];
  }, [data?.items, extraState.queryKey, extraState.items, filtersQuery]);

  // Quản lý trạng thái đã lưu (batch SWR theo danh sách item ID)
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const { isSaved, isPending, toggleSave, isReady, fetchError: savedError, retry: retrySaved } = useSavedInstructors(itemIds);

  const nextCursor = useMemo(() => {
    if (extraState.queryKey === filtersQuery && extraState.hasLoadedMore) {
      return extraState.cursor;
    }
    return data?.next_cursor ?? null;
  }, [extraState.queryKey, extraState.hasLoadedMore, extraState.cursor, data?.next_cursor, filtersQuery]);

  const activeCount = useMemo(() => {
    return Array.from(current.keys()).filter(
      (key) => (WHITELIST_PARAMS as readonly string[]).includes(key) && key !== "sort"
    ).length;
  }, [current]);

  // Cập nhật nhiều tham số trong 1 router.push hoặc router.replace duy nhất (atomic)
  const setParams = useCallback(
    (patch: Record<string, string>, replace = false) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
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

      for (const [key, value] of Object.entries(patch)) {
        if (value && value.trim() !== "") {
          next.set(key, value.trim());
        } else {
          next.delete(key);
        }
      }

      // Tự động kiểm tra tương thích grade khi subject hoặc level thay đổi
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
      const currentQuery = current.toString();
      if (query === currentQuery) return;

      if (replace) {
        router.replace(query ? `?${query}` : "?", { scroll: false });
      } else {
        router.push(query ? `?${query}` : "?", { scroll: false });
      }
    },
    [current, router, options]
  );

  const setParam = useCallback(
    (name: string, value: string, replace = false) => {
      setParams({ [name]: value }, replace);
    },
    [setParams]
  );

  const resetAllFilters = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    loadingMoreKeyRef.current = null;
    setLoadingMoreKey(null);
    setKeyword("");
    if (!current.toString()) return;
    router.push("?", { scroll: false });
  }, [current, router]);

  // Debounce tìm kiếm 350ms (replace URL để không làm ngập history)
  const handleKeywordChange = (val: string) => {
    setKeyword(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    searchTimeoutRef.current = setTimeout(() => {
      setParam("q", val.normalize("NFC").trim().replace(/\s+/g, " "), true);
    }, 350);
  };

  // Submit bằng Enter (push URL tạo history entry)
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setParam("q", keyword.normalize("NFC").trim().replace(/\s+/g, " "), false);
  };

  // Tải thêm (Load More) với AbortController và key binding an toàn
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMoreKeyRef.current === filtersQuery) return;

    const requestFilterKey = filtersQuery;
    const currentGen = ++loadMoreGenRef.current;

    loadingMoreKeyRef.current = requestFilterKey;
    setLoadingMoreKey(requestFilterKey);
    setMoreError(false);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const page = await api.get<InstructorDirectoryEnvelope>(
        `/users/instructors?${requestFilterKey ? `${requestFilterKey}&` : ""}limit=12&cursor=${encodeURIComponent(
          nextCursor
        )}&include_total=false`,
        { signal: controller.signal }
      );

      if (
        currentGen !== loadMoreGenRef.current ||
        requestFilterKey !== activeFilterKeyRef.current
      ) {
        return;
      }

      const firstPageItems = data?.items ?? [];
      const newItems = page.data.items ?? [];

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

  const filterValues: InstructorFilterValues = useMemo(
    () => ({
      q: current.get("q") ?? "",
      level: current.get("level") ?? "",
      grade: current.get("grade") ?? "",
      subject: current.get("subject") ?? "",
      goal: current.get("goal") ?? "",
      exam: current.get("exam") ?? "",
      provider: current.get("provider") ?? "",
      min_rating: current.get("min_rating") ?? "",
      has_courses: current.get("has_courses") ?? "",
    }),
    [current]
  );

  const activeKeyword = current.get("q") ?? "";

  // Active Filter Chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];

    if (filterValues.subject && options?.subjects) {
      const sub = options.subjects.find((s) => s.slug === filterValues.subject || s.code === filterValues.subject);
      if (sub) chips.push({ key: "subject", label: `Môn: ${sub.name}` });
    }
    if (filterValues.level && options?.levels) {
      const lvl = options.levels.find((l) => l.code === filterValues.level || l.id === filterValues.level);
      if (lvl) chips.push({ key: "level", label: `Cấp: ${lvl.name}` });
    }
    if (filterValues.grade) {
      chips.push({ key: "grade", label: `Lớp: ${filterValues.grade}` });
    }
    if (filterValues.has_courses) {
      chips.push({ key: "has_courses", label: filterValues.has_courses === "true" ? "Có khóa công khai" : "Chưa có khóa công khai" });
    }
    if (filterValues.min_rating) {
      chips.push({ key: "min_rating", label: `Đánh giá: Từ ${filterValues.min_rating}★` });
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
      chips.push({ key: "q", label: `Từ khóa: "${activeKeyword}"` });
    }

    return chips;
  }, [filterValues, options, activeKeyword]);

  return (
    <div className="space-y-8 text-foreground">
      {savedError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-foreground">
          <span>Chưa tải được trạng thái giảng viên đã lưu.</span>
          <Button variant="outline" size="sm" onClick={() => retrySaved()}>Thử lại</Button>
        </div>
      )}
      {/* 1. Hero Banner Giảng Viên Mây Mây */}
      <div className="relative overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-surface/90 p-6 sm:p-8 md:p-10 shadow-xs backdrop-blur-xl">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-light/60 blur-3xl -z-10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-secondary-light/40 blur-3xl -z-10"
          aria-hidden="true"
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" className="text-xs px-3 py-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
                Đội ngũ giáo viên Mây Mây
              </Badge>

              {totalDisplay !== null && (
                <span className="text-xs font-medium text-muted-foreground">
                  • {totalDisplay} giáo viên
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Đồng hành cùng <span className="text-primary">thầy cô tận tâm</span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Tìm kiếm giáo viên theo khối lớp phổ thông (Lớp 1–12), môn học, kỳ thi ôn luyện và đơn vị đào tạo uy tín.
            </p>
          </div>

          <div className="hidden lg:flex items-center justify-center shrink-0">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-[24px] border border-primary-pastel/80 bg-primary-light/50 p-6 shadow-sm">
              <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-primary-light via-surface to-secondary-light/30 opacity-70" />
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <GraduationCap className="h-14 w-14 text-primary" />
                <span className="mt-2 text-xs font-semibold text-foreground">Mây Mây</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcut Môn học theo mục 6.2B */}
      {options?.subjects && options.subjects.length > 0 && (
        <div className="pt-0.5">
          <SubjectPills
            subjects={options.subjects}
            selectedSubjectSlug={filterValues.subject}
            onSelectSubject={(slug) => setParam("subject", slug)}
          />
        </div>
      )}

      {/* Thông báo lỗi khi không nạp được options */}
      {optionError && (
        <div className="rounded-[20px] border border-destructive-border bg-destructive-bg/30 p-4 text-center">
          <p className="text-xs font-medium text-destructive-foreground mb-2">
            Không thể tải danh mục bộ lọc giáo viên. Vui lòng kiểm tra lại đường truyền.
          </p>
          <Button variant="outline" size="sm" onClick={() => reloadOptions()}>
            Thử tải lại
          </Button>
        </div>
      )}

      {/* 2. Toolbar: Tìm kiếm, Sort, Nút Mobile Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg flex items-center gap-2">
          <label htmlFor={searchInputId} className="sr-only">
            Tìm kiếm giáo viên theo tên hoặc giới thiệu
          </label>
          <div className="relative flex-1">
            <Input
              id={searchInputId}
              name="q"
              maxLength={160}
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Tìm giáo viên theo tên hoặc giới thiệu..."
              leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
              rightIcon={
                keyword ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                        searchTimeoutRef.current = null;
                      }
                      setKeyword("");
                      setParam("q", "", true);
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

        <div className="flex items-center justify-between sm:justify-end gap-2.5">
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

          <div className="flex items-center gap-1.5">
            <select
              aria-label="Sắp xếp danh sách giáo viên"
              value={current.get("sort") ?? "rating"}
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
        </div>
      </div>

      {/* 3. Active Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-150">
          <span className="text-xs font-medium text-muted-foreground">Đang lọc theo:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (chip.key === "q") {
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                    searchTimeoutRef.current = null;
                  }
                  setKeyword("");
                  setParam("q", "", true);
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

      {/* 4. Layout: Sidebar + Grid */}
      <div className="grid items-start gap-8 lg:grid-cols-[270px_1fr]">
        <div className="hidden lg:block">
          <InstructorFilterSidebar
            options={options}
            values={filterValues}
            onFilterChange={setParam}
            onFiltersChange={setParams}
            onResetFilters={resetAllFilters}
            activeCount={activeCount}
          />
        </div>

        {mobileFilterOpen && (
          <InstructorFilterSidebar
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

        <section aria-label="Kết quả tìm kiếm giáo viên" aria-busy={isLoading}>
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {totalDisplay !== null
                ? `Hiển thị ${items.length} trên tổng số ${totalDisplay} giáo viên`
                : `Hiển thị ${items.length} giáo viên`}
            </span>
          </div>

          {isLoading && items.length === 0 ? (
            <div role="status" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="rounded-[24px] border border-border bg-surface p-5 shadow-xs animate-pulse space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton variant="circle" className="w-16 h-16" />
                    <div className="space-y-2 flex-1">
                      <Skeleton variant="text" className="h-4 w-3/4" />
                      <Skeleton variant="text" className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton variant="text" className="h-3 w-full" />
                  <Skeleton variant="text" className="h-3 w-2/3" />
                  <div className="pt-3 border-t border-border/70 flex justify-between">
                    <Skeleton variant="text" className="h-3 w-16" />
                    <Skeleton variant="text" className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : error && items.length === 0 ? (
            <Card className="rounded-[24px] border-destructive-border bg-destructive-bg/30 p-8 text-center">
              <h3 className="text-base font-semibold text-destructive-foreground mb-1">
                Không thể tải danh sách giáo viên
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng kiểm tra lại đường truyền.
              </p>
              <Button variant="outline" size="sm" onClick={() => mutate()}>
                Thử tải lại
              </Button>
            </Card>
          ) : items.length === 0 ? (
            <EmptyState
              title={activeCount > 0 ? "Chưa có giáo viên phù hợp với bộ lọc" : "Chưa có giáo viên công khai"}
              description={activeCount > 0 ? "Hãy thử thay đổi tiêu chí môn học, cấp học hoặc từ khóa tìm kiếm để khám phá thêm giáo viên." : "Hồ sơ giáo viên có khóa học đủ điều kiện công khai sẽ được hiển thị tại đây."}
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
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((instructor) => (
                  <InstructorCard
                    key={instructor.id}
                    instructor={instructor}
                    isSaved={isSaved(instructor.id)}
                    isSaving={isPending(instructor.id)}
                    isReady={isReady}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>

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
                    Xem thêm giáo viên
                  </Button>
                  {moreError && (
                    <p role="alert" className="text-xs text-destructive-foreground">
                      Không thể tải thêm danh sách giáo viên. Vui lòng bấm thử lại.
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
