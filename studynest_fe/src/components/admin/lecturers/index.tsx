"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Ban,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  Eye,
  GraduationCap,
  LayoutGrid,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Table2,
  Trash2,
  Unlock,
  UserMinus,
  Users,
  X,
} from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import { formatCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  Lecturer,
  LecturersQueryParams,
  LecturersResponse,
} from "@/types/admin/lecturer";
import LecturerDrawer from "./lecturer-drawer";

const LECTURERS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  size: { type: "number", default: 12, min: 1, max: 100 },
  search: { type: "string", default: "" },
  sort_by: {
    type: "string",
    default: "create_at" as
      | "fullname"
      | "email"
      | "create_at"
      | "update_at"
      | "course_count"
      | "student_count"
      | "rating_avg"
      | "wallet_balance",
    allowed: [
      "fullname",
      "email",
      "create_at",
      "update_at",
      "course_count",
      "student_count",
      "rating_avg",
      "wallet_balance",
    ] as const,
  },
  order: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
  is_verified_email: {
    type: "string",
    default: "" as "" | "true" | "false",
    allowed: ["", "true", "false"] as const,
  },
  is_banned: {
    type: "string",
    default: "" as "" | "true" | "false",
    allowed: ["", "true", "false"] as const,
  },
} as const;

function exportLecturersCsv(items: Lecturer[]) {
  const header = [
    "ID",
    "Họ và tên",
    "Email",
    "Khóa học",
    "Học viên",
    "Đánh giá TB",
    "Số dư ví",
    "Trạng thái",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map((l) =>
      [
        l.id,
        l.fullname,
        l.email,
        String(l.course_count ?? 0),
        String(l.student_count ?? 0),
        String(l.rating_avg ?? 0),
        String(l.wallet_balance ?? 0),
        l.is_banned ? "Đã khóa" : "Hoạt động",
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
  a.download = `may-may-lecturers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LecturersManagement() {
  const router = useRouter();
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);

  const [banTarget, setBanTarget] = useState<Lecturer | null>(null);
  const [banPermanent, setBanPermanent] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Lecturer | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);

  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    lecturer: Lecturer;
  } | null>(null);

  const { values, setParam, setParams, resetParams } = useUrlQueryState(
    LECTURERS_QUERY_SCHEMA,
  );
  const {
    page,
    size: pageSize,
    search,
    sort_by: sortBy,
    order: sortOrder,
    is_verified_email: emailParam,
    is_banned: bannedParam,
  } = values;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const queryParams = useMemo<LecturersQueryParams>(() => {
    const p: LecturersQueryParams = {
      page,
      size: pageSize,
      sort_by: sortBy,
      order: sortOrder,
    };
    if (search.trim()) p.search = search.trim();
    if (emailParam !== "") p.is_verified_email = emailParam === "true";
    if (bannedParam !== "") p.is_banned = bannedParam === "true";
    return p;
  }, [page, pageSize, sortBy, sortOrder, search, emailParam, bannedParam]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<LecturersResponse>(
      ["/admin/lecturers", queryParams],
      async ([url, params]: [string, LecturersQueryParams]) => {
        const res = await api.get(url, { params });
        return res.data;
      },
      { revalidateOnFocus: false },
    );

  useEffect(() => {
    if (!menuState) return;
    const close = () => setMenuState(null);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuState(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuState]);

  const items = data?.items ?? [];
  const totalItems = data?.total_items ?? 0;
  const totalPages = Math.max(1, data?.total_pages ?? 1);

  const pageTotalCourses = items.reduce((s, l) => s + (l.course_count ?? 0), 0);
  const pageTotalStudents = items.reduce(
    (s, l) => s + (l.student_count ?? 0),
    0,
  );
  const pageTotalPaidCoins = items.reduce(
    (s, l) => s + (l.paid_coins ?? l.wallet_balance ?? 0),
    0,
  );
  const pageTotalBonusCoins = items.reduce(
    (s, l) => s + (l.bonus_coins ?? 0),
    0,
  );

  async function submitBan() {
    if (!banTarget) return;
    if (!banReason.trim()) {
      toast.error("Vui lòng nhập lý do khóa giảng viên.");
      return;
    }
    if (!banPermanent && !banUntil) {
      toast.error("Vui lòng chọn thời hạn khóa tạm thời.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/lecturers/${banTarget.id}/ban`, {
        is_block_permanently: banPermanent,
        banned_reason: banReason.trim(),
        banned_until: banPermanent ? null : new Date(banUntil).toISOString(),
      });
      toast.success(`Đã khóa giảng viên ${banTarget.fullname}`);
      setBanTarget(null);
      setBanReason("");
      setBanUntil("");
      await mutate();
    } catch {
      toast.error("Không thể khóa giảng viên.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnban(l: Lecturer) {
    setBusy(true);
    try {
      await api.post(`/admin/lecturers/${l.id}/unban`);
      toast.success(`Đã mở khóa giảng viên ${l.fullname}`);
      await mutate();
    } catch {
      toast.error("Không thể mở khóa giảng viên.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveRole(l: Lecturer) {
    if (
      !window.confirm(
        `Gỡ quyền Giảng viên của “${l.fullname}”? Tài khoản vẫn được giữ lại ở vai trò Học viên.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/admin/lecturers/${l.id}/remove_role_lecturer`);
      toast.success(`Đã gỡ quyền giảng viên của ${l.fullname}`);
      await mutate();
    } catch {
      toast.error("Không thể gỡ quyền giảng viên.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      toast.error("Vui lòng nhập lý do xóa tài khoản giảng viên.");
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/admin/lecturers/${deleteTarget.id}`, {
        params: { reason: deleteReason.trim() },
      });
      toast.success(`Đã xóa mềm giảng viên ${deleteTarget.fullname}`);
      setDeleteTarget(null);
      setDeleteReason("");
      await mutate();
    } catch {
      toast.error("Không thể xóa giảng viên.");
    } finally {
      setBusy(false);
    }
  }

  const hasFilter = Boolean(search || emailParam || bannedParam);

  return (
    <main className="relative mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Ambient Cloud Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-16 h-96 w-96 rounded-full bg-primary-light/55 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-vanilla/40 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
      </div>

      {/* Cloud Hero Banner */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent-vanilla/45 p-6 shadow-[0_28px_64px_-22px_rgba(53,111,167,0.20)] backdrop-blur-md sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/85 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-64 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-surface/95 px-3.5 py-1 text-xs font-semibold text-accent-vanilla-foreground shadow-2xs">
              <GraduationCap size={13} animated={false} />
              Mây Mây Faculty &amp; Lecturer Studio
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Đội ngũ Giảng viên &amp; Đối tác
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Quản trị trọn vòng đời giảng viên: tạo mới, thăng cấp 1 chạm từ thành viên, chỉnh sửa hồ sơ chuyên môn, theo dõi doanh thu ví và kiểm soát quyền hạn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isValidating}
              onClick={() => void mutate()}
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
                exportLecturersCsv(items);
                toast.success(`Đã xuất ${items.length} giảng viên ra CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingLecturer(null);
                setDrawerOpen(true);
              }}
            >
              <Plus size={15} />
              Thêm Giảng viên
            </Button>
          </div>
        </div>

        {/* 4 Floating Glass KPIs */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng giảng viên
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {totalItems} giảng viên
            </p>
            <p className="mt-0.5 text-[11px] text-primary">
              Đội ngũ giảng dạy trên Mây Mây
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <BookOpen size={13} className="text-primary" />
              Khóa học đang sở hữu
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {pageTotalCourses} khóa
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tổng trên trang hiện tại
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Users size={13} className="text-info-foreground" />
              Học viên theo học
            </p>
            <p className="mt-1 text-2xl font-bold text-info-foreground">
              {pageTotalStudents.toLocaleString("vi-VN")} HV
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tổng lượt ghi danh
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Coins size={13} className="text-accent-vanilla-foreground" />
              Tổng số dư Coin GV
            </p>
            <p className="mt-1 text-2xl font-bold text-accent-vanilla-foreground">
              {formatCoin(pageTotalPaidCoins)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              +{formatCoin(pageTotalBonusCoins)} Coin thưởng
            </p>
          </div>
        </div>
      </section>

      {/* Filters & View Mode Toolbar */}
      <section className="space-y-4 rounded-3xl border border-primary-pastel/60 bg-surface/90 p-4 shadow-[0_12px_32px_-16px_rgba(53,111,167,0.14)] backdrop-blur-md sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setParams({ is_verified_email: "", is_banned: "", page: 1 })
              }
              className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                emailParam === "" && bannedParam === ""
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setParams({ is_verified_email: "true", page: 1 })}
              className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                emailParam === "true"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-success-border bg-success-bg text-success-foreground"
              }`}
            >
              Email đã xác thực
            </button>
            <button
              type="button"
              onClick={() => setParams({ is_verified_email: "false", page: 1 })}
              className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                emailParam === "false"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
              }`}
            >
              Chưa xác thực
            </button>
            <button
              type="button"
              onClick={() => setParams({ is_banned: "true", page: 1 })}
              className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                bannedParam === "true"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-destructive-border bg-destructive-bg text-destructive-foreground"
              }`}
            >
              Đang bị khóa
            </button>
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
              Thẻ Giảng viên
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
              Bảng
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-7">
            <Search
              size={15}
              animated={false}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm tên giảng viên hoặc email..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-2 md:col-span-5">
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
              <option value="create_at:desc">Mới tham gia nhất</option>
              <option value="course_count:desc">Nhiều khóa học nhất</option>
              <option value="student_count:desc">Nhiều học viên nhất</option>
              <option value="rating_avg:desc">Đánh giá cao nhất</option>
              <option value="wallet_balance:desc">Số dư ví cao nhất</option>
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
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được danh sách giảng viên.</span>
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
              className="h-60 animate-pulse rounded-[2rem] border border-border bg-surface p-5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center">
          <p className="text-sm font-semibold text-foreground">
            Chưa có giảng viên nào khớp bộ lọc
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setEditingLecturer(null);
              setDrawerOpen(true);
            }}
          >
            <Plus size={15} />
            Thêm Giảng viên đầu tiên
          </Button>
        </div>
      ) : layout === "cards" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((l) => (
            <article
              key={l.id}
              onClick={() => router.push(`/admin/lecturers/${l.id}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuState({ x: e.clientX, y: e.clientY, lecturer: l });
              }}
              className={`group flex cursor-pointer flex-col justify-between overflow-hidden rounded-[2rem] border bg-surface/95 p-5 shadow-[0_14px_36px_-16px_rgba(53,111,167,0.16)] backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_22px_48px_-16px_rgba(53,111,167,0.22)] ${
                l.is_banned
                  ? "border-destructive-border"
                  : "border-primary-pastel/60 hover:border-primary"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3.5">
                    {l.avatar ? (
                      <img
                        src={getImageUrl(l.avatar)}
                        alt={l.fullname}
                        className="h-14 w-14 shrink-0 rounded-2xl border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla text-lg font-bold text-accent-vanilla-foreground">
                        {(l.fullname || l.email).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary">
                        {l.fullname || "Chưa đặt tên"}
                      </h3>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Mail size={11} animated={false} />
                        <span className="truncate">{l.email}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-semibold ${
                            l.is_banned
                              ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                              : "border-success-border bg-success-bg text-success-foreground"
                          }`}
                        >
                          {l.is_banned ? "Đã khóa" : "Hoạt động"}
                        </span>
                        {l.is_verified_email && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-info-border bg-info-bg px-2 py-0.5 font-semibold text-info-foreground">
                            <ShieldCheck size={10} animated={false} />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-accent-vanilla-border bg-accent-vanilla/70 px-2.5 py-1 text-xs font-bold text-accent-vanilla-foreground">
                    <Star size={12} animated={false} />
                    {(l.rating_avg ?? 0).toFixed(1)}
                  </span>
                </div>

                {l.bio && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {l.bio}
                  </p>
                )}

                {/* 3 Compact Metrics */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-2xl bg-background/70 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Khóa học</p>
                    <p className="mt-0.5 font-bold text-foreground">
                      {l.course_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background/70 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Học viên</p>
                    <p className="mt-0.5 font-bold text-primary">
                      {l.student_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary-light/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Ví Coin</p>
                    <p className="mt-0.5 truncate font-bold text-primary">
                      {formatCoin(l.paid_coins ?? l.wallet_balance ?? 0)}
                    </p>
                    {(l.bonus_coins ?? 0) > 0 && (
                      <p className="truncate text-[10px] font-medium text-muted-foreground">
                        +{formatCoin(l.bonus_coins)} thưởng
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Full CRUD Action Strip */}
              <div
                className="mt-4 flex items-center justify-between border-t border-border/70 pt-3"
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  href={`/admin/lecturers/${l.id}`}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light"
                >
                  <Eye size={13} animated={false} />
                  Hồ sơ 360°
                </Link>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLecturer(l);
                      setDrawerOpen(true);
                    }}
                    title="Chỉnh sửa hồ sơ"
                    aria-label={`Sửa ${l.fullname}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary-light hover:text-primary"
                  >
                    <Pencil size={14} animated={false} />
                  </button>
                  {l.is_banned ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleUnban(l)}
                      title="Mở khóa giảng viên"
                      aria-label={`Mở khóa ${l.fullname}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-success-foreground hover:bg-success-bg"
                    >
                      <Unlock size={14} animated={false} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setBanTarget(l)}
                      title="Khóa giảng viên"
                      aria-label={`Khóa ${l.fullname}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-warning-bg hover:text-warning-foreground"
                    >
                      <Ban size={14} animated={false} />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemoveRole(l)}
                    title="Gỡ quyền Giảng viên (giữ tài khoản Học viên)"
                    aria-label={`Gỡ quyền giảng viên ${l.fullname}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent-vanilla hover:text-accent-vanilla-foreground"
                  >
                    <UserMinus size={14} animated={false} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeleteTarget(l)}
                    title="Xóa mềm tài khoản"
                    aria-label={`Xóa ${l.fullname}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground"
                  >
                    <Trash2 size={14} animated={false} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[2rem] border border-primary-pastel/60 bg-surface/95 shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="px-5 py-3.5">Giảng viên</th>
                <th className="px-5 py-3.5">Khóa / HV</th>
                <th className="px-5 py-3.5">Đánh giá</th>
                <th className="px-5 py-3.5">Số dư ví</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => router.push(`/admin/lecturers/${l.id}`)}
                  className="cursor-pointer transition-colors hover:bg-primary-light/25"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{l.fullname}</p>
                    <p className="text-xs text-muted-foreground">{l.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <strong>{l.course_count}</strong> khóa ·{" "}
                    <strong className="text-primary">{l.student_count}</strong>{" "}
                    HV
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-accent-vanilla-foreground">
                    ★ {(l.rating_avg ?? 0).toFixed(1)}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-primary">
                      {formatCoin(l.paid_coins ?? l.wallet_balance ?? 0)}
                    </p>
                    {(l.bonus_coins ?? 0) > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        +{formatCoin(l.bonus_coins)} thưởng
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        l.is_banned
                          ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                          : "border-success-border bg-success-bg text-success-foreground"
                      }`}
                    >
                      {l.is_banned ? "Đã khóa" : "Hoạt động"}
                    </span>
                  </td>
                  <td
                    className="px-5 py-3.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingLecturer(l);
                          setDrawerOpen(true);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(l)}
                      >
                        Xóa
                      </Button>
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
        itemLabel="giảng viên"
        disabled={isValidating}
        onPageChange={(nextPage) => setParam("page", nextPage)}
        onPageSizeChange={(nextSize) =>
          setParams({ size: nextSize, page: 1 })
        }
      />

      {/* Create / Edit / Promote Drawer */}
      <LecturerDrawer
        open={drawerOpen}
        editing={editingLecturer}
        onClose={() => setDrawerOpen(false)}
        onSaved={async () => {
          await mutate();
        }}
      />

      {/* Ban Modal */}
      {banTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Khóa tài khoản Giảng viên
              </h2>
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-background"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Giảng viên:{" "}
              <strong className="text-foreground">{banTarget.fullname}</strong>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBanPermanent(false)}
                className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                  !banPermanent
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                Khóa tạm thời
              </button>
              <button
                type="button"
                onClick={() => setBanPermanent(true)}
                className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                  banPermanent
                    ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                Khóa vĩnh viễn
              </button>
            </div>
            {!banPermanent && (
              <input
                type="datetime-local"
                value={banUntil}
                onChange={(e) => setBanUntil(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              />
            )}
            <textarea
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Nhập lý do khóa giảng viên..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBanTarget(null)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => void submitBan()}
              >
                {busy ? "Đang khóa..." : "Xác nhận khóa"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Xóa tài khoản Giảng viên
              </h2>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-background"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Chuyển giảng viên{" "}
              <strong className="text-foreground">
                {deleteTarget.fullname}
              </strong>{" "}
              vào thùng rác (soft delete).
            </p>
            <textarea
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Nhập lý do xóa..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => void submitDelete()}
              >
                {busy ? "Đang xóa..." : "Xác nhận xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          onClose={() => setMenuState(null)}
          items={[
            {
              label: "Xem hồ sơ 360°",
              onClick: () => {
                router.push(`/admin/lecturers/${menuState.lecturer.id}`);
                setMenuState(null);
              },
            },
            {
              label: "Chỉnh sửa hồ sơ",
              onClick: () => {
                setEditingLecturer(menuState.lecturer);
                setDrawerOpen(true);
                setMenuState(null);
              },
            },
            {
              label: "Sao chép Email",
              onClick: () => {
                navigator.clipboard.writeText(menuState.lecturer.email);
                toast.success("Đã sao chép Email");
                setMenuState(null);
              },
            },
          ]}
        />
      )}
    </main>
  );
}
