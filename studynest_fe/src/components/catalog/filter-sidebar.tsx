"use client";

import { useId, useMemo } from "react";
import { Filter, RotateCcw, Star } from "lucide-react";
import { Badge, Button, Modal } from "@/components/ui";
import type { BrowseFilters } from "@/types/catalog";

export interface FilterValues {
  level: string;
  grade: string;
  subject: string;
  goal: string;
  exam: string;
  provider: string;
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
  const providerSelectId = useId();

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

  const currency = values.currency === "USD" ? "USD" : "VND";

  const pricePresets = useMemo(() => {
    if (currency === "USD") {
      return [
        { label: "Tất cả mức giá", min: "", max: "" },
        { label: "Miễn phí", min: "0", max: "0" },
        { label: "Dưới $25", min: "", max: "25" },
        { label: "$25 – $50", min: "25", max: "50" },
        { label: "Trên $50", min: "50", max: "" },
      ];
    }
    return [
      { label: "Tất cả mức giá", min: "", max: "" },
      { label: "Miễn phí", min: "0", max: "0" },
      { label: "Dưới 300.000 ₫", min: "", max: "300000" },
      { label: "300.000 ₫ – 700.000 ₫", min: "300000", max: "700000" },
      { label: "Trên 700.000 ₫", min: "700000", max: "" },
    ];
  }, [currency]);

  const selectStyle =
    "w-full h-10 px-3 rounded-xl border border-input bg-surface text-xs font-medium text-foreground transition-colors hover:border-primary-pastel focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 cursor-pointer";

  const content = (
    <div className="space-y-6">
      {/* Header của Sidebar (chỉ hiện trên desktop) */}
      {!isMobileDrawer && (
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Bộ lọc nâng cao</h2>
            {activeCount > 0 && (
              <Badge variant="primary" className="text-[11px] px-2 py-0.5">
                {activeCount}
              </Badge>
            )}
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      )}

      {/* 0. Lọc Cấp Học (Education Level) */}
      {options?.levels && options.levels.length > 0 && (
        <div className="space-y-1.5">
          <label
            htmlFor={levelSelectId}
            className="block text-xs font-semibold text-foreground uppercase tracking-wider"
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
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
          Khối lớp
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            aria-pressed={!values.grade}
            onClick={() => onFilterChange("grade", "")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
              !values.grade
                ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                : "bg-surface border border-border text-foreground hover:bg-primary-light/60 hover:text-primary"
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-center truncate ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "bg-surface border border-border text-foreground hover:bg-primary-light/60 hover:text-primary"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Khoảng Giá (Cập nhật min_price và max_price trong một patch router duy nhất) */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
          Khoảng học phí
        </label>
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
                className={`px-3 py-2 rounded-xl text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "bg-primary-light text-primary border border-primary-pastel font-semibold"
                    : "bg-surface border border-border/80 text-foreground hover:bg-primary-light/40 hover:border-primary-pastel/60"
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && <span className="text-primary font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Đánh Giá Tối Thiểu (Star Rating) */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
          Đánh giá học viên
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={!values.rating}
            onClick={() => onFilterChange("rating", "")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !values.rating
                ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                : "bg-surface border border-border text-foreground hover:bg-primary-light/60"
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
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "bg-surface border border-border text-foreground hover:bg-primary-light/60"
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                <span>Từ {star}★</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Mục Tiêu Học Tập */}
      {options?.learning_goals && options.learning_goals.length > 0 && (
        <div className="space-y-1.5">
          <label
            htmlFor={goalSelectId}
            className="block text-xs font-semibold text-foreground uppercase tracking-wider"
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
        <div className="space-y-1.5">
          <label
            htmlFor={examSelectId}
            className="block text-xs font-semibold text-foreground uppercase tracking-wider"
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

      {/* 6. Đơn Vị Đào Tạo */}
      {options?.providers && options.providers.length > 0 && (
        <div className="space-y-1.5">
          <label
            htmlFor={providerSelectId}
            className="block text-xs font-semibold text-foreground uppercase tracking-wider"
          >
            Đơn vị đào tạo
          </label>
          <select
            id={providerSelectId}
            value={values.provider}
            onChange={(e) => onFilterChange("provider", e.target.value)}
            className={selectStyle}
          >
            <option value="">Tất cả đơn vị</option>
            {options.providers.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
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
        title="Bộ lọc nâng cao"
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
      className="rounded-[24px] border border-border/80 bg-surface/90 p-5 shadow-xs sticky top-24 backdrop-blur-md"
    >
      {content}
    </aside>
  );
}
