"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid3x3,
  LayoutGrid,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  Users,
  X,
} from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Button, Input } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import type { Role, RolesQueryParams, RolesResponse } from "@/types/admin/role";
import {
  CAPABILITY_MATRIX_ROWS,
  ROLE_PRESETS,
  RoleAvatarIcon,
  SYSTEM_CORE_ROLES,
  exportRolesCsv,
  getRoleVisual,
  validateRoleNameCode,
} from "./role-visuals";

const ROLES_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  size: { type: "number", default: 12, min: 1, max: 100 },
  search: { type: "string", default: "" },
  sort_by: {
    type: "string",
    default: "role_name" as "role_name" | "details" | "total_users",
    allowed: ["role_name", "details", "total_users"] as const,
  },
  order: {
    type: "string",
    default: "asc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

type RoleViewMode = "cards" | "matrix" | "table";

export default function RolesManagement() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<RoleViewMode>("cards");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    role: Role;
  } | null>(null);

  const { values, setParam, setParams } = useUrlQueryState(ROLES_QUERY_SCHEMA);
  const { page, size, search: searchQuery, sort_by: sortBy, order } = values;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(searchQuery, (val) => setParam("search", val));

  const queryParams = useMemo<RolesQueryParams>(
    () => ({
      page,
      size,
      sort_by: sortBy,
      order,
      ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
    }),
    [page, size, sortBy, order, searchQuery],
  );

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<RolesResponse>(
      ["/admin/roles", queryParams],
      async ([url, params]: [string, RolesQueryParams]) => {
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
  const operationalRoles = data?.operational_roles ?? totalItems;
  const totalAssignedUsers = useMemo(
    () => items.reduce((sum, r) => sum + Number(r.total_users || 0), 0),
    [items],
  );

  const openCreateDrawer = () => {
    setEditingRole(null);
    setRoleName("");
    setDetails("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.role_name);
    setDetails(role.details || "");
    setDrawerOpen(true);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = roleName.trim().toUpperCase();
    const nameErr = validateRoleNameCode(cleaned);
    if (nameErr) {
      toast.error(nameErr);
      return;
    }
    if (!details.trim()) {
      toast.error("Vui lòng nhập mô tả phạm vi quyền hạn.");
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        await api.put(`/admin/roles/${editingRole.id}`, {
          role_name: cleaned,
          details: details.trim(),
        });
        toast.success(`Đã cập nhật vai trò ${cleaned}`);
      } else {
        await api.post("/admin/roles", {
          role_name: cleaned,
          details: details.trim(),
        });
        toast.success(`Đã tạo vai trò mới ${cleaned}`);
      }
      setDrawerOpen(false);
      await mutate();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        "Không thể lưu vai trò.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: Role) {
    if (SYSTEM_CORE_ROLES.has(role.role_name.toUpperCase())) {
      toast.error("Không thể xóa vai trò cốt lõi của hệ thống.");
      return;
    }
    if (
      !window.confirm(
        `Xóa vai trò “${role.role_name}”? Hành động này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setDeletingId(role.id);
    try {
      await api.delete(`/admin/roles/${role.id}`);
      toast.success(`Đã xóa vai trò ${role.role_name}`);
      await mutate();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể xóa vai trò đang có người dùng.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  const previewVisual = getRoleVisual(roleName || "CUSTOM");

  return (
    <main className="relative mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Ambient Cloud Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-20 h-96 w-96 rounded-full bg-primary-light/55 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-accent/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-accent-vanilla/35 blur-3xl" />
      </div>

      {/* Cloud Architecture Hero Banner */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent/40 p-6 shadow-[0_28px_64px_-22px_rgba(53,111,167,0.20)] backdrop-blur-md sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/85 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-1/4 h-44 w-64 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/95 px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs">
              <ShieldCheck size={13} animated={false} />
              Mây Mây Access &amp; Role Architecture
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Kiến trúc Vai trò &amp; Phân quyền
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Trực quan hóa phân tầng quyền hạn giữa Quản trị viên, Giảng viên, Học viên và các vai trò vận hành mở rộng trên toàn hệ sinh thái Mây Mây.
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
                exportRolesCsv(items);
                toast.success(`Đã xuất ${items.length} vai trò ra file CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV
            </Button>
            <Button size="sm" onClick={openCreateDrawer}>
              <Plus size={15} />
              Tạo vai trò mới
            </Button>
          </div>
        </div>

        {/* Role Distribution Sky Bar + KPIs */}
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="grid grid-cols-3 gap-3 lg:col-span-5">
            <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground">
                Tổng vai trò
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {totalItems}
              </p>
              <p className="mt-0.5 text-[11px] text-primary">
                {operationalRoles} đang vận hành
              </p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground">
                Lượt gán quyền
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {totalAssignedUsers}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Tài khoản đã phân vai
              </p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground">
                Vai trò cốt lõi
              </p>
              <p className="mt-1 text-2xl font-bold text-accent-foreground">
                3 tầng
              </p>
              <p className="mt-0.5 text-[11px] text-success-foreground">
                Được khóa bảo vệ
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">
                Cơ cấu Phân bổ Nhân sự theo Vai trò
              </span>
              <Link
                href="/admin/users"
                className="font-semibold text-primary hover:underline"
              >
                Quản lý thành viên →
              </Link>
            </div>

            <div className="my-3 flex h-3.5 w-full overflow-hidden rounded-full bg-background">
              {items.map((r) => {
                const vis = getRoleVisual(r.role_name);
                const w =
                  totalAssignedUsers > 0
                    ? Math.max(
                        4,
                        Math.round((r.total_users / totalAssignedUsers) * 100),
                      )
                    : 0;
                if (!w) return null;
                return (
                  <div
                    key={r.id}
                    title={`${r.role_name}: ${r.total_users} người`}
                    className={`h-full transition-all duration-500 ${vis.barClass}`}
                    style={{ width: `${w}%` }}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 text-[11px]">
              {items.map((r) => {
                const vis = getRoleVisual(r.role_name);
                const pct =
                  totalAssignedUsers > 0
                    ? Math.round((r.total_users / totalAssignedUsers) * 100)
                    : 0;
                return (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 font-medium text-foreground"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${vis.barClass}`} />
                    <strong>{r.role_name}</strong>: {r.total_users} ({pct}%)
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Workspace Mode Switcher + Search */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary-pastel/60 bg-surface/90 p-4 shadow-[0_12px_32px_-16px_rgba(53,111,167,0.14)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-background p-1">
            {(
              [
                ["cards", "Thẻ Quyền Lực", LayoutGrid],
                ["matrix", "Ma trận Phân quyền", Grid3x3],
                ["table", "Bảng gọn", Table2],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon size={14} animated={false} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              size={15}
              animated={false}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm mã vai trò hoặc mô tả..."
              className="h-9 w-56 rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <select
            aria-label="Sắp xếp"
            value={`${sortBy}:${order}`}
            onChange={(e) => {
              const [sb, od] = e.target.value.split(":") as [
                typeof sortBy,
                "asc" | "desc",
              ];
              setParams({ sort_by: sb, order: od, page: 1 });
            }}
            className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="total_users:desc">Nhiều thành viên nhất</option>
            <option value="role_name:asc">Tên A → Z</option>
            <option value="role_name:desc">Tên Z → A</option>
          </select>

          <Link
            href="/admin/roles/create"
            className="rounded-xl border border-primary-pastel bg-primary-light/60 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Trang tạo đầy đủ →
          </Link>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được danh sách vai trò.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* VIEW 1: POWER ROLE CARDS */}
      {viewMode === "cards" && (
        isLoading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-[2rem] border border-border bg-surface p-6"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center text-sm text-muted-foreground">
            Chưa có vai trò nào khớp với từ khóa tìm kiếm.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {items.map((role) => {
              const vis = getRoleVisual(role.role_name);
              const isCore = SYSTEM_CORE_ROLES.has(role.role_name.toUpperCase());
              const pct =
                totalAssignedUsers > 0
                  ? Math.round((role.total_users / totalAssignedUsers) * 100)
                  : 0;
              return (
                <article
                  key={role.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuState({ x: e.clientX, y: e.clientY, role });
                  }}
                  className={`group flex flex-col justify-between overflow-hidden rounded-[2rem] border bg-surface/95 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_24px_54px_-18px_rgba(53,111,167,0.22)] ${vis.border}`}
                >
                  <div>
                    {/* Pastel Sky Header */}
                    <div className={`p-5 ${vis.softBg}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-surface/95 shadow-xs ${vis.border} ${vis.text}`}
                          >
                            <RoleAvatarIcon roleName={role.role_name} size={22} />
                          </span>
                          <div>
                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {vis.tier}
                            </span>
                            <h2 className="mt-0.5 text-lg font-bold text-foreground">
                              {role.role_name}
                            </h2>
                          </div>
                        </div>

                        {isCore ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-surface/90 px-2.5 py-1 text-[10px] font-bold text-foreground">
                            <Lock size={10} animated={false} />
                            Core
                          </span>
                        ) : (
                          <span className="rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-semibold text-primary">
                            Tùy chỉnh
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="space-y-4 p-5">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {role.details || "Chưa có mô tả chi tiết cho vai trò này."}
                      </p>

                      {/* Capabilities Pills */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Phạm vi quyền hạn tiêu biểu
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {vis.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-foreground"
                            >
                              <CheckCircle2
                                size={11}
                                animated={false}
                                className="text-primary"
                              />
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Member Share Bar */}
                      <div className="rounded-2xl bg-background/70 p-3.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                            <Users size={13} animated={false} />
                            Thành viên sở hữu
                          </span>
                          <span className="font-bold text-foreground">
                            {role.total_users} ({pct}%)
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
                          <div
                            className={`h-full rounded-full ${vis.barClass}`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between border-t border-border/70 bg-background/40 px-5 py-3">
                    <code className="text-[11px] text-muted-foreground">
                      #{role.id.slice(0, 8)}
                    </code>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDrawer(role)}
                      >
                        <Pencil size={13} />
                        Chỉnh sửa
                      </Button>
                      <button
                        type="button"
                        disabled={isCore || deletingId === role.id}
                        onClick={() => void handleDelete(role)}
                        title={
                          isCore
                            ? "Vai trò cốt lõi được hệ thống bảo vệ"
                            : "Xóa vai trò"
                        }
                        aria-label={`Xóa vai trò ${role.role_name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground disabled:opacity-35"
                      >
                        <Trash2 size={14} animated={false} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {/* VIEW 2: CAPABILITY MATRIX */}
      {viewMode === "matrix" && (
        <section className="overflow-x-auto rounded-[2rem] border border-primary-pastel/60 bg-surface/95 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-bold text-foreground">
              Ma trận Phạm vi Quyền hạn Theo Miền Chức năng
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bản đồ đối chiếu nhanh phạm vi thao tác của 3 tầng vai trò cốt lõi trên hệ sinh thái Mây Mây.
            </p>
          </div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-primary-light/55 text-xs font-semibold text-foreground">
              <tr>
                <th className="px-6 py-3.5">Miền chức năng</th>
                <th className="px-6 py-3.5 text-center">ADMIN</th>
                <th className="px-6 py-3.5 text-center">LECTURER</th>
                <th className="px-6 py-3.5 text-center">USER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {CAPABILITY_MATRIX_ROWS.map((row) => {
                const renderCell = (level: string) => {
                  if (level === "full") {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-semibold text-success-foreground">
                        <Check size={12} animated={false} />
                        Toàn quyền
                      </span>
                    );
                  }
                  if (level === "self") {
                    return (
                      <span className="inline-flex rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                        Cá nhân
                      </span>
                    );
                  }
                  if (level === "partial") {
                    return (
                      <span className="inline-flex rounded-full border border-accent-vanilla-border bg-accent-vanilla px-3 py-1 text-xs font-semibold text-accent-vanilla-foreground">
                        Phối hợp
                      </span>
                    );
                  }
                  if (level === "read") {
                    return (
                      <span className="inline-flex rounded-full border border-info-border bg-info-bg px-3 py-1 text-xs font-semibold text-info-foreground">
                        Xem / Tra cứu
                      </span>
                    );
                  }
                  return (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  );
                };
                return (
                  <tr
                    key={row.domain}
                    className="transition-colors hover:bg-primary-light/20"
                  >
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {row.domain}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {renderCell(row.ADMIN)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {renderCell(row.LECTURER)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {renderCell(row.USER)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* VIEW 3: COMPACT TABLE */}
      {viewMode === "table" && (
        <section className="overflow-x-auto rounded-[2rem] border border-primary-pastel/60 bg-surface/95 shadow-[0_18px_42px_-18px_rgba(53,111,167,0.16)] backdrop-blur-md">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="px-5 py-3.5">Mã vai trò</th>
                <th className="px-5 py-3.5">Mô tả</th>
                <th className="px-5 py-3.5">Thành viên</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((role) => {
                const vis = getRoleVisual(role.role_name);
                const isCore = SYSTEM_CORE_ROLES.has(
                  role.role_name.toUpperCase(),
                );
                return (
                  <tr
                    key={role.id}
                    className="transition-colors hover:bg-primary-light/20"
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${vis.badgeClass}`}
                      >
                        <RoleAvatarIcon roleName={role.role_name} size={13} />
                        {role.role_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-foreground">
                      {role.details}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-primary">
                      {role.total_users}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDrawer(role)}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isCore}
                          onClick={() => void handleDelete(role)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Pagination */}
      {totalItems > size && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-3 text-xs">
          <span className="text-muted-foreground">
            Trang <strong className="text-foreground">{page}</strong> /{" "}
            <strong className="text-foreground">{totalPages}</strong> · Tổng{" "}
            <strong className="text-foreground">{totalItems}</strong> vai trò
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParam("page", page - 1)}
            >
              <ChevronLeft size={14} />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setParam("page", page + 1)}
            >
              Sau
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Slide-over Create / Edit Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
          <div className="flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-[0_24px_64px_-16px_rgba(53,111,167,0.28)]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Role Inspector
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  {editingRole
                    ? `Chỉnh sửa vai trò ${editingRole.role_name}`
                    : "Khởi tạo Vai trò mới"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                {/* Live Preview Card */}
                <div
                  className={`rounded-3xl border p-4 ${previewVisual.softBg} ${previewVisual.border}`}
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Xem trước Thẻ Vai trò
                  </p>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-surface p-3.5 shadow-2xs">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${previewVisual.softBg} ${previewVisual.border} ${previewVisual.text}`}
                    >
                      <RoleAvatarIcon
                        roleName={roleName || "CUSTOM"}
                        size={20}
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">
                        {roleName.trim().toUpperCase() || "TEN_VAI_TRO"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {details.trim() || "Mô tả phạm vi quyền hạn của vai trò..."}
                      </p>
                    </div>
                  </div>
                </div>

                {!editingRole && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Mẫu gợi ý nhanh (1 chạm):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLE_PRESETS.map((p) => (
                        <button
                          key={p.role_name}
                          type="button"
                          onClick={() => {
                            setRoleName(p.role_name);
                            setDetails(p.details);
                          }}
                          className="rounded-xl border border-primary-pastel bg-primary-light/60 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          +{p.role_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  label="Mã vai trò (VIẾT_HOA_KHÔNG_DẤU)"
                  required
                  readOnly={Boolean(
                    editingRole &&
                      SYSTEM_CORE_ROLES.has(editingRole.role_name.toUpperCase()),
                  )}
                  value={roleName}
                  onChange={(e) =>
                    setRoleName(
                      e.target.value.toUpperCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="VD: CONTENT_REVIEWER"
                />

                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    Mô tả phạm vi quyền hạn
                  </span>
                  <textarea
                    rows={4}
                    required
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Mô tả rõ vai trò này chịu trách nhiệm và thao tác được những gì..."
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-border bg-background/50 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDrawerOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Đang lưu..."
                    : editingRole
                      ? "Lưu thay đổi"
                      : "Khởi tạo vai trò"}
                </Button>
              </div>
            </form>
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
              label: "Chỉnh sửa vai trò",
              onClick: () => {
                openEditDrawer(menuState.role);
                setMenuState(null);
              },
            },
            {
              label: "Sao chép mã vai trò",
              onClick: () => {
                navigator.clipboard.writeText(menuState.role.role_name);
                toast.success("Đã sao chép mã vai trò");
                setMenuState(null);
              },
            },
          ]}
        />
      )}
    </main>
  );
}
