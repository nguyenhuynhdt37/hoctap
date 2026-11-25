"use client";

import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CourseStudentItem,
  CourseStudentsResponse,
} from "@/types/lecturer/student";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Download,
  ExternalLink,
  GraduationCap,
  Layers,
  RefreshCw,
  Search,
  Users,
  X,
} from "pulsoicon-react";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const COURSE_STUDENTS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 20, min: 1, max: 100 },
  search: { type: "string", default: "" as string },
  min_progress: { type: "string", default: "" as string },
  max_progress: { type: "string", default: "" as string },
  status: {
    type: "string",
    default: "",
    allowed: ["", "not_started", "learning", "almost", "completed"] as const,
  },
  sort_by: {
    type: "string",
    default: "enrolled_at",
    allowed: ["enrolled_at", "last_activity", "progress", "price"] as const,
  },
  order_dir: {
    type: "string",
    default: "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

const formatCoin = (value: number) => formatVndAsCoin(value);

const formatVndApprox = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "not_started", label: "Chưa học" },
  { value: "learning", label: "Đang học" },
  { value: "almost", label: "Gần hoàn thành" },
  { value: "completed", label: "Hoàn thành" },
];

export default function LecturerCourseStudents() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  const { values, setParam, resetParams } = useUrlQueryState(
    COURSE_STUDENTS_QUERY_SCHEMA,
  );
  const page = values.page;
  const limit = values.limit;
  const search = values.search;
  const minProgress = values.min_progress;
  const maxProgress = values.max_progress;
  const status = values.status;
  const sortBy = values.sort_by;
  const orderDir = values.order_dir;

  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    commitNow: commitSearchNow,
  } = useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", String(limit));
    q.set("sort_by", sortBy);
    q.set("order_dir", orderDir);
    if (search.trim()) q.set("search", search.trim());
    if (minProgress) q.set("min_progress", minProgress);
    if (maxProgress) q.set("max_progress", maxProgress);
    if (status) q.set("status", status);
    return q.toString();
  }, [
    page,
    limit,
    search,
    minProgress,
    maxProgress,
    status,
    sortBy,
    orderDir,
  ]);

  const { data, isLoading, isValidating, mutate } =
    useSWR<CourseStudentsResponse>(
      courseId ? `/lecturer/courses/${courseId}/students?${queryString}` : null,
      async (url) => {
        const res = await api.get(url, {
          headers: { accept: "application/json" },
        });
        return res.data;
      },
      { revalidateOnFocus: false },
    );

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  // Thống kê Bento từ dữ liệu thực
  const stats = useMemo(() => {
    const list = data?.students ?? [];
    const total = data?.total ?? 0;
    const completedCount = list.filter((s) => s.progress_percent >= 100).length;
    const avgProgress =
      list.length > 0
        ? list.reduce((sum, s) => sum + (s.progress_percent || 0), 0) /
          list.length
        : 0;
    const totalPaidVnd = list.reduce((sum, s) => sum + (s.price_paid || 0), 0);
    return { total, completedCount, avgProgress, totalPaidVnd };
  }, [data]);

  // Context menu chuột phải (giữ tương thích)
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuItem, setMenuItem] = useState<CourseStudentItem | null>(null);

  const openContextMenu = (e: React.MouseEvent, item: CourseStudentItem) => {
    e.preventDefault();
    setMenuItem(item);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    const close = () => setMenuOpen(false);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener("click", close);
      document.addEventListener("contextmenu", close);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  // Export Excel
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!courseId || exporting) return;
    try {
      setExporting(true);
      const q = new URLSearchParams();
      q.set("sort_by", sortBy);
      q.set("order_dir", orderDir);
      if (search.trim()) q.set("search", search.trim());
      if (minProgress) q.set("min_progress", minProgress);
      if (maxProgress) q.set("max_progress", maxProgress);
      if (status) q.set("status", status);
      const url = `/lecturer/courses/${courseId}/students/export?${q.toString()}`;
      const res = await api.get(url, {
        responseType: "blob",
        headers: {
          accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, application/json",
        },
      });
      const blob = new Blob([res.data]);
      const link = document.createElement("a");
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      link.href = URL.createObjectURL(blob);
      link.download = `hoc-vien-${courseId}-${y}${m}${d}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      showToast.success("Đã xuất danh sách học viên ra tệp Excel.");
    } catch {
      showToast.error("Không thể xuất tệp Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = Boolean(
    searchInput.trim() || status || minProgress || maxProgress,
  );

  const resetFilters = () => {
    setSearchInput("");
    resetParams();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Bar điều hướng */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/lecturer/courses"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại khóa học</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {courseId && (
              <>
                <Link href={`/lecturer/courses/${courseId}/stats`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-surface"
                    leftIcon={<BarChart3 className="h-3.5 w-3.5" />}
                  >
                    Thống kê
                  </Button>
                </Link>
                <Link href={`/lecturer/chapters?course_id=${courseId}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-surface"
                    leftIcon={<Layers className="h-3.5 w-3.5" />}
                  >
                    Chương bài
                  </Button>
                </Link>
              </>
            )}
            <Button
              type="button"
              variant="pastel"
              size="sm"
              className="rounded-full border border-primary-pastel/80"
              onClick={handleExport}
              disabled={exporting}
              isLoading={exporting}
              loadingText="Đang xuất..."
              leftIcon={
                !exporting ? <Download className="h-3.5 w-3.5" /> : undefined
              }
            >
              Xuất Excel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="rounded-full shadow-sm"
              disabled={isValidating}
              onClick={() => void mutate()}
              leftIcon={
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`}
                />
              }
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Hero & Bento 4 chỉ số */}
        <section className="relative overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light via-surface to-secondary-light/65 p-6 shadow-sm sm:p-8">
          <div className="relative space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Users animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Quản lý lớp học</span>
            </span>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Danh sách Học viên Đăng ký
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Theo dõi chi tiết tiến độ học tập, mức độ hoàn thành bài giảng và
              lịch sử tương tác của từng học viên trong khóa học.
            </p>
          </div>

          <div className="relative mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-primary-pastel/80 bg-surface/90 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-primary">
                <span>Tổng học viên</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Users animated={false} className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                {stats.total.toLocaleString("vi-VN")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Đang theo học khóa này
              </p>
            </div>

            <div className="rounded-2xl border border-secondary-pastel/80 bg-secondary-light/55 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-secondary-foreground">
                <span>Tiến độ TB (trang)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-secondary-foreground">
                  <GraduationCap animated={false} className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                {stats.avgProgress.toFixed(1)}%
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, stats.avgProgress)}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-success-border/80 bg-success-bg/60 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-success-foreground">
                <span>Đã hoàn thành (trang)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-success-foreground">
                  <CheckCircle2 animated={false} className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                {stats.completedCount}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Đạt 100% bài giảng
              </p>
            </div>

            <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/75 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-warning-foreground">
                <span>Giá trị đăng ký (trang)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-[#C98A2C]">
                  <Coins animated={false} className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" />
                {formatCoin(stats.totalPaidVnd)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                ≈ {formatVndApprox(stats.totalPaidVnd)}
              </p>
            </div>
          </div>
        </section>

        {/* Bộ lọc kính mờ */}
        <Card
          variant="surface"
          density="none"
          className="space-y-3 rounded-[22px] border border-border/90 bg-surface/95 p-4 shadow-2xs backdrop-blur-xs"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Segmented Progress Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_TABS.map((tab) => {
                const active = status === tab.value;
                return (
                  <button
                    key={tab.value || "all"}
                    type="button"
                    onClick={() =>
                      setParam(
                        "status",
                        tab.value as (typeof COURSE_STUDENTS_QUERY_SCHEMA.status.allowed)[number],
                      )
                    }
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-primary-light/60 hover:text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm */}
            <div className="relative w-full lg:w-72">
              <Search
                animated={false}
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Tìm theo họ tên hoặc email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa"
                  onClick={() => commitSearchNow("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-muted-foreground">Tiến độ:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={minProgress}
                onChange={(e) => setParam("min_progress", e.target.value)}
                placeholder="0"
                className="h-8 w-20 rounded-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-none"
              />
              <span className="text-muted-foreground">% đến</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxProgress}
                onChange={(e) => setParam("max_progress", e.target.value)}
                placeholder="100"
                className="h-8 w-20 rounded-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-none"
              />
              <span className="text-muted-foreground">%</span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary-light/70 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary-light cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  Đặt lại
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) =>
                  setParam(
                    "sort_by",
                    e.target.value as (typeof COURSE_STUDENTS_QUERY_SCHEMA.sort_by.allowed)[number],
                  )
                }
                aria-label="Sắp xếp theo"
                className="h-8 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="enrolled_at">Ngày đăng ký</option>
                <option value="last_activity">Hoạt động cuối</option>
                <option value="progress">Tiến độ</option>
                <option value="price">Giá đã mua</option>
              </select>
              <select
                value={orderDir}
                onChange={(e) =>
                  setParam(
                    "order_dir",
                    e.target.value === "asc" ? "asc" : "desc",
                  )
                }
                aria-label="Thứ tự"
                className="h-8 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
              <select
                value={limit}
                onChange={(e) =>
                  setParam("limit", parseInt(e.target.value, 10))
                }
                aria-label="Số dòng mỗi trang"
                className="h-8 rounded-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Bảng học viên */}
        <Card
          variant="surface"
          density="none"
          className="overflow-hidden rounded-[26px] border border-border shadow-xs"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-primary-light/35">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Học viên
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tiến độ học tập
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Giá đã mua
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Đăng ký &amp; Hoạt động
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-5 py-4">
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : !data || data.students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10">
                      <EmptyState
                        icon={<Users className="h-8 w-8 text-primary" />}
                        title="Chưa có học viên phù hợp"
                        description={
                          hasFilters
                            ? "Hãy thử điều chỉnh bộ lọc trạng thái hoặc khoảng tiến độ."
                            : "Khi học viên đăng ký khóa học này, danh sách sẽ hiển thị tại đây."
                        }
                        action={
                          hasFilters ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full"
                              onClick={resetFilters}
                            >
                              Đặt lại bộ lọc
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  data.students.map((s: CourseStudentItem) => {
                    const pct = Math.min(
                      100,
                      Math.max(0, s.progress_percent || 0),
                    );
                    const initials = (s.fullname || "HV")
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const detailHref = `/lecturer/courses/${courseId}/users/detail?user_id=${s.user_id}`;

                    return (
                      <tr
                        key={s.user_id}
                        className="transition-colors hover:bg-primary-light/20"
                        onContextMenu={(e) => openContextMenu(e, s)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {s.avatar ? (
                              <img
                                src={getImageUrl(s.avatar)}
                                alt={s.fullname}
                                className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-primary-light text-xs font-bold text-primary">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={detailHref}
                                className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                              >
                                {s.fullname}
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(s.email);
                                  showToast.success("Đã sao chép email học viên");
                                }}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer"
                                title="Nhấn để sao chép email"
                              >
                                <span className="truncate max-w-[200px]">
                                  {s.email}
                                </span>
                                <Copy animated={false} className="h-3 w-3 shrink-0" />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-primary-light/80">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 100 ? "bg-[#3E9B63]" : "bg-primary"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="min-w-[52px] text-xs font-bold tabular-nums text-foreground">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>
                              {s.completed_lessons}/{s.total_lessons} bài
                            </span>
                            {pct >= 100 && (
                              <Badge variant="success" size="sm">
                                Hoàn thành
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums text-warning-foreground">
                            <Coins
                              animated={false}
                              className="h-3.5 w-3.5 text-[#C98A2C]"
                              aria-hidden="true"
                            />
                            {s.price_paid === 0
                              ? "Miễn phí"
                              : formatCoin(s.price_paid || 0)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1 text-xs text-muted-foreground tabular-nums">
                            <div className="flex items-center gap-1.5 text-foreground">
                              <Clock
                                animated={false}
                                className="h-3.5 w-3.5 text-primary"
                              />
                              <span>ĐK: {formatDateTime(s.enrolled_at)}</span>
                            </div>
                            <div className="pl-5">
                              Cuối: {formatDateTime(s.last_activity)}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={detailHref}
                            className="inline-flex items-center gap-1 rounded-full border border-primary-pastel/80 bg-primary-light/45 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
                          >
                            <span>Chi tiết</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-background/50 px-5 py-3.5 sm:flex-row">
            <div className="text-xs text-muted-foreground tabular-nums">
              Tổng cộng:{" "}
              <strong className="text-foreground">
                {data ? data.total.toLocaleString("vi-VN") : 0}
              </strong>{" "}
              học viên
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Trang trước"
                type="button"
                onClick={() => setParam("page", Math.max(1, page - 1))}
                disabled={page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:opacity-45 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-semibold tabular-nums text-foreground">
                Trang {page} / {totalPages}
              </span>
              <button
                aria-label="Trang sau"
                type="button"
                onClick={() => setParam("page", Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:opacity-45 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Context Menu chuột phải */}
      {menuOpen && menuItem && (
        <div
          className="fixed z-50 min-w-[220px] rounded-2xl border border-primary-pastel bg-surface p-1.5 shadow-ambient-lg"
          style={{ left: menuPos.x, top: menuPos.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary-light/60 hover:text-primary cursor-pointer"
            onClick={() => {
              router.push(
                `/lecturer/courses/${courseId}/users/detail?user_id=${menuItem.user_id}`,
              );
              setMenuOpen(false);
            }}
          >
            <ExternalLink className="h-4 w-4 text-primary" />
            Xem chi tiết học viên
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary-light/60 hover:text-primary cursor-pointer"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(menuItem.email);
                showToast.success("Đã sao chép email");
              } catch {}
              setMenuOpen(false);
            }}
          >
            Sao chép Email
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary-light/60 hover:text-primary cursor-pointer"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(menuItem.user_id);
                showToast.success("Đã sao chép mã học viên");
              } catch {}
              setMenuOpen(false);
            }}
          >
            Sao chép mã học viên
          </button>
        </div>
      )}
    </div>
  );
}
