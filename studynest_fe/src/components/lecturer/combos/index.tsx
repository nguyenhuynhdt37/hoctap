"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Layers,
  LayoutGrid,
  Library,
  List,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  X,
} from "pulsoicon-react";
import {
  fetchLearning,
  LoadError,
  message,
  price,
} from "@/components/learning-paths/shared";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Switch,
} from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";

export type ComboRow = {
  bundle_id: string;
  id: string; // version_id
  title: string;
  code: string;
  slug: string;
  price: string | number;
  original_price: string | number;
  course_count: number;
  primary_thumbnail: string | null;
  status: string;
  review_status: string | null;
  is_active: boolean;
  total_orders: number;
  total_revenue: string | number;
};

type StatusTab = "all" | "active" | "paused" | "draft";
type ViewMode = "grid" | "list";

const statusLabels: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

const formatVndApprox = (vnd: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(vnd || 0)) + " đ";

export default function LecturerCombos() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [togglingBundleId, setTogglingBundleId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data, error, mutate, isLoading } = useSWR<{
    items: ComboRow[];
    total: number;
  }>(`/lecturer/bundles?keyword=${encodeURIComponent(query)}`, fetchLearning);

  const items = useMemo(() => data?.items ?? [], [data]);

  // Thống kê tổng quan từ danh sách combo
  const metrics = useMemo(() => {
    const total = data?.total ?? items.length;
    const activeCount = items.filter(
      (item) => item.is_active && item.status === "published",
    ).length;
    const pausedCount = items.filter(
      (item) => !item.is_active && item.status === "published",
    ).length;
    const draftCount = items.filter((item) => item.status === "draft").length;
    const totalOrders = items.reduce(
      (sum, item) => sum + (Number(item.total_orders) || 0),
      0,
    );
    const totalRevenue = items.reduce(
      (sum, item) => sum + (Number(item.total_revenue) || 0),
      0,
    );
    const activeRate =
      items.length > 0 ? Math.round((activeCount / items.length) * 100) : 0;

    return {
      total,
      activeCount,
      pausedCount,
      draftCount,
      totalOrders,
      totalRevenue,
      activeRate,
    };
  }, [data, items]);

  // Lọc theo tab trạng thái ở client
  const filteredItems = useMemo(() => {
    if (statusTab === "all") return items;
    if (statusTab === "active") {
      return items.filter(
        (item) => item.is_active && item.status === "published",
      );
    }
    if (statusTab === "paused") {
      return items.filter(
        (item) => !item.is_active && item.status === "published",
      );
    }
    return items.filter((item) => item.status === "draft");
  }, [items, statusTab]);

  // Xử lý bật / tắt mở bán nhanh qua Switch (Optimistic UI)
  const handleToggleActive = async (bundleId: string, nextActive: boolean) => {
    setTogglingBundleId(bundleId);
    const previousData = data;

    if (data) {
      mutate(
        {
          ...data,
          items: data.items.map((item) =>
            item.bundle_id === bundleId
              ? { ...item, is_active: nextActive }
              : item,
          ),
        },
        false,
      );
    }

    try {
      await api.put(
        `/lecturer/bundles/${bundleId}/active?active=${nextActive}`,
      );
      showToast.success(
        nextActive
          ? "Đã bật mở bán combo trên hệ thống"
          : "Đã tạm dừng mở bán combo",
      );
      await mutate();
    } catch (err) {
      if (previousData) {
        mutate(previousData, false);
      }
      showToast.error(message(err));
    } finally {
      setTogglingBundleId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    showToast.success(`Đã sao chép mã ${code}`);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 1800);
  };

  const statusTabs: Array<{ key: StatusTab; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: items.length },
    { key: "active", label: "Đang mở bán", count: metrics.activeCount },
    { key: "paused", label: "Tạm dừng", count: metrics.pausedCount },
    { key: "draft", label: "Bản nháp", count: metrics.draftCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Atelier Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-secondary-light/65 p-6 shadow-sm sm:p-8">
          {/* Họa tiết nền pastel */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-primary/10"
            viewBox="0 0 240 240"
            fill="none"
          >
            <circle cx="120" cy="120" r="96" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 6" />
            <circle cx="120" cy="120" r="68" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="120" cy="120" r="38" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 5" />
          </svg>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface/85 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-xs">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Combo &amp; Learning Path Atelier</span>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Xưởng Combo &amp; Lộ Trình Học Tập
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Đóng gói các khóa học liên kết thành lộ trình bài bản, thiết lập mức
                giá ưu đãi hấp dẫn và theo dõi hiệu suất chuyển đổi theo thời gian thực.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => router.push("/lecturer/discounts")}
                leftIcon={<Tag className="h-4 w-4" />}
                className="rounded-full bg-surface/90"
              >
                Mã giảm giá Combo
              </Button>
              <Button
                onClick={() => router.push("/lecturer/combos/create")}
                leftIcon={<Plus className="h-4 w-4" />}
                className="rounded-full shadow-sm"
              >
                Tạo combo mới
              </Button>
            </div>
          </div>

          {/* Bento 4 chỉ số tổng quan */}
          <div className="relative mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Tổng số combo</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Library animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
                {metrics.total}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.draftCount} bản nháp · {metrics.pausedCount} tạm dừng
              </p>
            </div>

            <div className="rounded-2xl border border-primary-pastel/80 bg-primary-light/45 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-primary">
                <span>Đang mở bán</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-primary">
                  <CheckCircle2 animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                  {metrics.activeCount}
                </span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {metrics.activeRate}% danh mục
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface/80">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${metrics.activeRate}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-secondary-pastel/80 bg-secondary-light/45 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-secondary-foreground">
                <span>Lượt mua tích lũy</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-secondary-foreground">
                  <ShoppingBag animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
                {metrics.totalOrders}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Học viên đã đăng ký combo
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-accent-vanilla/70 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-foreground/80">
                <span>Doanh thu combo</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-primary">
                  <Coins animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 font-display text-2xl font-semibold tabular-nums text-primary">
                <span>{price(metrics.totalRevenue)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {formatVndApprox(metrics.totalRevenue)}
              </p>
            </div>
          </div>
        </section>

        {/* Thanh lọc & tìm kiếm kính mờ */}
        <Card
          variant="surface"
          className="rounded-[22px] border border-border/90 bg-surface/90 p-3.5 shadow-2xs backdrop-blur-xs"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Segmented Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {statusTabs.map((tab) => {
                const active = statusTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusTab(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-primary-light/60 hover:text-primary"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                        active
                          ? "bg-surface/20 text-primary-foreground"
                          : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm + Chuyển chế độ xem */}
            <div className="flex flex-wrap items-center gap-2.5">
              <form
                className="flex flex-1 items-center gap-2 sm:flex-initial"
                onSubmit={(event) => {
                  event.preventDefault();
                  setQuery(keyword.trim());
                }}
              >
                <div className="relative flex-1 sm:w-64">
                  <Search
                    animated={false}
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    aria-label="Tìm theo tên combo"
                    placeholder="Tìm tên combo..."
                    className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                  {keyword && (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa"
                      onClick={() => {
                        setKeyword("");
                        setQuery("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="rounded-full px-4"
                >
                  Tìm
                </Button>
              </form>

              {/* View mode toggle */}
              <div
                className="inline-flex items-center rounded-full border border-border bg-background p-1"
                role="group"
                aria-label="Chế độ hiển thị"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Xem dạng lưới"
                  aria-pressed={viewMode === "grid"}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-surface text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lưới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="Xem dạng danh sách"
                  aria-pressed={viewMode === "list"}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-surface text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Danh sách</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Trạng thái lỗi */}
        {error && <LoadError error={error} retry={() => mutate()} />}

        {/* Skeleton loading */}
        {isLoading && (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-5 md:grid-cols-2"
                : "grid gap-4"
            }
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-[24px] border border-border bg-surface-muted"
              />
            ))}
          </div>
        )}

        {/* Trạng thái rỗng */}
        {!isLoading && data && filteredItems.length === 0 && (
          <Card variant="surface" className="rounded-[24px] p-10">
            <EmptyState
              icon={<Library className="h-8 w-8 text-primary" />}
              title={
                query || statusTab !== "all"
                  ? "Không tìm thấy combo phù hợp"
                  : "Chưa có combo lộ trình nào"
              }
              description={
                query || statusTab !== "all"
                  ? "Hãy thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
                  : "Kết hợp ít nhất 2 khóa học của bạn thành một lộ trình trọn gói để tăng tỷ lệ đăng ký."
              }
              action={
                query || statusTab !== "all" ? (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setKeyword("");
                      setQuery("");
                      setStatusTab("all");
                    }}
                  >
                    Đặt lại bộ lọc
                  </Button>
                ) : (
                  <Button
                    className="rounded-full"
                    onClick={() => router.push("/lecturer/combos/create")}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Tạo combo đầu tiên
                  </Button>
                )
              }
            />
          </Card>
        )}

        {/* Danh sách Combo (Grid 2 cột hoặc List ngang) */}
        {!isLoading && filteredItems.length > 0 && (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-5 md:grid-cols-2"
                : "grid grid-cols-1 gap-4"
            }
          >
            {filteredItems.map((item) => {
              const comboPrice = Number(item.price) || 0;
              const origPrice = Number(item.original_price) || 0;
              const isDiscounted = origPrice > comboPrice && origPrice > 0;
              const savingAmount = Math.max(0, origPrice - comboPrice);
              const savingPercent = isDiscounted
                ? Math.round((savingAmount / origPrice) * 100)
                : 0;
              const isGrid = viewMode === "grid";

              return (
                <Card
                  key={item.id}
                  density="none"
                  className="group overflow-hidden rounded-[24px] border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-md"
                >
                  <div
                    className={
                      isGrid
                        ? "flex h-full flex-col"
                        : "flex flex-col md:flex-row"
                    }
                  >
                    {/* Ảnh bìa 16:9 + Badges nổi */}
                    <div
                      className={`relative aspect-video shrink-0 overflow-hidden bg-primary-light/60 ${
                        isGrid
                          ? "w-full border-b border-border/60"
                          : "w-full md:m-4 md:mr-0 md:w-64 md:self-start md:rounded-2xl md:border md:border-border/70"
                      }`}
                    >
                      {item.primary_thumbnail ? (
                        <img
                          src={item.primary_thumbnail}
                          alt={item.title}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="grid size-full place-items-center bg-gradient-to-br from-primary-light to-secondary-light/60 text-primary">
                          <Library
                            animated={false}
                            className="size-10 stroke-[1.4]"
                            aria-hidden="true"
                          />
                        </div>
                      )}

                      {/* Badge số lượng khóa học */}
                      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs backdrop-blur-xs">
                          <Layers
                            animated={false}
                            className="h-3.5 w-3.5 text-primary"
                            aria-hidden="true"
                          />
                          {item.course_count} khóa học
                        </span>
                      </div>

                      {/* Huy hiệu tiết kiệm */}
                      {isDiscounted && savingPercent > 0 && (
                        <div className="absolute right-3 top-3">
                          <span className="inline-flex items-center rounded-full border border-secondary-pastel bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground shadow-xs">
                            Tiết kiệm -{savingPercent}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Nội dung thẻ */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
                      <div className="space-y-3">
                        {/* Dòng trạng thái + Mã combo + Switch */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code)}
                              title="Sao chép mã combo"
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground hover:border-primary-pastel hover:text-primary transition-colors cursor-pointer"
                            >
                              <span>{item.code}</span>
                              <Copy
                                animated={false}
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              {copiedCode === item.code && (
                                <span className="text-[10px] font-sans font-semibold text-primary">
                                  Đã chép
                                </span>
                              )}
                            </button>

                            <Badge
                              variant={
                                item.status === "published" ? "success" : "info"
                              }
                              size="sm"
                              dot
                            >
                              {statusLabels[item.status] || item.status}
                            </Badge>

                            {item.review_status &&
                              !["approved", "published", item.status].includes(
                                item.review_status,
                              ) && (
                                <Badge variant="warning" size="sm">
                                  Duyệt: {item.review_status}
                                </Badge>
                              )}
                          </div>

                          <Switch
                            size="sm"
                            checked={item.is_active}
                            disabled={togglingBundleId === item.bundle_id}
                            onCheckedChange={(checked) =>
                              handleToggleActive(item.bundle_id, checked)
                            }
                            label={item.is_active ? "Đang mở bán" : "Tạm dừng"}
                          />
                        </div>

                        {/* Tiêu đề */}
                        <Link
                          href={`/lecturer/combos/${item.id}`}
                          className="block font-display text-lg font-semibold leading-snug text-foreground transition-colors hover:text-primary line-clamp-2"
                        >
                          {item.title}
                        </Link>

                        {/* Cụm giá kép & Tiết kiệm */}
                        <div className="rounded-2xl border border-border/70 bg-background/80 px-3.5 py-2.5">
                          <div className="flex flex-wrap items-baseline gap-2.5">
                            <span className="inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-primary">
                              <Coins
                                animated={false}
                                className="h-5 w-5 text-primary"
                                aria-hidden="true"
                              />
                              {price(item.price)}
                            </span>

                            {isDiscounted ? (
                              <>
                                <span className="text-sm font-medium tabular-nums text-muted-foreground line-through">
                                  {price(item.original_price)}
                                </span>
                                <span className="rounded-full bg-secondary-light px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                                  Giảm {price(savingAmount)}
                                </span>
                              </>
                            ) : (
                              origPrice > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Bằng tổng giá lẻ {price(origPrice)}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer: Số liệu bán hàng + Hành động */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3.5">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light/50 px-2.5 py-1 text-foreground">
                            <ShoppingBag
                              animated={false}
                              className="h-3.5 w-3.5 text-primary"
                              aria-hidden="true"
                            />
                            <strong className="tabular-nums">
                              {item.total_orders}
                            </strong>{" "}
                            học viên
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-vanilla/70 px-2.5 py-1 text-foreground">
                            <Coins
                              animated={false}
                              className="h-3.5 w-3.5 text-primary"
                              aria-hidden="true"
                            />
                            Thu:{" "}
                            <strong className="tabular-nums text-primary">
                              {price(item.total_revenue)}
                            </strong>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {item.status === "published" &&
                            item.is_active &&
                            item.slug && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full"
                                onClick={() =>
                                  window.open(`/combo/${item.slug}`, "_blank")
                                }
                                leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                              >
                                Trang học viên
                              </Button>
                            )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              router.push(`/lecturer/combos/${item.id}`)
                            }
                            leftIcon={<Settings className="h-3.5 w-3.5" />}
                          >
                            Chỉnh sửa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
