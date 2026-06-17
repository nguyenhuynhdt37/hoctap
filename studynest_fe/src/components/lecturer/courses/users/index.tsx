"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import {
  CourseStudentItem,
  CourseStudentsResponse,
} from "@/types/lecturer/student";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiClock,
  HiOutlineExternalLink,
  HiRefresh,
  HiSearch,
  HiSortAscending,
  HiUserCircle,
} from "react-icons/hi";
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">
              Học viên đăng ký
            </h1>
            <p className="text-gray-600">
              Theo dõi danh sách học viên và tiến độ học tập
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (courseId) {
                  router.push(`/lecturer/courses/${courseId}/stats`);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M3 3a1 1 0 011-1h1a1 1 0 011 1v14H4a1 1 0 01-1-1V3zM8 7a1 1 0 011-1h1a1 1 0 011 1v10H9a1 1 0 01-1-1V7zM13 11a1 1 0 011-1h1a1 1 0 011 1v6h-2a1 1 0 01-1-1v-5z" />
              </svg>
              Thống kê
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-green-200 text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-60"
            >
              {exporting ? (
                <span className="inline-block h-4 w-4 border-2 border-green-600 border-top-transparent rounded-full animate-spin"></span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M3 3a1 1 0 011-1h6a1 1 0 110 2H5v12h10V9a1 1 0 112 0v7a2 2 0 01-2 2H5a2 2 0 01-2-2V3z" />
                  <path d="M13 3a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 11-2 0V4.414l-7.293 7.293a1 1 0 01-1.414-1.414L14.586 3H14a1 1 0 01-1-1z" />
                </svg>
              )}
              Xuất Excel
            </button>
            <button
              type="button"
              onClick={() => mutate()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <HiRefresh className="w-5 h-5" />
              Tải lại
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 md:p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2  gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <HiSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo họ tên hoặc email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Trạng thái học</option>
              <option value="not_started">Chưa học</option>
              <option value="learning">Đang học</option>
              <option value="almost">Gần hoàn thành</option>
              <option value="completed">Hoàn thành</option>
            </select>
            <div className="flex items-center gap-2 md:justify-end">
              <HiSortAscending className="w-5 h-5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Tiến độ từ</span>
              <input
                type="number"
                min={0}
                max={100}
                value={minProgress}
                onChange={(e) => setMinProgress(e.target.value)}
                placeholder="0"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Đến</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxProgress}
                onChange={(e) => setMaxProgress(e.target.value)}
                placeholder="100"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <div className="flex items-center gap-2 md:col-span-2 lg:col-span-1 md:justify-end">
              <span className="text-sm text-gray-600">Hiển thị</span>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">mục</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Học viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Tiến độ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Giá đã mua
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Đăng ký lúc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Hoạt động cuối
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12">
                      <div className="flex items-center justify-center gap-3 text-gray-600">
                        <div className="inline-block h-6 w-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        Đang tải dữ liệu...
                      </div>
                    </td>
                  </tr>
                ) : !data || data.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-600"
                    >
                      Chưa có học viên nào đăng ký
                    </td>
                  </tr>
                ) : (
                  data.students.map((s: CourseStudentItem) => (
                    <tr
                      key={s.user_id}
                      className="hover:bg-gray-50 transition-colors"
                      onContextMenu={(e) => openContextMenu(e, s)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {s.avatar ? (
                            <img
                              src={getGoogleDriveImageUrl(s.avatar)}
                              alt={s.fullname}
                              className="h-9 w-9 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                              <HiUserCircle className="w-6 h-6 text-green-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {s.fullname}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {s.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-full max-w-[220px] h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-green-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, s.progress_percent)
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 min-w-[56px]">
                            {s.progress_percent.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {s.completed_lessons}/{s.total_lessons} bài
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(s.price_paid || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <HiClock className="w-4 h-4 text-gray-400" />
                          <span>{formatDateTime(s.enrolled_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <HiClock className="w-4 h-4 text-gray-400" />
                          <span>{formatDateTime(s.last_activity)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-600">
              Tổng:{" "}
              <span className="font-semibold">{data ? data.total : 0}</span> học
              viên
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                <HiChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                <HiChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {menuOpen && menuItem && (
        <div
          className="fixed z-50 min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg p-1"
          style={{ left: menuPos.x, top: menuPos.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              router.push(
                `/lecturer/courses/${courseId}/users/detail?user_id=${menuItem.user_id}`
              );
              setMenuOpen(false);
            }}
          >
            <HiOutlineExternalLink className="w-4 h-4 text-green-600" />
            Xem chi tiết học viên
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50"
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
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50"
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
