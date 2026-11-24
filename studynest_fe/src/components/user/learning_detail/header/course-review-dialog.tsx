"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Send, Star, X } from "pulsoicon-react";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";

interface CourseReviewDialogProps {
  open: boolean;
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

const RATING_LABELS: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Chưa hài lòng", subtitle: "Hãy chia sẻ điểm cần cải thiện để thầy cô hoàn thiện hơn." },
  2: { title: "Cần bổ sung thêm", subtitle: "Nội dung còn chỗ chưa rõ hoặc cần thêm ví dụ minh họa." },
  3: { title: "Ổn, khá dễ hiểu", subtitle: "Khóa học đáp ứng cơ bản nhu cầu ôn luyện." },
  4: { title: "Rất hữu ích!", subtitle: "Bài giảng rõ ràng, dễ áp dụng vào bài tập thực tế." },
  5: { title: "Xuất sắc, rất đáng học!", subtitle: "Giảng viên truyền đạt cuốn hút và bài bản." },
};

const QUICK_REVIEW_CHIPS = [
  "Giảng viên giải thích rất dễ hiểu",
  "Ví dụ trực quan, sát chương trình học",
  "Âm thanh và hình ảnh rõ nét",
  "Cần thêm bài tập tự luyện cuối bài",
] as const;

export default function CourseReviewDialog({
  open,
  courseId,
  courseTitle,
  onClose,
}: CourseReviewDialogProps) {
  const titleId = useId();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setHoverRating(0);
      setError(null);
      setSubmitted(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  if (!open || typeof document === "undefined") return null;

  const activeRating = hoverRating || rating;
  const ratingInfo = RATING_LABELS[activeRating] ?? RATING_LABELS[5];

  const handleAppendChip = (chip: string) => {
    setContent((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.includes(chip)) return prev;
      return `${trimmed}. ${chip}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Hãy viết vài dòng cảm nhận hoặc chọn gợi ý nhanh bên trên nhé.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/courses/${courseId}/review`, {
        rating,
        content: trimmed,
      });
      setSubmitted(true);
      showToast.success("Cảm ơn bạn đã gửi đánh giá cho khóa học!");
      window.setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(
        typeof detail === "string" && detail.trim()
          ? detail
          : "Không thể gửi đánh giá lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-xs"
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-[26px] border border-primary-pastel bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-primary-pastel/70 bg-gradient-to-r from-accent-vanilla/55 via-surface to-primary-light/55 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-accent-vanilla-border bg-surface text-accent-vanilla-foreground shadow-2xs">
              <Star className="size-5" solid animated={false} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-lg font-bold text-foreground">
                Đánh giá khóa học
              </h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{courseTitle}</p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại đánh giá"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary-light hover:text-foreground cursor-pointer"
          >
            <X className="size-4" animated={false} aria-hidden="true" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-full border border-success-border bg-success-bg text-success-foreground">
              <Check className="size-7" animated={false} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">
              Đã ghi nhận đánh giá {rating}/5 sao!
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Góp ý của bạn giúp giảng viên và cộng đồng Mây Mây ngày càng tốt hơn.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
            {/* Bộ chọn sao tương tác */}
            <div className="rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/25 p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      aria-label={`Chọn ${star} sao`}
                      className="grid size-10 place-items-center rounded-full transition-transform hover:scale-115 cursor-pointer"
                    >
                      <Star
                        className={cn(
                          "size-7 transition-colors",
                          filled
                            ? "text-accent-vanilla-foreground"
                            : "text-primary-pastel",
                        )}
                        solid={filled}
                        animated={false}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 font-display text-sm font-bold text-foreground">
                {ratingInfo.title}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{ratingInfo.subtitle}</p>
            </div>

            {/* Gợi ý nhanh */}
            <div>
              <p className="mb-2 text-[11px] font-bold text-muted-foreground">Gợi ý nhận xét nhanh</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REVIEW_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleAppendChip(chip)}
                    className="rounded-full border border-primary-pastel/80 bg-primary-light/45 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-light cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhận xét */}
            <div>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ trải nghiệm học tập của bạn về khóa học này..."
                className="w-full resize-none rounded-2xl border border-border bg-background/70 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive-bg px-3 py-2 text-xs font-semibold text-destructive-foreground"
              >
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" size="sm" variant="ghost" disabled={submitting} onClick={onClose}>
                Để sau
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={submitting}
                disabled={submitting}
                leftIcon={<Send className="size-3.5" />}
              >
                Gửi đánh giá
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
