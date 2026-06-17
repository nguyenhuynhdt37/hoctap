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
    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
      <button
        onClick={onPrev}
        disabled={isFirstQuestion}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
          isFirstQuestion
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
        }`}
      >
        <HiArrowLeft className="w-4 h-4" />
        <span>Trước</span>
      </button>

      <button
        onClick={onNext}
        disabled={!isAnswered}
        className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
          isAnswered
            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 cursor-pointer shadow-md"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        <span>{isLastQuestion ? "Hoàn thành" : "Tiếp theo"}</span>
        <HiArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

