"use client";

import {
  DEFAULT_COIN_VND_RATE,
  formatCoin,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import type { CourseFormData } from "@/types/lecturer/course";
import {
  CheckCircle2,
  Circle,
  Coins,
  Eye,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Lock,
  Unlock,
} from "pulsoicon-react";
import { useMemo } from "react";

export type EditStepKey = "info" | "description" | "outcomes" | "pricing";

const LEVEL_LABELS: Record<string, string> = {
  all: "Tất cả cấp độ",
  beginner: "Người mới bắt đầu",
  intermediate: "Trung bình",
  advanced: "Nâng cao",
};

const LANGUAGE_LABELS: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
};

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  step: EditStepKey;
}

export type PreviewCourseFormData = Pick<
  CourseFormData,
  | "title"
  | "subtitle"
  | "description"
  | "level"
  | "language"
  | "outcomes"
  | "requirements"
  | "target_audience"
  | "base_price"
  | "is_published"
  | "is_lock_lesson"
>;

interface EditPreviewSidebarProps {
  formData: PreviewCourseFormData;
  thumbnailPreview: string | null;
  subjectName: string;
  gradeNames: string[];
  onJumpStep: (step: EditStepKey) => void;
}

export function EditPreviewSidebar({
  formData,
  thumbnailPreview,
  subjectName,
  gradeNames,
  onJumpStep,
}: EditPreviewSidebarProps) {
  const coinPrice = vndToCoin(formData.base_price, DEFAULT_COIN_VND_RATE);

  const plainDescription = useMemo(() => {
    return (formData.description || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, [formData.description]);

  const checklist: ChecklistItem[] = useMemo(
    () => [
      {
        id: "banner",
        label: "Ảnh bìa (Banner 16:9)",
        done: Boolean(thumbnailPreview),
        step: "info",
      },
      {
        id: "title",
        label: "Tiêu đề & Mô tả ngắn",
        done: Boolean(formData.title.trim() && formData.subtitle.trim()),
        step: "info",
      },
      {
        id: "taxonomy",
        label: "Khối lớp & Môn học chính",
        done: Boolean(subjectName || gradeNames.length > 0),
        step: "info",
      },
      {
        id: "description",
        label: "Mô tả chi tiết khóa học",
        done: plainDescription.length >= 20,
        step: "description",
      },
      {
        id: "outcomes",
        label: "Mục tiêu học tập",
        done: formData.outcomes.some((o) => o.trim().length > 0),
        step: "outcomes",
      },
      {
        id: "requirements",
        label: "Yêu cầu & Đối tượng học viên",
        done:
          formData.requirements.some((r) => r.trim().length > 0) &&
          formData.target_audience.some((t) => t.trim().length > 0),
        step: "outcomes",
      },
      {
        id: "pricing",
        label: "Cấu hình giá & Xuất bản",
        done: formData.base_price >= 0,
        step: "pricing",
      },
    ],
    [formData, thumbnailPreview, plainDescription, subjectName, gradeNames]
  );

  const completedCount = checklist.filter((item) => item.done).length;
  const readinessPct = Math.round((completedCount / checklist.length) * 100);

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (readinessPct / 100) * circumference;

  return (
    <aside className="space-y-5 lg:sticky lg:top-6">
      {/* Thẻ Xem Trước Trực Tiếp (Live Course Card Preview) */}
      <div className="overflow-hidden rounded-3xl border border-primary-pastel/80 bg-surface shadow-[0_18px_40px_-16px_rgba(53,111,167,0.16)]">
        <div className="flex items-center justify-between border-b border-border/70 bg-primary-light/50 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Eye className="h-3.5 w-3.5" />
            <span>Xem trước thẻ khóa học</span>
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              formData.is_published
                ? "border-success-border bg-success-bg text-success-foreground"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {formData.is_published ? "Công khai" : "Bản nháp"}
          </span>
        </div>

        {/* Ảnh bìa 16:9 */}
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary-light via-surface-muted to-accent/40">
          {thumbnailPreview ? (
            <img
              src={thumbnailPreview}
              alt={formData.title || "Ảnh bìa khóa học"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-pastel bg-surface/90 text-primary">
                <ImageIcon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium">Chưa có ảnh bìa</span>
            </div>
          )}

          {/* Badge cấp độ góc trên trái */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/60 bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-xs backdrop-blur-xs">
              {LEVEL_LABELS[formData.level] || "Tất cả cấp độ"}
            </span>
          </div>
        </div>

        {/* Nội dung thẻ */}
        <div className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-primary">
            <span>{subjectName || "Chưa chọn môn học"}</span>
            {gradeNames.length > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {gradeNames.slice(0, 3).join(", ")}
                  {gradeNames.length > 3 ? ` +${gradeNames.length - 3}` : ""}
                </span>
              </>
            )}
          </div>

          <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
            {formData.title.trim() || "Tiêu đề khóa học của bạn..."}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {formData.subtitle.trim() ||
              "Mô tả ngắn sẽ hiển thị tại đây giúp học viên nắm nhanh giá trị khóa học."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1">
              <Globe className="h-3 w-3 text-primary" />
              {LANGUAGE_LABELS[formData.language] || formData.language}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1">
              {formData.is_lock_lesson ? (
                <>
                  <Lock className="h-3 w-3 text-info-foreground" />
                  Học tuần tự
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 text-success-foreground" />
                  Học tự do
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1">
              <GraduationCap className="h-3 w-3 text-accent-foreground" />
              {formData.outcomes.filter((o) => o.trim()).length} mục tiêu
            </span>
          </div>

          {/* Giá Coin vàng mật ong */}
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              Học phí niêm yết
            </span>
            {coinPrice <= 0 ? (
              <span className="inline-flex items-center rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-bold text-success-foreground">
                Miễn phí
              </span>
            ) : (
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 text-base font-bold text-warning-foreground">
                  <Coins className="h-4 w-4 text-[#C98A2C]" />
                  <span>{formatCoin(coinPrice)}</span>
                </span>
                <p className="text-[11px] text-muted-foreground">
                  ≈ {formData.base_price.toLocaleString("vi-VN")} đ
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checklist Hoàn Thiện Hồ Sơ */}
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-3.5 border-b border-border/70 pb-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-primary-light"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="text-primary transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute text-sm font-bold text-foreground">
              {readinessPct}%
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Độ hoàn thiện hồ sơ
            </p>
            <p className="mt-0.5 text-sm font-bold text-foreground">
              {completedCount}/{checklist.length} tiêu chí đạt chuẩn
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bấm vào mục bất kỳ để đi nhanh tới phần đó
            </p>
          </div>
        </div>

        <ul className="mt-3.5 space-y-1.5">
          {checklist.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onJumpStep(item.step)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors hover:bg-primary-light/50"
              >
                <span className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2
                      animated={false}
                      className="h-4 w-4 shrink-0 text-success-foreground"
                    />
                  ) : (
                    <Circle
                      animated={false}
                      className="h-4 w-4 shrink-0 text-muted-foreground/60"
                    />
                  )}
                  <span
                    className={
                      item.done
                        ? "font-medium text-foreground"
                        : "font-medium text-muted-foreground"
                    }
                  >
                    {item.label}
                  </span>
                </span>
                {!item.done && (
                  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                    Bổ sung
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
