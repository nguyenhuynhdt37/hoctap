"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Grid3x3,
  Pencil,
  Plus,
  Star,
  TrendingUp,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import type {
  AdminCatalogOverview,
  CatalogTaxonomyKind,
  TaxonomyItem,
} from "@/types/catalog";
import { CatalogIcon, getPalette } from "./catalog-visuals";

interface AtlasViewProps {
  overview: AdminCatalogOverview;
  onEditItem: (kind: CatalogTaxonomyKind, item: TaxonomyItem) => void;
  onCreateItem: (
    kind: CatalogTaxonomyKind,
    preset?: Partial<TaxonomyItem>,
  ) => void;
  onJumpToMatrix: (subjectId?: string) => void;
}

export default function AtlasView({
  overview,
  onEditItem,
  onCreateItem,
  onJumpToMatrix,
}: AtlasViewProps) {
  const [gapLevelFilter, setGapLevelFilter] = useState<string>("all");

  const subjectsById = useMemo(
    () => new Map(overview.subjects.map((s) => [s.id, s])),
    [overview.subjects],
  );

  const gradeSubjectsMap = useMemo(() => {
    const map = new Map<string, { subject: TaxonomyItem; courseCount: number }[]>();
    for (const cell of overview.grade_subjects) {
      const subject = subjectsById.get(cell.subject_id);
      if (!subject) continue;
      const list = map.get(cell.grade_id) ?? [];
      list.push({ subject, courseCount: cell.course_count });
      map.set(cell.grade_id, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => b.courseCount - a.courseCount);
    }
    return map;
  }, [overview.grade_subjects, subjectsById]);

  const topSubjects = useMemo(() => {
    return [...overview.subjects]
      .filter((s) => s.is_active)
      .sort((a, b) => (b.course_count ?? 0) - (a.course_count ?? 0))
      .slice(0, 8);
  }, [overview.subjects]);

  const maxSubjectCourses = Math.max(
    1,
    ...topSubjects.map((s) => s.course_count ?? 0),
  );

  const filteredGaps = useMemo(() => {
    if (gapLevelFilter === "all") return overview.health.content_gaps;
    return overview.health.content_gaps.filter(
      (g) => g.level_id === gapLevelFilter,
    );
  }, [overview.health.content_gaps, gapLevelFilter]);

  return (
    <div className="space-y-8">
      {/* 3-Column Education Level Architecture */}
      <section aria-label="Bản đồ phân tầng 3 cấp học" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Sơ đồ Kiến trúc 3 Cấp học
            </h2>
            <p className="text-sm text-muted-foreground">
              Bấm vào bất kỳ cấp học hoặc khối lớp nào để chỉnh sửa metadata, màu sắc, biểu tượng hoặc nhảy sang Ma trận môn học.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateItem("levels")}
          >
            <Plus size={15} />
            Thêm cấp học
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {overview.levels.map((level) => {
            const palette = getPalette(level.color_token);
            const levelGrades = overview.grades
              .filter((g) => g.education_level_id === level.id)
              .sort((a, b) => (a.grade_number ?? 0) - (b.grade_number ?? 0));
            const gradeRange =
              typeof level.metadata?.grade_range === "string"
                ? level.metadata.grade_range
                : `${levelGrades.length} khối lớp`;
            const ageRange =
              typeof level.metadata?.age_range === "string"
                ? level.metadata.age_range
                : null;

            return (
              <div
                key={level.id}
                className={`flex flex-col overflow-hidden rounded-3xl border bg-surface shadow-[0_12px_32px_-12px_rgba(53,111,167,0.12)] transition-shadow hover:shadow-[0_18px_38px_-12px_rgba(53,111,167,0.18)] ${palette.border}`}
              >
                {/* Level Header */}
                <div className={`relative p-5 ${palette.softBg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-surface/90 shadow-xs ${palette.border} ${palette.text}`}
                      >
                        <CatalogIcon name={level.icon} size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">
                            {level.name}
                          </h3>
                          {level.is_featured && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-accent-vanilla-foreground">
                              <Star size={11} animated={false} />
                              Nổi bật
                            </span>
                          )}
                          {!level.is_active && (
                            <span className="rounded-full bg-destructive-bg px-2 py-0.5 text-[11px] font-medium text-destructive-foreground">
                              Đã ẩn
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {gradeRange}
                          {ageRange ? ` · ${ageRange}` : ""} ·{" "}
                          <span className="font-semibold text-foreground">
                            {level.course_count ?? 0} khóa học
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditItem("levels", level)}
                      aria-label={`Chỉnh sửa cấp học ${level.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface/90 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>

                  {level.tagline && (
                    <p className="mt-3 text-xs leading-relaxed text-foreground/80">
                      {level.tagline}
                    </p>
                  )}
                </div>

                {/* Grades Stack */}
                <div className="flex-1 space-y-2.5 p-4">
                  {levelGrades.map((grade) => {
                    const mapped = gradeSubjectsMap.get(grade.id) ?? [];
                    const coveredCount = mapped.filter(
                      (m) => m.courseCount > 0,
                    ).length;
                    const ratio =
                      mapped.length > 0
                        ? Math.round((coveredCount / mapped.length) * 100)
                        : 0;
                    const isMilestone = Boolean(grade.metadata?.milestone);

                    return (
                      <div
                        key={grade.id}
                        className="group rounded-2xl border border-border/80 bg-background/50 p-3.5 transition-all hover:border-primary-pastel hover:bg-surface"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onEditItem("grades", grade)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${palette.softBg} ${palette.border} ${palette.text}`}
                            >
                              {grade.grade_number}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-semibold text-foreground group-hover:text-primary">
                                  {grade.name}
                                </span>
                                {isMilestone && (
                                  <span className="rounded-full bg-secondary-light px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                                    Chuyển cấp
                                  </span>
                                )}
                                {!grade.is_active && (
                                  <span className="rounded-full bg-destructive-bg px-1.5 py-0.5 text-[10px] text-destructive-foreground">
                                    Ẩn
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {mapped.length} môn · {grade.course_count ?? 0}{" "}
                                khóa học
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => onJumpToMatrix()}
                            title="Mở trên Ma trận Lớp × Môn"
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary opacity-80 transition-opacity hover:bg-primary-light hover:opacity-100"
                          >
                            <Grid3x3 size={13} animated={false} />
                            <span>{ratio}%</span>
                          </button>
                        </div>

                        {/* Subject Pills Preview */}
                        {mapped.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {mapped.slice(0, 5).map(({ subject, courseCount }) => (
                              <span
                                key={subject.id}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
                                  courseCount > 0
                                    ? "border-border/80 bg-surface text-foreground"
                                    : "border-accent-vanilla-border bg-accent-vanilla/70 text-accent-vanilla-foreground"
                                }`}
                              >
                                <CatalogIcon
                                  name={subject.icon}
                                  size={11}
                                  animated={false}
                                />
                                <span className="max-w-[96px] truncate">
                                  {subject.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {courseCount}
                                </span>
                              </span>
                            ))}
                            {mapped.length > 5 && (
                              <span className="inline-flex items-center rounded-lg bg-primary-light/70 px-2 py-0.5 text-[11px] font-medium text-primary">
                                +{mapped.length - 5} môn
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      onCreateItem("grades", { education_level_id: level.id })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary-light/40 hover:text-primary"
                  >
                    <Plus size={14} animated={false} />
                    Thêm khối lớp vào {level.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Split: Top Subjects Distribution + Content Gap Radar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top Subjects Bar Distribution */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-12px_rgba(53,111,167,0.10)] lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <TrendingUp size={18} className="text-primary" />
                Phân bổ Khóa học theo Môn học
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Top 8 môn có mật độ khóa học cao nhất trong hệ thống
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onJumpToMatrix()}
            >
              Xem ma trận
              <ChevronRight size={14} />
            </Button>
          </div>

          <div className="mt-5 space-y-3.5">
            {topSubjects.map((subject) => {
              const palette = getPalette(subject.color_token);
              const count = subject.course_count ?? 0;
              const widthPct = Math.max(
                6,
                Math.round((count / maxSubjectCourses) * 100),
              );
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => onEditItem("subjects", subject)}
                  className="group block w-full text-left"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-medium text-foreground group-hover:text-primary">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border ${palette.softBg} ${palette.border} ${palette.text}`}
                      >
                        <CatalogIcon name={subject.icon} size={14} />
                      </span>
                      <span>{subject.name}</span>
                      <span className="text-xs text-muted-foreground">
                        · {subject.grade_count ?? 0} lớp
                      </span>
                    </span>
                    <span className="font-semibold text-foreground">
                      {count} khóa
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${palette.swatch}`}
                      style={{ width: `${widthPct}%`, opacity: 0.85 }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Content Gap Radar & Taxonomy Health */}
        <section className="flex flex-col rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-12px_rgba(53,111,167,0.10)] lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Radar Khoảng trống &amp; Sức khỏe
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Phát hiện cặp Lớp × Môn chưa có khóa học hoặc khóa chưa gán phân loại
              </p>
            </div>
          </div>

          {/* Unclassified Courses Alert */}
          {overview.health.unclassified_courses > 0 ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-bg p-3.5 text-warning-foreground">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">
                    {overview.health.unclassified_courses} khóa học
                  </span>{" "}
                  chưa có đầy đủ môn học hoặc khối lớp.
                </div>
              </div>
              <Link
                href="/admin/catalog/courses"
                className="shrink-0 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Gán ngay
              </Link>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-success-border bg-success-bg p-3.5 text-xs font-medium text-success-foreground">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>100% khóa học trong hệ thống đã được phân loại đầy đủ.</span>
            </div>
          )}

          {/* Content Gaps List */}
          <div className="mt-5 flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ô Lớp × Môn trống ({filteredGaps.length})
              </span>
              {overview.health.content_gaps_count > 0 && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setGapLevelFilter("all")}
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                      gapLevelFilter === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tất cả
                  </button>
                  {overview.levels.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setGapLevelFilter(lvl.id)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                        gapLevelFilter === lvl.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lvl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredGaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-success-border/70 bg-success-bg/50 p-6 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-success-foreground shadow-xs">
                  <CheckCircle2 size={22} />
                </div>
                <p className="mt-3 text-sm font-semibold text-success-foreground">
                  Phủ sóng ma trận 100%
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Tất cả {overview.health.matrix_total_links} liên kết Khối lớp × Môn học đang hoạt động đều đã có khóa học.
                </p>
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {filteredGaps.map((gap) => (
                  <div
                    key={`${gap.grade_id}-${gap.subject_id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-accent-vanilla-border bg-accent-vanilla/45 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-surface px-1.5 py-0.5 font-semibold text-foreground">
                        {gap.grade_name}
                      </span>
                      <span className="font-medium text-foreground">
                        {gap.subject_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-accent-vanilla-foreground">
                      0 khóa học
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
