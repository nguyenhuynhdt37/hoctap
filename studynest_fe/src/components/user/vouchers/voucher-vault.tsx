"use client";

import { Badge, Button, CoinBadge, EmptyState, Skeleton } from "@/components/ui";
import { vndToCoin } from "@/lib/learning-hub/coin-logic";
import { useCoinRate } from "@/lib/learning-hub/shop-hooks";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type {
  RevealPersonalCouponResponse,
  VoucherVaultItem,
  VoucherVaultResponse,
} from "@/types/user/voucher-vault";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Eye,
  Flag,
  Gift,
  RefreshCw,
  Search,
  Ticket,
  X,
} from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

type VaultTab = "available" | "personal" | "combo" | "public" | "used" | "expired";

const numberFormat = new Intl.NumberFormat("vi-VN");
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatExpiry(iso: string | null): { text: string; short: string } {
  if (!iso) return { text: "Không giới hạn", short: "Không giới hạn" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { text: "Đang cập nhật", short: "—" };
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return { text: `Hết hạn ${dateFormatter.format(date)}`, short: "Đã hết hạn" };
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) {
    return {
      text: `Hết hạn ${dateFormatter.format(date)}`,
      short: `Còn ${Math.max(1, hours)} giờ`,
    };
  }
  const days = Math.ceil(hours / 24);
  if (days <= 7) {
    return {
      text: `Hết hạn ${dateFormatter.format(date)}`,
      short: `Còn ${days} ngày`,
    };
  }
  return {
    text: `HSD: ${dateFormatter.format(date)}`,
    short: `HSD ${date.toLocaleDateString("vi-VN")}`,
  };
}

function getScopeLabel(item: VoucherVaultItem): string {
  if (item.source === "personal" || item.applies_to === "global" || item.applies_to === "all") {
    return "Áp dụng cho toàn bộ khóa học";
  }
  if (item.target_names.length > 0) {
    const rest = item.target_count - item.target_names.length;
    const joined = item.target_names.join(", ");
    return rest > 0 ? `${joined} (+${rest} khác)` : joined;
  }
  if (item.applies_to === "category") return "Áp dụng theo môn học chỉ định";
  return "Áp dụng cho khóa học chỉ định";
}

