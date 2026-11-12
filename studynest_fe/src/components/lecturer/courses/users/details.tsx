"use client";

import { Badge, Card } from "@/components/ui";
import { StudentDetailResponse } from "@/types/lecturer/student-detail";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LecturerStudentDetails({
  params,
  data,
}: {
  params: { id: string; userId: string };
  data: StudentDetailResponse;
}) {
  const progressPercent = Math.min(
    100,
    Math.max(0, data.progress?.progress_percent || 0)
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value));
    } catch {
      return "—";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Học viên: {data.student.fullname}
              </h1>
              <p className="text-muted-foreground mt-1">
                Khóa học:{" "}
                <span className="font-semibold text-foreground">
                  {data.course.title}
                </span>
              </p>
            </div>
            <Link
              href={`/lecturer/courses/${params.id}/users`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-foreground hover:bg-primary-light/60 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <div className="text-sm font-semibold text-foreground mb-2">
              Tiến độ khóa học
            </div>
            <div className="flex items-center gap-3">
              <div className="w-full max-w-[260px] h-2 bg-primary-light rounded-full overflow-hidden">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-lg font-bold text-foreground">
                {progressPercent.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.progress.completed_lessons}/{data.course.total_lessons} bài
            </p>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold text-foreground mb-2">
              Đăng ký & hoạt động
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Đăng ký:{" "}
                <span className="text-foreground font-medium">
                  {formatDateTime(data.student.enrolled_at)}
                </span>
              </div>
              <div>
                Hoạt động cuối:{" "}
                <span className="text-foreground font-medium">
                  {formatDateTime(data.student.last_activity)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold text-foreground mb-2">
              Giá trị thanh toán
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(data.purchase?.price_paid || 0)}
            </div>
            {data.purchase && (
              <p className="text-xs text-muted-foreground mt-1">
                Gốc: {formatCurrency(data.purchase.original_price || 0)} • Giảm:{" "}
                <span className="text-destructive-foreground font-semibold">
                  -{formatCurrency(data.purchase.discount_amount || 0)}
                </span>
                {data.purchase.discount_code
                  ? ` • Mã: ${data.purchase.discount_code}`
                  : ""}
              </p>
            )}
          </Card>
        </div>

        {data.progress?.current_lesson && (
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Bài học hiện tại
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {data.progress.current_lesson.title}
                </div>
              </div>
              <Badge variant="primary" size="sm">
                Vị trí: {data.progress.current_lesson.position}
              </Badge>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background/80 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bài học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vị trí
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hoàn thành lúc
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {data.lessons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      Không có dữ liệu bài học
                    </td>
                  </tr>
                ) : (
                  data.lessons.map((l) => (
                    <tr
                      key={l.lesson_id}
                      className="hover:bg-primary-light/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {l.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {l.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {l.position}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={l.is_completed ? "success" : "neutral"}
                          size="sm"
                        >
                          {l.is_completed ? "Đã hoàn thành" : "Chưa hoàn thành"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(l.completed_at)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
