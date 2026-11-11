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
    <div className="flex justify-between items-center pt-4 border-t border-border">
      <button
        onClick={onPrev}
        disabled={isFirstQuestion}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${
          isFirstQuestion
            ? "bg-background text-muted-foreground/50 cursor-not-allowed"
            : "bg-background text-foreground hover:bg-border cursor-pointer"
        }`}
      >
        <HiArrowLeft className="w-4 h-4" />
        <span>Trước</span>
      </button>

      <button
        onClick={onNext}
        disabled={!isAnswered}
        className={`flex items-center space-x-2 px-6 py-2 rounded-xl transition-colors ${
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

