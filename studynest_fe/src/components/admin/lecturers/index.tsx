"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  BookOpen,
  Clock,
  Coins,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutGrid,
  Mail,
  MapPin,
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
  MasterContractStatus,
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
  contract_status: {
    type: "string",
    default: "" as "" | "countersigned" | "signed" | "unsigned",
    allowed: ["", "countersigned", "signed", "unsigned"] as const,
  },
} as const;

function contractLabel(status?: MasterContractStatus): string {
  switch (status) {
    case "countersigned":
      return "Đã đồng ký 2 bên";
    case "signed":
      return "Chờ Bên A đồng ký";
    case "pending_otp":
      return "Đang chờ OTP";
    case "draft":
      return "Bản nháp";
    case "revoked":
      return "Đã thu hồi";
    default:
      return "Chưa ký HĐ";
  }
}

function formatShortDate(val?: string | null): string {
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

function exportLecturersCsv(items: Lecturer[]) {
  const header = [
    "ID",
    "Họ và tên",
    "Email",
    "Khóa học",
    "Học viên",
    "Đánh giá TB",
    "Coin thật",
    "Coin thưởng",
    "Trạng thái Hợp đồng",
    "Số Hợp đồng",
    "Trạng thái tài khoản",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map((l) =>
      [
        l.id,
        l.fullname || "",
        l.email,
        String(l.course_count ?? 0),
        String(l.student_count ?? 0),
        String(l.rating_avg ?? 0),
        String(l.paid_coins ?? l.wallet_balance ?? 0),
        String(l.bonus_coins ?? 0),
        contractLabel(l.master_contract_status),
        l.master_contract_number || "",
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

function ContractBadge({ lecturer }: { lecturer: Lecturer }) {
  const st = lecturer.master_contract_status ?? "none";
  const num = lecturer.master_contract_number;

  if (st === "countersigned") {
    return (
      <Link
        href={`/admin/contracts?status=countersigned${num ? `&search=${encodeURIComponent(num)}` : ""}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-success-border bg-success-bg/90 px-2.5 py-1 text-[11px] font-semibold text-success-foreground transition-colors hover:bg-success-bg"
        title="Mở kiểm toán Hợp đồng Đối tác"
      >
        <FileCheck2 size={12} animated={false} />
        <span className="truncate">
          {num ? `HĐ ${num}` : "Đã đồng ký"}
        </span>
        <ArrowUpRight size={11} animated={false} className="shrink-0 opacity-70" />
      </Link>
    );
  }

  if (st === "signed") {
    return (
      <Link
        href={`/admin/contracts?status=signed${num ? `&search=${encodeURIComponent(num)}` : ""}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-warning-border bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning-foreground transition-colors hover:brightness-95"
        title="Giảng viên đã ký — bấm để Bên A đồng ký"
      >
        <Clock size={12} animated={false} />
        <span className="truncate">Chờ Bên A đồng ký</span>
        <ArrowUpRight size={11} animated={false} className="shrink-0 opacity-75" />
      </Link>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl border border-destructive-border/70 bg-destructive-bg/80 px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground"
      title="Giảng viên cần ký Hợp đồng Đối tác tại /welcome/sign-contract để truy cập cổng giảng viên"
    >
      <AlertTriangle size={12} animated={false} />
      <span>{contractLabel(st)}</span>
    </span>
  );
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
    contract_status: contractParam,
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
    if (contractParam !== "") p.contract_status = contractParam;
    return p;
  }, [
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
    emailParam,
    bannedParam,
    contractParam,
  ]);

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
  const summary = data?.summary;

  const totalLecturers = summary?.total_lecturers ?? totalItems;
  const activeLecturers = summary?.active_lecturers ?? 0;
  const bannedLecturers = summary?.banned_lecturers ?? 0;
  const countersignedCount = summary?.countersigned_contracts ?? 0;
  const pendingCountersignCount = summary?.pending_countersign_contracts ?? 0;
  const unsignedCount = summary?.unsigned_contracts ?? 0;
  const totalCourses =
    summary?.total_courses ??
    items.reduce((s, l) => s + (l.course_count ?? 0), 0);
  const totalStudents =
    summary?.total_students ??
    items.reduce((s, l) => s + (l.student_count ?? 0), 0);
  const totalPaidCoins =
    summary?.total_paid_coins ??
    items.reduce((s, l) => s + (l.paid_coins ?? l.wallet_balance ?? 0), 0);
  const totalBonusCoins =
    summary?.total_bonus_coins ??
    items.reduce((s, l) => s + (l.bonus_coins ?? 0), 0);

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

  const hasFilter = Boolean(
    search || emailParam || bannedParam || contractParam,
  );

  return (
    <main className="relative mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Ambient Cloud Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-12 h-96 w-96 rounded-full bg-primary-light/55 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-vanilla/45 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-accent/35 blur-3xl" />
      </div>

      {/* Editorial Cloud Hero */}
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent-vanilla/45 p-6 shadow-[0_24px_60px_-22px_rgba(53,111,167,0.18)] backdrop-blur-md sm:p-8">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-surface/95 px-3.5 py-1 text-xs font-semibold text-accent-vanilla-foreground shadow-2xs">
                <GraduationCap size={13} animated={false} />
                Mây Mây Faculty Command Center
              </span>
              <Link
                href="/admin/contracts"
                className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
              >
                <FileText size={12} animated={false} />
                Trung tâm Hợp đồng PKI
                <ArrowUpRight size={12} animated={false} />
              </Link>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Đội ngũ Giảng viên &amp; Đối tác
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Quản trị trọn vòng đời giảng viên trên một màn hình: kiểm soát
              trạng thái Hợp đồng Đối tác PKI, số dư Coin thật, hiệu suất khóa
              học và phân quyền giảng dạy.
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

        {/* 4 Interactive Click-to-Filter KPIs */}
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() =>
              setParams({
                is_verified_email: "",
                is_banned: "",
                contract_status: "",
                page: 1,
              })
            }
            className={`group rounded-2xl border p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
              !hasFilter
                ? "border-primary/60 bg-surface shadow-sm"
                : "border-white/80 bg-surface/85 hover:border-primary-pastel"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Đội ngũ Giảng viên</span>
              <Users size={14} animated={false} className="text-primary" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-foreground">
              {totalLecturers.toLocaleString("vi-VN")}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                giảng viên
              </span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-success-foreground">
                {activeLecturers} hoạt động
              </span>
              {bannedLecturers > 0 && (
                <span className="font-semibold text-destructive-foreground">
                  · {bannedLecturers} bị khóa
                </span>
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setParams({
                contract_status:
                  pendingCountersignCount > 0
                    ? "signed"
                    : unsignedCount > 0
                      ? "unsigned"
                      : "countersigned",
                page: 1,
              })
            }
            className={`group rounded-2xl border p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
              contractParam !== ""
                ? "border-primary/60 bg-surface shadow-sm"
                : "border-white/80 bg-surface/85 hover:border-primary-pastel"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Hợp đồng Đối tác PKI</span>
              <FileCheck2
                size={14}
                animated={false}
                className="text-success-foreground"
              />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-success-foreground">
              {countersignedCount}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                / {totalLecturers} đã đồng ký
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              {pendingCountersignCount > 0 && (
                <span className="font-semibold text-warning-foreground">
                  {pendingCountersignCount} chờ đồng ký
                </span>
              )}
              {unsignedCount > 0 && (
                <span className="font-semibold text-destructive-foreground">
                  {pendingCountersignCount > 0 ? "· " : ""}
                  {unsignedCount} chưa ký HĐ
                </span>
              )}
              {pendingCountersignCount === 0 && unsignedCount === 0 && (
                <span className="text-muted-foreground">
                  100% đã hoàn tất pháp lý
                </span>
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setParams({ sort_by: "student_count", order: "desc", page: 1 })
            }
            className="group rounded-2xl border border-white/80 bg-surface/85 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary-pastel"
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Quy mô Giảng dạy</span>
              <BookOpen
                size={14}
                animated={false}
                className="text-info-foreground"
              />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-primary">
              {totalCourses.toLocaleString("vi-VN")}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                khóa học
              </span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-info-foreground">
              {totalStudents.toLocaleString("vi-VN")} lượt học viên theo học
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setParams({ sort_by: "wallet_balance", order: "desc", page: 1 })
            }
            className="group rounded-2xl border border-white/80 bg-surface/85 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary-pastel"
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Tổng số dư Coin GV</span>
              <Coins
                size={14}
                animated={false}
                className="text-accent-vanilla-foreground"
              />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-accent-vanilla-foreground">
              {formatCoin(totalPaidCoins)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              +{formatCoin(totalBonusCoins)} Coin thưởng
            </p>
          </button>
        </div>
      </section>

      {/* Actionable Legal Compliance Notice */}
      {(pendingCountersignCount > 0 || unsignedCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-bg/75 px-4 py-3 text-xs text-warning-foreground">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} animated={false} className="shrink-0" />
            <p className="leading-relaxed">
              {pendingCountersignCount > 0 && (
                <>
                  Có <strong>{pendingCountersignCount} giảng viên</strong> đã ký
                  và đang chờ Bên A đồng ký.{" "}
                </>
              )}
              {unsignedCount > 0 && (
                <>
                  Có <strong>{unsignedCount} giảng viên</strong> chưa ký Hợp
                  đồng Đối tác (hệ thống tự động chặn vào cổng{" "}
                  <code className="rounded bg-surface/70 px-1 py-0.5 font-mono text-[11px]">
                    /lecturer
                  </code>{" "}
                  cho đến khi hoàn tất ký số).
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingCountersignCount > 0 && (
              <Link
                href="/admin/contracts?status=signed"
                className="inline-flex items-center gap-1 rounded-xl border border-warning-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary-light hover:text-primary"
              >
                Đồng ký ngay
                <ArrowUpRight size={12} animated={false} />
              </Link>
            )}
            {unsignedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setParams({ contract_status: "unsigned", page: 1 })
                }
                className="inline-flex items-center gap-1 rounded-xl bg-warning-foreground/15 px-3 py-1.5 text-xs font-semibold text-warning-foreground hover:bg-warning-foreground/25"
              >
                Lọc {unsignedCount} người chưa ký
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters & View Mode Toolbar */}
      <section className="space-y-4 rounded-3xl border border-primary-pastel/60 bg-surface/90 p-4 shadow-[0_12px_32px_-16px_rgba(53,111,167,0.14)] backdrop-blur-md sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Account & Contract Segmented Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background/80 p-1">
              <button
                type="button"
                onClick={() =>
                  setParams({ is_verified_email: "", is_banned: "", page: 1 })
                }
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  emailParam === "" && bannedParam === ""
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả TK
              </button>
              <button
                type="button"
                onClick={() =>
                  setParams({
                    is_verified_email: "true",
                    is_banned: "",
                    page: 1,
                  })
                }
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  emailParam === "true" && bannedParam === ""
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Email xác thực
              </button>
              <button
                type="button"
                onClick={() =>
                  setParams({
                    is_verified_email: "false",
                    is_banned: "",
                    page: 1,
                  })
                }
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  emailParam === "false" && bannedParam === ""
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Chưa xác thực
              </button>
              <button
                type="button"
                onClick={() =>
                  setParams({
                    is_verified_email: "",
                    is_banned: "true",
                    page: 1,
                  })
                }
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  bannedParam === "true"
                    ? "bg-destructive text-destructive-foreground shadow-2xs"
                    : "text-destructive-foreground/80 hover:bg-destructive-bg/60"
                }`}
              >
                Đang bị khóa
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background/80 p-1">
              {(
                [
                  { value: "", label: "Mọi HĐ" },
                  { value: "countersigned", label: "Đã đồng ký" },
                  { value: "signed", label: "Chờ đồng ký" },
                  { value: "unsigned", label: "Chưa ký HĐ" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value || "all"}
                  type="button"
                  onClick={() =>
                    setParams({ contract_status: opt.value, page: 1 })
                  }
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    contractParam === opt.value
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
              Thẻ Hồ sơ
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
              placeholder="Tìm tên giảng viên, email hoặc số CCCD..."
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
              <option value="wallet_balance:desc">Số dư Coin cao nhất</option>
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
              className="h-64 animate-pulse rounded-[2rem] border border-border bg-surface p-5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <GraduationCap size={22} animated={false} />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            Không có giảng viên nào khớp bộ lọc hiện tại
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thử đặt lại bộ lọc hoặc thêm mới / thăng cấp thành viên thành giảng
            viên.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {hasFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  resetParams();
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
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
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="relative shrink-0">
                      {l.avatar ? (
                        <img
                          src={getImageUrl(l.avatar)}
                          alt={l.fullname}
                          className={`h-14 w-14 rounded-2xl border-2 object-cover ${
                            l.is_banned
                              ? "border-destructive-border opacity-75"
                              : "border-primary-pastel"
                          }`}
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla text-lg font-bold text-accent-vanilla-foreground">
                          {(l.fullname || l.email).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span
                        title={l.is_banned ? "Đã khóa" : "Đang hoạt động"}
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-surface ${
                          l.is_banned ? "bg-destructive" : "bg-success"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary">
                        {l.fullname || "Chưa đặt tên"}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(l.email);
                          toast.success("Đã sao chép Email");
                        }}
                        className="flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary"
                        title="Bấm để sao chép email"
                      >
                        <Mail size={11} animated={false} className="shrink-0" />
                        <span className="truncate">{l.email}</span>
                        <Copy
                          size={10}
                          animated={false}
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-70"
                        />
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {l.is_banned && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-destructive-border bg-destructive-bg px-2 py-0.5 font-semibold text-destructive-foreground">
                            Đã khóa
                          </span>
                        )}
                        {l.is_verified_email && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-info-border bg-info-bg px-2 py-0.5 font-semibold text-info-foreground">
                            <ShieldCheck size={10} animated={false} />
                            Verified
                          </span>
                        )}
                        {l.conscious && (
                          <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                            <MapPin size={10} animated={false} />
                            {l.conscious}
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

                {/* Legal Contract Status Strip */}
                <div className="mt-3.5 flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/60 px-3 py-2">
                  <ContractBadge lecturer={l} />
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    TG: {formatShortDate(l.create_at)}
                  </span>
                </div>

                {l.bio && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {l.bio}
                  </p>
                )}

                {/* 3 Compact Metrics */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-2xl bg-background/75 p-2.5">
                    <p className="text-[10px] text-muted-foreground">
                      Khóa học
                    </p>
                    <p className="mt-0.5 font-bold text-foreground">
                      {l.course_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background/75 p-2.5">
                    <p className="text-[10px] text-muted-foreground">
                      Học viên
                    </p>
                    <p className="mt-0.5 font-bold text-primary">
                      {(l.student_count ?? 0).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary-light/55 p-2.5">
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
                <th className="px-4 py-3.5">Hợp đồng PKI</th>
                <th className="px-4 py-3.5">Khóa / HV</th>
                <th className="px-4 py-3.5">Đánh giá</th>
                <th className="px-4 py-3.5">Số dư Coin</th>
                <th className="px-4 py-3.5">Trạng thái</th>
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
                    <div className="flex items-center gap-3">
                      {l.avatar ? (
                        <img
                          src={getImageUrl(l.avatar)}
                          alt={l.fullname}
                          className="h-9 w-9 shrink-0 rounded-xl border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-vanilla-border bg-accent-vanilla text-xs font-bold text-accent-vanilla-foreground">
                          {(l.fullname || l.email).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {l.fullname || "Chưa đặt tên"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {l.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ContractBadge lecturer={l} />
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <strong>{l.course_count}</strong> khóa ·{" "}
                    <strong className="text-primary">
                      {(l.student_count ?? 0).toLocaleString("vi-VN")}
                    </strong>{" "}
                    HV
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-accent-vanilla-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} animated={false} />
                      {(l.rating_avg ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-primary">
                      {formatCoin(l.paid_coins ?? l.wallet_balance ?? 0)}
                    </p>
                    {(l.bonus_coins ?? 0) > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        +{formatCoin(l.bonus_coins)} thưởng
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
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
                      <Link
                        href={`/admin/lecturers/${l.id}`}
                        title="Xem hồ sơ 360°"
                        aria-label={`Xem ${l.fullname}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-primary hover:bg-primary-light"
                      >
                        <Eye size={14} animated={false} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLecturer(l);
                          setDrawerOpen(true);
                        }}
                        title="Chỉnh sửa"
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
                          title="Mở khóa"
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
                          title="Khóa tài khoản"
                          aria-label={`Khóa ${l.fullname}`}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-warning-bg hover:text-warning-foreground"
                        >
                          <Ban size={14} animated={false} />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDeleteTarget(l)}
                        title="Xóa mềm"
                        aria-label={`Xóa ${l.fullname}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground"
                      >
                        <Trash2 size={14} animated={false} />
                      </button>
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
                aria-label="Đóng"
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
                aria-label="Đóng"
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
            ...(menuState.lecturer.master_contract_number
              ? [
                  {
                    label: `Kiểm toán HĐ ${menuState.lecturer.master_contract_number}`,
                    onClick: () => {
                      router.push(
                        `/admin/contracts?search=${encodeURIComponent(menuState.lecturer.master_contract_number || "")}`,
                      );
                      setMenuState(null);
                    },
                  },
                ]
              : []),
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
