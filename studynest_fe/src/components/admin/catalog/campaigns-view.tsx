"use client";

import { Calendar, Clock, Pencil, Plus, Star } from "pulsoicon-react";
import { Button } from "@/components/ui";
import type {
  AdminCatalogOverview,
  CatalogTaxonomyKind,
  TaxonomyItem,
} from "@/types/catalog";
import {
  CatalogIcon,
  EXAM_TYPE_LABELS,
  getPalette,
} from "./catalog-visuals";

interface CampaignsViewProps {
  overview: AdminCatalogOverview;
  onEditItem: (kind: CatalogTaxonomyKind, item: TaxonomyItem) => void;
  onCreateItem: (kind: CatalogTaxonomyKind) => void;
}

function getDaysCountdown(dateStr: unknown): number | null {
  if (typeof dateStr !== "string" || !dateStr.trim()) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function CampaignsView({
  overview,
  onEditItem,
  onCreateItem,
}: CampaignsViewProps) {
  return (
    <div className="space-y-8">
      {/* Section 1: Exam Campaigns Board */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Chiến dịch Mốc Kỳ thi
            </h2>
            <p className="text-sm text-muted-foreground">
              Quản lý các kỳ thi trọng điểm kèm lịch thi dự kiến, khối lớp mục tiêu và mức độ sẵn sàng khóa luyện thi.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateItem("exams")}
          >
            <Plus size={15} />
            Thêm kỳ thi
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {overview.exams.map((exam) => {
            const palette = getPalette(exam.color_token);
            const examTypeMeta = exam.exam_type
              ? EXAM_TYPE_LABELS[exam.exam_type]
              : null;
            const targetMonth =
              typeof exam.metadata?.target_month === "string"
                ? exam.metadata.target_month
                : null;
            const targetGrades = Array.isArray(exam.metadata?.target_grades)
              ? (exam.metadata.target_grades as number[])
              : [];
            const countdown = getDaysCountdown(exam.metadata?.exam_date);

            return (
              <article
                key={exam.id}
                className={`flex flex-col justify-between overflow-hidden rounded-3xl border bg-surface shadow-[0_12px_32px_-12px_rgba(53,111,167,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-14px_rgba(53,111,167,0.18)] ${palette.border}`}
              >
                <div>
                  {/* Pastel Top Ribbon */}
                  <div className={`p-5 ${palette.softBg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-surface/90 shadow-xs ${palette.border} ${palette.text}`}
                        >
                          <CatalogIcon name={exam.icon} size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {examTypeMeta && (
                              <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                                {examTypeMeta.label}
                              </span>
                            )}
                            {exam.is_featured && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-accent-vanilla-foreground">
                                <Star size={11} animated={false} />
                                Nổi bật
                              </span>
                            )}
                          </div>
                          <h3 className="mt-1.5 text-base font-bold text-foreground">
                            {exam.name}
                          </h3>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditItem("exams", exam)}
                        aria-label={`Chỉnh sửa kỳ thi ${exam.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface/90 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-3 p-5">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {exam.tagline ||
                        exam.description ||
                        "Chưa có mô tả chi tiết cho kỳ thi này."}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {targetMonth && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-background px-2.5 py-1.5 font-medium text-foreground">
                          <Calendar size={13} className="text-primary" />
                          {targetMonth}
                        </span>
                      )}
                      {countdown !== null && countdown > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-secondary-light px-2.5 py-1.5 font-semibold text-secondary-foreground">
                          <Clock size={13} />
                          Còn {countdown} ngày
                        </span>
                      )}
                    </div>

                    {targetGrades.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground">
                          Khối mục tiêu:
                        </span>
                        {targetGrades.map((g) => (
                          <span
                            key={g}
                            className="rounded-lg border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground"
                          >
                            Lớp {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/70 bg-background/40 px-5 py-3 text-xs">
                  <span className="font-semibold text-primary">
                    {exam.course_count ?? 0} khóa luyện thi
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-medium ${
                      exam.is_active
                        ? "bg-success-bg text-success-foreground"
                        : "bg-destructive-bg text-destructive-foreground"
                    }`}
                  >
                    {exam.is_active ? "Đang mở" : "Đã ẩn"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 2: Learning Goals Journey */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Lộ trình Định hướng Học tập
            </h2>
            <p className="text-sm text-muted-foreground">
              Các nấc thang mục tiêu giúp học viên lọc đúng khóa học theo trình độ từ nền tảng đến bứt phá.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateItem("learning-goals")}
          >
            <Plus size={15} />
            Thêm định hướng
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overview.learning_goals.map((goal, idx) => {
            const palette = getPalette(goal.color_token);
            const badgeLabel =
              typeof goal.metadata?.badge_label === "string"
                ? goal.metadata.badge_label
                : `Bước ${idx + 1}`;
            return (
              <div
                key={goal.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] transition-all hover:border-primary-pastel hover:shadow-[0_16px_32px_-14px_rgba(53,111,167,0.16)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${palette.softBg} ${palette.border} ${palette.text}`}
                      >
                        <CatalogIcon name={goal.icon} size={20} />
                      </div>
                      <div>
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${palette.badgeBg}`}
                        >
                          {badgeLabel}
                        </span>
                        <h3 className="mt-1 text-base font-bold text-foreground">
                          {goal.name}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditItem("learning-goals", goal)}
                      aria-label={`Chỉnh sửa định hướng ${goal.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {goal.tagline ||
                      goal.description ||
                      "Chưa có mô tả cho định hướng học tập này."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="font-semibold text-primary">
                    {goal.course_count ?? 0} khóa học gắn mục tiêu
                  </span>
                  <code className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {goal.code}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
