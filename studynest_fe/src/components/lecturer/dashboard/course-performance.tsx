"use client";

import Link from "next/link";
import useSWR from "swr";
import { Star, Users } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { CoursePerformanceItem } from "@/types/lecturer/statistics";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function CoursePerformance() {
  const { data, isLoading } = useSWR<CoursePerformanceItem[]>(
    "/lecturer/statistics/courses",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  return (
    <Card className="rounded-[24px] p-6 border-border bg-surface shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Hiệu Suất Khóa Học
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Top khóa học hoạt động hiệu quả nhất của bạn
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Khóa Học
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trạng Thái
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Học Viên
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Đánh Giá
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Doanh Thu Tháng
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="py-4 px-4">
                    <Skeleton variant="text" className="h-4 w-48" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton variant="text" className="h-5 w-20 mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton variant="text" className="h-4 w-12 mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton variant="text" className="h-4 w-12 mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton variant="text" className="h-4 w-24 ml-auto" />
                  </td>
                </tr>
              ))
            ) : !data || data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  Chưa có dữ liệu hiệu suất khóa học
                </td>
              </tr>
            ) : (
              data.map((course) => (
                <tr
                  key={course.course_id}
                  className="hover:bg-primary-light/25 transition-colors"
                >
                  <td className="py-4 px-4">
                    <Link
                      href={`/lecturer/courses/${course.course_id}/stats`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-12 h-8 rounded-lg overflow-hidden bg-primary-light/60 border border-border flex-shrink-0">
                        <img
                          src={getImageUrl(
                            course.thumbnail || "/logo/studynest-logo.svg"
                          )}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p
                        className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-xs"
                        title={course.title}
                      >
                        {course.title}
                      </p>
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge
                      variant={
                        course.status === "published"
                          ? "success"
                          : course.status === "draft"
                          ? "default"
                          : "warning"
                      }
                      size="sm"
                    >
                      {course.status === "published"
                        ? "Đã xuất bản"
                        : course.status === "draft"
                        ? "Bản nháp"
                        : course.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-sm text-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{course.total_students}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-foreground">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span>{course.average_rating.toFixed(1)}</span>
                      <span className="text-xs text-subtle-foreground">
                        ({course.reviews_count})
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(course.this_month_revenue)}
                    </p>
                    <p className="text-xs text-subtle-foreground">
                      Tổng: {formatCurrency(course.revenue)}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
