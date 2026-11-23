"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ExternalLink,
  Layers,
  Library,
  Plus,
  Search,
  Settings,
  ShoppingBag,
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
  Input,
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

const labels: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

export default function LecturerCombos() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [togglingBundleId, setTogglingBundleId] = useState<string | null>(null);

  const { data, error, mutate, isLoading } = useSWR<{
    items: ComboRow[];
    total: number;
  }>(`/lecturer/bundles?keyword=${encodeURIComponent(query)}`, fetchLearning);

  // Thống kê nhanh từ danh sách combo
  const metrics = useMemo(() => {
    if (!data?.items) {
      return { total: 0, activeCount: 0, totalOrders: 0, totalRevenue: 0 };
    }
    const total = data.total ?? data.items.length;
    const activeCount = data.items.filter(
      (item) => item.is_active && item.status === "published",
    ).length;
    const totalOrders = data.items.reduce(
      (sum, item) => sum + (Number(item.total_orders) || 0),
      0,
    );
    const totalRevenue = data.items.reduce(
      (sum, item) => sum + (Number(item.total_revenue) || 0),
      0,
    );

    return { total, activeCount, totalOrders, totalRevenue };
  }, [data]);

  // Xử lý bật / tắt mở bán nhanh qua Switch
  const handleToggleActive = async (bundleId: string, nextActive: boolean) => {
    setTogglingBundleId(bundleId);
    const previousData = data;

    // Optimistic UI Update
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
      await api.put(`/lecturer/bundles/${bundleId}/active?active=${nextActive}`);
      showToast.success(
        nextActive
          ? "Đã bật mở bán combo trên hệ thống"
          : "Đã tạm dừng mở bán combo",
      );
      await mutate();
    } catch (err) {
      // Rollback nếu thất bại
      if (previousData) {
        mutate(previousData, false);
      }
      showToast.error(message(err));
    } finally {
      setTogglingBundleId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      {/* Header trang & Nút Tạo mới */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Combo · Lộ trình của tôi
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Quản lý lộ trình, giá bán và mã ưu đãi của bạn.
          </p>
        </div>
        <Button
          onClick={() => router.push("/lecturer/combos/create")}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Tạo combo mới
        </Button>
      </div>

      {/* KPI Overview Cards */}
      {data && (
        <Card density="none">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[inherit] bg-border sm:grid-cols-4">
            {[
              { label: "Tổng số combo", value: metrics.total },
              { label: "Đang mở bán", value: metrics.activeCount },
              { label: "Lượt mua hiển thị", value: metrics.totalOrders },
              { label: "Tiền đã thu hiển thị", value: price(metrics.totalRevenue) },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0 bg-surface px-4 py-3 sm:px-5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Thanh tìm kiếm */}
      <form
        className="max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(keyword.trim());
        }}
      >
        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Tên combo"
            placeholder="Tìm theo tên combo"
            className="flex-1"
          />
          <Button type="submit" variant="secondary" leftIcon={<Search className="h-4 w-4" />}>
            Tìm
          </Button>
        </div>
      </form>

      {/* Trạng thái lỗi hoặc tải */}
      {error && <LoadError error={error} retry={() => mutate()} />}
      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-surface-muted border border-border"
            />
          ))}
        </div>
      )}

      {/* Trạng thái danh sách rỗng */}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={<Library className="h-8 w-8 text-primary" />}
          title={query ? "Không tìm thấy combo" : "Chưa có combo nào"}
          description={query ? undefined : "Chọn ít nhất hai khóa học để tạo lộ trình đầu tiên."}
          action={
            query ? <Button variant="outline" onClick={() => {
              setKeyword("");
              setQuery("");
            }}>Xóa bộ lọc</Button> : <Button
              onClick={() => router.push("/lecturer/combos/create")}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Tạo combo đầu tiên
            </Button>
          }
        />
      )}

      {/* Danh sách thẻ combo đầy đủ thông tin chuyên nghiệp */}
      <div className="grid gap-4">
        {data?.items.map((item) => {
          const comboPrice = Number(item.price) || 0;
          const origPrice = Number(item.original_price) || 0;
          const isDiscounted = origPrice > comboPrice && origPrice > 0;
          const savingAmount = origPrice - comboPrice;
          const savingPercent = isDiscounted
            ? Math.round((savingAmount / origPrice) * 100)
            : 0;

          return (
            <Card
              key={item.id}
              density="none"
              className="overflow-hidden hover:border-primary-pastel"
            >
              <div className="flex flex-col md:flex-row">
                {/* Cột 1: Thumbnail 16:9 + Badge số lượng khóa */}
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-primary-light md:m-4 md:mr-0 md:w-48 md:self-start md:rounded-xl">
                  {item.primary_thumbnail ? (
                    <img
                      src={item.primary_thumbnail}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-primary">
                      <Library animated={false} className="size-8 stroke-[1.5]" aria-hidden="true" />
                    </div>
                  )}

                  {/* Badge số lượng khóa học gắn góc ảnh */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <Badge
                      variant="outline"
                      className="bg-surface/95 backdrop-blur-xs font-semibold shadow-2xs text-foreground"
                    >
                      <Layers animated={false} className="h-3 w-3 mr-1 text-primary" />
                      {item.course_count} khóa học
                    </Badge>
                  </div>
                </div>

                {/* Cột 2 & 3: Chi tiết thông tin + Giá kép + Thao tác */}
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
                  <div>
                    {/* Header: Mã combo + Trạng thái mở bán + Switch Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all text-xs text-muted-foreground">
                          {item.code}
                        </span>
                        <Badge
                          variant={item.status === "published" ? "success" : "info"}
                          size="sm"
                          dot
                        >
                          {labels[item.status] || item.status}
                        </Badge>
                        {item.review_status && !["approved", "published", item.status].includes(item.review_status) && (
                          <Badge variant="warning" size="sm">
                            Duyệt: {item.review_status}
                          </Badge>
                        )}
                      </div>

                      {/* Switch bật/tắt mở bán nhanh */}
                      <div className="flex items-center gap-2">
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
                    </div>

                    {/* Tiêu đề Combo */}
                    <Link
                      href={`/lecturer/combos/${item.id}`}
                      className="text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-2"
                    >
                      {item.title}
                    </Link>

                    {/* CỤM GIÁ KÉP & TIẾT KIỆM */}
                    <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
                      <span className="text-2xl font-extrabold text-primary">
                        {price(item.price)}
                      </span>

                      {isDiscounted ? (
                        <>
                          <span className="text-sm font-medium text-muted-foreground line-through">
                            {price(item.original_price)}
                          </span>
                          <Badge
                            variant="secondary"
                            size="sm"
                            className="font-semibold shadow-2xs"
                          >
                            Tiết kiệm {price(savingAmount)} (-{savingPercent}%)
                          </Badge>
                        </>
                      ) : (
                        origPrice > 0 && (
                          <span className="text-xs text-muted-foreground">
                            (Bằng tổng giá lẻ {price(origPrice)})
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Footer: Số liệu bán hàng + Nút Hành động */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                    {/* Thống kê đơn hàng và doanh thu */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag animated={false} className="h-4 w-4 text-primary" />
                        <span>
                          Đã bán: <strong className="text-foreground">{item.total_orders}</strong> học viên
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>
                          Đã thu: <strong className="text-foreground">{price(item.total_revenue)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Các nút hành động */}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.status === "published" && item.is_active && item.slug && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/combo/${item.slug}`, "_blank")}
                          leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        >
                          Xem trang học viên
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/lecturer/combos/${item.id}`)}
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
    </div>
  );
}
