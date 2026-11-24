"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "pulsoicon-react";
import { cn } from "@/lib/utils";

interface QuizNavigationProps {
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isAnswered: boolean;
  submitting?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function QuizNavigation({
  isFirstQuestion,
  isLastQuestion,
  isAnswered,
  submitting = false,
  onPrev,
  onNext,
}: QuizNavigationProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-surface/95 px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirstQuestion || submitting}
        className={cn(
          "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition-colors",
          isFirstQuestion || submitting
            ? "cursor-not-allowed border-border bg-background text-muted-foreground/50"
            : "cursor-pointer border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
        )}
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        <span>Câu trước</span>
      </button>

      <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
        Phím 1–4 chọn đáp án · Enter để tiếp tục
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={!isAnswered || submitting}
        className={cn(
          "inline-flex min-h-10 items-center gap-1.5 rounded-full px-5 text-xs font-bold transition-all",
          isAnswered && !submitting
            ? "cursor-pointer bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover"
            : "cursor-not-allowed border border-border bg-background text-muted-foreground/50",
        )}
      >
        {isLastQuestion ? (
          <>
            <CheckCircle2 aria-hidden="true" animated={false} className="size-4" />
            <span>{submitting ? "Đang nộp bài..." : "Nộp bài & Chấm điểm"}</span>
          </>
        ) : (
          <>
            <span>Câu tiếp theo</span>
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </>
        )}
      </button>
    </div>
  );
}
