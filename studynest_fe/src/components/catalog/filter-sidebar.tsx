"use client";

import { useId, useMemo } from "react";
import { Filter, RotateCcw, Star } from "pulsoicon-react";
import { Badge, Button, Modal } from "@/components/ui";
import type { BrowseFilters } from "@/types/catalog";

export interface FilterValues {
  level: string;
  grade: string;
  subject: string;
  goal: string;
  exam: string;
  delivery_type: string;
  rating: string;
  currency: string;
  min_price: string;
  max_price: string;
}

interface FilterSidebarProps {
  options?: BrowseFilters | null;
  values: FilterValues;
  onFilterChange: (key: string, value: string) => void;
  onFiltersChange: (patch: Record<string, string>) => void;
  onResetFilters: () => void;
  activeCount: number;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function FilterSidebar({
  options,
  values,
  onFilterChange,
  onFiltersChange,
  onResetFilters,
  activeCount,
  isMobileDrawer = false,
  onCloseMobileDrawer = () => {},
}: FilterSidebarProps) {
  const levelSelectId = useId();
  const goalSelectId = useId();
  const examSelectId = useId();

  // Lọc danh sách khối lớp: phải giao thoa giữa Cấp học (Level) và Môn học (Subject)
  const availableGrades = useMemo(() => {
    if (!options?.grades) return [];
    let list = options.grades;

    // 1. Giao với level (nếu đang chọn level)
    if (values.level && options.levels) {
      const selectedLevel = options.levels.find(
        (l) => l.code === values.level || l.id === values.level
      );
      if (selectedLevel) {
        list = list.filter((g) => g.education_level_id === selectedLevel.id);
      }
    }

    // 2. Giao với subject (nếu đang chọn subject qua grade_subjects)
    if (values.subject && options.subjects && options.grade_subjects) {
      const currentSubject = options.subjects.find(
        (s) => s.slug === values.subject || s.code === values.subject
      );
      if (currentSubject) {
        list = list.filter((grade) =>
          options.grade_subjects.some(
            (link) => link.grade_id === grade.id && link.subject_id === currentSubject.id
          )
        );
      }
    }

    return list;
  }, [options, values.level, values.subject]);

  const pricePresets = useMemo(() => {
    return [
      { label: "Tất cả mức giá", min: "", max: "" },
      { label: "Miễn phí", min: "0", max: "0" },
      { label: "Dưới 30 Coin", min: "", max: "300000" },
      { label: "30 – 70 Coin", min: "300000", max: "700000" },
      { label: "Trên 70 Coin", min: "700000", max: "" },
    ];
  }, []);

  const selectStyle =
    "h-10 w-full cursor-pointer rounded-xl border border-input bg-background/60 px-3 text-xs font-medium text-foreground transition-colors hover:border-primary-pastel hover:bg-surface focus:border-ring focus:bg-surface focus:outline-none focus:ring-2 focus:ring-ring/15";

  const content = (
    <div className="space-y-4">
      {/* Header của Sidebar (chỉ hiện trên desktop) */}
      {!isMobileDrawer && (
        <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Filter className="size-3.5" aria-hidden="true" />
            </span>
            <h2 className="text-sm font-semibold text-foreground">Bộ lọc</h2>
            {activeCount > 0 && (
              <Badge variant="primary" className="px-2 py-0.5 text-[11px]">
                {activeCount}
              </Badge>
            )}
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-light/60 hover:text-primary cursor-pointer"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      )}

      {/* 0. Lọc Cấp Học (Education Level) */}
      {options?.levels && options.levels.length > 0 && (
        <div className="space-y-2">
          <label
            htmlFor={levelSelectId}
            className="block text-[13px] font-semibold text-foreground"
          >
            Cấp học
          </label>
          <select
            id={levelSelectId}
            value={values.level}
            onChange={(e) => onFilterChange("level", e.target.value)}
            className={selectStyle}
          >
            <option value="">Tất cả cấp học</option>
            {options.levels.map((lvl) => (
              <option key={lvl.id} value={lvl.code}>
                {lvl.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 1. Lọc Khối Lớp (phù hợp với cả Cấp học và Môn học) */}
      <div className="space-y-2.5 border-t border-border/70 pt-4">
        <span className="block text-[13px] font-semibold text-foreground">
          Khối lớp
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            aria-pressed={!values.grade}
            onClick={() => onFilterChange("grade", "")}
            className={`cursor-pointer rounded-xl px-2.5 py-1.5 text-center text-xs font-medium transition-all ${
              !values.grade
                ? "bg-primary font-semibold text-primary-foreground shadow-2xs"
                : "border border-border bg-background/60 text-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
            }`}
          >
            Tất cả
          </button>
          {availableGrades.map((g) => {
            const gradeVal = String(g.grade_number);
            const isSelected = values.grade === gradeVal;
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onFilterChange("grade", isSelected ? "" : gradeVal)}
                className={`cursor-pointer truncate rounded-xl px-2.5 py-1.5 text-center text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground shadow-2xs"
                    : "border border-border bg-background/60 text-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Khoảng Giá (Cập nhật min_price và max_price trong một patch router duy nhất) */}
      <div className="space-y-2.5 border-t border-border/70 pt-4">
        <span className="block text-[13px] font-semibold text-foreground">
          Khoảng học phí
        </span>
        <div className="flex flex-col gap-1.5">
          {pricePresets.map((preset) => {
            const isSelected =
              values.min_price === preset.min && values.max_price === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  if (isSelected) {
                    onFiltersChange({ min_price: "", max_price: "" });
                  } else {
                    onFiltersChange({ min_price: preset.min, max_price: preset.max });
                  }
                }}
                className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${
                  isSelected
                    ? "border border-primary-pastel bg-primary-light/85 font-semibold text-primary"
                    : "border border-border/80 bg-background/50 text-foreground hover:border-primary-pastel/70 hover:bg-primary-light/40"
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && (
                  <span aria-hidden="true" className="font-bold text-primary">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Đánh Giá Tối Thiểu (Star Rating) */}
      <div className="space-y-2.5 border-t border-border/70 pt-4">
        <span className="block text-[13px] font-semibold text-foreground">
          Đánh giá học viên
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={!values.rating}
            onClick={() => onFilterChange("rating", "")}
            className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              !values.rating
                ? "bg-primary font-semibold text-primary-foreground shadow-2xs"
                : "border border-border bg-background/60 text-foreground hover:border-primary-pastel hover:bg-primary-light/60"
            }`}
          >
            Tất cả
          </button>
          {[4, 3].map((star) => {
            const isSelected = values.rating === String(star);
            return (
              <button
                key={star}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onFilterChange("rating", isSelected ? "" : String(star))}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground shadow-2xs"
                    : "border border-border bg-background/60 text-foreground hover:border-primary-pastel hover:bg-primary-light/60"
                }`}
              >
                <Star
                  animated={false}
                  aria-hidden="true"
                  className="size-3.5 fill-warning text-warning"
                />
                <span>Từ {star}★</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Mục Tiêu Học Tập */}
      {options?.learning_goals && options.learning_goals.length > 0 && (
        <div className="space-y-2 border-t border-border/70 pt-4">
          <label
            htmlFor={goalSelectId}
            className="block text-[13px] font-semibold text-foreground"
          >
            Mục tiêu học tập
          </label>
          <select
            id={goalSelectId}
            value={values.goal}
            onChange={(e) => onFilterChange("goal", e.target.value)}
            className={selectStyle}
          >
            <option value="">Tất cả mục tiêu</option>
            {options.learning_goals.map((g) => (
              <option key={g.id} value={g.code}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 5. Kỳ Thi Mục Tiêu */}
      {options?.exams && options.exams.length > 0 && (
        <div className="space-y-2 border-t border-border/70 pt-4">
          <label
            htmlFor={examSelectId}
            className="block text-[13px] font-semibold text-foreground"
          >
            Kỳ thi
          </label>
          <select
            id={examSelectId}
            value={values.exam}
            onChange={(e) => onFilterChange("exam", e.target.value)}
            className={selectStyle}
          >
            <option value="">Tất cả kỳ thi</option>
            {options.exams.map((exam) => (
              <option key={exam.id} value={exam.code}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  // Render dạng Drawer trên Mobile sử dụng shared Modal chuẩn WCAG / Focus trap
  if (isMobileDrawer) {
    return (
      <Modal
        open={true}
        onClose={onCloseMobileDrawer}
        title="Bộ lọc khóa học"
        description="Lựa chọn các tiêu chí để tìm khóa học phù hợp"
        size="md"
        footer={
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="flex-1"
            >
              Đặt lại
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onCloseMobileDrawer}
              className="flex-1"
            >
              Xem kết quả
            </Button>
          </div>
        }
      >
        <div className="max-h-[65vh] overflow-y-auto px-1 py-1">
          {content}
        </div>
      </Modal>
    );
  }

  // Render dạng Sticky Sidebar trên Desktop
  return (
    <aside
      aria-label="Bộ lọc tìm kiếm khóa học"
      className="sticky top-24 rounded-[24px] border border-border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)]"
    >
      {content}
    </aside>
  );
}
