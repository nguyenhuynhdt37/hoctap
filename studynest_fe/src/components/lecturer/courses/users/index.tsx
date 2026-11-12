"use client";

import { Button, Card } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import {
  CourseStudentItem,
  CourseStudentsResponse,
} from "@/types/lecturer/student";
import {
  ArrowUpDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  UserCircle,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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

export default function LecturerCourseStudents() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params?.id;

  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [limit, setLimit] = useState(
    parseInt(searchParams.get("limit") || "20", 10)
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [minProgress, setMinProgress] = useState<string>(
    searchParams.get("min_progress") || ""
  );
  const [maxProgress, setMaxProgress] = useState<string>(
    searchParams.get("max_progress") || ""
  );
  const [status, setStatus] = useState<string>(
    searchParams.get("status") || ""
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get("sort_by") || "enrolled_at"
  );
  const [orderDir, setOrderDir] = useState<"asc" | "desc">(
    (searchParams.get("order_dir") as "asc" | "desc") || "desc"
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    minProgress,
    maxProgress,
    status,
    sortBy,
    orderDir,
    limit,
  ]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sort_by", sortBy);
    params.set("order_dir", orderDir);
    if (debouncedSearch) params.set("search", debouncedSearch.trim());
    if (minProgress) params.set("min_progress", minProgress);
    if (maxProgress) params.set("max_progress", maxProgress);
    if (status) params.set("status", status);
    return params.toString();
  }, [
    page,
    limit,
    debouncedSearch,
    minProgress,
    maxProgress,
    status,
    sortBy,
    orderDir,
  ]);

  const { data, isLoading, mutate } = useSWR<CourseStudentsResponse>(
    courseId ? `/lecturer/courses/${courseId}/students?${queryString}` : null,
    async (url) => {
      const res = await api.get(url, {
        headers: { accept: "application/json" },
      });
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  // Context menu
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
      const params = new URLSearchParams();
      params.set("sort_by", sortBy);
      params.set("order_dir", orderDir);
      if (debouncedSearch) params.set("search", debouncedSearch.trim());
      if (minProgress) params.set("min_progress", minProgress);
      if (maxProgress) params.set("max_progress", maxProgress);
      if (status) params.set("status", status);
      const url = `/lecturer/courses/${courseId}/students/export?${params.toString()}`;
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
      link.download = `students-${courseId}-${y}${m}${d}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      // keep silent per project minimal error surfaces
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Học viên đăng ký
            </h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi danh sách học viên và tiến độ học tập
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (courseId) {
                  router.push(`/lecturer/courses/${courseId}/stats`);
                }
              }}
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              Thống kê
            </Button>
            <Button
              type="button"
              variant="pastel"
              onClick={handleExport}
              disabled={exporting}
              isLoading={exporting}
              loadingText="Đang xuất..."
              leftIcon={!exporting ? <Download className="w-4 h-4" /> : undefined}
            >
              Xuất Excel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => mutate()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Tải lại
            </Button>
          </div>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm theo họ tên hoặc email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                />
              </div>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
            >
              <option value="">Trạng thái học</option>
              <option value="not_started">Chưa học</option>
              <option value="learning">Đang học</option>
              <option value="almost">Gần hoàn thành</option>
              <option value="completed">Hoàn thành</option>
            </select>
            <div className="flex items-center gap-2 md:justify-end">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3.5 py-2.5 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              >
                <option value="enrolled_at">Ngày đăng ký</option>
                <option value="last_activity">Hoạt động cuối</option>
                <option value="progress">Tiến độ</option>
                <option value="price">Giá đã mua</option>
              </select>
              <select
                value={orderDir}
                onChange={(e) =>
                  setOrderDir(e.target.value === "asc" ? "asc" : "desc")
                }
                className="px-3.5 py-2.5 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tiến độ từ</span>
              <input
                type="number"
                min={0}
                max={100}
                value={minProgress}
                onChange={(e) => setMinProgress(e.target.value)}
                placeholder="0"
                className="w-24 px-3 py-2 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Đến</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxProgress}
                onChange={(e) => setMaxProgress(e.target.value)}
                placeholder="100"
                className="w-24 px-3 py-2 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="flex items-center gap-2 md:col-span-2 lg:col-span-1 md:justify-end">
              <span className="text-sm text-muted-foreground">Hiển thị</span>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-muted-foreground">mục</span>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background/80 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Học viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tiến độ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Giá đã mua
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Đăng ký lúc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hoạt động cuối
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12">
                      <div className="flex items-center justify-center gap-3 text-muted-foreground">
                        <div className="inline-block h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Đang tải dữ liệu...
                      </div>
                    </td>
                  </tr>
                ) : !data || data.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      Chưa có học viên nào đăng ký
                    </td>
                  </tr>
                ) : (
                  data.students.map((s: CourseStudentItem) => (
                    <tr
                      key={s.user_id}
                      className="hover:bg-primary-light/30 transition-colors"
                      onContextMenu={(e) => openContextMenu(e, s)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {s.avatar ? (
                            <img
                              src={getImageUrl(s.avatar)}
                              alt={s.fullname}
                              className="h-9 w-9 rounded-full object-cover border border-border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center">
                              <UserCircle className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {s.fullname}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-full max-w-[220px] h-2 bg-primary-light rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-primary rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, s.progress_percent)
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground min-w-[56px]">
                            {s.progress_percent.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {s.completed_lessons}/{s.total_lessons} bài
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(s.price_paid || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDateTime(s.enrolled_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDateTime(s.last_activity)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface">
            <div className="text-sm text-muted-foreground">
              Tổng:{" "}
              <span className="font-semibold text-foreground">
                {data ? data.total : 0}
              </span>{" "}
              học viên
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-2 border border-border bg-surface text-foreground hover:bg-primary-light/60 rounded-xl text-sm disabled:opacity-50 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-foreground font-medium">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 border border-border bg-surface text-foreground hover:bg-primary-light/60 rounded-xl text-sm disabled:opacity-50 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Context Menu */}
      {menuOpen && menuItem && (
        <div
          className="fixed z-50 min-w-[220px] bg-surface border border-border rounded-xl shadow-lg p-1.5"
          style={{ left: menuPos.x, top: menuPos.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/60 hover:text-primary flex items-center gap-2 cursor-pointer transition-colors"
            onClick={() => {
              router.push(
                `/lecturer/courses/${courseId}/users/detail?user_id=${menuItem.user_id}`
              );
              setMenuOpen(false);
            }}
          >
            <ExternalLink className="w-4 h-4 text-primary" />
            Xem chi tiết học viên
          </button>
          <div className="h-px bg-border my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/60 hover:text-primary cursor-pointer transition-colors"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(menuItem.email);
              } catch {}
              setMenuOpen(false);
            }}
          >
            Sao chép Email
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/60 hover:text-primary cursor-pointer transition-colors"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(menuItem.user_id);
              } catch {}
              setMenuOpen(false);
            }}
          >
            Sao chép User ID
          </button>
        </div>
      )}
    </div>
  );
}
