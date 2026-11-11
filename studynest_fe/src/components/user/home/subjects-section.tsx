"use client";

import { Badge, Button, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { CatalogOptions, TaxonomyItem } from "@/types/catalog";
import Link from "next/link";
import { useMemo } from "react";
import { HiArrowRight, HiBookOpen, HiCalculator, HiChip, HiGlobeAlt } from "react-icons/hi";
import useSWR from "swr";
import type { SchoolLevelId } from "./grade-levels-section";

const fetcher = (url: string) => api.get<CatalogOptions>(url).then((res) => res.data);
const levelCode: Record<Exclude<SchoolLevelId, "all">, string> = {
  primary: "tieu-hoc",
  secondary: "thcs",
  highschool: "thpt",
};
const tabs: { id: SchoolLevelId; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "primary", label: "Tiểu học" },
  { id: "secondary", label: "THCS" },
  { id: "highschool", label: "THPT" },
];

function gradesFor(subject: TaxonomyItem, options: CatalogOptions, level: SchoolLevelId) {
  const linked = new Set(
    options.grade_subjects
      .filter((entry) => entry.subject_id === subject.id)
      .map((entry) => entry.grade_id)
  );
  const levelId = level === "all"
    ? null
    : options.levels.find((item) => item.code === levelCode[level])?.id;
  return options.grades
    .filter((grade) => grade.is_active && linked.has(grade.id) && (!levelId || grade.education_level_id === levelId))
    .sort((a, b) => (a.grade_number || 0) - (b.grade_number || 0));
}

interface SubjectsSectionProps {
  selectedLevel: SchoolLevelId;
  onChangeLevel: (level: SchoolLevelId) => void;
  onExploreCourses: () => void;
}

export default function SubjectsSection({ selectedLevel, onChangeLevel, onExploreCourses }: SubjectsSectionProps) {
  const { data, error, isLoading, mutate } = useSWR<CatalogOptions>("/catalog/filters", fetcher);
  const subjects = useMemo(() => {
    if (!data) return [];
    return data.subjects
      .filter((subject) => subject.is_active)
      .map((subject) => ({ subject, grades: gradesFor(subject, data, selectedLevel) }))
      .filter(({ grades }) => grades.length > 0)
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name, "vi"));
  }, [data, selectedLevel]);

  return (
    <section id="subjects-section" className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Badge variant="lavender" size="md">Danh mục theo chương trình</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">
              Chọn môn học theo cấp lớp
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Tìm môn học phù hợp với lớp và mục tiêu của bạn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc môn học theo cấp học">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selectedLevel === tab.id}
                onClick={() => onChangeLevel(tab.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${selectedLevel === tab.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-primary-light"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Đang tải môn học">
            {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-2xl" />)}
          </div>
        ) : error ? (
          <Card className="rounded-2xl bg-surface p-8 text-center">
            <p className="text-foreground">Chưa tải được danh mục môn học.</p>
            <Button variant="outline" className="mt-4" onClick={() => mutate()}>Thử lại</Button>
          </Card>
        ) : subjects.length === 0 ? (
          <Card className="rounded-2xl bg-surface p-8 text-center text-muted-foreground">
            Chưa có môn học được cấu hình cho cấp học này.
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map(({ subject, grades }, index) => {
              const Icon = subject.code === "toan" ? HiCalculator : subject.code.includes("lich-su") || subject.code.includes("dia-ly") ? HiGlobeAlt : subject.code.includes("tin-hoc") ? HiChip : HiBookOpen;
              const numbers = grades.map((grade) => grade.grade_number).filter((n): n is number => typeof n === "number");
              const gradeLabel = numbers.length === 1 ? `Lớp ${numbers[0]}` : `Lớp ${numbers[0]}–${numbers[numbers.length - 1]}`;
              return (
                <Link
                  key={subject.id}
                  href={`/courses?subject=${encodeURIComponent(subject.slug || subject.code)}`}
                  className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Card className="flex h-full flex-col rounded-2xl border-border bg-surface p-5 transition-colors group-hover:border-primary-pastel">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${index % 3 === 0 ? "bg-primary-light text-primary" : index % 3 === 1 ? "bg-secondary-light text-secondary-foreground" : "bg-accent text-accent-foreground"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <Badge variant="outline" size="sm">{gradeLabel}</Badge>
                    </div>
                    <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary">{subject.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {subject.description || `Có trong danh mục học tập của ${numbers.length} lớp.`}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Xem khóa học <HiArrowRight className="h-4 w-4" />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <Button variant="outline" onClick={onExploreCourses}>Xem khóa học chính thức ↓</Button>
        </div>
      </div>
    </section>
  );
}
