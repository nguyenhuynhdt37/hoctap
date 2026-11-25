"use client";

import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import {
  ArrowRight,
  Award,
  Coins,
  Download,
  Search,
  Star,
  Users,
  X,
} from "pulsoicon-react";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { CoursePerformanceItem } from "@/types/lecturer/statistics";

type SortField = "this_month_revenue" | "revenue" | "total_students" | "average_rating";

const COURSE_PERFORMANCE_QUERY_SCHEMA = {
  search: { type: "string", default: "" as string },
  status: {
    type: "string",
    default: "all",
    allowed: ["all", "approved", "pending", "draft"] as const,
  },
  sort_by: {
    type: "string",
    default: "this_month_revenue",
    allowed: [
      "this_month_revenue",
      "revenue",
      "total_students",
      "average_rating",
    ] as const,
  },
} as const;

const getCourseStatusMeta = (
  status: string,
): { label: string; variant: "success" | "warning" | "destructive" | "default" | "neutral" } => {
  switch (status) {
    case "approved":
      return { label: "Đã duyệt", variant: "success" };
    case "published":
      return { label: "Đã xuất bản", variant: "success" };
    case "pending":
      return { label: "Chờ duyệt", variant: "warning" };
    case "draft":
      return { label: "Bản nháp", variant: "default" };
    case "rejected":
      return { label: "Từ chối", variant: "destructive" };
    case "archived":
      return { label: "Đã lưu trữ", variant: "neutral" };
    default:
      return { label: "Khác", variant: "neutral" };
  }
};

