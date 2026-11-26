"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Key,
  LayoutGrid,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  User,
  X,
} from "pulsoicon-react";
import { Button, Pagination } from "@/components/ui";
import {
  formatContractDateTime,
  getContractStatusMeta,
  getContractTypeLabel,
} from "@/components/shared/digital-contract/signing-studio";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  AdminContractStats,
  ContractDetail,
  ContractIntegrity,
  ContractListItem,
  ContractListResponse,
  ContractTemplateItem,
} from "@/types/contract";

const QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 12, min: 1, max: 100 },
  search: { type: "string", default: "" },
  status: { type: "string", default: "" },
  contract_type: { type: "string", default: "" },
} as const;

const AUDIT_LABELS: Record<string, string> = {
  created: "Khởi tạo văn bản hợp đồng",
  otp_sent: "Gửi mã OTP xác thực",
  signed: "Bên B ký số PKI X.509",
  countersigned: "Bên A (Mây Mây CA) đồng ký",
  pdf_downloaded: "Xuất tệp PDF PAdES",
  verified: "Kiểm toán toàn vẹn SHA-256",
  revoked: "Thu hồi hiệu lực hợp đồng",
};

const TEMPLATE_VARIABLES = [
  "{{contract_number}}",
  "{{signed_date}}",
  "{{lecturer_name}}",
  "{{lecturer_email}}",
  "{{signer_cccd}}",
  "{{instructor_share_pct}}",
  "{{platform_fee_pct}}",
  "{{coin_vnd_rate}}",
  "{{activation_fee_coin}}",
  "{{hold_days}}",
];

