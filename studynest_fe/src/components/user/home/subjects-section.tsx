"use client";

import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import type { CatalogOptionsWithCourseCounts } from "@/types/catalog";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, BookOpen, ChevronDown, LayoutGrid, SlidersHorizontal } from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import type { SchoolLevelId } from "./grade-levels-section";
import { CloudBlob, GlassCard, IconBubble, Pill, Reveal, SectionHeader, SectionShell } from "./landing-ui";
import { formatCount, SubjectCard } from "./subjects/subject-card";

const levels = {
  all: { label: "Tất cả cấp", code: undefined },
  primary: { label: "Tiểu học", code: "tieu-hoc" },
  secondary: { label: "THCS", code: "thcs" },
  highschool: { label: "THPT", code: "thpt" },
} satisfies Record<SchoolLevelId, { label: string; code: string | undefined }>;

const levelChoices: SchoolLevelId[] = ["all", "primary", "secondary", "highschool"];
const resultsId = "subjects-results";
const previewLimit = 5;
const grid = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:auto-rows-[minmax(9.5rem,auto)] lg:grid-cols-3";
const layoutTransition = { layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } };
const roundedButton = "rounded-full motion-reduce:transition-none motion-reduce:active:translate-y-0";
const fetcher = (url: string) => api.get<CatalogOptionsWithCourseCounts>(url).then(({ data }) => {
  // Proxy/tunnel có thể trả HTML thay vì JSON; không để dữ liệu sai dạng làm sập giao diện.
  if (!data || !Array.isArray(data.levels) || !Array.isArray(data.grades)
    || !Array.isArray(data.subjects) || !Array.isArray(data.grade_subjects)) {
    throw new Error("Dữ liệu danh mục không hợp lệ.");
  }
  return data;
});

interface SubjectsSectionProps {
  selectedLevel: SchoolLevelId;
  onChangeLevel: (level: SchoolLevelId) => void;
  onExploreCourses: () => void;
}

function initialView(level: SchoolLevelId): { level: SchoolLevelId; grade: number | null; expanded: boolean } {
  return { level, grade: null, expanded: false };
}

