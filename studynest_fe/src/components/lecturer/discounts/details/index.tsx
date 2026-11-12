"use client";

import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import {
  DiscountDetail,
  DiscountDetailsProps,
} from "@/types/lecturer/discount";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function DiscountDetails({ discountId }: DiscountDetailsProps) {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<DiscountDetail>(
    `/lecturer/discounts/${discountId}`,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const discountStatus = useMemo<{
    label: string;
    variant: BadgeVariant;
  } | null>(() => {
    if (!data?.discount) return null;
    const now = new Date();
    const startAt = new Date(data.discount.start_at);
    const endAt = new Date(data.discount.end_at);

    if (!data.discount.is_active) {
      return { label: "Đã tắt", variant: "neutral" };
    }
    if (now < startAt) {
      return { label: "Sắp bắt đầu", variant: "warning" };
    }
    if (now > endAt) {
      return { label: "Đã hết hạn", variant: "destructive" };
    }
    return { label: "Đang hoạt động", variant: "success" };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-64" />
          <Card variant="surface" className="p-6 sm:p-8 space-y-6">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <Alert variant="destructive" title="Không thể tải thông tin">
            Vui lòng thử lại sau hoặc liên hệ hỗ trợ.
          </Alert>
        </div>
      </div>
    );
  }

  const { discount, targets, usage_history } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-1.5">
            Chi tiết mã giảm giá
          </h1>
        </div>

        {/* Discount Info Card */}
        <Card variant="surface" className="p-6 sm:p-8 mb-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-primary-light border border-primary-pastel rounded-2xl flex items-center justify-center shrink-0">
                <Tag className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-1.5">
                  {discount.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 bg-background border border-border text-foreground rounded-lg font-mono font-semibold text-xs">
                    {discount.code}
                  </span>
                  {discountStatus && (
                    <Badge variant={discountStatus.variant} size="sm" dot>
                      {discountStatus.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {discount.is_active ? (
                <CheckCircle2 className="h-6 w-6 text-success-foreground" />
              ) : (
                <XCircle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          {discount.description && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {discount.description}
            </p>
          )}

          {/* Discount Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-background border border-border rounded-2xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Giá trị giảm
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {discount.discount_type === "percent"
                  ? `${discount.percent_value}%`
                  : formatCurrency(discount.fixed_value || 0)}
              </p>
            </div>

            <div className="p-4 bg-background border border-border rounded-2xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Đã sử dụng
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {discount.usage_count}
                {discount.usage_limit && ` / ${discount.usage_limit}`}
              </p>
            </div>

            <div className="p-4 bg-background border border-border rounded-2xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Giới hạn/người
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {discount.per_user_limit}
              </p>
            </div>

            <div className="p-4 bg-background border border-border rounded-2xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Áp dụng cho
                </span>
              </div>
              <p className="text-lg font-semibold text-foreground capitalize">
                {discount.applies_to === "course"
                  ? "Khóa học"
                  : discount.applies_to === "category"
                  ? "Danh mục"
                  : discount.applies_to === "global"
                  ? "Toàn bộ"
                  : discount.applies_to}
              </p>
            </div>
          </div>

          {/* Date Range */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Thời gian hiệu lực
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bắt đầu</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatDateTime(discount.start_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Kết thúc</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatDateTime(discount.end_at)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Targets Section */}
        {targets.length > 0 && (
          <Card variant="surface" className="p-6 sm:p-8 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Đối tượng áp dụng ({targets.length})
            </h3>
            <div className="space-y-3">
              {targets.map((target, index) => (
                <div
                  key={index}
                  className="p-4 bg-background rounded-2xl border border-border"
                >
                  {target.course_title ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Khóa học
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {target.course_title}
                      </p>
                    </div>
                  ) : target.category_name ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Danh mục
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {target.category_name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Toàn bộ</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Usage History */}
        <Card variant="surface" className="p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Lịch sử sử dụng ({usage_history.length})
          </h3>
          {usage_history.length === 0 ? (
            <EmptyState
              icon={<User className="h-7 w-7" />}
              title="Chưa có lịch sử sử dụng"
              description="Lịch sử học viên áp dụng mã giảm giá này sẽ hiển thị tại đây."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Khóa học
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Số tiền giảm
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {usage_history.map((usage, index) => (
                    <tr
                      key={index}
                      className="hover:bg-background/70 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {usage.avatar ? (
                            <img
                              src={getImageUrl(usage.avatar)}
                              alt={usage.user_name}
                              className="h-9 w-9 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary-light border border-primary-pastel flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {usage.user_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-foreground">
                          {usage.course_title}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-primary tabular-nums">
                          {formatCurrency(usage.discounted_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(usage.used_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