function renderFormalA4Content(text: string): React.ReactNode[] {
  const rawLines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const trimmed = rawLines[i].trim();
    if (!trimmed) {
      nodes.push(<div key={`sp-${i}`} className="h-1" />);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tblStart = i;
      const tblLines: string[] = [];
      while (
        i < rawLines.length &&
        rawLines[i].trim().startsWith("|") &&
        rawLines[i].trim().endsWith("|")
      ) {
        tblLines.push(rawLines[i].trim());
        i += 1;
      }
      const rows = tblLines
        .map((l) => l.slice(1, -1).split("|").map((c) => c.trim()))
        .filter((cells) => !cells.every((c) => /^[:\-\s]+$/.test(c)));

      if (rows.length > 0) {
        const [headerRow, ...bodyRows] = rows;
        nodes.push(
          <div key={`tbl-${tblStart}`} className="my-3 overflow-x-auto">
            <table className="w-full border-collapse border border-black text-[12.5px] leading-[1.55]">
              <thead>
                <tr className="bg-gray-100">
                  {headerRow.map((cell, ci) => (
                    <th
                      key={ci}
                      className="border border-black px-2.5 py-2 text-left font-bold text-black"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`border border-black px-2.5 py-2 align-top text-black ${
                          ci === 0 ? "font-semibold" : ""
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={`h-${i}`}
          className="pt-3.5 text-[14px] font-bold uppercase tracking-wide text-black"
        >
          {trimmed.replace(/^#+\s*/, "")}
        </h3>,
      );
    } else if (trimmed.startsWith("- ")) {
      nodes.push(
        <p key={`li-${i}`} className="pl-5 -indent-3 text-justify">
          – {trimmed.slice(2)}
        </p>,
      );
    } else {
      nodes.push(
        <p key={`p-${i}`} className="text-justify">
          {trimmed}
        </p>,
      );
    }
    i += 1;
  }

  return nodes;
}

function exportContractsCsv(items: ContractListItem[]) {
  const header = [
    "So Hop Dong",
    "Loai Hop Dong",
    "Giang Vien",
    "Email",
    "Trang Thai",
    "Phuong Thuc Ky",
    "Serial X509",
    "Thoi Diem Ky",
    "Thoi Diem Dong Ky",
  ];
  const rows = items.map((c) => [
    c.contract_number,
    getContractTypeLabel(c.contract_type),
    c.party_b.fullname,
    c.party_b.email,
    getContractStatusMeta(c.status).label,
    c.signing_method || "",
    c.cert_serial || "",
    c.signed_at || "",
    c.countersigned_at || "",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maymay-hop-dong-so-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminContractsCenter() {
  const [activeTab, setActiveTab] = useState<"ledger" | "templates">("ledger");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedDetail, setSelectedDetail] = useState<ContractDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ContractIntegrity | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevokeBox, setShowRevokeBox] = useState(false);

  const [editingTpl, setEditingTpl] = useState<{
    code: string;
    version: string;
    title: string;
    description: string;
    body_markdown: string;
  } | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  const { values, setParam, setParams, resetParams } =
    useUrlQueryState(QUERY_SCHEMA);
  const { page, limit, search: debouncedSearch, status, contract_type } = values;

  const { inputValue: search, setInputValue: setSearch } = useDebouncedUrlSearch(
    debouncedSearch,
    (val) => setParam("search", val),
  );

  const { data: stats, mutate: mutateStats } = useSWR<AdminContractStats>(
    "/admin/contracts/stats",
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  const queryString = useMemo(
    () =>
      new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(status ? { status } : {}),
        ...(contract_type ? { contract_type } : {}),
      }).toString(),
    [page, limit, debouncedSearch, status, contract_type],
  );

  const {
    data: listData,
    isLoading,
    isValidating,
    mutate: mutateList,
  } = useSWR<ContractListResponse>(
    `/admin/contracts?${queryString}`,
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  const { data: templatesData, mutate: mutateTemplates } = useSWR<{
    items: ContractTemplateItem[];
  }>(
    activeTab === "templates" ? "/admin/contracts/templates" : null,
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  const items = listData?.items ?? [];

  async function openDetail(id: string) {
    setDrawerLoading(true);
    setVerifyResult(null);
    setShowRevokeBox(false);
    setRevokeReason("");
    try {
      const res = await api.get(`/admin/contracts/${id}`);
      setSelectedDetail(res.data);
      setVerifyResult(res.data?.integrity || null);
    } catch {
      toast.error("Không tải được chi tiết hồ sơ hợp đồng.");
    } finally {
      setDrawerLoading(false);
    }
  }

  async function handleCountersign(id: string) {
    setActionBusy(true);
    try {
      const res = await api.post(`/admin/contracts/${id}/countersign`);
      if (selectedDetail?.id === id) {
        setSelectedDetail(res.data);
        setVerifyResult(res.data?.integrity || null);
      }
      await Promise.all([mutateList(), mutateStats()]);
      toast.success("Đã đồng ký điện tử Bên A (Mây Mây Digital CA) thành công!");
    } catch {
      toast.error("Không thể đồng ký hợp đồng này.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleVerify(id: string) {
    setActionBusy(true);
    try {
      const res = await api.post(`/admin/contracts/${id}/verify`);
      setVerifyResult(res.data);
      if (res.data?.valid) {
        toast.success("Xác thực thành công: SHA-256, PKI X.509 & HMAC nguyên vẹn 100%!");
      } else {
        toast.error("Cảnh báo: Chữ ký số hoặc nội dung không hợp lệ!");
      }
    } catch {
      toast.error("Không thể chạy kiểm tra toàn vẹn.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!revokeReason.trim()) {
      toast.error("Vui lòng nhập lý do thu hồi hiệu lực hợp đồng.");
      return;
    }
    setActionBusy(true);
    try {
      const res = await api.post(`/admin/contracts/${id}/revoke`, {
        reason: revokeReason.trim(),
      });
      setSelectedDetail(res.data);
      setShowRevokeBox(false);
      await Promise.all([mutateList(), mutateStats()]);
      toast.success("Đã thu hồi hiệu lực hợp đồng.");
    } catch {
      toast.error("Không thể thu hồi hợp đồng.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDownloadPdf(id: string, contractNumber: string) {
    try {
      const res = await api.get(`/admin/contracts/${id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contractNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Đã tải ${contractNumber}.pdf (Times New Roman · PAdES)`);
    } catch {
      toast.error("Không thể tải tệp PDF.");
    }
  }

  async function handleSaveTemplate() {
    if (!editingTpl) return;
    if (
      !editingTpl.title.trim() ||
      !editingTpl.version.trim() ||
      !editingTpl.body_markdown.trim()
    ) {
      toast.error("Vui lòng điền đủ phiên bản, tiêu đề và nội dung điều khoản.");
      return;
    }
    setSavingTpl(true);
    try {
      await api.post("/admin/contracts/templates", editingTpl);
      toast.success(`Đã phát hành mẫu ${editingTpl.code} (${editingTpl.version})`);
      setEditingTpl(null);
      await mutateTemplates();
    } catch {
      toast.error("Không thể phát hành mẫu hợp đồng.");
    } finally {
      setSavingTpl(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Ambient Cloud Mist */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-16 h-96 w-96 rounded-full bg-primary-light/60 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-vanilla/45 blur-3xl" />
      </div>

      {/* Editorial Legal Command Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent-vanilla/45 p-6 shadow-[0_28px_64px_-22px_rgba(53,111,167,0.20)] backdrop-blur-md sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/85 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/95 px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs">
              <Cloud size={13} animated={false} />
              Mây Mây Legal &amp; PKI Command Center
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Trung tâm Quản trị Hợp đồng Điện tử
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Kiểm toán toàn văn A4 Times New Roman, xác minh 3 lớp mật mã
              (SHA-256 · PKI X.509 · HMAC), đồng ký Bên A bằng Mây Mây Digital CA
              và quản trị phiên bản mẫu hợp đồng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isValidating}
              onClick={() => void Promise.all([mutateList(), mutateStats()])}
            >
              <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} />
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={items.length === 0}
              onClick={() => {
                exportContractsCsv(items);
                toast.success(`Đã xuất ${items.length} hồ sơ hợp đồng ra CSV`);
              }}
            >
              <Download size={14} />
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* 4 Interactive Glass KPI Cards (Click to filter) */}
        {stats && (
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab("ledger");
                setParams({ status: "", page: 1 });
              }}
              className={`rounded-2xl border bg-surface/90 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
                status === "" && activeTab === "ledger"
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-white/85 hover:border-primary-pastel"
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                Tổng hồ sơ hợp đồng
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {stats.total} hồ sơ
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {stats.draft} bản thảo · {stats.revoked} thu hồi
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("ledger");
                setParams({ status: "signed", page: 1 });
              }}
              className={`rounded-2xl border bg-surface/90 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
                status === "signed"
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-primary-pastel/80 hover:border-primary"
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                Chờ Admin đồng ký
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                {stats.signed} hợp đồng
              </p>
              <p className="mt-0.5 text-[11px] text-primary">
                Bấm để duyệt đồng ký Bên A
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("ledger");
                setParams({ status: "countersigned", page: 1 });
              }}
              className={`rounded-2xl border bg-surface/90 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
                status === "countersigned"
                  ? "border-success-foreground ring-2 ring-success-border"
                  : "border-success-border/80 hover:border-success-foreground"
              }`}
            >
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CheckCircle2 size={13} className="text-success-foreground" />
                Đã đồng ký 2 bên
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-success-foreground">
                {stats.countersigned} hợp đồng
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Hoàn chỉnh dấu Mây Mây CA
              </p>
            </button>

            <div className="rounded-2xl border border-accent-vanilla-border bg-surface/90 p-4 text-left backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Key size={13} className="text-accent-vanilla-foreground" />
                Chứng thư số X.509
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-accent-vanilla-foreground">
                {stats.active_certificates} chứng thư
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Đang hiệu lực cho giảng viên
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Workspace Tabs + View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-primary-pastel/70 bg-surface p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "ledger"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={14} animated={false} />
            Sổ cái Hợp đồng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "templates"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck size={14} animated={false} />
            Template Studio
          </button>
        </div>

        {activeTab === "ledger" && (
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} animated={false} />
              Hồ sơ
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table2 size={14} animated={false} />
              Bảng
            </button>
          </div>
        )}
      </div>

      {activeTab === "ledger" ? (
        <>
          {/* Segmented Status Pills + Search Bar */}
          <section className="space-y-4 rounded-3xl border border-primary-pastel/60 bg-surface/95 p-4 shadow-[0_12px_32px_-16px_rgba(53,111,167,0.14)] sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "", label: "Tất cả", count: stats?.total },
                  { key: "signed", label: "Chờ đồng ký", count: stats?.signed },
                  {
                    key: "countersigned",
                    label: "Đã đồng ký 2 bên",
                    count: stats?.countersigned,
                  },
                  { key: "draft", label: "Bản thảo", count: stats?.draft },
                  { key: "revoked", label: "Đã thu hồi", count: stats?.revoked },
                ] as const
              ).map((pill) => {
                const active = status === pill.key;
                return (
                  <button
                    key={pill.key || "all"}
                    type="button"
                    onClick={() => setParams({ status: pill.key, page: 1 })}
                    className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
                    }`}
                  >
                    <span>{pill.label}</span>
                    {typeof pill.count === "number" && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          active
                            ? "bg-white/20 text-primary-foreground"
                            : "bg-primary-light text-primary"
                        }`}
                      >
                        {pill.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="relative md:col-span-6">
                <Search
                  size={15}
                  animated={false}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm số hợp đồng HD-MM-..., tên giảng viên, email..."
                  className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <select
                aria-label="Lọc loại hợp đồng"
                value={contract_type}
                onChange={(e) =>
                  setParams({ contract_type: e.target.value, page: 1 })
                }
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium md:col-span-4"
              >
                <option value="">Tất cả loại hợp đồng</option>
                <option value="LECTURER_MASTER">Hợp đồng Khung Giảng viên</option>
                <option value="COURSE_PUBLISHING">Phụ lục Phát hành Khóa học</option>
                <option value="COURSE_PURCHASE">Hợp đồng Mua Khóa học</option>
              </select>

              <div className="flex items-center justify-end md:col-span-2">
                {(debouncedSearch || status || contract_type) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      resetParams();
                    }}
                  >
                    Đặt lại bộ lọc
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Content: Dossier Cards or Ledger Table */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-3xl border border-border bg-surface"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-primary-pastel bg-surface p-16 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <FileText size={24} animated={false} />
              </div>
              <p className="text-sm font-bold text-foreground">
                Chưa có hồ sơ hợp đồng nào ở trạng thái này
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Thử chuyển sang tab “Tất cả” hoặc “Chờ đồng ký” để kiểm tra các
                hợp đồng mới từ giảng viên.
              </p>
              {(debouncedSearch || status || contract_type) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    resetParams();
                  }}
                >
                  Xem tất cả hợp đồng
                </Button>
              )}
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const st = getContractStatusMeta(item.status);
                const isSigned =
                  item.status === "signed" || item.status === "countersigned";
                return (
                  <article
                    key={item.id}
                    onClick={() => void openDetail(item.id)}
                    className="group flex cursor-pointer flex-col justify-between rounded-[1.75rem] border border-primary-pastel/70 bg-surface p-5 shadow-[0_14px_34px_-16px_rgba(53,111,167,0.16)] transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_22px_44px_-18px_rgba(53,111,167,0.24)]"
                  >
                    <div className="space-y-3.5">
                      {/* Top Row */}
                      <div className="flex items-center justify-between gap-2">
                        <code className="rounded-lg border border-primary-pastel bg-primary-light/80 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                          {item.contract_number}
                        </code>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.badgeClass}`}
                        >
                          {st.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-primary">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {getContractTypeLabel(item.contract_type)}
                        </p>
                      </div>

                      {/* Party B Lecturer Info */}
                      <div className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-background/65 p-3">
                        {item.party_b.avatar ? (
                          <img
                            src={getImageUrl(item.party_b.avatar)}
                            alt={item.party_b.fullname}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-primary-pastel"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                            {(item.party_b.fullname || "G").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {item.party_b.fullname}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.party_b.email}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Strip */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-xl bg-background/70 px-3 py-2">
                          <span className="block text-[10px] text-muted-foreground">
                            Chữ ký số
                          </span>
                          <strong className="text-foreground">
                            {item.signing_method === "external_p12"
                              ? "Tệp .p12 ngoài"
                              : item.signing_method === "cloud_pki"
                                ? "Cloud PKI X.509"
                                : "Chưa ký"}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-background/70 px-3 py-2">
                          <span className="block text-[10px] text-muted-foreground">
                            Thời điểm ký
                          </span>
                          <strong className="text-foreground">
                            {formatContractDateTime(
                              item.countersigned_at || item.signed_at || item.created_at,
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div
                      className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openDetail(item.id)}
                      >
                        <Eye size={13} />
                        Kiểm toán A4
                      </Button>

                      <div className="flex items-center gap-1">
                        {item.status === "signed" && (
                          <Button
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => void handleCountersign(item.id)}
                          >
                            <ShieldCheck size={13} />
                            Đồng ký
                          </Button>
                        )}
                        {isSigned && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void handleDownloadPdf(item.id, item.contract_number)
                            }
                            aria-label={`Tải PDF ${item.contract_number}`}
                          >
                            <Download size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-primary-pastel/60 bg-surface shadow-[0_14px_36px_-14px_rgba(53,111,167,0.12)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Số hợp đồng &amp; Loại</th>
                    <th className="px-5 py-3.5">Bên B (Giảng viên)</th>
                    <th className="px-5 py-3.5">Chứng thư X.509</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5">Thời điểm ký</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {items.map((item) => {
                    const st = getContractStatusMeta(item.status);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => void openDetail(item.id)}
                        className="cursor-pointer transition-colors hover:bg-primary-light/25"
                      >
                        <td className="px-5 py-3.5">
                          <code className="rounded-md bg-primary-light px-2 py-0.5 font-mono text-xs font-bold text-primary">
                            {item.contract_number}
                          </code>
                          <p className="mt-1 text-xs font-semibold text-foreground">
                            {getContractTypeLabel(item.contract_type)}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-bold text-foreground">
                            {item.party_b.fullname}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.party_b.email}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-medium text-foreground">
                            {item.signing_method === "external_p12"
                              ? "Chứng thư .p12"
                              : item.signing_method === "cloud_pki"
                                ? "Cloud PKI X.509"
                                : "Chưa ký"}
                          </p>
                          {item.cert_serial && (
                            <p className="max-w-[140px] truncate font-mono text-[10px] text-muted-foreground">
                              {item.cert_serial}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.badgeClass}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {formatContractDateTime(
                            item.countersigned_at || item.signed_at || item.created_at,
                          )}
                        </td>
                        <td
                          className="px-5 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            {item.status === "signed" && (
                              <Button
                                size="sm"
                                disabled={actionBusy}
                                onClick={() => void handleCountersign(item.id)}
                              >
                                Đồng ký
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void openDetail(item.id)}
                            >
                              <Eye size={14} />
                              Kiểm toán
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void handleDownloadPdf(item.id, item.contract_number)
                              }
                            >
                              <Download size={14} />
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            totalPages={listData?.total_pages ?? 1}
            totalItems={listData?.total ?? 0}
            pageSize={limit}
            itemLabel="hợp đồng"
            disabled={isValidating}
            onPageChange={(nextPage) => setParam("page", nextPage)}
            onPageSizeChange={(nextSize) =>
              setParams({ limit: nextSize, page: 1 })
            }
          />
        </>
      ) : (
        /* Template Studio with Live A4 Preview */
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(templatesData?.items ?? []).map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-3xl border border-primary-pastel/70 bg-surface p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="rounded-lg bg-primary-light px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {tpl.code} · {tpl.version}
                    </code>
                    {tpl.is_active && (
                      <span className="rounded-full border border-success-border bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                        Đang áp dụng
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold text-foreground">
                    {tpl.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tpl.description}
                  </p>
                </div>
                <div className="mt-4 flex justify-end border-t border-border/70 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditingTpl({
                        code: tpl.code,
                        version: tpl.version,
                        title: tpl.title,
                        description: tpl.description || "",
                        body_markdown: tpl.body_markdown,
                      })
                    }
                  >
                    <Plus size={13} />
                    Soạn / Nâng phiên bản
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {editingTpl && (
            <div className="grid grid-cols-1 gap-5 rounded-3xl border border-primary-pastel bg-surface p-6 shadow-md xl:grid-cols-12">
              <div className="space-y-4 xl:col-span-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Soạn mẫu {editingTpl.code}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingTpl(null)}
                    className="rounded-xl p-1.5 text-muted-foreground hover:bg-background"
                  >
                    <X size={16} animated={false} />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold">Phiên bản</span>
                    <input
                      type="text"
                      value={editingTpl.version}
                      onChange={(e) =>
                        setEditingTpl({ ...editingTpl, version: e.target.value })
                      }
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs sm:col-span-2">
                    <span className="font-semibold">Tiêu đề hợp đồng</span>
                    <input
                      type="text"
                      value={editingTpl.title}
                      onChange={(e) =>
                        setEditingTpl({ ...editingTpl, title: e.target.value })
                      }
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  </label>
                </div>

                {/* Quick Variable Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Bấm để chèn biến động hệ thống:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setEditingTpl({
                            ...editingTpl,
                            body_markdown: `${editingTpl.body_markdown} ${v}`,
                          })
                        }
                        className="rounded-lg border border-primary-pastel bg-primary-light/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={16}
                  value={editingTpl.body_markdown}
                  onChange={(e) =>
                    setEditingTpl({
                      ...editingTpl,
                      body_markdown: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-border bg-background p-3.5 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none"
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTpl(null)}
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    disabled={savingTpl}
                    onClick={() => void handleSaveTemplate()}
                  >
                    {savingTpl ? "Đang phát hành..." : "Lưu & Phát hành mẫu"}
                  </Button>
                </div>
              </div>

              {/* Live A4 Preview */}
              <div className="rounded-2xl border border-gray-300 bg-[#EEF1F5] p-4 xl:col-span-6">
                <p className="mb-2 text-xs font-bold text-gray-700">
                  Xem trước văn bản A4 (Times New Roman)
                </p>
                <div
                  style={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                  }}
                  className="max-h-[560px] overflow-y-auto border border-gray-400 bg-white p-6 text-[13px] leading-[1.7] text-black shadow-xs"
                >
                  <h4 className="mb-3 text-center text-base font-bold uppercase">
                    {editingTpl.title}
                  </h4>
                  {renderFormalA4Content(editingTpl.body_markdown)}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Full-Screen Legal Audit & Countersign Workspace */}
      {(selectedDetail || drawerLoading) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Không gian Kiểm toán Hợp đồng Điện tử"
          className="fixed inset-0 z-[100] flex flex-col bg-[#EEF1F5] text-[#111827]"
        >
          {/* Top Formal Bar */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-300 bg-white px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-900">
                <ShieldCheck size={16} animated={false} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-gray-950">
                    {selectedDetail?.title || "Đang tải hồ sơ..."}
                  </span>
                  {selectedDetail && (
                    <code className="hidden rounded border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-800 sm:inline">
                      {selectedDetail.contract_number}
                    </code>
                  )}
                </div>
                <p className="text-[11px] text-gray-600">
                  Phòng Pháp chế &amp; Kiểm toán Chữ ký số · Mây Mây Digital CA
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {selectedDetail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void handleDownloadPdf(
                      selectedDetail.id,
                      selectedDetail.contract_number,
                    )
                  }
                >
                  <Download size={14} />
                  Tải PDF (PAdES)
                </Button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 hover:bg-gray-100"
              >
                <X size={15} animated={false} />
                Đóng
              </button>
            </div>
          </header>

          {drawerLoading || !selectedDetail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-700">
              Đang tải toàn văn A4 và dữ liệu mật mã...
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              {/* LEFT (~68%): Formal A4 White Paper Times New Roman */}
              <section className="flex-1 overflow-y-auto px-3 py-6 sm:px-8 sm:py-8">
                <article
                  style={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                  }}
                  className="mx-auto w-full max-w-[840px] border border-gray-400 bg-white px-7 py-10 text-black shadow-[0_10px_34px_rgba(15,23,42,0.10)] sm:px-14 sm:py-14"
                >
                  <div className="text-center">
                    <p className="text-[14px] font-bold uppercase tracking-wide text-black">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="mt-0.5 text-[13px] font-bold text-black">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <div className="mx-auto mt-1.5 h-[1px] w-44 bg-black" />
                  </div>

                  <div className="mt-7 text-center">
                    <h2 className="text-[19px] font-bold uppercase text-black">
                      {selectedDetail.title}
                    </h2>
                    <p className="mt-1.5 text-[13px] font-bold text-black">
                      Số: {selectedDetail.contract_number}
                    </p>
                  </div>

                  <div className="mt-6 space-y-2.5 text-[14px] leading-[1.75] text-black">
                    {renderFormalA4Content(selectedDetail.rendered_content)}
                  </div>

                  {/* Signature Boxes */}
                  <div className="mt-12 grid grid-cols-1 gap-6 border-t-2 border-black pt-8 sm:grid-cols-2">
                    <div className="flex flex-col items-center border border-gray-300 p-5 text-center">
                      <p className="text-xs font-bold uppercase text-black">
                        ĐẠI DIỆN BÊN A (MÂY MÂY)
                      </p>
                      <div className="mt-4 w-full border border-gray-900 bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-black">
                        <p className="font-bold uppercase">
                          ✓{" "}
                          {selectedDetail.status === "countersigned"
                            ? "ĐÃ ĐỒNG KÝ ĐIỆN TỬ"
                            : "CHỜ ADMIN ĐỒNG KÝ"}
                        </p>
                        <p>Chứng thư: Mây Mây Digital CA (X.509)</p>
                        {selectedDetail.countersigner_name && (
                          <p>Người đồng ký: {selectedDetail.countersigner_name}</p>
                        )}
                        {selectedDetail.countersigned_at && (
                          <p>
                            Ngày đồng ký:{" "}
                            {formatContractDateTime(selectedDetail.countersigned_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center border border-gray-300 p-5 text-center">
                      <p className="text-xs font-bold uppercase text-black">
                        ĐẠI DIỆN BÊN B (GIẢNG VIÊN)
                      </p>
                      {selectedDetail.signature_image_data && (
                        <img
                          src={selectedDetail.signature_image_data}
                          alt="Chữ ký Bên B"
                          className="my-3 max-h-16 object-contain"
                        />
                      )}
                      <div className="mt-2 w-full border border-gray-900 bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-black">
                        <p className="font-bold uppercase">
                          ✓ ĐÃ KÝ ĐIỆN TỬ (PKI X.509)
                        </p>
                        <p>Họ tên: {selectedDetail.party_b.fullname}</p>
                        <p>CCCD: {selectedDetail.signer_cccd || "—"}</p>
                        <p>
                          Ngày ký: {formatContractDateTime(selectedDetail.signed_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              {/* RIGHT (~32%): Legal Audit & Countersign Console */}
              <aside className="flex w-full shrink-0 flex-col border-t border-gray-300 bg-white lg:w-[410px] lg:border-l lg:border-t-0">
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {/* Status & Integrity Check */}
                  <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          getContractStatusMeta(selectedDetail.status).badgeClass
                        }`}
                      >
                        {getContractStatusMeta(selectedDetail.status).label}
                      </span>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void handleVerify(selectedDetail.id)}
                        className="text-xs font-bold text-gray-900 underline hover:opacity-75"
                      >
                        Kiểm tra mật mã
                      </button>
                    </div>

                    {verifyResult && (
                      <div className="space-y-1.5 text-xs">
                        {[
                          ["Toàn vẹn SHA-256", verifyResult.hash_match],
                          ["Chữ ký PKI X.509", verifyResult.pki_signature_valid],
                          ["Niêm phong HMAC", verifyResult.hmac_seal_valid],
                        ].map(([label, ok]) => (
                          <div
                            key={String(label)}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-1.5"
                          >
                            <span className="text-gray-700">{String(label)}</span>
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${
                                ok
                                  ? "text-success-foreground"
                                  : "text-destructive-foreground"
                              }`}
                            >
                              {ok ? (
                                <CheckCircle2 size={13} animated={false} />
                              ) : (
                                <AlertTriangle size={13} animated={false} />
                              )}
                              {ok ? "Hợp lệ" : "Lỗi"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedDetail.document_hash && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-600">
                          <span className="font-semibold">SHA-256 HASH</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedDetail.document_hash || "",
                              );
                              toast.success("Đã sao chép mã băm SHA-256");
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-gray-900 hover:underline"
                          >
                            <Copy size={11} animated={false} />
                            Copy
                          </button>
                        </div>
                        <p className="mt-1 break-all rounded-lg border border-gray-200 bg-white p-2 font-mono text-[10px] text-gray-800">
                          {selectedDetail.document_hash}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Party B Identity */}
                  <div className="space-y-2 rounded-2xl border border-gray-200 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">
                        Thông tin Bên B (Giảng viên)
                      </span>
                      <Link
                        href={`/admin/lecturers/${selectedDetail.party_b.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <User size={12} animated={false} />
                        Hồ sơ GV
                      </Link>
                    </div>
                    <p className="font-semibold text-gray-950">
                      {selectedDetail.party_b.fullname}
                    </p>
                    <p className="text-gray-600">{selectedDetail.party_b.email}</p>
                    <p className="text-gray-700">
                      CCCD: <strong>{selectedDetail.signer_cccd || "—"}</strong>
                    </p>
                    {selectedDetail.cert_serial && (
                      <p className="truncate font-mono text-[10.5px] text-gray-600">
                        Serial: {selectedDetail.cert_serial}
                      </p>
                    )}
                  </div>

                  {/* Audit Trail */}
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-gray-950">
                      <Clock size={14} animated={false} />
                      Nhật ký Pháp lý (Audit Trail)
                    </h3>
                    <div className="space-y-1.5">
                      {selectedDetail.audit_logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[11px]"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-950">
                              {AUDIT_LABELS[log.action] || log.action}
                            </p>
                            <p className="truncate text-[10px] text-gray-600">
                              {log.actor_name}
                              {log.ip_address ? ` · ${log.ip_address}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-gray-500">
                            {formatContractDateTime(log.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revoke Box */}
                  {showRevokeBox && (
                    <div className="space-y-2 rounded-2xl border border-destructive-border bg-destructive-bg/40 p-3.5">
                      <textarea
                        rows={3}
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="Nhập lý do thu hồi hiệu lực hợp đồng..."
                        className="w-full rounded-xl border border-border bg-white p-2.5 text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowRevokeBox(false)}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionBusy}
                          onClick={() => void handleRevoke(selectedDetail.id)}
                        >
                          Xác nhận thu hồi
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Audit Footer */}
                <div className="space-y-2 border-t border-gray-200 bg-gray-50 p-4">
                  {selectedDetail.status === "signed" && (
                    <Button
                      fullWidth
                      disabled={actionBusy}
                      onClick={() => void handleCountersign(selectedDetail.id)}
                    >
                      <ShieldCheck size={15} />
                      Đồng ký Bên A (Mây Mây Digital CA)
                    </Button>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/verify-contract/${selectedDetail.contract_number}`}
                      target="_blank"
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-900 hover:bg-gray-100"
                    >
                      <Lock size={12} animated={false} />
                      Xác thực công khai
                      <ExternalLink size={12} animated={false} />
                    </Link>

                    {selectedDetail.status !== "revoked" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actionBusy}
                        onClick={() => setShowRevokeBox((v) => !v)}
                      >
                        Thu hồi
                      </Button>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