export default function CoursePerformance() {
  const { values, setParam } = useUrlQueryState(
    COURSE_PERFORMANCE_QUERY_SCHEMA,
  );
  const search = values.search;
  const statusFilter = values.status;
  const sortBy = values.sort_by;

  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    commitNow: commitSearchNow,
  } = useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const { data, isLoading } = useSWR<CoursePerformanceItem[]>(
    "/lecturer/statistics/courses",
    async (url) => {
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    { revalidateOnFocus: false },
  );

  const { rows, maxRevenue } = useMemo(() => {
    const list = Array.isArray(data) ? [...data] : [];
    const q = search.trim().toLowerCase();

    const filtered = list.filter((course) => {
      if (statusFilter === "approved") {
        if (course.status !== "approved" && course.status !== "published") {
          return false;
        }
      } else if (statusFilter !== "all" && course.status !== statusFilter) {
        return false;
      }
      if (q && !course.title.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    const maxRev = Math.max(1, ...filtered.map((c) => c.revenue || 0));
    return { rows: filtered, maxRevenue: maxRev };
  }, [data, search, statusFilter, sortBy]);

  const handleExportCsv = () => {
    if (rows.length === 0) {
      showToast.error("Không có dữ liệu để xuất báo cáo.");
      return;
    }
    const headers = [
      "Hạng",
      "Tên khóa học",
      "Trạng thái",
      "Số học viên",
      "Điểm đánh giá",
      "Số đánh giá",
      "Doanh thu tháng này (VND)",
      "Tổng doanh thu (VND)",
    ];
    const escapeCell = (v: string | number) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;

    const lines = [
      headers.map(escapeCell).join(","),
      ...rows.map((c, idx) =>
        [
          idx + 1,
          c.title,
          getCourseStatusMeta(c.status).label,
          c.total_students,
          (c.average_rating ?? 0).toFixed(1),
          c.reviews_count ?? 0,
          c.this_month_revenue ?? 0,
          c.revenue ?? 0,
        ]
          .map(escapeCell)
          .join(","),
      ),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-hieu-suat-khoa-hoc-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast.success("Đã xuất báo cáo CSV thành công.");
  };

  return (
    <Card
      variant="surface"
      density="none"
      className="overflow-hidden rounded-[28px] border border-border shadow-xs"
    >
      {/* Header + Công cụ lọc & Xuất CSV */}
      <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-primary-light/45 via-surface to-accent-vanilla/45 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Ma trận hiệu suất khóa học
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            So sánh doanh thu tháng, tổng thu nhập, học viên và chất lượng từng khóa học
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Tìm nhanh */}
          <div className="relative w-full sm:w-56">
            <Search
              animated={false}
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm tên khóa học..."
              className="h-9 w-full rounded-full border border-border bg-surface pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Xóa từ khóa"
                onClick={() => commitSearchNow("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc trạng thái */}
          <div
            className="inline-flex items-center rounded-full border border-border bg-surface p-1"
            role="group"
            aria-label="Lọc trạng thái khóa học"
          >
            {[
              { key: "all" as const, label: "Tất cả" },
              { key: "approved" as const, label: "Đã duyệt" },
              { key: "pending" as const, label: "Chờ duyệt" },
              { key: "draft" as const, label: "Bản nháp" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setParam("status", tab.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sắp xếp */}
          <select
            value={sortBy}
            onChange={(e) => setParam("sort_by", e.target.value as SortField)}
            aria-label="Sắp xếp theo"
            className="h-9 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="this_month_revenue">Sắp xếp: Doanh thu tháng</option>
            <option value="revenue">Sắp xếp: Tổng doanh thu</option>
            <option value="total_students">Sắp xếp: Nhiều học viên</option>
            <option value="average_rating">Sắp xếp: Đánh giá cao</option>
          </select>

          {/* Xuất CSV */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full bg-surface"
            onClick={handleExportCsv}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* Bảng hiệu suất */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background/60">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Khóa học &amp; Tỷ trọng
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Học viên
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Đánh giá
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Doanh thu
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground print:hidden">
                Chi tiết
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <Skeleton variant="text" className="h-5 w-52" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton variant="text" className="mx-auto h-5 w-20" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton variant="text" className="mx-auto h-4 w-12" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton variant="text" className="mx-auto h-4 w-16" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton variant="text" className="ml-auto h-4 w-24" />
                  </td>
                  <td className="px-4 py-4" />
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  Chưa có khóa học nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              rows.map((course, idx) => {
                const revPct = Math.min(
                  100,
                  Math.max(4, Math.round(((course.revenue || 0) / maxRevenue) * 100)),
                );
                return (
                  <tr
                    key={course.course_id}
                    className="group transition-colors hover:bg-primary-light/20"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                            idx === 0
                              ? "border border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                              : "border border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {idx === 0 ? (
                            <Award animated={false} className="h-3.5 w-3.5" />
                          ) : (
                            `#${idx + 1}`
                          )}
                        </span>

                        <div className="h-10 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/50">
                          <img
                            src={getImageUrl(
                              course.thumbnail || "/logo/studynest-logo.svg",
                            )}
                            alt={course.title}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 max-w-xs">
                          <Link
                            href={`/lecturer/courses/${course.course_id}/stats`}
                            className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                            title={course.title}
                          >
                            {course.title}
                          </Link>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-primary-light/70">
                            <div
                              className="h-full rounded-full bg-primary/80 transition-all duration-300 group-hover:bg-primary"
                              style={{ width: `${revPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      {(() => {
                        const meta = getCourseStatusMeta(course.status);
                        return (
                          <Badge variant={meta.variant} size="sm" dot>
                            {meta.label}
                          </Badge>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light/50 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                        <Users
                          animated={false}
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                        {course.total_students.toLocaleString("vi-VN")}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-foreground">
                        <Star
                          animated={false}
                          className="h-3.5 w-3.5 fill-current text-accent-vanilla-foreground"
                          aria-hidden="true"
                        />
                        {(course.average_rating ?? 0).toFixed(1)}
                        <span className="font-normal text-muted-foreground">
                          ({course.reviews_count ?? 0})
                        </span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <p className="inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums text-warning-foreground">
                        <Coins
                          animated={false}
                          className="h-3.5 w-3.5 text-[#C98A2C]"
                          aria-hidden="true"
                        />
                        {formatVndAsCoin(course.this_month_revenue)}
                      </p>
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        Tổng: {formatVndAsCoin(course.revenue)}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right print:hidden">
                      <Link
                        href={`/lecturer/courses/${course.course_id}/stats`}
                        className="inline-flex items-center gap-1 rounded-full border border-primary-pastel/80 bg-primary-light/40 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
                      >
                        <span>Phân tích</span>
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
    </Card>
  );
}
