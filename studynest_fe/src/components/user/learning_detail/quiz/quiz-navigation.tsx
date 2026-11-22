"use client";

import { HiArrowLeft, HiArrowRight } from "react-icons/hi";

interface QuizNavigationProps {
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isAnswered: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function QuizNavigation({
  isFirstQuestion,
  isLastQuestion,
  isAnswered,
  onPrev,
  onNext,
}: QuizNavigationProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirstQuestion}
        className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 transition-colors ${
          isFirstQuestion
            ? "bg-background text-muted-foreground/50 cursor-not-allowed"
            : "bg-background text-foreground hover:bg-border cursor-pointer"
        }`}
      >
        <HiArrowLeft className="w-4 h-4" />
        <span>Trước</span>
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!isAnswered}
        className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 transition-colors sm:px-6 ${
          isAnswered
            ? "bg-primary text-white hover:bg-primary-hover cursor-pointer shadow-sm"
            : "bg-background text-muted-foreground/50 cursor-not-allowed"
        }`}
      >
        <span>{isLastQuestion ? "Hoàn thành" : "Tiếp theo"}</span>
        <HiArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

