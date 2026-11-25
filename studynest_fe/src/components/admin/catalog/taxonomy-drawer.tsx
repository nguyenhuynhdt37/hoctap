"use client";

import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Bot, Check, Star, X } from "pulsoicon-react";
import { Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  CatalogAiEnrichResult,
  CatalogColorToken,
  CatalogTaxonomyKind,
  TaxonomyItem,
} from "@/types/catalog";
import {
  CATALOG_ICON_LIST,
  CLOUDY_PALETTE_LIST,
  CatalogIcon,
  EXAM_TYPE_LABELS,
  TAXONOMY_KIND_META,
  getPalette,
  toVietnameseSlug,
} from "./catalog-visuals";

interface TaxonomyDrawerProps {
  open: boolean;
  kind: CatalogTaxonomyKind;
  initial: Partial<TaxonomyItem> | null;
  levels: TaxonomyItem[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function getErr(error: unknown) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.detail === "string"
    ? error.response.data.detail
    : "Không lưu được dữ liệu. Kiểm tra lại các trường bắt buộc.";
}

export default function TaxonomyDrawer({
  open,
  kind,
  initial,
  levels,
  onClose,
  onSaved,
}: TaxonomyDrawerProps) {
  const isEditing = Boolean(initial?.id);
  const kindMeta = TAXONOMY_KIND_META[kind];

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [icon, setIcon] = useState<string>(kindMeta.defaultIcon);
  const [colorToken, setColorToken] = useState<CatalogColorToken>(
    kindMeta.defaultColor,
  );
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");

  // Kind-specific fields
  const [gradeNumber, setGradeNumber] = useState<number>(10);
  const [educationLevelId, setEducationLevelId] = useState<string>("");
  const [examType, setExamType] = useState<string>("entrance");
  const [targetMonth, setTargetMonth] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [badgeLabel, setBadgeLabel] = useState<string>("");
  const [gradeRange, setGradeRange] = useState<string>("");
  const [ageRange, setAgeRange] = useState<string>("");
  const [isMilestone, setIsMilestone] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const meta = initial?.metadata ?? {};
    setName(initial?.name ?? "");
    setCode(initial?.code ?? "");
    setCodeTouched(Boolean(initial?.id || initial?.code));
    setSlug(initial?.slug ?? "");
    setOrderIndex(initial?.order_index ?? 0);
    setIsActive(initial?.is_active ?? true);
    setIsFeatured(initial?.is_featured ?? false);
    setIcon(initial?.icon ?? TAXONOMY_KIND_META[kind].defaultIcon);
    setColorToken(
      (initial?.color_token as CatalogColorToken) ||
        TAXONOMY_KIND_META[kind].defaultColor,
    );
    setTagline(initial?.tagline ?? "");
    setDescription(initial?.description ?? "");
    setGradeNumber(initial?.grade_number ?? 10);
    setEducationLevelId(initial?.education_level_id ?? levels[0]?.id ?? "");
    setExamType(initial?.exam_type ?? "entrance");
    setTargetMonth(
      typeof meta.target_month === "string" ? meta.target_month : "",
    );
    setExamDate(typeof meta.exam_date === "string" ? meta.exam_date : "");
    setBadgeLabel(typeof meta.badge_label === "string" ? meta.badge_label : "");
    setGradeRange(typeof meta.grade_range === "string" ? meta.grade_range : "");
    setAgeRange(typeof meta.age_range === "string" ? meta.age_range : "");
    setIsMilestone(Boolean(meta.milestone));
  }, [open, initial, kind, levels]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const palette = getPalette(colorToken);

  function handleNameChange(val: string) {
    setName(val);
    if (!isEditing && !codeTouched) {
      setCode(toVietnameseSlug(val));
    }
  }