function VoucherTicketCard({
  item,
  rateVnd,
  revealedCode,
  revealing,
  copied,
  onCopy,
  onReveal,
}: {
  item: VoucherVaultItem;
  rateVnd: number;
  revealedCode?: string;
  revealing: boolean;
  copied: boolean;
  onCopy: (code: string) => void;
  onReveal: (item: VoucherVaultItem) => void;
}) {
  const isAvailable = item.status === "available";
  const isPersonal = item.source === "personal";
  const isCombo = item.source === "combo";
  const isGlobal = item.applies_to === "global" || item.applies_to === "all";
  const displayCode = revealedCode || item.code || item.code_masked;
  const expiry = formatExpiry(item.expires_at);
  const fixedCoin = item.fixed_value ? vndToCoin(item.fixed_value, rateVnd) : 0;

  const stubStyle = !isAvailable
    ? "bg-muted text-muted-foreground"
    : isPersonal
      ? "bg-gradient-to-br from-accent via-accent/80 to-primary-light text-accent-foreground"
      : isCombo
        ? "bg-gradient-to-br from-primary-light via-primary-pastel/70 to-primary-light text-primary"
        : isGlobal
          ? "bg-gradient-to-br from-accent-vanilla via-accent-vanilla/80 to-primary-light/60 text-accent-vanilla-foreground"
          : "bg-gradient-to-br from-secondary-light via-secondary-pastel/70 to-secondary-light text-secondary-foreground";

  const darkStub = false;
  const useHref = isCombo
    ? item.primary_bundle_slug
      ? `/combo/${item.primary_bundle_slug}`
      : "/combo"
    : item.primary_course_slug
      ? `/course/${item.primary_course_slug}`
      : "/courses";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[26px] border bg-surface shadow-xs transition-all duration-200 sm:flex-row",
        isAvailable
          ? "border-border hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-ambient-md"
          : "border-border/70 opacity-75 grayscale-[25%]",
      )}
    >
      {/* NGĂN TRÁI: STUB GIÁ TRỊ GIẢM */}
      <div
        className={cn(
          "relative flex shrink-0 flex-row items-center justify-between gap-3 px-5 py-4 sm:w-44 sm:flex-col sm:justify-center sm:px-4 sm:py-6 sm:text-center",
          stubStyle,
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            darkStub
              ? "border border-white/25 bg-white/15 text-white"
              : "border border-[#E292B5] bg-white/75 text-[#7A2447]",
          )}
        >
          <Ticket aria-hidden="true" animated={false} className="size-3" />
          <span>{isPersonal ? "Mã riêng VIP" : isCombo ? "Ưu đãi Combo" : isGlobal ? "Toàn sàn" : "Chuyên đề"}</span>
        </span>

        <div className="flex flex-col items-end sm:items-center">
          {item.discount_type === "percent" ? (
            <p className="font-display text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              -{numberFormat.format(item.percent_value ?? 0)}%
            </p>
          ) : (
            <div className="py-1">
              <CoinBadge
                kind="gold"
                amount={`-${numberFormat.format(fixedCoin)}`}
                surface={darkStub ? "dark" : "light"}
                size="lg"
              />
            </div>
          )}
          <span
            className={cn(
              "mt-0.5 text-[11px] font-medium",
              darkStub ? "text-white/75" : "text-[#7A2447]/80",
            )}
          >
            {item.discount_type === "percent" ? "Giảm trực tiếp" : "Trừ thẳng giá"}
          </span>
        </div>

        {/* Rãnh khuyết bán nguyệt tạo hiệu ứng vé cứng */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2.5 left-5 hidden size-5 rounded-full border border-border bg-background sm:block sm:-right-2.5 sm:left-auto sm:top-0 sm:-translate-y-1/2"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2.5 right-5 hidden size-5 rounded-full border border-border bg-background sm:block sm:-right-2.5 sm:bottom-0 sm:translate-y-1/2"
        />
      </div>

      {/* NGĂN PHẢI: THÔNG TIN & THAO TÁC 1 CHẠM */}
      <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-3 border-t border-dashed border-border p-4 sm:border-l sm:border-t-0 sm:p-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-snug text-foreground wrap-anywhere">
              {item.title}
            </h3>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {item.expiring_soon && isAvailable && (
                <Badge variant="warning" size="sm">
                  Sắp hết hạn
                </Badge>
              )}
              <Badge
                variant={
                  item.status === "available"
                    ? "success"
                    : item.status === "used"
                      ? "info"
                      : "outline"
                }
                size="sm"
              >
                {item.status === "available"
                  ? "Khả dụng"
                  : item.status === "used"
                    ? "Đã dùng"
                    : item.status === "revoked"
                      ? "Đã thu hồi"
                      : "Hết hạn"}
              </Badge>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {getScopeLabel(item)}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] font-medium text-muted-foreground">
            <span
              title={expiry.text}
              className={cn(
                "inline-flex items-center gap-1",
                item.expiring_soon && isAvailable && "font-semibold text-warning-foreground",
              )}
            >
              <Clock aria-hidden="true" animated={false} className="size-3.5" />
              <span>{expiry.short}</span>
            </span>
            {item.remaining_uses !== null && isAvailable && (
              <span>Còn {numberFormat.format(item.remaining_uses)} lượt</span>
            )}
          </div>
        </div>

        {/* Hàng mã code + nút Sao chép / Lộ mã / Dùng ngay */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <code className="max-w-[11rem] truncate rounded-xl border border-primary-pastel/80 bg-primary-light/65 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-primary sm:max-w-[14rem]">
              {displayCode}
            </code>

            {isAvailable && (
              item.can_reveal && !revealedCode ? (
                <Button
                  type="button"
                  size="sm"
                  variant="pastel"
                  isLoading={revealing}
                  loadingText="Đang mở..."
                  onClick={() => onReveal(item)}
                  className="min-h-9 rounded-xl px-3 text-xs"
                  leftIcon={<Eye aria-hidden="true" className="size-3.5" />}
                >
                  Lộ mã &amp; Chép
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant={copied ? "primary" : "outline"}
                  onClick={() => onCopy(displayCode)}
                  className="min-h-9 rounded-xl px-3 text-xs"
                  leftIcon={
                    copied ? (
                      <Check aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Copy aria-hidden="true" className="size-3.5" />
                    )
                  }
                >
                  {copied ? "Đã chép" : "Sao chép"}
                </Button>
              )
            )}
          </div>

          {isAvailable && (
            <Link
              href={useHref}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-2xs transition-colors hover:bg-primary-hover"
            >
              <span>Dùng ngay</span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function VoucherVault() {
  const rateVnd = useCoinRate();
  const [tab, setTab] = useState<VaultTab>("available");
  const [query, setQuery] = useState("");
  const [revealedMap, setRevealedMap] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, error, isLoading, isValidating, mutate } = useSWR<VoucherVaultResponse>(
    "/users/discounts/my-vault",
    async (url: string) => (await api.get<VoucherVaultResponse>(url)).data,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const items = data?.items ?? [];
  const summary = data?.summary;
  const savedCoin = summary ? vndToCoin(summary.total_saved_vnd, rateVnd) : 0;

  const counts = useMemo(
    () => ({
      available: items.filter((i) => i.status === "available").length,
      personal: items.filter((i) => i.source === "personal" && i.status === "available").length,
      combo: items.filter((i) => i.source === "combo" && i.status === "available").length,
      public: items.filter((i) => i.source === "public" && i.status === "available").length,
      used: items.filter((i) => i.status === "used").length,
      expired: items.filter((i) => i.status === "expired" || i.status === "revoked").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tab === "available" && item.status !== "available") return false;
      if (tab === "personal" && !(item.source === "personal" && item.status === "available"))
        return false;
      if (tab === "combo" && !(item.source === "combo" && item.status === "available"))
        return false;
      if (tab === "public" && !(item.source === "public" && item.status === "available"))
        return false;
      if (tab === "used" && item.status !== "used") return false;
      if (tab === "expired" && item.status !== "expired" && item.status !== "revoked")
        return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.code ?? "").toLowerCase().includes(q) ||
        item.code_masked.toLowerCase().includes(q) ||
        item.target_names.some((name) => name.toLowerCase().includes(q))
      );
    });
  }, [items, tab, query]);

  async function copyCode(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      showToast.success(`Đã sao chép mã ${code}`);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2200);
    } catch {
      showToast.error("Không thể sao chép tự động. Bạn vui lòng bôi đen mã để chép nhé.");
    }
  }

  async function revealPersonal(item: VoucherVaultItem) {
    if (revealingId) return;
    setRevealingId(item.id);
    try {
      const res = await api.post<RevealPersonalCouponResponse>(
        `/users/discounts/personal/${item.id}/reveal`,
      );
      const code = res.data.code;
      setRevealedMap((prev) => ({ ...prev, [item.id]: code }));
      await copyCode(item.id, code);
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.detail || "Không thể mở khóa mã thưởng lúc này.",
      );
    } finally {
      setRevealingId(null);
    }
  }

  const tabOptions: ReadonlyArray<{ id: VaultTab; label: string; count: number }> = [
    { id: "available", label: "Khả dụng", count: counts.available },
    { id: "personal", label: "Mã riêng của tôi", count: counts.personal },
    { id: "combo", label: "Ưu đãi Combo", count: counts.combo },
    { id: "public", label: "Ưu đãi sàn", count: counts.public },
    { id: "used", label: "Đã dùng", count: counts.used },
    { id: "expired", label: "Hết hạn", count: counts.expired },
  ];

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-16">
      <div className="mx-auto w-full max-w-6xl space-y-7 px-4 pt-6 sm:px-6 sm:pt-8">
        {/* CLOUDY BLUE VOUCHER HERO BANNER */}
        <header className="relative isolate overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent/45 p-6 text-foreground shadow-[0_24px_48px_-14px_rgba(53,111,167,0.16)] sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-white/80 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 size-64 rounded-full bg-secondary-light/65 blur-3xl"
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary shadow-2xs">
                <Ticket aria-hidden="true" animated={false} className="size-3.5 text-primary" />
                <span>Kho ưu đãi · Mây Mây</span>
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem]">
                Kho mã giảm giá của tôi
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Quản lý trọn vẹn mã thưởng cá nhân và ưu đãi từ giảng viên. Sao chép 1 chạm, hệ thống tự động chọn mã tốt nhất khi bạn thanh toán khóa học.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/courses"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
              >
                <span>Khám phá khóa học</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/missions"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary-pastel bg-surface px-4 text-sm font-semibold text-primary shadow-2xs transition-colors hover:bg-primary-light"
              >
                <Flag aria-hidden="true" className="size-4 text-primary" />
                <span>Săn thêm mã</span>
              </Link>
            </div>
          </div>

          {/* 4 THẺ CHỈ SỐ SỐNG */}
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Mã khả dụng
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold text-primary tabular-nums">
                {summary ? numberFormat.format(summary.total_available) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sắp hết hạn (&lt;72h)
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold text-warning-foreground tabular-nums">
                {summary ? numberFormat.format(summary.expiring_soon) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Lượt đã dùng
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold text-foreground tabular-nums">
                {summary ? numberFormat.format(summary.total_used) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/50 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent-vanilla-foreground">
                Đã tiết kiệm
              </p>
              <div className="mt-2">
                <CoinBadge kind="gold" amount={savedCoin} size="lg" />
              </div>
            </div>
          </div>
        </header>

        {/* FLOATING GLASS CONTROL BAR: TAB + TÌM KIẾM */}
        <div className="flex flex-col gap-3 rounded-[24px] border border-primary-pastel/80 bg-surface/90 p-3 shadow-ambient-sm backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Lọc mã giảm giá" className="flex flex-wrap items-center gap-1.5">
            {tabOptions.map((option) => {
              const active = tab === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(option.id)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all cursor-pointer sm:text-sm",
                    active
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-primary-light hover:text-foreground",
                  )}
                >
                  <span>{option.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                      active ? "bg-white/20 text-white" : "bg-background text-muted-foreground",
                    )}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search
                aria-hidden="true"
                animated={false}
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm mã hoặc khóa học..."
                aria-label="Tìm kiếm mã giảm giá"
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void mutate()}
              disabled={isValidating}
              aria-label="Làm mới kho mã giảm giá"
              className="min-h-10 rounded-xl px-3"
            >
              <RefreshCw className={cn("size-4", isValidating && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* DANH SÁCH VOUCHER */}
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((idx) => (
              <Skeleton key={idx} className="h-44 rounded-[26px] motion-reduce:animate-none" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[26px] border border-destructive-border bg-destructive-bg/40 p-8 text-center">
            <p className="text-base font-bold text-destructive-foreground">
              Chưa tải được kho mã giảm giá
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vui lòng kiểm tra kết nối và thử lại.
            </p>
            <Button variant="outline" size="sm" onClick={() => void mutate()} className="mt-4">
              Thử lại
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Gift className="size-8" />}
            title={
              query
                ? "Không tìm thấy mã phù hợp"
                : tab === "personal"
                  ? "Bạn chưa có mã thưởng riêng khả dụng"
                  : tab === "used"
                    ? "Bạn chưa sử dụng mã giảm giá nào"
                    : tab === "expired"
                      ? "Không có mã hết hạn"
                      : "Kho mã giảm giá đang trống"
            }
            description={
              query
                ? "Thử xóa từ khóa hoặc chuyển sang tab khác để xem toàn bộ ưu đãi."
                : "Hoàn thành nhiệm vụ hoặc lên cấp để mở khóa mã thưởng riêng, hoặc khám phá các khóa học đang có ưu đãi."
            }
            action={
              query ? (
                <Button variant="outline" onClick={() => setQuery("")}>
                  Xóa bộ lọc
                </Button>
              ) : (
                <Link
                  href="/missions"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  <span>Đi săn mã thưởng</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              )
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredItems.map((item) => (
              <VoucherTicketCard
                key={`${item.source}-${item.id}`}
                item={item}
                rateVnd={rateVnd}
                revealedCode={revealedMap[item.id]}
                revealing={revealingId === item.id}
                copied={copiedId === item.id}
                onCopy={(code) => void copyCode(item.id, code)}
                onReveal={(target) => void revealPersonal(target)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
