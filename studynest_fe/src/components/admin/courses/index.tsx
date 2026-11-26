"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  Folder,
  GraduationCap,
  LayoutGrid,
  Play,
  RefreshCw,
  Search,
  Star,
  Table2,
  Users,
  X,
  XCircle,
} from "pulsoicon-react";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  AdminCourseListItem,
  AdminCoursesResponse,
} from "@/types/admin/course";

const COURSES_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  size: { type: "number", default: 12, min: 1, max: 100 },
  search: { type: "string", default: "" },
  status: {
    type: "string",
    default: "" as
      | ""
      | "pending"
      | "approved_live"
      | "approved_hidden"
      | "rejected",
    allowed: [
      "",
      "pending",
      "approved_live",
      "approved_hidden",
      "rejected",
    ] as const,
  },
  price_type: {
    type: "string",
    default: "" as "" | "free" | "paid",
    allowed: ["", "free", "paid"] as const,
  },
  level: {
    type: "string",
    default: "" as "" | "beginner" | "intermediate" | "advanced" | "all",
    allowed: ["", "beginner", "intermediate", "advanced", "all"] as const,
  },
  sort_by: {
    type: "string",
    default: "pending_first" as
      | "pending_first"
      | "updated_at"
      | "created_at"
      | "total_enrolls"
      | "base_price"
      | "rating_avg"
      | "review_round",
    allowed: [
      "pending_first",
      "updated_at",
      "created_at",
      "total_enrolls",
      "base_price",
      "rating_avg",
      "review_round",
    ] as const,
  },
  order: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

const LEVEL_LABELS: Record<string, string> = {
  all: "Mọi trình độ",
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

const QUICK_REJECT_REASONS = [
  "Khóa học còn bài giảng trống nội dung hoặc chưa tải video lên.",
  "Thiếu ảnh bìa rõ nét hoặc mô tả khóa học chưa nêu rõ mục tiêu đầu ra.",
  "Chưa gán đúng Môn học / Khối lớp trong danh mục học thuật.",
  "Âm thanh / hình ảnh bài giảng chưa đạt chuẩn rõ ràng, cần cập nhật lại.",
  "Câu hỏi bài tập chưa cấu hình đầy đủ đáp án đúng và giải thích.",
];

function formatDurationShort(sec?: number | null): string {
  const s = Math.max(0, Math.round(Number(sec || 0)));
  if (s === 0) return "0p";
  const h = Math.floor(s / 3600);
  const m = Math.max(1, Math.round((s % 3600) / 60));
  return h > 0 ? `${h}g ${m}p` : `${m} phút`;
}

function formatDateShort(val?: string | null): string {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(val));
  } catch {
    return "—";
  }
}

