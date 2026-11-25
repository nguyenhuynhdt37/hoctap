"use client";

import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  CatalogOptions,
  CourseTaxonomyInput,
  TaxonomyItem,
} from "@/types/catalog";
import { BookOpen, Check, GraduationCap } from "pulsoicon-react";
import { useState } from "react";
import useSWR from "swr";

export const selectClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

export default function CourseTaxonomyForm({
  value,
  onChange,
}: {
  value: CourseTaxonomyInput;
  onChange: (value: CourseTaxonomyInput) => void;
}) {
  const { data, error, mutate } = useSWR<CatalogOptions>(
    "/catalog/filters",
    fetcher,
    { revalidateOnFocus: false }
  );
  const [level, setLevel] = useState("");

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
      >
        Không tải được phân loại giáo dục.{" "}
        <Button type="button" variant="outline" size="sm" onClick={() => mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        role="status"
        className="animate-pulse rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground"
      >
        Đang tải phân loại giáo dục…
      </div>
    );
  }

  const subjects = data.subjects.filter((subject) =>
    value.grade_ids.every((grade) =>
      data.grade_subjects.some(
        (link) => link.grade_id === grade && link.subject_id === subject.id
      )
    )
  );

  const renderMultiPills = (
    label: string,
    hint: string,
    items: TaxonomyItem[],
    field: "grade_ids" | "learning_goal_ids" | "exam_ids"
  ) => {
    const selectedCount = value[field].length;
    return (
      <fieldset className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-semibold text-foreground">
            {label}
          </legend>
          <span className="text-xs text-muted-foreground">
            {selectedCount > 0 ? `Đã chọn ${selectedCount}` : hint}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const checked = value[field].includes(item.id);
            return (
              <label
                key={item.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  checked
                    ? "border-primary bg-primary-light text-primary shadow-xs"
                    : "border-border bg-background/60 text-foreground hover:border-primary-pastel hover:bg-primary-light/40"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={(event) => {
                    const ids = event.target.checked
                      ? [...value[field], item.id]
                      : value[field].filter((id) => id !== item.id);
                    onChange({ ...value, [field]: ids });
                  }}
                />
                {checked && <Check animated={false} className="h-3.5 w-3.5" />}
                <span>{item.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  };

  return (
    <section className="space-y-5 rounded-2xl border border-primary-pastel/80 bg-surface p-6 text-foreground shadow-xs">
      <div className="flex items-start gap-3 border-b border-border/70 pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">
            Phân loại chương trình học
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Chọn khối lớp, môn học chính, định hướng và kỳ thi để học sinh lọc
            đúng khóa học.
          </p>
        </div>
      </div>

      {/* Cấp học & Môn học chính đặt cạnh nhau 2 cột gọn gàng */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-foreground">
            Lọc nhanh theo cấp học
          </span>
          <select
            className={selectClass}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Tất cả cấp học</option>
            {data.levels.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>Môn học chính</span>
          </span>
          <select
            className={selectClass}
            value={value.subject_id ?? ""}
            onChange={(e) =>
              onChange({ ...value, subject_id: e.target.value || null })
            }
          >
            <option value="">-- Chọn môn học chính --</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
            {value.subject_id &&
              !subjects.some((x) => x.id === value.subject_id) && (
                <option value={value.subject_id}>
                  Môn đã chọn không phù hợp lớp — hãy chọn lại
                </option>
              )}
          </select>
        </label>
      </div>

      {renderMultiPills(
        "Khối lớp",
        "Có thể chọn nhiều khối lớp",
        data.grades.filter((x) => !level || x.education_level_id === level),
        "grade_ids"
      )}

      {renderMultiPills(
        "Định hướng học tập",
        "Tùy chọn theo nhu cầu học sinh",
        data.learning_goals,
        "learning_goal_ids"
      )}

      {renderMultiPills(
        "Kỳ thi liên quan",
        "Tùy chọn",
        data.exams,
        "exam_ids"
      )}
    </section>
  );
}