function SubjectsSkeleton() {
  const block = "bg-primary-light motion-reduce:animate-none";

  return (
    <div aria-hidden="true" className={grid}>
      {Array.from({ length: previewLimit + 1 }, (_, index) => (
        <GlassCard
          key={index}
          tilt={false}
          className={cn(
            "flex flex-col items-start justify-between p-5",
            index === 0
              ? "min-h-64 md:col-span-2 lg:row-span-2"
              : cn("min-h-36", index === previewLimit && "md:max-lg:col-span-2"),
          )}
        >
          <Skeleton className={cn(block, "size-10 rounded-xl", index === 0 && "size-20 self-end rounded-3xl")} />
          <div className="mt-4 w-full space-y-3">
            <Skeleton className={cn(block, "h-4 w-3/5 rounded-full")} />
            <Skeleton className={cn(block, "h-3 w-1/3 rounded-full")} />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

export default function SubjectsSection({ selectedLevel, onChangeLevel, onExploreCourses }: SubjectsSectionProps) {
  const [view, setView] = useState(() => initialView(selectedLevel));
  // The hero and the preceding section can change the level through the parent.
  const currentView = view.level === selectedLevel ? view : initialView(selectedLevel);
  if (currentView !== view) setView(currentView);

  const reducedMotion = useReducedMotion();
  const { data, error, isLoading, isValidating, mutate } = useSWR<CatalogOptionsWithCourseCounts, unknown>(
    "/catalog/filters?include_course_counts=true",
    fetcher,
    { dedupingInterval: 60_000, focusThrottleInterval: 60_000, errorRetryCount: 2 },
  );

  const { code: levelCode, label: levelLabel } = levels[selectedLevel];
  const counts = data?.course_counts;

  const grades = useMemo(() => {
    if (!data) return [];
    const levelIds = new Set(data.levels
      .filter((level) => level.is_active && (!levelCode || level.code === levelCode))
      .map((level) => level.id));
    return data.grades
      .flatMap((grade) => grade.is_active && grade.education_level_id
        && levelIds.has(grade.education_level_id) && typeof grade.grade_number === "number"
        ? [{ id: grade.id, number: grade.grade_number, name: grade.name }]
        : [])
      .sort((a, b) => a.number - b.number);
  }, [data, levelCode]);

  const selectedGrade = grades.find((grade) => grade.number === currentView.grade);
  const gradeNumber = selectedGrade?.number ?? null;

  const subjects = useMemo(() => {
    if (!data || !counts) return [];
    const gradeIds = new Set(selectedGrade ? [selectedGrade.id] : grades.map((grade) => grade.id));
    const subjectIds = new Set(data.grade_subjects
      .filter(({ grade_id }) => gradeIds.has(grade_id))
      .map(({ subject_id }) => subject_id));

    return data.subjects
      .filter((subject) => subject.is_active && subjectIds.has(subject.id))
      .map((subject) => {
        const subjectCounts = counts.by_subject[subject.id];
        const courseCount = gradeNumber !== null
          ? subjectCounts?.by_grade[String(gradeNumber)]
          : levelCode ? subjectCounts?.by_level[levelCode] : subjectCounts?.total;
        return { subject, courseCount: courseCount ?? 0 };
      })
      .sort((a, b) => b.courseCount - a.courseCount || a.subject.name.localeCompare(b.subject.name, "vi"));
  }, [data, counts, selectedGrade, gradeNumber, grades, levelCode]);

  const pending = !counts && isLoading && !error;
  const failed = !pending && !counts;
  const hasCourses = subjects.some(({ courseCount }) => courseCount > 0);
  const hasMore = subjects.length > previewLimit;
  const visibleSize = (currentView.expanded ? subjects.length : Math.min(subjects.length, previewLimit))
    + (hasMore ? 1 : 0);
  const selectGrade = (grade: number | null) => setView({ level: selectedLevel, grade, expanded: false });

  const status = pending
    ? "Đang tải danh mục môn học"
    : failed ? "Chưa tải được danh mục môn học."
      : hasCourses ? `${formatCount.format(subjects.length)} môn học` : "Chưa có khóa học phù hợp";

  function slotClass(index: number) {
    const last = index === visibleSize - 1;
    return cn(
      "min-w-0",
      index === 0 && "md:col-span-2",
      index === 0 && visibleSize > 2 && "lg:row-span-2",
      index === 0 && visibleSize === 1 && "lg:col-span-3",
      index > 0 && last && visibleSize % 2 === 0 && "md:max-lg:col-span-2",
      index > 2 && last && visibleSize % 3 === 1 && "lg:col-span-3",
      index > 2 && index === visibleSize - 2 && visibleSize % 3 === 2 && "lg:col-span-2",
    );
  }

  function renderSubject({ subject, courseCount }: (typeof subjects)[number], index: number) {
    return (
      <motion.li
        key={subject.id}
        layout={reducedMotion ? false : "position"}
        transition={layoutTransition}
        className={slotClass(index)}
      >
        <Reveal className="h-full" delay={(index % 3) * 0.08}>
          <SubjectCard
            subject={subject}
            courseCount={courseCount}
            levelCode={levelCode}
            grade={gradeNumber}
            featured={index === 0}
            tone={index % 2 === 0 ? "lavender" : "blue"}
          />
        </Reveal>
      </motion.li>
    );
  }

  return (
    <SectionShell id="subjects-section" tone="blue" label="Khám phá môn học">
      <SectionHeader
        title="Chọn môn học theo cấp lớp"
        description="Chọn lớp để xem các môn và số khóa học phù hợp với bạn."
        align="left"
        className="mb-9! md:mb-12! [&_h2]:text-balance [&_p]:text-foreground/85"
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-9 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Reveal delay={0.08} className="min-w-0">
          <GlassCard tilt={false} className="relative p-4 sm:p-5 lg:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-3xl border border-primary-pastel bg-primary-light/70" />
            <div className="flex items-center gap-2.5 text-sm font-bold text-foreground">
              <IconBubble className="h-8! w-8! rounded-xl!">
                <SlidersHorizontal aria-hidden="true" className="size-4" />
              </IconBubble>
              Lọc môn học
            </div>

            <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-1">
              <fieldset className="min-w-0">
                <legend className="mb-2.5 text-sm font-semibold text-foreground">Cấp học</legend>
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-primary-pastel/70 bg-primary-light/60 p-1">
                  {levelChoices.map((level) => {
                    const { code, label } = levels[level];
                    const active = selectedLevel === level;
                    const count = counts ? (code ? counts.by_level[code] ?? 0 : counts.total) : null;
                    return (
                      <Button
                        key={level}
                        variant={active ? "primary" : "ghost"}
                        aria-pressed={active}
                        aria-controls={resultsId}
                        onClick={() => onChangeLevel(level)}
                        className={cn(roundedButton, "h-auto min-h-14 min-w-0 px-1.5 py-2 text-sm leading-tight")}
                      >
                        <span className="flex min-w-0 flex-col items-center gap-0.5">
                          <span className="font-semibold">{label}</span>
                          <span className="text-xs leading-normal tabular-nums">
                            {count !== null ? `${formatCount.format(count)} khóa`
                              : <span aria-hidden="true" className="block h-4" />}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="min-w-0 border-t border-primary-pastel/65 pt-4 md:max-lg:border-t-0 md:max-lg:border-l md:max-lg:pt-0 md:max-lg:pl-5">
                <legend className="float-left mb-2.5 w-full text-sm font-semibold text-foreground">Lớp</legend>
                <div className="clear-both flex min-h-11 flex-wrap content-start gap-1.5">
                  <Button
                    variant={gradeNumber === null ? "pastel" : "outline"}
                    aria-pressed={gradeNumber === null}
                    aria-controls={resultsId}
                    onClick={() => selectGrade(null)}
                    className={cn(roundedButton, "h-auto min-h-11 px-3 py-2 leading-snug", gradeNumber === null && "border-primary text-info-foreground")}
                  >
                    Tất cả lớp
                  </Button>
                  {pending && Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-11 w-15 rounded-full bg-primary-light motion-reduce:animate-none" aria-hidden="true" />
                  ))}
                  {grades.map((grade) => {
                    const active = grade.number === gradeNumber;
                    return (
                      <Button
                        key={grade.id}
                        variant={active ? "pastel" : "outline"}
                        aria-pressed={active}
                        aria-controls={resultsId}
                        onClick={() => selectGrade(grade.number)}
                        className={cn(roundedButton, "h-auto min-h-11 min-w-11 px-3 py-2 text-sm leading-snug", active && "border-primary text-info-foreground")}
                      >
                        {grade.name}
                      </Button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </GlassCard>
        </Reveal>

        <div className="min-w-0">
          <div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-foreground">
              <span className="sr-only">{selectedGrade?.name ?? levelLabel}. </span>{status}
            </p>
            <Pill tone="lavender" className="shadow-sm">{selectedGrade?.name ?? levelLabel}</Pill>
          </div>

          <div id={resultsId} aria-busy={pending}>
            {pending ? <SubjectsSkeleton /> : failed || !hasCourses ? (
              <Reveal key={failed ? "error" : "empty"}>
                <GlassCard tilt={false} className="relative isolate flex min-h-64 flex-col items-start justify-center gap-4 overflow-hidden p-6 sm:p-8">
                  <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-24 -z-10 size-64 rounded-full border border-accent-border/65 bg-accent/45 sm:-right-10" />
                  <CloudBlob className="-right-20 -bottom-10 -z-10 h-32 w-72 bg-primary-light" />
                  <IconBubble tone="lavender" className="shadow-md">
                    <BookOpen aria-hidden="true" className="size-6" />
                  </IconBubble>
                  <p className="max-w-md text-sm leading-relaxed text-foreground sm:text-base">
                    {failed ? "Thử tải lại để xem các môn và số khóa học."
                      : gradeNumber !== null ? "Thử xem tất cả lớp để tìm thêm khóa học."
                        : levelCode ? "Thử xem danh mục của tất cả cấp học."
                          : "Danh mục môn học sẽ hiển thị khi có khóa học được công bố."}
                  </p>
                  <Button
                    variant="outline"
                    className={cn(roundedButton, "min-h-11")}
                    disabled={failed && isValidating}
                    onClick={failed ? () => { void mutate(); }
                      : gradeNumber !== null ? () => selectGrade(null)
                        : levelCode ? () => onChangeLevel("all") : onExploreCourses}
                  >
                    {failed ? "Thử lại" : gradeNumber !== null ? "Xem tất cả lớp"
                      : levelCode ? "Xem tất cả cấp" : "Khám phá khóa học"}
                  </Button>
                </GlassCard>
              </Reveal>
            ) : (
              <ul role="list" aria-label="Môn học" className={grid}>
                {subjects.slice(0, previewLimit).map(renderSubject)}
                {hasMore && (
                  <motion.li
                    key="more-subjects"
                    layout={reducedMotion ? false : "position"}
                    transition={layoutTransition}
                    className={slotClass(previewLimit)}
                  >
                    <Reveal className="h-full" delay={0.16}>
                      <GlassCard tilt={false} className="h-full border-dashed! border-primary-pastel! p-2">
                        <Button
                          variant="ghost"
                          aria-expanded={currentView.expanded}
                          fullWidth
                          className={cn(roundedButton, "h-full min-h-32 justify-start px-4 py-4 text-left text-info-foreground")}
                          onClick={() => setView({ ...currentView, expanded: !currentView.expanded })}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <LayoutGrid aria-hidden="true" className="size-5 shrink-0" />
                            <span className="flex min-w-0 flex-col gap-1">
                              <span className="font-semibold leading-snug">{currentView.expanded ? "Thu gọn môn học" : "Xem tất cả môn"}</span>
                              <span className="text-xs leading-snug text-foreground">
                                {currentView.expanded ? `Đang xem ${formatCount.format(subjects.length)} môn` : `Còn ${formatCount.format(subjects.length - previewLimit)} môn`}
                              </span>
                            </span>
                            <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0", currentView.expanded && "rotate-180")} />
                          </span>
                        </Button>
                      </GlassCard>
                    </Reveal>
                  </motion.li>
                )}
                {currentView.expanded && subjects.slice(previewLimit).map((subject, index) => renderSubject(subject, index + previewLimit + 1))}
              </ul>
            )}
          </div>

          <Reveal className="mt-7 flex justify-start md:justify-end">
            <Button
              variant="outline"
              onClick={onExploreCourses}
              rightIcon={<ArrowDown aria-hidden="true" className="size-4" />}
              className={cn(roundedButton, "h-auto min-h-11 max-w-full py-2 text-info-foreground [&>span]:leading-snug")}
            >
              Xem khóa học chính thức
            </Button>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