  async function handleAiEnrich() {
    if (!name.trim()) {
      toast.error("Hãy nhập tên danh mục trước khi gọi AI gợi ý.");
      return;
    }
    setEnriching(true);
    try {
      const { data } = await api.post<CatalogAiEnrichResult>(
        "/admin/catalog/ai-enrich",
        {
          kind,
          name: name.trim(),
          code: code.trim() || undefined,
          exam_type: kind === "exams" ? examType : undefined,
        },
      );
      if (data.tagline) setTagline(data.tagline);
      if (data.description) setDescription(data.description);
      if (data.icon) setIcon(data.icon);
      if (data.color_token) setColorToken(data.color_token);
      toast.success("AI đã gợi ý nội dung & nhận diện trực quan!");
    } catch (error) {
      toast.error(getErr(error));
    } finally {
      setEnriching(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const mergedMetadata: Record<string, unknown> = {
      ...(initial?.metadata ?? {}),
    };
    if (kind === "levels") {
      if (gradeRange.trim()) mergedMetadata.grade_range = gradeRange.trim();
      else delete mergedMetadata.grade_range;
      if (ageRange.trim()) mergedMetadata.age_range = ageRange.trim();
      else delete mergedMetadata.age_range;
    } else if (kind === "grades") {
      mergedMetadata.milestone = isMilestone;
    } else if (kind === "exams") {
      if (targetMonth.trim()) mergedMetadata.target_month = targetMonth.trim();
      else delete mergedMetadata.target_month;
      if (examDate.trim()) mergedMetadata.exam_date = examDate.trim();
      else delete mergedMetadata.exam_date;
    } else if (kind === "learning-goals") {
      if (badgeLabel.trim()) mergedMetadata.badge_label = badgeLabel.trim();
      else delete mergedMetadata.badge_label;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      code: code.trim(),
      order_index: Number(orderIndex) || 0,
      is_active: isActive,
      is_featured: isFeatured,
      icon: icon || null,
      color_token: colorToken,
      tagline: tagline.trim() || null,
      metadata: mergedMetadata,
    };

    if (kind === "grades") {
      payload.grade_number = Number(gradeNumber);
      payload.education_level_id = educationLevelId;
      if (slug.trim()) payload.slug = slug.trim();
    }
    if (kind === "subjects") {
      if (slug.trim()) payload.slug = slug.trim();
      payload.description = description.trim() || null;
    }
    if (kind === "learning-goals") {
      payload.description = description.trim() || null;
    }
    if (kind === "exams") {
      payload.exam_type = examType;
      payload.description = description.trim() || null;
    }

    try {
      if (isEditing && initial?.id) {
        await api.put(`/admin/catalog/${kind}/${initial.id}`, payload);
      } else {
        await api.post(`/admin/catalog/${kind}`, payload);
      }
      await onSaved();
      toast.success(
        isEditing
          ? `Đã cập nhật ${kindMeta.singular.toLowerCase()}`
          : `Đã tạo ${kindMeta.singular.toLowerCase()} mới`,
      );
      onClose();
    } catch (error) {
      toast.error(getErr(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Chỉnh sửa mục phân loại" : "Tạo mục phân loại mới"}
    >
      <div className="flex-1" onClick={onClose} />
      <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-[0_24px_64px_-16px_rgba(53,111,167,0.28)]">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {kindMeta.singular}
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? `Chỉnh sửa “${initial?.name}”` : `Tạo ${kindMeta.singular} mới`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ngăn chỉnh sửa"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Live Card Preview */}
            <div
              className={`rounded-3xl border p-4 transition-colors ${palette.softBg} ${palette.border}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Xem trước thẻ hiển thị
                </span>
                <button
                  type="button"
                  disabled={enriching || !name.trim()}
                  onClick={handleAiEnrich}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary-pastel bg-surface px-3 py-1.5 text-xs font-semibold text-primary shadow-xs transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Bot size={14} animated={false} />
                  {enriching ? "AI đang gợi ý..." : "AI Gợi ý nội dung"}
                </button>
              </div>
              <div className="flex items-center gap-3.5 rounded-2xl border border-border/70 bg-surface p-3.5 shadow-xs">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${palette.softBg} ${palette.border} ${palette.text}`}
                >
                  <CatalogIcon name={icon} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-bold text-foreground">
                      {name.trim() || `Tên ${kindMeta.singular.toLowerCase()}...`}
                    </span>
                    {isFeatured && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-vanilla px-2 py-0.5 text-[10px] font-semibold text-accent-vanilla-foreground">
                        <Star size={10} animated={false} />
                        Nổi bật
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tagline.trim() ||
                      "Khẩu hiệu ngắn hiển thị cùng thẻ danh mục"}
                  </p>
                </div>
              </div>
            </div>

            {/* Core Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Tên hiển thị"
                required
                maxLength={160}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`VD: ${kind === "subjects" ? "Toán học" : kind === "exams" ? "Đánh giá năng lực" : "Lớp 12"}`}
              />
              <Input
                label="Mã ổn định (code)"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                readOnly={isEditing}
                value={code}
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(e.target.value);
                }}
                placeholder="tu-dong-tao-tu-ten"
              />
              <Input
                label="Thứ tự hiển thị"
                type="number"
                min={0}
                required
                value={String(orderIndex)}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
              />
              {["grades", "subjects"].includes(kind) && (
                <Input
                  label="Đường dẫn (slug · trống để tự tạo)"
                  readOnly={isEditing}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              )}
            </div>

            {/* Kind-specific Fields */}
            {kind === "grades" && (
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-background/50 p-4 sm:grid-cols-2">
                <Input
                  label="Số lớp (1 – 12)"
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={String(gradeNumber)}
                  onChange={(e) => setGradeNumber(Number(e.target.value))}
                />
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">Cấp học</span>
                  <select
                    required
                    value={educationLevelId}
                    onChange={(e) => setEducationLevelId(e.target.value)}
                    className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">Chọn cấp học</option>
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={isMilestone}
                    onChange={(e) => setIsMilestone(e.target.checked)}
                  />
                  Đánh dấu là khối lớp chuyển cấp quan trọng (VD: Lớp 5, Lớp 9, Lớp 12)
                </label>
              </div>
            )}

            {kind === "levels" && (
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-background/50 p-4 sm:grid-cols-2">
                <Input
                  label="Khoảng lớp"
                  value={gradeRange}
                  onChange={(e) => setGradeRange(e.target.value)}
                  placeholder="VD: Lớp 10 – 12"
                />
                <Input
                  label="Độ tuổi"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  placeholder="VD: 15 – 18 tuổi"
                />
              </div>
            )}

            {kind === "exams" && (
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-background/50 p-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    Nhóm kỳ thi
                  </span>
                  <select
                    required
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label} ({k})
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Thời gian tổ chức"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  placeholder="VD: Cuối tháng 6 hằng năm"
                />
                <Input
                  label="Ngày thi dự kiến (tính đếm ngược)"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
            )}

            {kind === "learning-goals" && (
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <Input
                  label="Nhãn giai đoạn (Badge)"
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value)}
                  placeholder="VD: Nền tảng, Củng cố, Bứt phá, Về đích"
                />
              </div>
            )}

            {/* Editorial Copy */}
            <div className="space-y-4">
              <Input
                label="Khẩu hiệu ngắn (Tagline)"
                maxLength={240}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="1 dòng mô tả súc tích hiển thị trên thẻ danh mục"
              />
              {["subjects", "exams", "learning-goals"].includes(kind) && (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    Mô tả chi tiết
                  </span>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả định hướng sư phạm, phạm vi kiến thức..."
                    className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </label>
              )}
            </div>

            {/* Pastel Color Token Picker */}
            <div className="space-y-2.5">
              <span className="block text-sm font-medium text-foreground">
                Sắc màu Pastel Cloudy Blue
              </span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {CLOUDY_PALETTE_LIST.map((item) => {
                  const selected = colorToken === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setColorToken(item.key)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-[11px] font-medium transition-all ${
                        selected
                          ? `${item.softBg} ${item.border} ${item.text} ring-2 ${item.ring}`
                          : "border-border bg-background/50 text-muted-foreground hover:border-primary-pastel"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${item.swatch} text-white`}
                      >
                        {selected && <Check size={12} animated={false} />}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual PulsoIcon Picker */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Biểu tượng PulsoIcon
                </span>
                <span className="text-xs text-muted-foreground">{icon}</span>
              </div>
              <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-2xl border border-border bg-background/50 p-2.5 sm:grid-cols-9">
                {CATALOG_ICON_LIST.map((iconName) => {
                  const selected = icon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      title={iconName}
                      aria-label={`Chọn biểu tượng ${iconName}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                        selected
                          ? `${palette.softBg} ${palette.border} ${palette.text} ring-2 ${palette.ring}`
                          : "border-transparent bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary"
                      }`}
                    >
                      <CatalogIcon name={iconName} size={18} animated={false} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Toggles */}
            <div className="flex flex-wrap gap-6 rounded-2xl border border-border bg-background/50 p-4 text-sm">
              <label className="flex items-center gap-2 font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Đang hoạt động
              </label>
              <label className="flex items-center gap-2 font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Ghim nổi bật (Featured)
              </label>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border bg-background/50 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Đang lưu..."
                : isEditing
                  ? "Lưu thay đổi"
                  : "Tạo danh mục"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
