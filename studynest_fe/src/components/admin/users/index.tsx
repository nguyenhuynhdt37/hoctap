"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Ban,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  LayoutGrid,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  Unlock,
  Users,
  X,
} from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import type { User, UsersQueryParams, UsersResponse } from "@/types/admin/user";
import {
  UsersAdminNav,
  exportUsersCsv,
  formatUserDateTime,
  getRoleBadge,
} from "./user-visuals";

const USERS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  size: { type: "number", default: 12, min: 1, max: 100 },
  search: { type: "string", default: "" },
  sort_by: {
    type: "string",
    default: "created_at" as
      | "fullname"
      | "email"
      | "created_at"
      | "updated_at"
      | "last_login_at"
      | "total_courses",
    allowed: [
      "fullname",
      "email",
      "created_at",
      "updated_at",
      "last_login_at",
      "total_courses",
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

export default function UsersManagement() {
  const router = useRouter();
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [banPermanent, setBanPermanent] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);

  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    user: User;
  } | null>(null);

  const { values, setParam, setParams, resetParams } =
    useUrlQueryState(USERS_QUERY_SCHEMA);
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

  const queryParams = useMemo<UsersQueryParams>(() => {
    const p: UsersQueryParams = {
      page,
      size: pageSize,
      sort_by: sortBy === "created_at" ? "create_at" : sortBy,
      order: sortOrder,
    };
    if (search.trim()) p.search = search.trim();
    if (emailParam !== "") p.is_verified_email = emailParam === "true";
    if (bannedParam !== "") p.is_banned = bannedParam === "true";
    return p;
  }, [page, pageSize, sortBy, sortOrder, search, emailParam, bannedParam]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<UsersResponse>(
      ["/admin/users", queryParams],
      async ([url, params]: [string, UsersQueryParams]) => {
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
  const verifiedTotal = data?.total_user_very_email ?? 0;
  const bannedTotal = data?.total_user_banned ?? 0;
  const totalCoursesAll = data?.total_courses_all_users ?? 0;
  const verifiedPct =
    totalItems > 0 ? Math.round((verifiedTotal / totalItems) * 100) : 0;

  async function submitBan() {
    if (!banTarget) return;
    if (!banReason.trim()) {
      toast.error("Vui lòng nhập lý do khóa tài khoản.");
      return;
    }
    if (!banPermanent && !banUntil) {
      toast.error("Vui lòng chọn thời hạn khóa tạm thời.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/users/${banTarget.id}/ban`, {
        is_block_permanently: banPermanent,
        banned_reason: banReason.trim(),
        banned_until: banPermanent ? null : new Date(banUntil).toISOString(),
      });
      toast.success(`Đã khóa tài khoản ${banTarget.fullname || banTarget.email}`);
      setBanTarget(null);
      setBanReason("");
      setBanUntil("");
      await mutate();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể khóa tài khoản.";
      toast.error(detail);
    } finally {
      setBusy(false);
    }
  }

  async function unlockUser(user: User) {
    setBusy(true);
    try {
      await api.post(`/admin/users/${user.id}/unlock_ban`);
      toast.success(`Đã mở khóa tài khoản ${user.fullname || user.email}`);
      await mutate();
    } catch {
      toast.error("Không thể mở khóa tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      toast.error("Vui lòng nhập lý do xóa tài khoản.");
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`, {
        params: { reason: deleteReason.trim() },
      });
      toast.success("Đã chuyển tài khoản vào thùng rác");
      setDeleteTarget(null);
      setDeleteReason("");
      await mutate();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể xóa tài khoản.";
      toast.error(detail);
    } finally {
      setBusy(false);
    }
  }

  const hasFilter = Boolean(search || emailParam || bannedParam);

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      <UsersAdminNav totalActive={totalItems} />

      {/* Editorial Hero — Cloudy Blue Pastel Sky */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/75 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-2xs">
              <Users size={13} animated={false} />
              Mây Mây User Identity Studio
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Quản trị Thành viên &amp; Tài khoản
            </h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi hồ sơ học tập 360°, trạng thái xác thực email, khóa/mở khóa tài khoản và xuất danh sách thành viên.
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
              size="sm"
              disabled={items.length === 0}
              onClick={() => {
                exportUsersCsv(items);
                toast.success(`Đã xuất ${items.length} thành viên ra file CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* 4 Floating Glass KPIs */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Thành viên hiện hành
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {totalItems} tài khoản
            </p>
            <p className="mt-0.5 text-[11px] text-primary">
              Đang hoạt động trên nền tảng
            </p>
          </div>

          <div className="rounded-2xl border border-success-border/70 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <CheckCircle2 size={13} className="text-success-foreground" />
              Đã xác thực Email
            </p>
            <p className="mt-1 text-2xl font-bold text-success-foreground">
              {verifiedTotal}{" "}
              <span className="text-sm font-semibold">({verifiedPct}%)</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tài khoản đã kích hoạt email
            </p>
          </div>

          <div className="rounded-2xl border border-destructive-border/70 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Ban size={13} className="text-destructive-foreground" />
              Đang bị khóa
            </p>
            <p className="mt-1 text-2xl font-bold text-destructive-foreground">
              {bannedTotal} tài khoản
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tạm khóa hoặc khóa vĩnh viễn
            </p>
          </div>

          <div className="rounded-2xl border border-primary-pastel/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <BookOpen size={13} className="text-primary" />
              Tổng đăng ký khóa học
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {totalCoursesAll} lượt
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Trên toàn bộ thành viên
            </p>
          </div>
        </div>
      </section>

      {/* Quick Pills + Filter Bar */}
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] sm:p-5">
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
              onClick={() =>
                setParams({ is_verified_email: "true", page: 1 })
              }
              className={`rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                emailParam === "true"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-success-border bg-success-bg text-success-foreground"
              }`}
            >
              Đã xác thực Email
            </button>
            <button
              type="button"
              onClick={() =>
                setParams({ is_verified_email: "false", page: 1 })
              }
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
              Thẻ
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
              placeholder="Tìm theo họ tên hoặc địa chỉ email..."
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
              <option value="created_at:desc">Mới tham gia nhất</option>
              <option value="last_login_at:desc">Đăng nhập gần nhất</option>
              <option value="total_courses:desc">Nhiều khóa học nhất</option>
              <option value="fullname:asc">Tên A → Z</option>
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

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được danh sách thành viên.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-3xl border border-border bg-surface p-5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center text-sm text-muted-foreground">
          Không tìm thấy thành viên nào khớp với bộ lọc hiện tại.
        </div>
      ) : layout === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((u) => (
            <article
              key={u.id}
              onClick={() => router.push(`/admin/users/${u.id}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuState({ x: e.clientX, y: e.clientY, user: u });
              }}
              className={`group flex cursor-pointer flex-col justify-between rounded-3xl border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(53,111,167,0.18)] ${
                u.is_banned
                  ? "border-destructive-border"
                  : "border-border hover:border-primary-pastel"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-base font-bold text-primary">
                      {(u.fullname || u.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary">
                        {u.fullname || "Chưa đặt tên"}
                      </h3>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Mail size={11} animated={false} />
                        <span className="truncate">{u.email}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                      u.is_banned
                        ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                        : "border-success-border bg-success-bg text-success-foreground"
                    }`}
                  >
                    {u.is_banned ? "Đã khóa" : "Hoạt động"}
                  </span>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium ${
                      u.is_verified_email
                        ? "border-info-border bg-info-bg text-info-foreground"
                        : "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                    }`}
                  >
                    <ShieldCheck size={11} animated={false} />
                    {u.is_verified_email ? "Email đã xác thực" : "Chưa xác thực"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 font-medium text-foreground">
                    <BookOpen size={11} animated={false} />
                    {u.total_courses ?? 0} khóa học
                  </span>
                  {(u.roles ?? []).map((role) => {
                    const rb = getRoleBadge(role);
                    return (
                      <span
                        key={role}
                        className={`rounded-full border px-2 py-0.5 font-semibold ${rb.cls}`}
                      >
                        {rb.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock size={12} animated={false} />
                  {formatUserDateTime(u.last_login_at).split(" ")[0]}
                </span>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/users/${u.id}`}
                    aria-label={`Xem ${u.fullname}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary-light hover:text-primary"
                  >
                    <Eye size={14} animated={false} />
                  </Link>
                  <Link
                    href={`/admin/users/${u.id}/edit`}
                    aria-label={`Sửa ${u.fullname}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary-light hover:text-primary"
                  >
                    <Pencil size={14} animated={false} />
                  </Link>
                  {u.is_banned ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void unlockUser(u)}
                      title="Mở khóa tài khoản"
                      aria-label={`Mở khóa ${u.fullname}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-success-foreground hover:bg-success-bg"
                    >
                      <Unlock size={14} animated={false} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setBanTarget(u)}
                      title="Khóa tài khoản"
                      aria-label={`Khóa ${u.fullname}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-warning-bg hover:text-warning-foreground"
                    >
                      <Ban size={14} animated={false} />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeleteTarget(u)}
                    title="Xóa tài khoản"
                    aria-label={`Xóa ${u.fullname}`}
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
        <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="px-5 py-3.5">Thành viên</th>
                <th className="px-5 py-3.5">Xác thực</th>
                <th className="px-5 py-3.5">Khóa học</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5">Đăng nhập gần nhất</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                  className="cursor-pointer transition-colors hover:bg-primary-light/25"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">
                      {u.fullname || "Chưa đặt tên"}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        u.is_verified_email
                          ? "border-info-border bg-info-bg text-info-foreground"
                          : "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                      }`}
                    >
                      {u.is_verified_email ? "Đã xác thực" : "Chưa xác thực"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-primary">
                    {u.total_courses ?? 0}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        u.is_banned
                          ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                          : "border-success-border bg-success-bg text-success-foreground"
                      }`}
                    >
                      {u.is_banned ? "Đã khóa" : "Hoạt động"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {formatUserDateTime(u.last_login_at)}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/users/${u.id}/edit`)}
                      >
                        Sửa
                      </Button>
                      {u.is_banned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void unlockUser(u)}
                        >
                          Mở khóa
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBanTarget(u)}
                        >
                          Khóa
                        </Button>
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
        itemLabel="thành viên"
        disabled={isValidating}
        onPageChange={(nextPage) => setParam("page", nextPage)}
        onPageSizeChange={(nextSize) =>
          setParams({ size: nextSize, page: 1 })
        }
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
                Khóa tài khoản
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
              Thành viên:{" "}
              <strong className="text-foreground">
                {banTarget.fullname || banTarget.email}
              </strong>
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
              <label className="block space-y-1 text-xs">
                <span className="font-medium text-foreground">Khóa đến ngày</span>
                <input
                  type="datetime-local"
                  value={banUntil}
                  onChange={(e) => setBanUntil(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
            )}
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-foreground">Lý do khóa</span>
              <textarea
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Nhập lý do vi phạm chính sách..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
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

      {/* Soft Delete Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Xóa tài khoản (Soft Delete)
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
              Chuyển tài khoản{" "}
              <strong className="text-foreground">
                {deleteTarget.fullname || deleteTarget.email}
              </strong>{" "}
              vào mục Đã xóa.
            </p>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-foreground">Lý do xóa</span>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Nhập lý do xóa tài khoản..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
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
                router.push(`/admin/users/${menuState.user.id}`);
                setMenuState(null);
              },
            },
            {
              label: "Chỉnh sửa thông tin",
              onClick: () => {
                router.push(`/admin/users/${menuState.user.id}/edit`);
                setMenuState(null);
              },
            },
            {
              label: "Sao chép Email",
              onClick: () => {
                navigator.clipboard.writeText(menuState.user.email);
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
