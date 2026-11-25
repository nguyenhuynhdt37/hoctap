"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Coins, Percent, RefreshCw, Tag } from "pulsoicon-react";
import { Button, Input } from "@/components/ui";
import {
  coinToVnd,
  DEFAULT_COIN_VND_RATE,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type { Category } from "@/types/admin/category";
import type { DiscountCourse, DiscountFormData } from "@/types/admin/discount";
import {
  VoucherTicketPreview,
  generatePromoCode,
} from "../discount-visuals";
import { CategorySelector } from "./category-selector";
import { CourseSelector } from "./course-selector";
import { WeakCoursesList } from "./weak-courses-list";

const datetimeLocalToISO = (datetimeLocal: string): string => {
  if (!datetimeLocal) return "";
  try {
    const date = new Date(datetimeLocal);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
};

const toDatetimeLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
};

export default function CreateDiscount() {
  const router = useRouter();
  const [selectedCourses, setSelectedCourses] = useState<DiscountCourse[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<DiscountFormData>({
    name: "",
    description: "",
    discount_code: "",
    is_hidden: false,
    applies_to: "global",
    discount_type: "percent",
    percent_value: 20,
    fixed_value: null,
    usage_limit: null,
    per_user_limit: 1,
    start_at: "",
    end_at: "",
    auto_targets_weak_courses: false,
    targets: [],
  });

  const applyDatePreset = (days: number) => {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    setFormData((prev) => ({
      ...prev,
      start_at: toDatetimeLocal(now),
      end_at: toDatetimeLocal(end),
    }));
  };

  const handleSelectCourse = (course: DiscountCourse) => {
    setSelectedCourses((prev) => [...prev, course]);
    setFormData((prev) => ({
      ...prev,
      targets: [...prev.targets, { course_id: course.id }],
    }));
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== courseId));
    setFormData((prev) => ({
      ...prev,
      targets: prev.targets.filter((t) => t.course_id !== courseId),
    }));
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategories((prev) => [...prev, category]);
    setFormData((prev) => ({
      ...prev,
      targets: [...prev.targets, { category_id: category.id }],
    }));
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setFormData((prev) => ({
      ...prev,
      targets: prev.targets.filter((t) => t.category_id !== categoryId),
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Vui lòng nhập tên chiến dịch giảm giá";
    if (!formData.discount_code.trim()) return "Vui lòng nhập mã voucher";
    if (formData.discount_type === "percent" && !formData.percent_value) {
      return "Vui lòng nhập phần trăm giảm giá";
    }
    if (formData.discount_type === "fixed" && !formData.fixed_value) {
      return "Vui lòng nhập số Coin giảm giá";
    }
    if (!formData.start_at) return "Vui lòng chọn thời gian bắt đầu";
    if (!formData.end_at) return "Vui lòng chọn thời gian kết thúc";
    if (new Date(formData.start_at) >= new Date(formData.end_at)) {
      return "Thời gian kết thúc phải sau thời gian bắt đầu";
    }
    if (
      formData.applies_to === "course" &&
      !formData.auto_targets_weak_courses &&
      formData.targets.length === 0
    ) {
      return "Vui lòng chọn ít nhất 1 khóa học hoặc bật tự động nhắm khóa yếu";
    }
    if (formData.applies_to === "category" && formData.targets.length === 0) {
      return "Vui lòng chọn ít nhất 1 danh mục";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      showToast.error(err);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        discount_code: formData.discount_code.trim().toUpperCase(),
        is_hidden: formData.is_hidden,
        applies_to: formData.applies_to,
        discount_type: formData.discount_type,
        percent_value:
          formData.discount_type === "percent" ? formData.percent_value : null,
        fixed_value:
          formData.discount_type === "fixed" ? formData.fixed_value : null,
        usage_limit: formData.usage_limit,
        per_user_limit: formData.per_user_limit,
        start_at: datetimeLocalToISO(formData.start_at),
        end_at: datetimeLocalToISO(formData.end_at),
        auto_targets_weak_courses: formData.auto_targets_weak_courses,
        targets:
          formData.applies_to === "global" || formData.auto_targets_weak_courses
            ? []
            : formData.targets,
      };
      await api.post("/admin/discounts", payload);
      showToast.success("Đã tạo mã giảm giá thành công!");
      router.push("/admin/discounts");
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể tạo mã giảm giá.";
      showToast.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/discounts"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
          >
            <ArrowLeft size={13} />
            Quay lại danh sách
          </Link>
          <h1 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Tạo Chiến dịch Mã Giảm Giá
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Thiết lập mức ưu đãi, phạm vi áp dụng và xem trước vé khuyến mãi theo thời gian thực.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        {/* Left Form Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Basic Info */}
          <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Tag size={17} className="text-primary" />
              Thông tin Chiến dịch
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Tên chiến dịch"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="VD: Ưu đãi khai giảng tháng 9"
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Mã Voucher (Code)"
                    required
                    value={formData.discount_code}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        discount_code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="VD: MAYMAY20"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      discount_code: generatePromoCode("MAYMAY"),
                    }))
                  }
                >
                  <RefreshCw size={14} />
                  Sinh mã
                </Button>
              </div>
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Mô tả ngắn</span>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Ghi chú điều kiện áp dụng hoặc mục tiêu chiến dịch..."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={formData.is_hidden}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, is_hidden: e.target.checked }))
                }
              />
              Ẩn khỏi danh sách công khai (chỉ dùng khi học viên nhập đúng mã)
            </label>
          </section>

          {/* Value & Limits */}
          <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Coins size={17} className="text-primary" />
              Mức Ưu đãi &amp; Giới hạn
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    discount_type: "percent",
                    fixed_value: null,
                    percent_value: p.percent_value ?? 20,
                  }))
                }
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  formData.discount_type === "percent"
                    ? "border-primary bg-primary-light/70 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel"
                }`}
              >
                <Percent size={20} />
                <div>
                  <p className="text-sm font-bold">Giảm theo %</p>
                  <p className="text-xs opacity-80">VD: Giảm 15%, 20%, 50%</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    discount_type: "fixed",
                    percent_value: null,
                    fixed_value: p.fixed_value ?? coinToVnd(50, DEFAULT_COIN_VND_RATE),
                  }))
                }
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  formData.discount_type === "fixed"
                    ? "border-primary bg-primary-light/70 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel"
                }`}
              >
                <Coins size={20} />
                <div>
                  <p className="text-sm font-bold">Giảm Coin cố định</p>
                  <p className="text-xs opacity-80">
                    1 Coin = {DEFAULT_COIN_VND_RATE.toLocaleString("vi-VN")}đ
                  </p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {formData.discount_type === "percent" ? (
                <Input
                  label="Phần trăm giảm (%)"
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={
                    formData.percent_value === null
                      ? ""
                      : String(formData.percent_value)
                  }
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      percent_value:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              ) : (
                <Input
                  label="Số Coin giảm"
                  type="number"
                  min={1}
                  required
                  value={
                    formData.fixed_value === null
                      ? ""
                      : String(vndToCoin(formData.fixed_value))
                  }
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      fixed_value:
                        e.target.value === ""
                          ? null
                          : coinToVnd(Number(e.target.value), DEFAULT_COIN_VND_RATE),
                    }))
                  }
                />
              )}

              <Input
                label="Tổng lượt dùng (trống = ∞)"
                type="number"
                min={1}
                value={
                  formData.usage_limit === null
                    ? ""
                    : String(formData.usage_limit)
                }
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    usage_limit:
                      e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />

              <Input
                label="Giới hạn mỗi học viên"
                type="number"
                min={1}
                required
                value={String(formData.per_user_limit)}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    per_user_limit: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
            </div>
          </section>

          {/* Schedule */}
          <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Lịch chạy Chiến dịch
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => applyDatePreset(d)}
                    className="rounded-xl border border-primary-pastel bg-primary-light/60 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Chạy ngay +{d} ngày
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Bắt đầu từ"
                type="datetime-local"
                required
                value={formData.start_at}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, start_at: e.target.value }))
                }
              />
              <Input
                label="Kết thúc lúc"
                type="datetime-local"
                required
                value={formData.end_at}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, end_at: e.target.value }))
                }
              />
            </div>
          </section>

          {/* Scope Targets */}
          <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="text-base font-semibold text-foreground">
              Phạm vi Áp dụng
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(
                [
                  ["global", "Toàn hệ thống", "Áp dụng mọi khóa học"],
                  ["course", "Khóa học chỉ định", "Chọn khóa cụ thể / khóa yếu"],
                  ["category", "Theo danh mục", "Áp dụng theo nhóm ngành"],
                ] as const
              ).map(([key, title, desc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedCourses([]);
                    setSelectedCategories([]);
                    setFormData((p) => ({
                      ...p,
                      applies_to: key,
                      auto_targets_weak_courses: false,
                      targets: [],
                    }));
                  }}
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    formData.applies_to === key
                      ? "border-primary bg-primary-light/70 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary-pastel"
                  }`}
                >
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>

            {formData.applies_to === "course" && (
              <div className="space-y-4 pt-2">
                <label className="inline-flex items-center gap-2 rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/45 px-4 py-3 text-xs font-semibold text-accent-vanilla-foreground">
                  <input
                    type="checkbox"
                    checked={formData.auto_targets_weak_courses}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        auto_targets_weak_courses: e.target.checked,
                      }))
                    }
                  />
                  Tự động nhắm các khóa học cần thúc đẩy doanh số (Weak Courses)
                </label>

                {formData.auto_targets_weak_courses ? (
                  <WeakCoursesList isEnabled={formData.auto_targets_weak_courses} />
                ) : (
                  <CourseSelector
                    selectedCourses={selectedCourses}
                    onSelect={handleSelectCourse}
                    onRemove={handleRemoveCourse}
                  />
                )}
              </div>
            )}

            {formData.applies_to === "category" && (
              <div className="pt-2">
                <CategorySelector
                  selectedCategories={selectedCategories}
                  onSelect={handleSelectCategory}
                  onRemove={handleRemoveCategory}
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Sticky Live Preview */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-3xl border border-primary-pastel/70 bg-primary-light/35 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                Xem trước Vé Voucher trực tiếp
              </p>
              <VoucherTicketPreview
                name={formData.name}
                code={formData.discount_code}
                discountType={formData.discount_type}
                percentValue={formData.percent_value}
                fixedValue={formData.fixed_value}
                appliesTo={formData.applies_to}
                isActive={true}
                isHidden={formData.is_hidden}
                startAt={formData.start_at || null}
                endAt={formData.end_at || null}
                usageCount={0}
                usageLimit={formData.usage_limit}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang khởi tạo..." : "Phát hành Mã Giảm Giá"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/admin/discounts")}
              >
                Hủy bỏ
              </Button>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
