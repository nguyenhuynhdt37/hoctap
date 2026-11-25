"use client";

import { Badge, Card } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { StudentDetailResponse } from "@/types/lecturer/student-detail";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  PlayCircle,
  User,
} from "pulsoicon-react";
import Link from "next/link";

const getLessonTypeLabel = (type?: string | null) => {
  switch ((type || "").toLowerCase()) {
    case "video":
      return "Video bài giảng";
    case "quiz":
      return "Trắc nghiệm";
    case "code":
      return "Thực hành lập trình";
    case "article":
    case "text":
      return "Bài đọc";
    default:
      return type || "Bài học";
  }
};

export default function LecturerStudentDetails({
  params,
  data,
}: {
  params: { id: string; userId: string };
  data: StudentDetailResponse;
}) {
  const progressPercent = Math.min(
    100,
    Math.max(0, data.progress?.progress_percent || 0),
  );

  const formatCoin = (value: number) => formatVndAsCoin(value);

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

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPercent / 100);

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top bar */}
        <div>
          <Link
            href={`/lecturer/courses/${params.id}/users`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách học viên</span>
          </Link>
        </div>

        {/* Hero hồ sơ học viên */}
        <section className="relative overflow-hidden rounded-[30px] border border-primary-pastel bg-gradient-to-br from-primary-light via-surface to-accent-vanilla/70 p-6 shadow-sm sm:p-7">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <User animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                Hồ sơ học tập chi tiết
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {data.student.fullname}
              </h1>
              <p className="text-sm text-muted-foreground">
                Khóa học:{" "}
                <strong className="text-foreground">{data.course.title}</strong>
              </p>
            </div>

            {/* Vòng đo tiến độ SVG */}
            <div className="flex items-center gap-4 self-start rounded-2xl border border-surface bg-surface/90 px-5 py-3.5 shadow-2xs backdrop-blur-xs sm:self-auto">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="var(--color-primary-light)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke={
                      progressPercent >= 100
                        ? "#3E9B63"
                        : "var(--color-primary)"
                    }
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <span className="absolute font-display text-sm font-bold tabular-nums text-foreground">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Tiến độ hoàn thành
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {data.progress.completed_lessons}/{data.course.total_lessons}{" "}
                  bài học
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 thẻ tóm tắt đa sắc */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-[24px] border-primary-pastel bg-gradient-to-br from-primary-light/70 via-surface to-surface p-5 shadow-2xs">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <PlayCircle animated={false} className="h-4 w-4" />
              <span>Bài học đang theo dõi</span>
            </div>
            {data.progress?.current_lesson ? (
              <>
                <p className="font-semibold text-foreground line-clamp-2">
                  {data.progress.current_lesson.title}
                </p>
                <Badge variant="primary" size="sm" className="mt-2">
                  Vị trí bài #{data.progress.current_lesson.position}
                </Badge>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa bắt đầu bài học nào
              </p>
            )}
          </Card>

          <Card className="rounded-[24px] border-secondary-pastel bg-gradient-to-br from-secondary-light/70 via-surface to-surface p-5 shadow-2xs">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-secondary-foreground">
              <Clock animated={false} className="h-4 w-4" />
              <span>Đăng ký &amp; Hoạt động</span>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground tabular-nums">
              <div>
                Đăng ký:{" "}
                <strong className="text-foreground">
                  {formatDateTime(data.student.enrolled_at)}
                </strong>
              </div>
              <div>
                Hoạt động cuối:{" "}
                <strong className="text-foreground">
                  {formatDateTime(data.student.last_activity)}
                </strong>
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border-accent-vanilla-border bg-gradient-to-br from-accent-vanilla/85 via-surface to-surface p-5 shadow-2xs">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-warning-foreground">
              <Coins animated={false} className="h-4 w-4 text-[#C98A2C]" />
              <span>Giá trị thanh toán</span>
            </div>
            <p className="inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-warning-foreground">
              <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" />
              {formatCoin(data.purchase?.price_paid || 0)}
            </p>
            {data.purchase && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Gốc: {formatCoin(data.purchase.original_price || 0)} · Giảm:{" "}
                <strong className="text-destructive-foreground">
                  -{formatCoin(data.purchase.discount_amount || 0)}
                </strong>
                {data.purchase.discount_code
                  ? ` · Mã: ${data.purchase.discount_code}`
                  : ""}
              </p>
            )}
          </Card>
        </div>

        {/* Bảng tiến độ từng bài học */}
        <Card
          variant="surface"
          density="none"
          className="overflow-hidden rounded-[26px] border border-border shadow-xs"
        >
          <div className="flex items-center gap-2.5 border-b border-border bg-primary-light/35 px-6 py-4">
            <BookOpen animated={false} className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Lộ trình hoàn thành từng bài học ({data.lessons.length} bài)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-background/70">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bài học
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Định dạng
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thứ tự
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hoàn thành lúc
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {data.lessons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-muted-foreground"
                    >
                      Không có dữ liệu bài học
                    </td>
                  </tr>
                ) : (
                  data.lessons.map((l) => (
                    <tr
                      key={l.lesson_id}
                      className="transition-colors hover:bg-primary-light/20"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2
                            animated={false}
                            className={`h-4 w-4 shrink-0 ${
                              l.is_completed
                                ? "text-success-foreground"
                                : "text-border"
                            }`}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {l.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-muted-foreground">
                        {getLessonTypeLabel(l.type)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                        #{l.position}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={l.is_completed ? "success" : "neutral"}
                          size="sm"
                          dot
                        >
                          {l.is_completed ? "Đã hoàn thành" : "Chưa học xong"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs tabular-nums text-muted-foreground">
                        {formatDateTime(l.completed_at)}
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
