"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Gift,
  Heart,
  Layers,
  RefreshCw,
  ShieldCheck,
  Target,
  Ticket,
  UserRound,
  Wallet,
} from "pulsoicon-react";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { safeUUID } from "@/lib/utils/uuid";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { Badge, Button, CoinPrice, Input, Modal } from "@/components/ui";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { useUserStore } from "@/stores/user";
import type { Bundle, BundleQuote, BundleReceipt } from "@/types/learning-paths";
import { fetchLearning, LoadError, Loading, message } from "./shared";

function cleanTitle(title: string): string {
  return title.replace(/^\[QA\]\s*/i, "").trim();
}

export default function BundleDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [disableAutoCoupon, setDisableAutoCoupon] = useState(false);
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [bookmarkHint, setBookmarkHint] = useState("");

  const { data, error, mutate } = useSWR<Bundle>(
    `/bundles/${encodeURIComponent(slug)}`,
    fetchLearning,
  );
  const quoteQuery = couponCode
    ? `?coupon_code=${encodeURIComponent(couponCode)}`
    : disableAutoCoupon
      ? "?auto_best=false"
      : "?auto_best=true";
  const {
    data: quote,
    error: quoteError,
    mutate: refreshQuote,
    isValidating,
  } = useSWR<BundleQuote>(
    data ? [`/bundles/versions/${data.id}/quote${quoteQuery}`, user?.id] : null,
    ([url]: [string, string | undefined]) => fetchLearning<BundleQuote>(url),
    { revalidateOnFocus: false },
  );

  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const confirmation = useRef<HTMLDivElement>(null);
  const identity = useRef<{ hash: string; key: string } | null>(null);

  function open() {
    if (!user) {
      const destination = sanitizeRedirect(location.pathname, "/combo");
      router.push(`/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }
    setFailure("");
    setConfirm(true);
  }

  async function toggleBookmark() {
    if (!data) return;
    if (!user) {
      setBookmarkHint("Đăng nhập để lưu combo yêu thích vào tài khoản của bạn nhé.");
      window.setTimeout(() => setBookmarkHint(""), 3000);
      return;
    }
    const current = bookmarked ?? Boolean(data.is_bookmarked);
    setBookmarked(!current);
    try {
      const res = await api.post<{ bookmarked: boolean }>(`/bundles/${data.bundle_id}/bookmark`);
      setBookmarked(res.data.bookmarked);
    } catch {
      setBookmarked(current);
    }
  }

  async function purchase() {
    if (!data || !quote || busy || isValidating) return;
    setBusy(true);
    setFailure("");
    try {
      const storageKey = `studynest:combo:${user?.id}:${data.id}:${quote.quote_hash}`;
      if (identity.current?.hash !== quote.quote_hash) {
        let stored: string | null = null;
        try {
          stored = sessionStorage.getItem(storageKey);
        } catch {}
        identity.current = {
          hash: quote.quote_hash,
          key: stored ?? safeUUID(),
        };
        try {
          sessionStorage.setItem(storageKey, identity.current.key);
        } catch {}
      }
      const { data: receipt } = await api.post<BundleReceipt>(
        "/bundles/checkout",
        {
          version_id: data.id,
          quote_hash: quote.quote_hash,
          idempotency_key: identity.current.key,
          coupon_code: quote.coupon_code,
        },
        { timeout: 30000 },
      );
      router.push(`/combo/orders/${receipt.id}`);
    } catch (err) {
      setFailure(message(err));
      setConfirm(false);
      await refreshQuote();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <LoadError error={error} retry={() => mutate()} />;
  if (!data) return <Loading />;

  const courseCount = data.course_count ?? data.items?.length ?? 0;
  const standaloneTotal = (data.items ?? []).reduce((sum, item) => sum + Number(item.list_price || 0), 0);
  const bundlePriceNum = Number(data.price || 0);
  const savingsPercent =
    standaloneTotal > bundlePriceNum && standaloneTotal > 0
      ? Math.floor(((standaloneTotal - bundlePriceNum) / standaloneTotal) * 100)
      : 0;
  const isSaved = bookmarked ?? Boolean(data.is_bookmarked);

  const learningSections = [
    {
      title: "Kết quả học tập",
      items: data.outcomes,
      tone: "border-primary-pastel bg-primary-light/40",
      badge: "bg-primary text-primary-foreground",
      icon: Award,
    },
    {
      title: "Đối tượng phù hợp",
      items: data.target_audience,
      tone: "border-accent-border bg-accent/40",
      badge: "bg-accent text-accent-foreground border border-accent-border",
      icon: Target,
    },
    {
      title: "Yêu cầu đầu vào",
      items: data.requirements,
      tone: "border-accent-vanilla-border bg-accent-vanilla/45",
      badge: "bg-accent-vanilla text-accent-vanilla-foreground border border-accent-vanilla-border",
      icon: Layers,
    },
  ].filter(({ items }) => items && items.length > 0);

  return (
    <main className="user-container space-y-7 pb-20 pt-6 text-foreground">
      {/* ── BREADCRUMB & QUICK ACTIONS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Điều hướng" className="flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/combo"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Tất cả combo
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="max-w-xs truncate text-muted-foreground">{cleanTitle(data.title)}</span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBookmark}
            aria-pressed={isSaved}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors cursor-pointer",
              isSaved
                ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                : "border-border bg-surface text-foreground hover:border-secondary-pastel hover:bg-secondary/40",
            )}
          >
            <Heart className="size-3.5" solid={isSaved} aria-hidden="true" />
            <span>{isSaved ? "Đã lưu combo" : "Lưu combo"}</span>
          </button>
          <Link
            href="/vouchers"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-bold text-foreground hover:border-primary-pastel hover:bg-primary-light"
          >
            <Gift className="size-3.5 text-primary" aria-hidden="true" />
            Kho mã của tôi
          </Link>
        </div>
      </div>

      {bookmarkHint && (
        <p role="status" className="rounded-2xl border border-primary-pastel bg-primary-light px-4 py-2.5 text-sm font-semibold text-primary">
          {bookmarkHint}
        </p>
      )}

      {/* ── CLOUDY BLUE EDITORIAL HERO POSTER ── */}
      <header className="relative isolate overflow-hidden rounded-[2rem] border border-primary-pastel/80 bg-gradient-to-br from-surface via-primary-light/65 to-secondary/35 p-6 shadow-sm sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 -z-10 size-80 rounded-full bg-primary-pastel/55 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 size-72 rounded-full bg-accent/55 blur-3xl"
        />

        <div className={cn("grid items-center gap-7", data.thumbnail_url && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]")}>
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-xs font-extrabold text-primary">
                <Crown className="size-3.5" animated={false} aria-hidden="true" />
                Combo Lộ Trình · {courseCount} khóa học
              </span>
              {savingsPercent > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground">
                  Tiết kiệm {savingsPercent}% so với mua lẻ
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-3 py-1 text-xs font-bold text-accent-vanilla-foreground">
                <Coins className="size-3.5" animated={false} aria-hidden="true" />
                Hoàn +20% Coin trắng
              </span>
            </div>

            <h1 className="break-words font-display text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-[2.85rem]">
              {cleanTitle(data.title)}
            </h1>

            {data.subtitle && (
              <p className="max-w-xl break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
                {data.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {data.instructor && (
                <Link
                  href={`/instructors/${data.instructor.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary"
                >
                  <UserRound className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                  <span>Giảng viên: {data.instructor.name}</span>
                </Link>
              )}
              <a
                href="#mua-combo"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-extrabold text-primary-foreground hover:bg-primary-hover lg:hidden"
              >
                <span>Xem giá &amp; Mua ngay</span>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {data.thumbnail_url && (
            <div className="relative aspect-video w-full overflow-hidden rounded-[24px] border border-primary-pastel/80 bg-surface shadow-md">
              <img
                src={data.thumbnail_url}
                alt=""
                className="size-full object-cover"
              />
            </div>
          )}
        </div>
      </header>

      {/* ── BENTO VALUE STRIP (3 thẻ tóm tắt quyền lợi nổi bật) ── */}
      <section aria-label="Tóm tắt giá trị combo" className="grid gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary-pastel/70 bg-primary-light/45 p-4">
          <p className="text-[11px] font-bold tracking-wider text-primary uppercase">Trọn gói lộ trình</p>
          <p className="mt-1 text-lg font-extrabold text-foreground">{courseCount} khóa học liên kết</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Sở hữu toàn bộ nội dung ngay sau 1 lần thanh toán.</p>
        </div>
        <div className="rounded-2xl border border-secondary-pastel/70 bg-secondary/40 p-4">
          <p className="text-[11px] font-bold tracking-wider text-secondary-foreground uppercase">Tự động trừ khóa đã có</p>
          <p className="mt-1 text-lg font-extrabold text-foreground">
            {savingsPercent > 0 ? `Rẻ hơn mua lẻ ${savingsPercent}%` : "Giá ưu đãi trọn gói"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Hệ thống tự khấu trừ phần khóa học bạn đã sở hữu.</p>
        </div>
        <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/50 p-4">
          <p className="text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">Hoàn thưởng &amp; An tâm</p>
          <p className="mt-1 text-lg font-extrabold text-foreground">
            +20% Coin trắng · Hoàn tiền {quote?.refund_days ?? 7} ngày
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Áp dụng thêm mã ưu đãi combo để tối ưu chi phí.</p>
        </div>
      </section>

      {/* ── MAIN 2-COLUMN CONTENT + STICKY BOARDING-PASS CHECKOUT ── */}
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          {/* 1. FLIGHT ROADMAP — Các khóa học trong lộ trình */}
          <section
            aria-labelledby="combo-roadmap-heading"
            className="rounded-[28px] border border-border bg-surface p-5 shadow-2xs sm:p-7"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold tracking-[0.16em] text-primary uppercase">Lộ trình từng chặng</p>
                <h2 id="combo-roadmap-heading" className="font-display text-2xl font-bold text-foreground">
                  Các khóa học trong combo ({courseCount})
                </h2>
              </div>
              <Badge variant="primary">Học theo đúng thứ tự</Badge>
            </div>

            <ol className="relative space-y-4 before:pointer-events-none before:absolute before:inset-y-6 before:left-5 before:border-l-2 before:border-dashed before:border-primary-pastel">
              {data.items?.map((item, index) => {
                const lineQuote = quote?.items.find((line) => line.course_id === item.course_id);
                const owned = Boolean(lineQuote?.already_owned);
                return (
                  <li
                    key={item.course_id}
                    className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 sm:gap-4"
                  >
                    <span
                      className={cn(
                        "relative z-10 mt-1 grid size-10 shrink-0 place-items-center rounded-2xl border-2 text-sm font-extrabold shadow-2xs",
                        owned
                          ? "border-success-border bg-success-bg text-success-foreground"
                          : "border-primary-pastel bg-primary-light text-primary",
                      )}
                      aria-label={`Chặng ${index + 1}`}
                    >
                      {owned ? <Check className="size-4" animated={false} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}
                    </span>

                    <article
                      className={cn(
                        "group flex flex-col gap-4 rounded-2xl border p-4 transition-all hover:border-primary-pastel hover:shadow-sm sm:flex-row sm:items-center",
                        owned ? "border-success-border/70 bg-success-bg/25" : "border-border bg-background/55",
                      )}
                    >
                      {item.thumbnail && (
                        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border/70 bg-primary-light sm:w-44">
                          <img
                            alt=""
                            loading="lazy"
                            src={item.thumbnail}
                            className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold leading-snug text-foreground">{item.title}</h3>
                          {owned && <Badge variant="success">Đã sở hữu</Badge>}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-muted-foreground">Trong combo:</span>
                          <CoinPrice
                            priceVnd={Number(item.allocated_price)}
                            originalPriceVnd={
                              Number(item.list_price) > Number(item.allocated_price)
                                ? Number(item.list_price)
                                : undefined
                            }
                            size="sm"
                            showWhiteDiscount={false}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-0.5">
                          {item.slug && (
                            <Link
                              href={`/course/${item.slug}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            >
                              <span>Xem giáo trình khóa học</span>
                              <ArrowUpRight className="size-3.5" aria-hidden="true" />
                            </Link>
                          )}
                          {!item.available && (
                            <span className="text-xs font-semibold text-warning-foreground">
                              Tạm ngừng nhận đăng ký mới
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* 2. BENTO OUTCOMES / AUDIENCE / REQUIREMENTS */}
          {learningSections.length > 0 && (
            <div className={cn("grid gap-4", learningSections.length >= 2 && "md:grid-cols-2")}>
              {learningSections.map(({ title, items, tone, icon: Icon }) => (
                <section
                  key={title}
                  className={cn("space-y-3 rounded-[24px] border p-5", tone)}
                >
                  <h2 className="inline-flex items-center gap-2 text-base font-extrabold text-foreground">
                    <Icon className="size-4 text-primary" animated={false} aria-hidden="true" />
                    <span>{title}</span>
                  </h2>
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {items?.map((entry, idx) => (
                      <li key={idx} className="flex items-start gap-2 break-words">
                        <Check animated={false} className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 leading-relaxed">{entry}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {/* 3. GIỚI THIỆU CHI TIẾT */}
          {data.description && (
            <section className="space-y-3 rounded-[28px] border border-border bg-surface p-6 shadow-2xs">
              <h2 className="font-display text-xl font-bold text-foreground">Giới thiệu chi tiết lộ trình</h2>
              <div className="break-words text-sm leading-relaxed text-muted-foreground">
                <MarkdownRenderer content={data.description} />
              </div>
            </section>
          )}

          {/* 4. QUYỀN LỢI & HOÀN TIỀN */}
          <section className="space-y-3 rounded-[24px] border border-primary-pastel/70 bg-primary-light/35 p-6">
            <h2 className="inline-flex items-center gap-2 text-base font-extrabold text-foreground">
              <ShieldCheck className="size-5 text-primary" animated={false} aria-hidden="true" />
              <span>Quyền lợi và chính sách hoàn tiền</span>
            </h2>
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>• Bạn nhận trọn quyền học từng khóa được liệt kê tại thời điểm mua.</li>
              {data.refund_policy && <li>• {data.refund_policy}</li>}
              <li>• Bạn có thể áp dụng một mã ưu đãi riêng của combo hoặc mã thưởng cá nhân (mã khóa lẻ không áp dụng).</li>
            </ul>
          </section>
        </div>

        {/* ── STICKY BOARDING-PASS CHECKOUT TICKET ── */}
        <aside
          id="mua-combo"
          className="relative scroll-mt-28 overflow-hidden rounded-[28px] border border-primary-pastel bg-surface shadow-lg lg:sticky lg:top-24"
        >
          {/* Header vé màu Cloudy Blue */}
          <div className="bg-gradient-to-r from-[#285C90] via-[#356FA7] to-[#4A85BF] px-6 py-4 text-white">
            <p className="text-[10px] font-bold tracking-[0.2em] text-primary-light uppercase">
              COMBO BOARDING PASS
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold">Sở hữu trọn lộ trình</h2>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {quoteError ? (
              <LoadError error={quoteError} retry={() => refreshQuote()} />
            ) : !quote ? (
              <p role="status" className="text-sm text-muted-foreground">
                Đang tính quyền sở hữu và báo giá…
              </p>
            ) : (
              <>
                {/* Bảng tính chi tiết bằng Coin */}
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Giá combo lộ trình</dt>
                    <dd>
                      <CoinPrice priceVnd={Number(quote.full_price)} size="sm" showWhiteDiscount={false} />
                    </dd>
                  </div>
                  {Number(quote.owned_credit) > 0 && (
                    <div className="flex items-center justify-between gap-4 text-success-foreground">
                      <dt className="font-medium">Trừ khóa đã sở hữu</dt>
                      <dd className="inline-flex items-center gap-1 font-bold">
                        <span>−</span>
                        <CoinPrice priceVnd={Number(quote.owned_credit)} size="sm" showWhiteDiscount={false} />
                      </dd>
                    </div>
                  )}
                  {Number(quote.discount_amount) > 0 && (
                    <div className="flex items-center justify-between gap-4 text-success-foreground">
                      <dt className="font-medium">Mã {quote.coupon_code}</dt>
                      <dd className="inline-flex items-center gap-1 font-bold">
                        <span>−</span>
                        <CoinPrice priceVnd={Number(quote.discount_amount)} size="sm" showWhiteDiscount={false} />
                      </dd>
                    </div>
                  )}

                  {/* Đường cắt rãnh khuyết */}
                  <div className="relative my-3 border-t border-dashed border-primary-pastel pt-4">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 -left-8 size-5 -translate-y-1/2 rounded-full border border-primary-pastel bg-background"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 -right-8 size-5 -translate-y-1/2 rounded-full border border-primary-pastel bg-background"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-base font-extrabold text-foreground">Cần thanh toán</dt>
                      <dd>
                        <CoinPrice priceVnd={Number(quote.total)} size="lg" />
                      </dd>
                    </div>
                  </div>
                </dl>

                {/* Ô nhập mã ưu đãi mở sẵn + hiển thị mã tự động áp tốt nhất */}
                <form
                  className="space-y-2 rounded-2xl border border-dashed border-accent-vanilla-border bg-accent-vanilla/45 p-3.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setDisableAutoCoupon(false);
                    setCouponCode(couponInput.trim().toUpperCase());
                    setConfirm(false);
                    setFailure("");
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-accent-vanilla-foreground">
                      <Ticket className="size-3.5" animated={false} aria-hidden="true" />
                      Mã ưu đãi combo
                    </span>
                    <Link href="/vouchers" className="text-[11px] font-bold text-primary hover:underline">
                      Xem kho mã →
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Mã ưu đãi combo"
                      maxLength={40}
                      value={couponInput}
                      disabled={busy}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder={quote.coupon_code ? `Đang dùng ${quote.coupon_code}…` : "Nhập mã giảm giá…"}
                      containerClassName="min-w-0 flex-1"
                      className="h-9 bg-surface text-xs font-semibold"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={busy || !couponInput.trim() || isValidating}
                      className="h-9 shrink-0 rounded-xl px-3.5 text-xs font-bold"
                    >
                      Áp dụng
                    </Button>
                  </div>
                  {(quote.coupon_code || couponCode) && (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      {quote.coupon_code && !quoteError ? (
                        <span role="status" className="font-semibold text-success-foreground">
                          ✓ {quote.auto_applied ? "Tự động áp mã tốt nhất:" : "Đang áp dụng"}{" "}
                          <strong className="font-mono">{quote.coupon_code}</strong>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Mã: {couponCode}</span>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setCouponCode("");
                          setCouponInput("");
                          setDisableAutoCoupon(true);
                          setConfirm(false);
                        }}
                        className="shrink-0 font-bold text-primary hover:underline cursor-pointer"
                      >
                        Gỡ mã
                      </button>
                    </div>
                  )}
                </form>

                {/* CTA Chính */}
                <Button
                  fullWidth
                  disabled={busy || isValidating}
                  onClick={open}
                  className="min-h-12 rounded-full text-sm font-extrabold shadow-sm"
                >
                  {!user
                    ? "Đăng nhập để xem giá của bạn"
                    : Number(quote.total) === 0
                      ? "Xác nhận quyền học miễn phí"
                      : "Mua trọn lộ trình bằng ví"}
                </Button>

                {quote.items.some((i) => i.already_owned) && (
                  <ul className="space-y-1 rounded-xl border border-success-border/60 bg-success-bg/40 p-3 text-xs text-success-foreground">
                    {quote.items
                      .filter((i) => i.already_owned)
                      .map((i) => (
                        <li key={i.course_id} className="font-medium">
                          ✓ Đã sở hữu: {i.title}
                        </li>
                      ))}
                  </ul>
                )}

                <div className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <p>{user ? quote.policy : "Đăng nhập để hệ thống tự trừ các khóa bạn đã sở hữu."}</p>
                  <p>
                    Hoàn tiền trong <strong>{quote.refund_days} ngày</strong> kể từ lúc mua theo giá thực trả của từng khóa.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => refreshQuote()}
                    className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-primary cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" animated={false} aria-hidden="true" />
                    Cập nhật báo giá
                  </button>
                  <Link
                    href="/wallets"
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    <Wallet className="size-3.5" animated={false} aria-hidden="true" />
                    Xem ví &amp; nạp Coin
                  </Link>
                </div>
              </>
            )}

            {failure && (
              <p role="alert" className="rounded-xl border border-destructive-border bg-destructive-bg px-3.5 py-2.5 text-xs font-semibold text-destructive-foreground">
                {failure}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* ── MODAL XÁC NHẬN THANH TOÁN ── */}
      <Modal
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
        title="Xác nhận sở hữu combo"
        description="Kiểm tra danh sách khóa học và số Coin trước khi thanh toán."
        footer={
          <>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
              Quay lại
            </Button>
            <Button disabled={busy || isValidating || !quote} onClick={purchase}>
              {busy ? "Đang xử lý…" : "Xác nhận thanh toán"}
            </Button>
          </>
        }
      >
        <div ref={confirmation} tabIndex={-1} className="space-y-5 outline-none">
          <p className="font-bold text-foreground">{cleanTitle(data.title)}</p>
          {quote?.coupon_code && (
            <p className="inline-flex items-center gap-2 rounded-xl bg-success-bg px-3 py-1.5 text-xs font-bold text-success-foreground">
              <span>Mã {quote.coupon_code} · Giảm</span>
              <CoinPrice priceVnd={Number(quote.discount_amount)} size="sm" showWhiteDiscount={false} />
            </p>
          )}
          <ul className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {quote?.items.map((i) => (
              <li key={i.course_id} className="flex items-center justify-between gap-4 border-b border-border pb-2">
                <span className="min-w-0 flex-1">
                  {i.title}
                  {i.already_owned ? " · Đã sở hữu" : ""}
                </span>
                <span className="shrink-0">
                  <CoinPrice priceVnd={Number(i.payable)} size="sm" showWhiteDiscount={false} />
                </span>
              </li>
            ))}
          </ul>
          {quote && (
            <div className="flex items-center justify-between rounded-2xl border border-primary-pastel bg-primary-light/50 px-4 py-3">
              <span className="text-sm font-bold text-foreground">Tổng thanh toán</span>
              <CoinPrice priceVnd={Number(quote.total)} size="md" />
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Thanh toán bằng số dư ví Coin. Bạn sẽ được hoàn ngay +20% Coin trắng sau khi hoàn tất.
          </p>
        </div>
      </Modal>
    </main>
  );
}