function exportCoursesCsv(items: AdminCourseListItem[]) {
  const header = [
    "ID",
    "Tên khóa học",
    "Giảng viên",
    "Email GV",
    "Trạng thái duyệt",
    "Hiển thị",
    "Vòng duyệt",
    "Giá VND",
    "Số chương",
    "Số bài học",
    "Học viên",
    "Đánh giá",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map((c) =>
      [
        c.id,
        c.title,
        c.instructor.fullname,
        c.instructor.email,
        c.approval_status,
        c.is_published ? "Công khai" : "Đang ẩn",
        String(c.review_round),
        String(c.base_price),
        String(c.sections_count),
        String(c.lessons_count),
        String(c.total_enrolls),
        String(c.rating_avg),
      ]
        .map(esc)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `may-may-courses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StatusBadge({ item }: { item: AdminCourseListItem }) {
  if (item.approval_status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-bg px-2.5 py-0.5 text-[11px] font-bold text-warning-foreground">
        <Clock size={11} animated={false} />
        Chờ duyệt · Vòng #{item.review_round}
      </span>
    );
  }
  if (item.approval_status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive-border bg-destructive-bg px-2.5 py-0.5 text-[11px] font-bold text-destructive-foreground">
        <XCircle size={11} animated={false} />
        Cần chỉnh sửa · Vòng #{item.review_round}
      </span>
    );
  }
  if (item.is_published) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success-foreground">
        <CheckCircle2 size={11} animated={false} />
        Đang lên sàn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-info-border bg-info-bg px-2.5 py-0.5 text-[11px] font-semibold text-info-foreground">
      <EyeOff size={11} animated={false} />
      Đã duyệt · Tạm ẩn
    </span>
  );
}

export default function AdminCoursesManagement() {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Modal Phê duyệt / Yêu cầu sửa nhanh
  const [reviewModal, setReviewModal] = useState<{
    mode: "approve" | "reject";
    course: AdminCourseListItem;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [publishOnApprove, setPublishOnApprove] = useState(true);

  const { values, setParam, setParams, resetParams } = useUrlQueryState(
    COURSES_QUERY_SCHEMA,
  );
  const {
    page,
    size: pageSize,
    search,
    status: statusParam,
    price_type: priceParam,
    level: levelParam,
    sort_by: sortBy,
    order: sortOrder,
  } = values;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const apiParams = useMemo(() => {
    const p: Record<string, string | number> = {
      page,
      size: pageSize,
      sort_by: sortBy,
      order: sortOrder,
    };
    if (search.trim()) p.search = search.trim();
    if (statusParam) p.status = statusParam;
    if (priceParam) p.price_type = priceParam;
    if (levelParam) p.level = levelParam;
    return p;
  }, [
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
    statusParam,
    priceParam,
    levelParam,
  ]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<AdminCoursesResponse>(
      ["/admin/courses", apiParams],
      async ([url, params]: [string, Record<string, string | number>]) =>
        (await api.get(url, { params })).data,
      { revalidateOnFocus: false },
    );

  const items = data?.items ?? [];
  const totalItems = data?.total_items ?? 0;
  const totalPages = Math.max(1, data?.total_pages ?? 1);
  const summary = data?.summary;

  const hasFilter = Boolean(
    search || statusParam || priceParam || levelParam,
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function refreshAll() {
    await Promise.all([mutate(), globalMutate("/admin/courses/stats")]);
  }

  async function submitSingleReview() {
    if (!reviewModal) return;
    if (reviewModal.mode === "reject" && reviewNote.trim().length < 5) {
      toast.error(
        "Vui lòng nhập lý do / hướng dẫn chỉnh sửa tối thiểu 5 ký tự.",
      );
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/courses/${reviewModal.course.id}/review`, {
        action: reviewModal.mode,
        note: reviewNote.trim() || null,
        publish_on_approve: publishOnApprove,
      });
      toast.success(
        reviewModal.mode === "approve"
          ? `Đã phê duyệt khóa học “${reviewModal.course.title}”!`
          : `Đã gửi yêu cầu chỉnh sửa tới giảng viên ${reviewModal.course.instructor.fullname}.`,
      );
      setReviewModal(null);
      setReviewNote("");
      await refreshAll();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể xử lý yêu cầu kiểm duyệt.";
      toast.error(detail);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleVisibility(item: AdminCourseListItem) {
    const nextAction = item.is_published ? "unpublish" : "publish";
    setBusy(true);
    try {
      await api.post(`/admin/courses/${item.id}/review`, {
        action: nextAction,
      });
      toast.success(
        nextAction === "publish"
          ? "Đã bật hiển thị khóa học trên sàn!"
          : "Đã tạm ẩn khóa học khỏi danh mục công khai.",
      );
      await refreshAll();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể đổi trạng thái hiển thị.";
      toast.error(detail);
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkAction(action: "approve" | "unpublish") {
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      await api.post("/admin/courses/bulk-review", {
        course_ids: selectedIds,
        action,
        publish_on_approve: true,
      });
      toast.success(
        action === "approve"
          ? `Đã phê duyệt ${selectedIds.length} khóa học!`
          : `Đã tạm ẩn ${selectedIds.length} khóa học.`,
      );
      setSelectedIds([]);
      await refreshAll();
    } catch {
      toast.error("Không thể thực hiện thao tác hàng loạt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Ambient Cloud Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-12 h-96 w-96 rounded-full bg-primary-light/60 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-vanilla/45 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-accent/35 blur-3xl" />
      </div>

      {/* Editorial Cloud Hero */}
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent-vanilla/45 p-6 shadow-[0_24px_60px_-22px_rgba(53,111,167,0.18)] backdrop-blur-md sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/85 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-surface/95 px-3.5 py-1 text-xs font-semibold text-accent-vanilla-foreground shadow-2xs">
                <BookOpen size={13} animated={false} />
                Mây Mây Academic Quality Gate
              </span>
              <Link
                href="/admin/catalog/courses"
                className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
              >
                <Folder size={12} animated={false} />
                Gán phân loại Môn / Lớp
                <ArrowUpRight size={12} animated={false} />
              </Link>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Quản lý, Xem trước &amp; Phê duyệt Khóa học
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Thẩm định toàn diện chất lượng học liệu trước khi phát hành lên
              sàn: xem trực tiếp Video bài giảng, kiểm tra đáp án bài tập tương
              tác (Quiz, Code, Listening, Speaking) và phản hồi trực tiếp cho
              Giảng viên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isValidating}
              onClick={() => void refreshAll()}
            >
              <RefreshCw
                size={14}
                className={isValidating ? "animate-spin" : ""}
              />
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={items.length === 0}
              onClick={() => {
                exportCoursesCsv(items);
                toast.success(`Đã xuất ${items.length} khóa học ra CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* 4 Interactive KPI Cards */}
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setParams({ status: "pending", page: 1 })}
            className={`rounded-2xl border p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
              statusParam === "pending"
                ? "border-warning-border bg-warning-bg/85 shadow-sm"
                : "border-white/80 bg-surface/85 hover:border-warning-border"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Hàng đợi Chờ phê duyệt</span>
              <Clock
                size={14}
                animated={false}
                className="text-warning-foreground"
              />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-warning-foreground">
              {(summary?.pending ?? 0).toLocaleString("vi-VN")}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                khóa học
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {(summary?.pending ?? 0) > 0
                ? "Bấm để mở danh sách cần thẩm định ngay"
                : "Không có khóa học nào đang tồn đọng"}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setParams({ status: "approved_live", page: 1 })}
            className={`rounded-2xl border p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
              statusParam === "approved_live"
                ? "border-success-border bg-success-bg/80 shadow-sm"
                : "border-white/80 bg-surface/85 hover:border-success-border"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Đang phát hành trên sàn</span>
              <CheckCircle2
                size={14}
                animated={false}
                className="text-success-foreground"
              />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-success-foreground">
              {(summary?.approved_live ?? 0).toLocaleString("vi-VN")}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                công khai
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              +{(summary?.approved_hidden ?? 0).toLocaleString("vi-VN")} khóa đã
              duyệt đang tạm ẩn
            </p>
          </button>

          <button
            type="button"
            onClick={() => setParams({ status: "rejected", page: 1 })}
            className={`rounded-2xl border p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
              statusParam === "rejected"
                ? "border-destructive-border bg-destructive-bg/80 shadow-sm"
                : "border-white/80 bg-surface/85 hover:border-destructive-border"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Yêu cầu chỉnh sửa</span>
              <XCircle
                size={14}
                animated={false}
                className="text-destructive-foreground"
              />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-destructive-foreground">
              {(summary?.rejected ?? 0).toLocaleString("vi-VN")}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                khóa học
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Đang chờ Giảng viên cập nhật &amp; gửi duyệt lại
            </p>
          </button>

          <button
            type="button"
            onClick={() => setParams({ status: "", page: 1 })}
            className={`rounded-2xl border p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
              statusParam === ""
                ? "border-primary/60 bg-surface shadow-sm"
                : "border-white/80 bg-surface/85 hover:border-primary-pastel"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Tổng quy mô Học liệu</span>
              <Users size={14} animated={false} className="text-primary" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-foreground">
              {(summary?.total ?? totalItems).toLocaleString("vi-VN")}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                khóa · {(summary?.total_lessons ?? 0).toLocaleString("vi-VN")}{" "}
                bài
              </span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-primary">
              {(summary?.total_enrolls ?? 0).toLocaleString("vi-VN")} lượt học
              viên ghi danh
            </p>
          </button>
        </div>
      </section>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-pastel bg-primary-light/85 px-4 py-3 text-xs shadow-xs">
          <span className="font-semibold text-foreground">
            Đã chọn <strong>{selectedIds.length}</strong> khóa học
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void handleBulkAction("approve")}
            >
              <CheckCircle2 size={14} />
              Duyệt &amp; Công khai ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void handleBulkAction("unpublish")}
            >
              <EyeOff size={14} />
              Tạm ẩn ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Filter & View Mode Toolbar */}
      <section className="space-y-4 rounded-3xl border border-primary-pastel/60 bg-surface/90 p-4 shadow-[0_12px_32px_-16px_rgba(53,111,167,0.14)] backdrop-blur-md sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background/80 p-1">
            {(
              [
                { value: "", label: "Tất cả" },
                {
                  value: "pending",
                  label: `Chờ duyệt (${summary?.pending ?? 0})`,
                },
                { value: "approved_live", label: "Đang lên sàn" },
                { value: "approved_hidden", label: "Đã duyệt · Tạm ẩn" },
                { value: "rejected", label: "Cần chỉnh sửa" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => setParams({ status: tab.value, page: 1 })}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusParam === tab.value
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setLayout("cards")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                layout === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} animated={false} />
              Thẻ Khóa học
            </button>
            <button
              type="button"
              onClick={() => setLayout("table")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                layout === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table2 size={14} animated={false} />
              Bảng Kiểm duyệt
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search
              size={15}
              animated={false}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm tên khóa học, slug, tên hoặc email giảng viên..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:col-span-7">
            <select
              aria-label="Lọc học phí"
              value={priceParam}
              onChange={(e) =>
                setParams({
                  price_type: e.target.value as "" | "free" | "paid",
                  page: 1,
                })
              }
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Mọi mức học phí</option>
              <option value="paid">Khóa học có phí (Coin)</option>
              <option value="free">Khóa học miễn phí</option>
            </select>

            <select
              aria-label="Lọc trình độ"
              value={levelParam}
              onChange={(e) =>
                setParams({
                  level: e.target.value as typeof levelParam,
                  page: 1,
                })
              }
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Mọi trình độ</option>
              <option value="beginner">Cơ bản</option>
              <option value="intermediate">Trung cấp</option>
              <option value="advanced">Nâng cao</option>
            </select>

            <div className="col-span-2 flex gap-2 sm:col-span-1">
              <select
                aria-label="Sắp xếp"
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, od] = e.target.value.split(":") as [
                    typeof sortBy,
                    "asc" | "desc",
                  ];
                  setParams({ sort_by: sb, order: od, page: 1 });
                }}
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
              >
                <option value="pending_first:desc">Ưu tiên Chờ duyệt</option>
                <option value="updated_at:desc">Cập nhật mới nhất</option>
                <option value="created_at:desc">Mới tạo gần đây</option>
                <option value="total_enrolls:desc">Nhiều học viên nhất</option>
                <option value="base_price:desc">Học phí cao nhất</option>
                <option value="review_round:desc">Nhiều vòng duyệt nhất</option>
              </select>

              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInput("");
                    resetParams();
                  }}
                >
                  Đặt lại
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được danh sách khóa học.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-[2rem] border border-border bg-surface p-5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <BookOpen size={22} animated={false} />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            Không có khóa học nào khớp bộ lọc hiện tại
          </p>
          {hasFilter && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchInput("");
                resetParams();
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : layout === "cards" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => {
            const checked = selectedIds.includes(c.id);
            return (
              <article
                key={c.id}
                onClick={() => router.push(`/admin/courses/${c.id}`)}
                className={`group flex cursor-pointer flex-col justify-between overflow-hidden rounded-[2rem] border bg-surface/95 shadow-[0_14px_36px_-16px_rgba(53,111,167,0.16)] transition-all hover:-translate-y-1 hover:shadow-[0_22px_48px_-16px_rgba(53,111,167,0.22)] ${
                  c.approval_status === "pending"
                    ? "border-warning-border/90"
                    : c.approval_status === "rejected"
                      ? "border-destructive-border/80"
                      : "border-primary-pastel/60 hover:border-primary"
                }`}
              >
                <div>
                  {/* Cover Thumbnail */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-primary-light/50">
                    {c.thumbnail_url ? (
                      <img
                        src={getImageUrl(c.thumbnail_url)}
                        alt={c.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-primary/70">
                        <BookOpen size={28} animated={false} />
                        <span className="text-[11px] font-semibold">
                          Chưa có ảnh bìa
                        </span>
                      </div>
                    )}

                    <div
                      className="absolute left-3 top-3 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(c.id)}
                        aria-label={`Chọn ${c.title}`}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <StatusBadge item={c} />
                    </div>

                    <div className="absolute bottom-3 right-3 rounded-xl border border-white/85 bg-surface/95 px-2.5 py-1 text-xs font-bold text-primary shadow-xs backdrop-blur-sm">
                      {c.base_price <= 0 ? (
                        <span className="text-success-foreground">
                          Miễn phí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Coins size={12} animated={false} />
                          {formatVndAsCoin(c.base_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-3 p-5">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate font-medium text-primary">
                          {c.category?.name || "Chưa gán danh mục"}
                        </span>
                        <span>{LEVEL_LABELS[c.level] || c.level}</span>
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-primary">
                        {c.title}
                      </h3>
                    </div>

                    {/* Instructor Row + PKI Contract */}
                    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/60 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {c.instructor.avatar ? (
                          <img
                            src={getImageUrl(c.instructor.avatar)}
                            alt={c.instructor.fullname}
                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-vanilla text-[11px] font-bold text-accent-vanilla-foreground">
                            {(c.instructor.fullname || "G")
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {c.instructor.fullname}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {c.instructor.email}
                          </p>
                        </div>
                      </div>

                      {c.instructor.master_contract_status ===
                      "countersigned" ? (
                        <span
                          title={`Hợp đồng ${c.instructor.master_contract_number || ""}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-success-border bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success-foreground"
                        >
                          <FileCheck2 size={10} animated={false} />
                          PKI OK
                        </span>
                      ) : (
                        <span
                          title="Giảng viên chưa hoàn tất đồng ký Hợp đồng Đối tác"
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-warning-border bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning-foreground"
                        >
                          <AlertTriangle size={10} animated={false} />
                          Chưa đủ HĐ
                        </span>
                      )}
                    </div>

                    {/* Rejection note preview */}
                    {c.approval_status === "rejected" && c.approval_note && (
                      <div className="rounded-xl border border-destructive-border/70 bg-destructive-bg/60 px-3 py-2 text-[11px] text-destructive-foreground">
                        <strong className="font-semibold">Lý do sửa:</strong>{" "}
                        <span className="line-clamp-2">{c.approval_note}</span>
                      </div>
                    )}

                    {/* 3 Curriculum & Enrollment Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-background/75 p-2">
                        <p className="text-[10px] text-muted-foreground">
                          Chương · Bài
                        </p>
                        <p className="mt-0.5 font-bold text-foreground">
                          {c.sections_count} · {c.lessons_count}
                        </p>
                      </div>
                      <div className="rounded-xl bg-background/75 p-2">
                        <p className="text-[10px] text-muted-foreground">
                          Thời lượng
                        </p>
                        <p className="mt-0.5 font-bold text-foreground">
                          {formatDurationShort(c.total_length_seconds)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-primary-light/55 p-2">
                        <p className="text-[10px] text-muted-foreground">
                          Học viên
                        </p>
                        <p className="mt-0.5 font-bold text-primary">
                          {c.total_enrolls.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Strip */}
                <div
                  className="flex items-center justify-between gap-2 border-t border-border/70 bg-background/40 px-5 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={`/admin/courses/${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-light px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Play size={12} animated={false} />
                    Xem trước &amp; Thẩm định
                  </Link>

                  <div className="flex items-center gap-1">
                    {c.approval_status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModal({ mode: "approve", course: c });
                          setReviewNote("");
                          setPublishOnApprove(true);
                        }}
                        title="Phê duyệt nhanh"
                        aria-label={`Phê duyệt ${c.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-success-foreground hover:bg-success-bg"
                      >
                        <CheckCircle2 size={15} animated={false} />
                      </button>
                    )}
                    {c.approval_status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModal({ mode: "reject", course: c });
                          setReviewNote(c.approval_note || "");
                        }}
                        title="Yêu cầu chỉnh sửa"
                        aria-label={`Yêu cầu sửa ${c.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-destructive-foreground hover:bg-destructive-bg"
                      >
                        <XCircle size={15} animated={false} />
                      </button>
                    )}
                    {c.approval_status === "approved" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggleVisibility(c)}
                        title={
                          c.is_published
                            ? "Tạm ẩn khỏi sàn"
                            : "Bật công khai lên sàn"
                        }
                        aria-label={`Đổi hiển thị ${c.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary-light hover:text-primary"
                      >
                        {c.is_published ? (
                          <EyeOff size={14} animated={false} />
                        ) : (
                          <Eye size={14} animated={false} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[2rem] border border-primary-pastel/60 bg-surface/95 shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="px-4 py-3.5">Khóa học</th>
                <th className="px-4 py-3.5">Giảng viên</th>
                <th className="px-4 py-3.5">Cấu trúc</th>
                <th className="px-4 py-3.5">Học phí</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5">Cập nhật</th>
                <th className="px-5 py-3.5 text-right">Thẩm định</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/courses/${c.id}`)}
                  className="cursor-pointer transition-colors hover:bg-primary-light/25"
                >
                  <td className="max-w-[300px] px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {c.thumbnail_url ? (
                        <img
                          src={getImageUrl(c.thumbnail_url)}
                          alt={c.title}
                          className="h-11 w-16 shrink-0 rounded-xl border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                          <BookOpen size={16} animated={false} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {c.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.category?.name || "Chưa gán danh mục"} ·{" "}
                          <span className="inline-flex items-center gap-0.5 text-accent-vanilla-foreground">
                            <Star size={10} animated={false} />
                            {c.rating_avg.toFixed(1)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="flex items-center gap-1 font-medium text-foreground">
                      <GraduationCap
                        size={12}
                        animated={false}
                        className="text-primary"
                      />
                      <span className="truncate">{c.instructor.fullname}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.instructor.email}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <strong>{c.sections_count}</strong> chương ·{" "}
                    <strong className="text-primary">{c.lessons_count}</strong>{" "}
                    bài
                    <p className="text-[11px] text-muted-foreground">
                      {c.total_enrolls.toLocaleString("vi-VN")} học viên
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-primary">
                    {c.base_price <= 0
                      ? "Miễn phí"
                      : formatVndAsCoin(c.base_price)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge item={c} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {formatDateShort(c.updated_at)}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/admin/courses/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary-light px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <Play size={12} animated={false} />
                        Xem trước
                      </Link>
                      {c.approval_status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewModal({ mode: "approve", course: c });
                            setReviewNote("");
                            setPublishOnApprove(true);
                          }}
                          title="Phê duyệt"
                          aria-label={`Phê duyệt ${c.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-success-foreground hover:bg-success-bg"
                        >
                          <CheckCircle2 size={15} animated={false} />
                        </button>
                      )}
                      {c.approval_status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewModal({ mode: "reject", course: c });
                            setReviewNote(c.approval_note || "");
                          }}
                          title="Yêu cầu sửa"
                          aria-label={`Yêu cầu sửa ${c.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-destructive-foreground hover:bg-destructive-bg"
                        >
                          <XCircle size={15} animated={false} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        itemLabel="khóa học"
        disabled={isValidating}
        onPageChange={(nextPage) => setParam("page", nextPage)}
        onPageSizeChange={(nextSize) => setParams({ size: nextSize, page: 1 })}
      />

      {/* Quick Approve / Reject Modal */}
      {reviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {reviewModal.mode === "approve"
                    ? "Phê duyệt Khóa học lên sàn"
                    : "Yêu cầu Giảng viên chỉnh sửa"}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {reviewModal.course.title} · GV:{" "}
                  <strong className="text-foreground">
                    {reviewModal.course.instructor.fullname}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setReviewModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-background"
              >
                <X size={16} />
              </button>
            </div>

            {reviewModal.mode === "approve" ? (
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-success-border bg-success-bg/60 px-4 py-3 text-xs">
                <div>
                  <p className="font-bold text-success-foreground">
                    Tự động bật công khai lên sàn ngay
                  </p>
                  <p className="text-[11px] text-success-foreground/80">
                    Học viên có thể tìm thấy và đăng ký khóa học ngay sau khi
                    duyệt.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={publishOnApprove}
                  onChange={(e) => setPublishOnApprove(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Gợi ý nhanh lý do cần chỉnh sửa:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REJECT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() =>
                        setReviewNote((prev) =>
                          prev ? `${prev}\n- ${reason}` : `- ${reason}`,
                        )
                      }
                      className="rounded-xl border border-border bg-background px-2.5 py-1 text-left text-[11px] text-foreground transition-colors hover:border-primary hover:bg-primary-light"
                    >
                      + {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                {reviewModal.mode === "approve"
                  ? "Ghi chú phản hồi cho Giảng viên (tùy chọn)"
                  : "Nội dung góp ý / yêu cầu chỉnh sửa *"}
              </label>
              <textarea
                rows={4}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  reviewModal.mode === "approve"
                    ? "Ví dụ: Nội dung bài giảng rất chỉn chu, chúc khóa học đạt nhiều học viên!"
                    : "Nêu rõ bài học hoặc mục nào giảng viên cần bổ sung trước khi gửi duyệt lại..."
                }
                className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setReviewModal(null)}>
                Hủy
              </Button>
              <Button
                variant={
                  reviewModal.mode === "approve" ? "primary" : "destructive"
                }
                disabled={busy}
                onClick={() => void submitSingleReview()}
              >
                {busy
                  ? "Đang xử lý..."
                  : reviewModal.mode === "approve"
                    ? "Xác nhận Phê duyệt"
                    : "Gửi Yêu cầu chỉnh sửa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
