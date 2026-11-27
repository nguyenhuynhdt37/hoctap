"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Layers,
  Play,
  Printer,
  ShieldCheck,
  Tag,
  Target,
} from "pulsoicon-react";
import useSWR from "swr";
import { Badge, CoinPrice } from "@/components/ui";
import { hubEndpoints } from "@/lib/learning-hub/endpoints";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";
import type { BundleReceipt } from "@/types/learning-paths";
import { fetchLearning, LoadError, Loading } from "./shared";

const numberFmt = new Intl.NumberFormat("vi-VN");

function formatVnDateTime(iso?: string | null): string {
  if (!iso) return "Vừa ghi nhận";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Vừa ghi nhận";
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("day")}/${pick("month")}/${pick("year")} · ${pick("hour")}:${pick("minute")}`;
}

export function BundleReceiptView({ id }: { id: string }) {
  const { data, error, mutate } = useSWR<BundleReceipt>(
    hubEndpoints.bundleOrder(id),
    fetchLearning,
  );
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyOrderId = async () => {
    if (!data?.id) return;
    try {
      await navigator.clipboard.writeText(data.id);
      setCopiedId(true);
      showToast.success("Đã sao chép mã đơn hàng Combo.");
      window.setTimeout(() => setCopiedId(false), 1800);
    } catch {
      showToast.error("Không sao chép được mã đơn.");
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <LoadError error={error} retry={() => mutate()} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="user-container max-w-5xl py-12">
        <Loading />
      </main>
    );
  }

  const firstCourseSlug = data.lines.find((l) => l.course_slug)?.course_slug;
  const primaryLearnHref = firstCourseSlug ? `/learning/${firstCourseSlug}` : "/my-learning";
  const savingsCoin = data.total_savings_coin ?? 0;
  const discountCoin = data.discount_coin ?? 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background pb-20 text-foreground">
      {/* Đốm mây Ambient Pastel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/3 -z-10 h-80 w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-light/80 via-secondary/35 to-transparent blur-3xl print:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-56 -right-24 -z-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl print:hidden"
      />

      <div className="user-container max-w-5xl space-y-7 pt-7">
        {/* ── THANH ĐIỀU HƯỚNG & TIỆN ÍCH IN / SAO CHÉP ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/my-learning"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
          >
            <ArrowLeft className="size-3.5" animated={false} aria-hidden="true" />
            <span>Khóa học của tôi</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyOrderId()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
            >
              <span className="inline-flex shrink-0">
                {copiedId ? (
                  <Check className="size-3.5 text-success-foreground" animated={false} aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" animated={false} aria-hidden="true" />
                )}
              </span>
              <span>{copiedId ? "Đã chép mã đơn" : "Chép mã đơn"}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/70 px-3.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              <Printer className="size-3.5" animated={false} aria-hidden="true" />
              <span>In biên nhận</span>
            </button>
          </div>
        </div>

        {/* ── TẦNG 1: CLOUDY BOARDING PASS (VÉ HÀNH TRÌNH LỘ TRÌNH COMBO) ── */}
        <section className="relative overflow-hidden rounded-[30px] border border-primary-pastel bg-surface shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_320px]">
            {/* THÂN VÉ CHÍNH */}
            <div className="relative bg-gradient-to-br from-primary-light/75 via-surface to-secondary/30 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-3 py-1 text-[11px] font-extrabold text-success-foreground">
                  <CheckCircle2 className="size-3.5" animated={false} aria-hidden="true" />
                  Đã kích hoạt trọn bộ lộ trình
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface/90 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  <Layers className="size-3" animated={false} aria-hidden="true" />
                  {data.lines.length} khóa học
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-[210px_minmax(0,1fr)] sm:items-center">
                {/* Ảnh bìa Combo chuẩn 16:9 */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-primary-pastel/80 bg-surface shadow-xs">
                  <img
                    src={getImageUrl(data.thumbnail_url || "/logo/studynest-logo.svg")}
                    alt={data.title}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.endsWith("/logo/studynest-logo.svg")) img.src = "/logo/studynest-logo.svg";
                    }}
                    className="size-full object-cover"
                  />
                </div>

                <div className="min-w-0 space-y-2">
                  <h1 className="font-display text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                    {data.title}
                  </h1>
                  {data.subtitle && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {data.subtitle}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                      {formatVnDateTime(data.created_at)}
                    </span>
                    <span className="font-mono text-[10px]">
                      Mã đơn: #{data.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA chính ngay trên vé */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5 print:hidden">
                <Link
                  href={primaryLearnHref}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-extrabold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover hover:shadow-md"
                >
                  <Play className="size-3.5" solid animated={false} aria-hidden="true" />
                  <span>Bắt đầu học ngay</span>
                  <ArrowRight className="size-3.5" animated={false} aria-hidden="true" />
                </Link>

                <Link
                  href={`/goals?path_id=${encodeURIComponent(data.id)}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-4 text-xs font-extrabold text-primary transition-colors hover:bg-primary-light"
                >
                  <Target className="size-3.5" animated={false} aria-hidden="true" />
                  <span>Đặt mục tiêu học</span>
                </Link>

                {data.bundle_slug && (
                  <Link
                    href={`/combo/${data.bundle_slug}`}
                    className="inline-flex h-10 items-center gap-1 rounded-full border border-border bg-surface px-4 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:text-primary"
                  >
                    <span>Trang Combo</span>
                    <ArrowUpRight className="size-3.5" animated={false} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>

            {/* CUỐNG VÉ TÀI CHÍNH (FINANCIAL STUB VỚI RÃNH CẮT NÉT ĐỨT) */}
            <aside className="relative flex flex-col justify-between border-t border-dashed border-primary-pastel bg-background/60 p-5 sm:p-6 lg:border-t-0 lg:border-l">
              {/* 2 rãnh khuyết Boarding Pass trên desktop */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-3 -left-3 hidden size-6 rounded-full border border-primary-pastel bg-background lg:block"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 -left-3 hidden size-6 rounded-full border border-primary-pastel bg-background lg:block"
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-wider text-primary uppercase">
                    Biên nhận thanh toán
                  </span>
                  <Badge variant="success" className="text-[10px] font-extrabold">
                    Đã thanh toán
                  </Badge>
                </div>

                <div className="space-y-2.5 text-xs">
                  {typeof data.total_list_price_coin === "number" &&
                    data.total_list_price_coin > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Giá niêm yết gốc</span>
                        <span className="inline-flex items-center gap-1 font-semibold tabular-nums line-through">
                          {numberFmt.format(data.total_list_price_coin)}
                          <Coins className="size-3" animated={false} aria-hidden="true" />
                        </span>
                      </div>
                    )}

                  {data.coupon_code && (
                    <div className="flex items-center justify-between text-success-foreground">
                      <span className="inline-flex items-center gap-1 font-bold">
                        <Tag className="size-3" animated={false} aria-hidden="true" />
                        Mã {data.coupon_code}
                      </span>
                      <span className="inline-flex items-center gap-1 font-extrabold tabular-nums">
                        -{numberFmt.format(discountCoin)}
                        <Coins className="size-3" animated={false} aria-hidden="true" />
                      </span>
                    </div>
                  )}

                  {savingsCoin > 0 && (
                    <div className="rounded-xl border border-accent-vanilla-border bg-accent-vanilla/50 px-3 py-2 text-[11px] font-extrabold text-accent-vanilla-foreground">
                      Bạn đã tiết kiệm {numberFmt.format(savingsCoin)} Coin khi mua Combo!
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-dashed border-primary-pastel pt-4">
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Tổng thực thanh toán
                </div>
                <div className="mt-1">
                  <CoinPrice
                    priceVnd={data.total_paid}
                    originalPriceVnd={data.total_list_price}
                    size="lg"
                    showWhiteDiscount={false}
                  />
                </div>
                <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
                  Mã đơn: {data.id}
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* ── TẦNG 2: DANH SÁCH KHÓA HỌC ĐÃ MỞ KHÓA TRONG COMBO ── */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Lộ trình khóa học trong đơn ({data.lines.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Tất cả khóa học đã được kích hoạt trong mục Khóa học của tôi và sẵn sàng vào học ngay
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {data.lines.map((line, index) => {
              const isRefunded = line.purchase_status === "refunded";
              const isFree = !line.already_owned && Number(line.paid) === 0;
              const canRefund =
                Boolean(line.purchase_item_id) &&
                line.purchase_status === "completed" &&
                Number(line.paid) > 0;
              const learnHref = line.course_slug
                ? `/learning/${line.course_slug}`
                : "/my-learning";

              return (
                <article
                  key={line.id}
                  className="flex flex-col justify-between gap-4 rounded-[24px] border border-border/80 bg-surface p-4 shadow-2xs transition-colors hover:border-primary-pastel sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
                    {/* Số thứ tự */}
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-black tabular-nums",
                        isRefunded
                          ? "bg-destructive-bg text-destructive-foreground"
                          : "bg-primary-light text-primary",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {/* Thumbnail 16:9 */}
                    <Link
                      href={learnHref}
                      className="relative hidden aspect-video w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/40 sm:block"
                    >
                      <img
                        src={getImageUrl(line.course_thumbnail_url || "/logo/studynest-logo.svg")}
                        alt={line.title}
                        onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.endsWith("/logo/studynest-logo.svg")) img.src = "/logo/studynest-logo.svg";
                    }}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {line.already_owned ? (
                          <Badge variant="lavender" className="text-[10px] font-bold">
                            Đã sở hữu trước khi mua combo
                          </Badge>
                        ) : isRefunded ? (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            Đã hoàn tiền
                          </Badge>
                        ) : isFree ? (
                          <Badge variant="success" className="text-[10px] font-bold">
                            Tặng kèm miễn phí trong combo
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] font-bold">
                            Đã mở khóa quyền học
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-display text-base font-bold text-foreground">
                        {line.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {!line.already_owned && !isFree && (
                          <CoinPrice
                            priceVnd={line.paid}
                            originalPriceVnd={line.list_price}
                            size="sm"
                            showWhiteDiscount={false}
                          />
                        )}

                        {line.refund_deadline && canRefund && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <ShieldCheck className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                            Hạn hoàn tiền: {formatVnDateTime(line.refund_deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hành động từng khóa */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
                    {canRefund && (
                      <Link
                        href="/refunds/refundable"
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary"
                      >
                        Hoàn tiền
                      </Link>
                    )}

                    {!isRefunded && (
                      <Link
                        href={learnHref}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-light px-4 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <Play className="size-3" solid animated={false} aria-hidden="true" />
                        <span>Vào học ngay</span>
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── TẦNG 3: ĐIỀU HƯỚNG CUỐI TRANG ── */}
        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-primary-pastel/70 bg-surface p-4 sm:px-6 print:hidden">
          <p className="text-xs text-muted-foreground">
            Tất cả khóa học trong gói đã được gom gọn trong mục{" "}
            <strong className="text-foreground">Combo đã mua</strong> tại Khóa học của tôi.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/my-learning"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <span>Vào Khóa học của tôi</span>
              <ArrowRight className="size-3.5" animated={false} aria-hidden="true" />
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
