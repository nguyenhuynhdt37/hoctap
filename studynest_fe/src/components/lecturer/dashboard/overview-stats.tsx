"use client";

import useSWR from "swr";
import {
  BookOpen,
  DollarSign,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { LecturerOverview } from "@/types/lecturer/statistics";

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function OverviewStats() {
  const { data, isLoading } = useSWR<LecturerOverview>(
    "/lecturer/statistics/overview",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const growthValue = data?.revenue_growth ?? 0;
  const isGrowthPositive = growthValue >= 0;

  const stats = [
    {
      title: "Tổng Doanh Thu",
      value: formatCurrency(data?.total_revenue),
      subValue: `${growthValue.toFixed(1)}% so với tháng trước`,
      isGrowthPositive,
      icon: DollarSign,
      iconClass: "bg-success-bg text-success-foreground border-success-border",
    },
    {
      title: "Học Viên",
      value: (data?.total_students ?? 0).toLocaleString("vi-VN"),
      subValue: "Tổng số học viên đã ghi danh",
      icon: Users,
      iconClass: "bg-primary-light text-primary border-primary-pastel/70",
    },
    {
      title: "Khóa Học",
      value: (data?.total_courses ?? 0).toLocaleString("vi-VN"),
      subValue: "Khóa học đang hoạt động",
      icon: BookOpen,
      iconClass:
        "bg-secondary-light text-secondary-foreground border-secondary-pastel/70",
    },
    {
      title: "Đánh Giá",
      value: (data?.average_rating ?? 0).toFixed(1),
      subValue: `${data?.total_reviews ?? 0} lượt đánh giá`,
      icon: Star,
      iconClass:
        "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border/70",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-36 rounded-[20px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card
            key={idx}
            className="rounded-[20px] p-5 border-border bg-surface shadow-xs hover:border-primary-pastel hover:shadow-ambient-md transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`p-3 rounded-xl border ${stat.iconClass} flex items-center justify-center`}
              >
                <Icon className="w-5 h-5" />
              </div>
              {idx === 0 && (
                <Badge
                  variant={stat.isGrowthPositive ? "success" : "destructive"}
                  size="sm"
                  className="gap-1 text-xs"
                >
                  {stat.isGrowthPositive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(growthValue).toFixed(1)}%
                </Badge>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium mb-1">
                {stat.title}
              </p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">
                {stat.value}
              </h3>
              <p className="text-xs text-subtle-foreground mt-2">
                {stat.subValue}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
