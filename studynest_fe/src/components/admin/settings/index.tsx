"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Lock,
  Percent,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Wallet,
} from "pulsoicon-react";
import { Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import AISettingsPanel from "./ai-settings";

interface PlatformSettings {
  id: string;
  platform_fee: number;
  hold_days: number;
  payout_min_balance: number;
  payout_schedule: string;
  currency: string;
  allow_wallet_topup: boolean;
  allow_auto_withdraw: boolean;
  max_discounts_per_course: number;
  refund_max_courses_per_month?: number;
  monthly_platform_coupon_budget?: number;
  coin_vnd_rate?: number;
  bonus_coin_max_share?: number;
  discount_max_percent: number;
  discount_min_price: number;
  course_min_price: number;
  course_max_price: number;
  course_default_language: string;
  embedding_dim: number;
  search_top_k: number;
  rag_max_chunks: number;
  max_login_attempts: number;
  lock_time_minutes: number;
  updated_at: string;
  updated_by: string | null;
}

type SettingsTab = "ai" | "finance" | "economy" | "commerce" | "security";

const SETTINGS_TABS: {
  key: SettingsTab;
  label: string;
  subtitle: string;
  icon: typeof Bot;
}[] = [
  {
    key: "ai",
    label: "AI & RAG",
    subtitle: "9Router, Embedding & Tìm kiếm",
    icon: Bot,
  },
  {
    key: "finance",
    label: "Tài chính & Phí",
    subtitle: "Chia doanh thu, Escrow & Lịch chi",
    icon: Percent,
  },
  {
    key: "economy",
    label: "Ví & Kinh tế Coin",
    subtitle: "Tỉ giá Coin, Hoàn tiền & Ngân sách",
    icon: Coins,
  },
  {
    key: "commerce",
    label: "Khóa học & Voucher",
    subtitle: "Khung giá bán & Luật khuyến mãi",
    icon: Tag,
  },
  {
    key: "security",
    label: "Bảo mật",
    subtitle: "Chống dò mật khẩu & Khóa phiên",
    icon: ShieldCheck,
  },
];

const EDITABLE_KEYS: (keyof PlatformSettings)[] = [
  "platform_fee",
  "hold_days",
  "payout_min_balance",
  "payout_schedule",
  "currency",
  "allow_wallet_topup",
  "allow_auto_withdraw",
  "max_discounts_per_course",
  "refund_max_courses_per_month",
  "monthly_platform_coupon_budget",
  "coin_vnd_rate",
  "bonus_coin_max_share",
  "discount_max_percent",
  "discount_min_price",
  "course_min_price",
  "course_max_price",
  "course_default_language",
  "embedding_dim",
  "search_top_k",
  "rag_max_chunks",
  "max_login_attempts",
  "lock_time_minutes",
];

function extractEditable(data: PlatformSettings): Partial<PlatformSettings> {
  const out: Partial<PlatformSettings> = {};
  for (const k of EDITABLE_KEYS) {
    if (data[k] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[k] = data[k];
    }
  }
  return out;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<PlatformSettings>>({});

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<PlatformSettings>(
      "/admin/settings",
      async (url: string) => (await api.get(url)).data,
      { revalidateOnFocus: false },
    );

  useEffect(() => {
    if (data) {
      setFormData(extractEditable(data));
    }
  }, [data]);

  const changedCount = useMemo(() => {
    if (!data) return 0;
    let cnt = 0;
    for (const k of EDITABLE_KEYS) {
      if (data[k] === undefined && formData[k] === undefined) continue;
      if (String(data[k] ?? "") !== String(formData[k] ?? "")) cnt += 1;
    }
    return cnt;
  }, [data, formData]);

  const updateField = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetDraft = () => {
    if (data) setFormData(extractEditable(data));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.put("/admin/settings", formData);
      await mutate();
      toast.success("Đã lưu toàn bộ cài đặt hệ thống!");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể cập nhật cài đặt. Kiểm tra lại giá trị nhập.";
      toast.error(detail);
    } finally {
      setIsSaving(false);
    }
  };

  const platformFeePct = Math.round(
    Number(formData.platform_fee ?? data?.platform_fee ?? 0.3) * 10000,
  ) / 100;
  const instructorFeePct = Math.max(
    0,
    Math.round((100 - platformFeePct) * 100) / 100,
  );
  const sampleOrderVnd = 500_000;
  const samplePlatformShare = Math.round(
    (sampleOrderVnd * platformFeePct) / 100,
  );
  const sampleInstructorShare = sampleOrderVnd - samplePlatformShare;

  const bonusSharePct = Math.round(
    Number(formData.bonus_coin_max_share ?? data?.bonus_coin_max_share ?? 0) *
      100,
  );

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 pb-24 text-foreground sm:p-6 lg:p-8">
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
              <SlidersHorizontal size={13} animated={false} />
              Mây Mây System Control Center
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Cấu hình &amp; Điều phối Nền tảng
            </h1>
            <p className="text-sm text-muted-foreground">
              Quản trị mô hình AI 9Router, tỉ lệ chia doanh thu, kinh tế Coin, khung giá khóa học và chính sách bảo mật toàn hệ thống.
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
              Tải lại
            </Button>
            <Button
              size="sm"
              disabled={isSaving || changedCount === 0}
              onClick={() => void handleSubmit()}
            >
              <Save size={14} />
              {isSaving
                ? "Đang lưu..."
                : changedCount > 0
                  ? `Lưu ${changedCount} thay đổi`
                  : "Đã đồng bộ"}
            </Button>
          </div>
        </div>

        {/* 4 Live Config Summary Pills */}
        {data && (
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Chia doanh thu (Sàn / GV)
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {platformFeePct}% / {instructorFeePct}%
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Giữ Escrow {formData.hold_days ?? data.hold_days} ngày
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Tỉ giá quy đổi Coin
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                1 Coin ={" "}
                {(formData.coin_vnd_rate ?? data.coin_vnd_rate ?? 1000).toLocaleString(
                  "vi-VN",
                )}
                đ
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Coin thưởng tối đa {bonusSharePct}% đơn hàng
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Lịch chi trả &amp; Rút tối thiểu
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {formatVndAsCoin(
                  Number(formData.payout_min_balance ?? data.payout_min_balance ?? 0),
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-primary">
                Lịch: {formData.payout_schedule ?? data.payout_schedule}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Clock size={12} animated={false} />
                Cập nhật lần cuối
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {new Date(data.updated_at).toLocaleString("vi-VN")}
              </p>
              <p className="mt-0.5 text-[11px] text-success-foreground">
                Khóa sau {formData.max_login_attempts ?? data.max_login_attempts} lần sai
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 5 Section Tabs */}
      <nav
        aria-label="Nhóm cấu hình hệ thống"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
      >
        {SETTINGS_TABS.map(({ key, label, subtitle, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`group flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_-12px_rgba(53,111,167,0.45)]"
                  : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/40"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-primary-light text-primary group-hover:bg-surface"
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {label}
                </span>
                <span
                  className={`block truncate text-[11px] ${
                    active
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Error / Loading */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được cấu hình hệ thống.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {isLoading || !data ? (
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-surface p-6" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: AI & RAG */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <AISettingsPanel />

              <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
                <h2 className="text-base font-semibold text-foreground">
                  Cấu hình RAG &amp; Tìm kiếm Ngữ nghĩa (Vector Search)
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Điều chỉnh số lượng đoạn ngữ cảnh truy xuất cho Trợ lý Mây AI và tìm kiếm khóa học thông minh.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="Chiều vector Embedding (embedding_dim)"
                    type="number"
                    min={128}
                    max={4096}
                    value={String(formData.embedding_dim ?? "")}
                    onChange={(e) =>
                      updateField("embedding_dim", Number(e.target.value) || 0)
                    }
                  />
                  <Input
                    label="Top-K kết quả tìm kiếm (search_top_k)"
                    type="number"
                    min={1}
                    max={50}
                    value={String(formData.search_top_k ?? "")}
                    onChange={(e) =>
                      updateField("search_top_k", Number(e.target.value) || 1)
                    }
                  />
                  <Input
                    label="Số chunks RAG tối đa (rag_max_chunks)"
                    type="number"
                    min={1}
                    max={200}
                    value={String(formData.rag_max_chunks ?? "")}
                    onChange={(e) =>
                      updateField("rag_max_chunks", Number(e.target.value) || 1)
                    }
                  />
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: FINANCE & REVENUE SPLIT */}
          {activeTab === "finance" && (
            <div className="space-y-6">
              {/* Interactive Revenue Split Simulator */}
              <section className="rounded-3xl border border-primary-pastel/80 bg-gradient-to-br from-primary-light/55 via-surface to-accent/25 p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.12)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Mô phỏng Tỉ lệ Chia Doanh Thu (Revenue Split)
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Kéo thanh trượt hoặc nhập chính xác để điều chỉnh phí nền tảng; hệ thống tự động tính phần giảng viên.
                    </p>
                  </div>
                  <span className="rounded-full border border-primary-pastel bg-surface px-3 py-1 text-xs font-bold text-primary">
                    Sàn {platformFeePct}% · Giảng viên {instructorFeePct}%
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    aria-label="Tỉ lệ phí nền tảng (%)"
                    value={Math.round(platformFeePct)}
                    onChange={(e) =>
                      updateField(
                        "platform_fee",
                        Number((Number(e.target.value) / 100).toFixed(4)),
                      )
                    }
                    className="h-2.5 w-full cursor-pointer accent-primary"
                  />

                  <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full bg-accent-border transition-all"
                      style={{ width: `${platformFeePct}%` }}
                    />
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${instructorFeePct}%` }}
                    />
                  </div>

                  {/* Sample 500k Order Breakdown */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-surface/90 p-3.5 text-xs">
                      <p className="text-muted-foreground">
                        Ví dụ 1 đơn khóa học
                      </p>
                      <p className="mt-1 text-base font-bold text-foreground">
                        {formatVndAsCoin(sampleOrderVnd)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-accent-border bg-surface/90 p-3.5 text-xs">
                      <p className="text-muted-foreground">
                        Nền tảng Mây Mây nhận ({platformFeePct}%)
                      </p>
                      <p className="mt-1 text-base font-bold text-accent-foreground">
                        {formatVndAsCoin(samplePlatformShare)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-primary-pastel bg-surface/90 p-3.5 text-xs">
                      <p className="text-muted-foreground">
                        Giảng viên thực nhận ({instructorFeePct}%)
                      </p>
                      <p className="mt-1 text-base font-bold text-primary">
                        {formatVndAsCoin(sampleInstructorShare)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
                <h2 className="text-base font-semibold text-foreground">
                  Thông số Thanh toán &amp; Giải ngân Escrow
                </h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Phí nền tảng chính xác (0.0000 – 1.0000)"
                    type="number"
                    min={0}
                    max={1}
                    step={0.0001}
                    value={String(formData.platform_fee ?? "")}
                    onChange={(e) =>
                      updateField("platform_fee", parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    label="Số ngày giữ tiền Escrow (hold_days)"
                    type="number"
                    min={0}
                    max={365}
                    value={String(formData.hold_days ?? "")}
                    onChange={(e) =>
                      updateField("hold_days", Number(e.target.value) || 0)
                    }
                  />
                  <Input
                    label="Số dư tối thiểu để rút (VND)"
                    type="number"
                    min={0}
                    value={String(formData.payout_min_balance ?? "")}
                    onChange={(e) =>
                      updateField(
                        "payout_min_balance",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <div className="space-y-2">
                    <Input
                      label="Lịch thanh toán (payout_schedule)"
                      value={String(formData.payout_schedule ?? "")}
                      onChange={(e) =>
                        updateField("payout_schedule", e.target.value)
                      }
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {["daily", "mon-wed-fri", "weekly", "manual"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateField("payout_schedule", p)}
                          className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
                            formData.payout_schedule === p
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary-pastel"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: WALLET & COIN ECONOMY */}
          {activeTab === "economy" && (
            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Wallet size={18} className="text-primary" />
                  Quyền Nạp &amp; Rút Ví Tự động
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary-pastel">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Cho phép nạp tiền vào ví
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Bật/tắt cổng nạp Coin vào ví học viên trên toàn hệ thống.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.allow_wallet_topup)}
                      onChange={(e) =>
                        updateField("allow_wallet_topup", e.target.checked)
                      }
                      className="mt-1 h-5 w-5 accent-primary"
                    />
                  </label>

                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary-pastel">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Cho phép giảng viên rút tiền tự động
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Cho phép hệ thống tự giải ngân định kỳ theo lịch payout.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.allow_auto_withdraw)}
                      onChange={(e) =>
                        updateField("allow_auto_withdraw", e.target.checked)
                      }
                      className="mt-1 h-5 w-5 accent-primary"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Coins size={18} className="text-primary" />
                  Chính sách Kinh tế Coin, Hoàn tiền &amp; Ngân sách Trợ giá
                </h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Tỉ giá quy đổi 1 Coin = ? VND (coin_vnd_rate)"
                    type="number"
                    min={1}
                    value={String(formData.coin_vnd_rate ?? "")}
                    onChange={(e) =>
                      updateField("coin_vnd_rate", Number(e.target.value) || 1)
                    }
                  />
                  <Input
                    label="Tỉ lệ Coin thưởng tối đa / đơn (0.000 – 1.000)"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={String(formData.bonus_coin_max_share ?? "")}
                    onChange={(e) =>
                      updateField(
                        "bonus_coin_max_share",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label="Giới hạn khóa hoàn tiền / tháng / học viên"
                    type="number"
                    min={0}
                    value={String(formData.refund_max_courses_per_month ?? "")}
                    onChange={(e) =>
                      updateField(
                        "refund_max_courses_per_month",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label="Ngân sách Coupon toàn sàn / tháng (VND)"
                    type="number"
                    min={0}
                    value={String(formData.monthly_platform_coupon_budget ?? "")}
                    onChange={(e) =>
                      updateField(
                        "monthly_platform_coupon_budget",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: COMMERCE & VOUCHER RULES */}
          {activeTab === "commerce" && (
            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
                <h2 className="text-base font-semibold text-foreground">
                  Khung Giá Khóa học &amp; Ngôn ngữ Mặc định
                </h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Giá khóa học tối thiểu (VND)"
                    type="number"
                    min={0}
                    value={String(formData.course_min_price ?? "")}
                    onChange={(e) =>
                      updateField(
                        "course_min_price",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label="Giá khóa học tối đa (VND)"
                    type="number"
                    min={0}
                    value={String(formData.course_max_price ?? "")}
                    onChange={(e) =>
                      updateField(
                        "course_max_price",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      Tiền tệ mặc định
                    </span>
                    <select
                      value={formData.currency ?? "VND"}
                      onChange={(e) => updateField("currency", e.target.value)}
                      className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      Ngôn ngữ mặc định
                    </span>
                    <select
                      value={formData.course_default_language ?? "vi"}
                      onChange={(e) =>
                        updateField("course_default_language", e.target.value)
                      }
                      className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
                <h2 className="text-base font-semibold text-foreground">
                  Giới hạn Mã Giảm Giá
                </h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="Số mã tối đa mỗi khóa học"
                    type="number"
                    min={0}
                    max={20}
                    value={String(formData.max_discounts_per_course ?? "")}
                    onChange={(e) =>
                      updateField(
                        "max_discounts_per_course",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label="% Giảm giá tối đa cho phép"
                    type="number"
                    min={0}
                    max={100}
                    value={String(formData.discount_max_percent ?? "")}
                    onChange={(e) =>
                      updateField(
                        "discount_max_percent",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label="Giá tối thiểu sau khi giảm (VND)"
                    type="number"
                    min={0}
                    value={String(formData.discount_min_price ?? "")}
                    onChange={(e) =>
                      updateField(
                        "discount_min_price",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: SECURITY */}
          {activeTab === "security" && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Lock size={18} className="text-primary" />
                    Chính sách Bảo vệ Đăng nhập (Brute-force Guard)
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tự động tạm khóa tài khoản khi phát hiện đăng nhập sai liên tiếp vượt ngưỡng.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-semibold text-success-foreground">
                  <CheckCircle2 size={13} animated={false} />
                  Đang bảo vệ
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Số lần đăng nhập sai tối đa (max_login_attempts)"
                  type="number"
                  min={1}
                  max={50}
                  value={String(formData.max_login_attempts ?? "")}
                  onChange={(e) =>
                    updateField(
                      "max_login_attempts",
                      Number(e.target.value) || 1,
                    )
                  }
                />
                <Input
                  label="Thời gian khóa tài khoản (phút)"
                  type="number"
                  min={1}
                  max={600}
                  value={String(formData.lock_time_minutes ?? "")}
                  onChange={(e) =>
                    updateField(
                      "lock_time_minutes",
                      Number(e.target.value) || 1,
                    )
                  }
                />
              </div>
            </section>
          )}
        </form>
      )}

      {/* Sticky Unsaved Changes Bar */}
      {changedCount > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-primary-pastel bg-surface/95 px-5 py-3 shadow-[0_20px_48px_-12px_rgba(53,111,167,0.28)] backdrop-blur-md">
          <span className="text-sm font-semibold text-foreground">
            Bạn có{" "}
            <strong className="text-primary">{changedCount} thay đổi</strong>{" "}
            chưa lưu
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={resetDraft}
          >
            <RotateCcw size={14} />
            Hoàn tác
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSubmit()}
          >
            <Save size={14} />
            {isSaving ? "Đang lưu..." : "Lưu ngay"}
          </Button>
        </div>
      )}
    </main>
  );
}
