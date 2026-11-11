"use client";

import { HiCheckCircle, HiXCircle } from "react-icons/hi";

interface QuizResultsProps {
  scorePercentage: number;
  correctCount: number;
  totalQuestions: number;
  answeredCount: number;
  allQuestionsAnswered: boolean;
  onRetry: () => void;
  onComplete: () => void;
}

export default function QuizResults({
  scorePercentage,
  correctCount,
  totalQuestions,
  answeredCount,
  allQuestionsAnswered,
  onRetry,
  onComplete,
}: QuizResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="mb-8">
        <div className="text-6xl font-black mb-4">
          {scorePercentage >= 80 ? (
            <span className="text-primary">{scorePercentage}%</span>
          ) : (
            <span className="text-red-600">{scorePercentage}%</span>
          )}
        </div>
        <div className="text-2xl font-bold text-foreground mb-2">
          {correctCount}/{totalQuestions} câu đúng
        </div>
      </div>

      {!allQuestionsAnswered ? (
        <div className="mb-8">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-6">
            <HiXCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-amber-700 mb-2">
              Chưa hoàn thành! ⚠️
            </h3>
            <p className="text-amber-600 mb-2">
              Bạn mới trả lời {answeredCount}/{totalQuestions} câu hỏi.
            </p>
            <p className="text-sm text-amber-500">
              Vui lòng trả lời hết tất cả câu hỏi để hoàn thành bài học.
            </p>
          </div>
        </div>
      ) : scorePercentage >= 80 ? (
        <div className="mb-8">
          <div className="bg-primary-pastel/50 border-2 border-primary-light rounded-xl p-6 mb-6">
            <HiCheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">
              Chúc mừng! 🎉
            </h3>
            <p className="text-foreground">
              Bạn đã hoàn thành bài học thành công!
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
            <HiXCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-orange-700 mb-2">
              Chưa đạt yêu cầu! ⚠️
            </h3>
            <p className="text-orange-600 mb-2">
              Bạn cần đạt ít nhất 80% để hoàn thành bài học này.
            </p>
            <p className="text-sm text-orange-500">
              Bạn đã đạt {scorePercentage}%. Hãy làm lại để cải thiện kết quả!
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-background hover:bg-border border border-border text-foreground rounded-xl font-semibold transition-colors cursor-pointer"
        >
          Làm lại
        </button>
        {allQuestionsAnswered && scorePercentage >= 80 && (
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Hoàn tất
          </button>
        )}
      </div>
    </div>
  );
}

