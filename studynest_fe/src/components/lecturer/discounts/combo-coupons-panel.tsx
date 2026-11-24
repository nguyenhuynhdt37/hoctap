"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  Coins,
  Copy,
  Layers,
  Pencil,
  Percent,
  Plus,
  Power,
  RefreshCw,
  Ticket,
  Users,
} from "pulsoicon-react";
import useSWR from "swr";
import { Alert, Badge, Button, EmptyState, Input, Modal, Skeleton } from "@/components/ui";
import {
  coinToVnd,
  DEFAULT_COIN_VND_RATE,
  formatVndAsCoin,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import type { BundleCoupon } from "@/types/learning-paths";
import { cn } from "@/lib/utils";

export interface LecturerBundleItem {
  bundle_id: string;
  version_id?: string;
  title: string;
  thumbnail?: string | null;
  price: string | number;
  original_price: string | number;
  course_count: number;
  is_active?: boolean;
  total_orders?: number;
}

interface ComboCouponsPanelProps {
  bundles: LecturerBundleItem[];
  bundlesLoading: boolean;
  openCreateSignal?: number;
}

function toLocalDateTimeInput(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function couponStatusMeta(c: BundleCoupon): {
  label: string;
  variant: "success" | "warning" | "destructive" | "secondary" | "info";
} {
  if (!c.is_active) return { label: "Đang tắt", variant: "secondary" };
  const now = Date.now();
  if (new Date(c.ends_at).getTime() <= now) return { label: "Hết hạn", variant: "destructive" };
  if (c.max_uses !== null && c.usage_count >= c.max_uses) {
    return { label: "Hết lượt", variant: "warning" };
  }
  if (new Date(c.starts_at).getTime() > now) return { label: "Sắp chạy", variant: "info" };
  return { label: "Đang chạy", variant: "success" };
}

function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `COMBO${suffix}`;
}

export function ComboCouponsPanel({
  bundles,
  bundlesLoading,
  openCreateSignal = 0,
}: ComboCouponsPanelProps) {
  const [selectedBundleId, setSelectedBundleId] = useState<string>("");
  const [editing, setEditing] = useState<BundleCoupon | "new" | null>(null);
  const [codeValue, setCodeValue] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!selectedBundleId && bundles.length > 0) {
      setSelectedBundleId(bundles[0].bundle_id);
    } else if (
      selectedBundleId &&
      bundles.length > 0 &&
      !bundles.some((b) => b.bundle_id === selectedBundleId)
    ) {
      setSelectedBundleId(bundles[0].bundle_id);
    }
  }, [bundles, selectedBundleId]);

  useEffect(() => {
    if (openCreateSignal > 0 && selectedBundleId) {
      openCreateModal();
    }
  }, [openCreateSignal, selectedBundleId]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const selectedBundle = bundles.find((b) => b.bundle_id === selectedBundleId) ?? null;
  const couponUrl = selectedBundleId ? `/lecturer/bundles/${selectedBundleId}/coupons` : null;

  const {
    data: couponsData,
    error: couponsError,
    isLoading: couponsLoading,
    mutate: mutateCoupons,
  } = useSWR<{ items: BundleCoupon[] }>(
    couponUrl,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false },
  );

  const openCreateModal = () => {
    setFormError("");
    setDiscountType("percent");
    setCodeValue(generateRandomCode());
    setEditing("new");
  };

  const openEditModal = (coupon: BundleCoupon) => {
    setFormError("");
    setDiscountType(coupon.discount_type);
    setCodeValue(coupon.code);
    setEditing(coupon);
  };

  const handleCopy = useCallback((id: string, code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedId(id);
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(() => setCopiedId(null), 1800);
        })
        .catch(() => undefined);
    }
  }, []);

  const handleToggleCoupon = async (coupon: BundleCoupon) => {
    if (!couponUrl || busy) return;
    setBusy(true);
    try {
      await api.put(`${couponUrl}/${coupon.id}/active?active=${!coupon.is_active}`);
      showToast.success(coupon.is_active ? "Đã tắt mã giảm giá Combo" : "Đã bật mã giảm giá Combo");
      await mutateCoupons();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Không thể đổi trạng thái mã Combo.";
      showToast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!couponUrl || busy) return;

    const form = new FormData(event.currentTarget);
    const optionalNum = (key: string) => {
      const raw = String(form.get(key) || "").trim();
      return raw ? Number(raw) : null;
    };

    const rawValue = Number(form.get("value") || 0);
    const rawMinTotal = Number(form.get("min_total") || 0);
    const rawMaxDiscount = optionalNum("max_discount");
    const startsAtRaw = String(form.get("starts_at") || "");
    const endsAtRaw = String(form.get("ends_at") || "");

    if (!codeValue.trim()) {
      setFormError("Vui lòng nhập mã ưu đãi.");
      return;
    }
    if (!startsAtRaw || !endsAtRaw || new Date(endsAtRaw) <= new Date(startsAtRaw)) {
      setFormError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    const payload = {
      code: codeValue.trim().toUpperCase(),
      discount_type: discountType,
      value:
        discountType === "fixed"
          ? String(coinToVnd(rawValue, DEFAULT_COIN_VND_RATE))
          : String(rawValue),
      min_total: String(coinToVnd(rawMinTotal, DEFAULT_COIN_VND_RATE)),
      max_discount:
        discountType === "percent" && rawMaxDiscount !== null
          ? coinToVnd(rawMaxDiscount, DEFAULT_COIN_VND_RATE)
          : null,
      starts_at: new Date(startsAtRaw).toISOString(),
      ends_at: new Date(endsAtRaw).toISOString(),
      max_uses: optionalNum("max_uses"),
      per_user_limit: Number(form.get("per_user_limit") || 1),
      is_active: form.get("is_active") === "on",
    };

    setBusy(true);
    setFormError("");
    try {
      if (editing && editing !== "new") {
        await api.put(`${couponUrl}/${editing.id}`, payload);
        showToast.success("Đã cập nhật mã giảm giá Combo!");
      } else {
        await api.post(couponUrl, payload);
        showToast.success("Đã tạo mã giảm giá Combo mới!");
      }
      setEditing(null);
      await mutateCoupons();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Không thể lưu mã giảm giá Combo. Vui lòng kiểm tra lại thông tin.";
      setFormError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (bundlesLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-[24px] lg:col-span-4" />
        <Skeleton className="h-80 rounded-[24px] lg:col-span-8" />
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <div className="rounded-[26px] border border-border bg-surface p-8 shadow-xs">
        <EmptyState
          icon={<Layers />}
          title="Bạn chưa có Combo khóa học nào"
          description="Hãy tạo Combo đầu tiên từ các khóa học của bạn, sau đó quay lại đây để phát hành mã giảm giá riêng cho Combo."
          action={
            <Link
              href="/lecturer/combos"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <span>Tạo Combo khóa học</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        />
      </div>
    );
  }

  const coupons = couponsData?.items ?? [];
  const editingCoupon = editing && editing !== "new" ? editing : null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-12">
      {/* CỘT TRÁI (4/12): Danh sách Combo của giảng viên */}
      <aside className="rounded-[24px] border border-border bg-surface p-4 shadow-xs lg:sticky lg:top-20 lg:col-span-4">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-primary uppercase">
              Combo của bạn ({bundles.length})
            </p>
            <p className="text-xs text-muted-foreground">Chọn combo để quản lý mã giảm giá</p>
          </div>
          <Link
            href="/lecturer/combos"
            className="text-xs font-bold text-primary hover:underline"
          >
            Quản lý
          </Link>
        </div>

        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-0.5">
          {bundles.map((bundle) => {
            const active = bundle.bundle_id === selectedBundleId;
            const thumb = bundle.thumbnail ? getImageUrl(bundle.thumbnail) : "";

            return (
              <button
                key={bundle.bundle_id}
                type="button"
                onClick={() => setSelectedBundleId(bundle.bundle_id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all cursor-pointer",
                  active
                    ? "border-primary bg-primary-light/70 shadow-2xs ring-1 ring-primary/25"
                    : "border-border/80 bg-background/60 hover:border-primary-pastel hover:bg-primary-light/35",
                )}
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/50">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={bundle.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-primary">
                      <Layers aria-hidden="true" animated={false} className="size-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-bold text-foreground">
                    {bundle.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    <span className="text-primary tabular-nums">
                      {formatVndAsCoin(Number(bundle.price || 0))}
                    </span>
                    <span className="text-muted-foreground">· {bundle.course_count} khóa</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CỘT PHẢI (8/12): Xưởng mã giảm giá cho Combo đang chọn */}
      <section className="space-y-4 lg:col-span-8">
        {selectedBundle && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-primary-pastel/80 bg-gradient-to-r from-primary-light/70 via-surface to-accent-vanilla/45 p-5 shadow-xs">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-accent-vanilla-foreground uppercase">
                <Layers aria-hidden="true" animated={false} className="size-3" />
                Ưu đãi riêng cho Combo
              </span>
              <h2 className="mt-1.5 truncate font-display text-xl font-bold text-foreground">
                {selectedBundle.title}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Giá combo hiện tại:{" "}
                <strong className="font-bold text-primary">
                  {formatVndAsCoin(Number(selectedBundle.price || 0))}
                </strong>{" "}
                · {selectedBundle.course_count} khóa học
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="min-h-10 rounded-full px-4 font-bold shadow-xs"
            >
              <Plus aria-hidden="true" className="size-4" />
              <span>Tạo mã Combo mới</span>
            </Button>
          </div>
        )}

        {couponsError && (
          <Alert variant="destructive">
            Không thể tải danh sách mã giảm giá cho combo này.
          </Alert>
        )}

        {couponsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 rounded-[24px]" />
            <Skeleton className="h-44 rounded-[24px]" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-primary-pastel bg-surface/90 p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
              <Ticket aria-hidden="true" animated={false} className="size-6" />
            </span>
            <h3 className="mt-3 font-display text-lg font-bold text-foreground">
              Chưa có mã giảm giá cho Combo này
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Tạo mã ưu đãi riêng giúp học viên tiết kiệm thêm khi mua trọn bộ lộ trình và tăng tỉ lệ chốt đơn.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="mt-4 min-h-10 rounded-full px-5 font-bold"
            >
              <Plus aria-hidden="true" className="size-4" />
              <span>Phát hành mã Combo đầu tiên</span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {coupons.map((coupon) => {
              const status = couponStatusMeta(coupon);
              const isPercent = coupon.discount_type === "percent";
              const usagePct =
                coupon.max_uses && coupon.max_uses > 0
                  ? Math.min(100, Math.round((coupon.usage_count / coupon.max_uses) * 100))
                  : null;

              return (
                <article
                  key={coupon.id}
                  className={cn(
                    "flex flex-col justify-between overflow-hidden rounded-[22px] border bg-surface shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
                    coupon.is_active ? "border-primary-pastel/85" : "border-border opacity-85",
                  )}
                >
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(coupon.id, coupon.code)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary-pastel bg-primary-light/60 px-3 py-1 font-mono text-xs font-extrabold text-primary transition-colors hover:bg-primary-light cursor-pointer"
                      >
                        <Ticket aria-hidden="true" animated={false} className="size-3.5" />
                        <span>{coupon.code}</span>
                        {copiedId === coupon.id ? (
                          <Check
                            aria-hidden="true"
                            animated={false}
                            className="size-3.5 text-success-foreground"
                          />
                        ) : (
                          <Copy aria-hidden="true" animated={false} className="size-3" />
                        )}
                      </button>

                      <Badge variant={status.variant} size="sm">
                        {status.label}
                      </Badge>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "font-display text-2xl font-bold tabular-nums",
                          isPercent ? "text-primary" : "text-accent-vanilla-foreground",
                        )}
                      >
                        {isPercent
                          ? `-${Number(coupon.value)}%`
                          : `-${formatVndAsCoin(Number(coupon.value))}`}
                      </span>
                      {isPercent && coupon.max_discount != null && (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          tối đa {formatVndAsCoin(Number(coupon.max_discount))}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 border-t border-border/60 pt-2.5 text-[11px] font-semibold text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Calendar aria-hidden="true" animated={false} className="size-3 text-primary" />
                          {formatDateShort(coupon.starts_at)} → {formatDateShort(coupon.ends_at)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-foreground tabular-nums">
                          <Users aria-hidden="true" animated={false} className="size-3 text-primary" />
                          {coupon.usage_count}
                          {coupon.max_uses ? `/${coupon.max_uses}` : ""}
                        </span>
                      </div>
                      {Number(coupon.min_total || 0) > 0 && (
                        <p>
                          Đơn tối thiểu:{" "}
                          <strong className="text-foreground">
                            {formatVndAsCoin(Number(coupon.min_total))}
                          </strong>
                        </p>
                      )}
                      {usagePct !== null && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-background/60 px-4 py-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleCoupon(coupon)}
                      className={cn(
                        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50",
                        coupon.is_active
                          ? "border-success-border bg-success-bg/75 text-success-foreground hover:bg-success-bg"
                          : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
                      )}
                    >
                      <Power aria-hidden="true" animated={false} className="size-3.5" />
                      <span>{coupon.is_active ? "Đang bật" : "Đang tắt"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(coupon)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
                    >
                      <Pencil aria-hidden="true" animated={false} className="size-3.5" />
                      <span>Sửa</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Tạo / Sửa Mã Giảm Giá Combo */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editingCoupon ? `Chỉnh sửa mã ${editingCoupon.code}` : "Tạo mã giảm giá Combo"}
        description={selectedBundle ? `Áp dụng cho Combo: ${selectedBundle.title}` : undefined}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && <Alert variant="destructive">{formError}</Alert>}

          {/* Mã code + nút sinh ngẫu nhiên */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Mã giảm giá <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                name="code"
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
                placeholder="VD: COMBO2026"
                required
                className="font-mono uppercase"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setCodeValue(generateRandomCode())}
                className="shrink-0 rounded-xl"
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                <span>Tạo mã</span>
              </Button>
            </div>
          </div>

          {/* Loại giảm giá */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Hình thức giảm</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType("percent")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer",
                  discountType === "percent"
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel",
                )}
              >
                <Percent aria-hidden="true" animated={false} className="size-4" />
                <span>Giảm theo %</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("fixed")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer",
                  discountType === "fixed"
                    ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel",
                )}
              >
                <Coins aria-hidden="true" animated={false} className="size-4" />
                <span>Giảm cố định (Coin)</span>
              </button>
            </div>
          </div>

          {/* Giá trị & Giới hạn */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {discountType === "percent" ? "Phần trăm giảm (%)" : "Số Coin giảm"}
              </label>
              <Input
                name="value"
                type="number"
                min={1}
                max={discountType === "percent" ? 90 : undefined}
                required
                defaultValue={
                  editingCoupon
                    ? editingCoupon.discount_type === "fixed"
                      ? vndToCoin(Number(editingCoupon.value), DEFAULT_COIN_VND_RATE)
                      : Number(editingCoupon.value)
                    : discountType === "percent"
                      ? 15
                      : 50
                }
              />
            </div>

            {discountType === "percent" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Giảm tối đa (Coin, để trống nếu không giới hạn)
                </label>
                <Input
                  name="max_discount"
                  type="number"
                  min={1}
                  placeholder="VD: 200"
                  defaultValue={
                    editingCoupon?.max_discount != null
                      ? vndToCoin(Number(editingCoupon.max_discount), DEFAULT_COIN_VND_RATE)
                      : ""
                  }
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Đơn tối thiểu (Coin)
                </label>
                <Input
                  name="min_total"
                  type="number"
                  min={0}
                  defaultValue={
                    editingCoupon
                      ? vndToCoin(Number(editingCoupon.min_total || 0), DEFAULT_COIN_VND_RATE)
                      : 0
                  }
                />
              </div>
            )}
          </div>

          {discountType === "percent" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Đơn tối thiểu (Coin)
              </label>
              <Input
                name="min_total"
                type="number"
                min={0}
                defaultValue={
                  editingCoupon
                    ? vndToCoin(Number(editingCoupon.min_total || 0), DEFAULT_COIN_VND_RATE)
                    : 0
                }
              />
            </div>
          )}

          {/* Thời gian hiệu lực */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Bắt đầu từ</label>
              <Input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={
                  editingCoupon
                    ? toLocalDateTimeInput(editingCoupon.starts_at)
                    : toLocalDateTimeInput(Date.now())
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Kết thúc lúc</label>
              <Input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={
                  editingCoupon
                    ? toLocalDateTimeInput(editingCoupon.ends_at)
                    : toLocalDateTimeInput(Date.now() + 14 * 86400 * 1000)
                }
              />
            </div>
          </div>

          {/* Giới hạn lượt dùng */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Tổng lượt dùng tối đa (trống = không giới hạn)
              </label>
              <Input
                name="max_uses"
                type="number"
                min={1}
                placeholder="VD: 100"
                defaultValue={editingCoupon?.max_uses ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Lượt tối đa mỗi học viên
              </label>
              <Input
                name="per_user_limit"
                type="number"
                min={1}
                required
                defaultValue={editingCoupon?.per_user_limit ?? 1}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-xs font-bold text-foreground cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editingCoupon ? editingCoupon.is_active : true}
              className="size-4 accent-[color:var(--color-primary)]"
            />
            <span>Kích hoạt mã giảm giá ngay sau khi lưu</span>
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              className="rounded-full px-5"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy}
              className="rounded-full px-6 font-bold"
            >
              {busy ? "Đang lưu..." : editingCoupon ? "Lưu thay đổi" : "Phát hành mã Combo"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
