"use client";

import { useId } from "react";
import { Award, CheckCircle2, CircleX, RotateCcw } from "pulsoicon-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  const ringId = useId();
  const passed = allQuestionsAnswered && scorePercentage >= 60;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, scorePercentage)) / 100) * circumference;

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-4 text-center sm:p-6">
      <div
        className={cn(
          "w-full max-w-lg rounded-[2rem] border bg-gradient-to-br p-6 shadow-sm sm:p-8",
          passed
            ? "border-success-border from-success-bg/75 via-surface to-accent-vanilla/50"
            : "border-warning-border from-warning-bg/70 via-surface to-primary-light/40",
        )}
      >
        {/* Vòng tròn điểm số SVG */}
        <div className="mx-auto relative grid size-36 place-items-center rounded-full bg-surface/90 p-1.5 shadow-sm ring-1 ring-border">
          <svg viewBox="0 0 132 132" className="size-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={passed ? "var(--sn-success-400)" : "var(--sn-warning-400)"} />
                <stop offset="100%" stopColor={passed ? "var(--sn-success-700)" : "var(--sn-warning-700)"} />
              </linearGradient>
            </defs>
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="10"
            />
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              stroke={`url(#${ringId})`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 motion-reduce:transition-none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "font-display text-3xl font-bold tabular-nums",
                passed ? "text-success-foreground" : "text-warning-foreground",
              )}
            >
              {scorePercentage}%
            </span>
            <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
              {correctCount}/{totalQuestions} câu
            </span>
          </div>
        </div>

        {/* Con dấu trạng thái */}
        <div className="mt-4">
          <span
            className={cn(
              "stamp-down inline-flex items-center gap-1.5 rounded-full border-2 border-dashed px-3.5 py-1 text-[11px] font-extrabold tracking-[0.14em] uppercase",
              passed
                ? "border-success-foreground/45 bg-surface/85 text-success-foreground"
                : "border-warning-foreground/45 bg-surface/85 text-warning-foreground",
            )}
          >
            {passed ? (
              <>
                <Award aria-hidden="true" animated={false} className="size-3.5" />
                <span>ĐẠT YÊU CẦU (≥ 60%)</span>
              </>
            ) : (
              <>
                <CircleX aria-hidden="true" animated={false} className="size-3.5" />
                <span>CẦN ÔN LẠI</span>
              </>
            )}
          </span>
        </div>

        <h3 className="mt-3 font-display text-2xl font-bold text-foreground">
          {!allQuestionsAnswered
            ? "Bạn chưa hoàn thành hết câu hỏi"
            : passed
              ? "Xuất sắc! Bạn đã chinh phục bài luyện tập"
              : "Cố thêm một chút nữa nhé!"}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {!allQuestionsAnswered
            ? `Bạn mới trả lời ${answeredCount}/${totalQuestions} câu. Hãy hoàn thành đủ tất cả các câu để ghi nhận kết quả.`
            : passed
              ? "Kiến thức phần này đã rất vững vàng. Bạn có thể chuyển sang bài tiếp theo ngay!"
              : "Cần đạt tối thiểu 60% để hoàn thành bài học. Xem lại tóm tắt bên trái và thử lại nhé!"}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="min-h-11 rounded-full bg-surface px-5 font-bold"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            <span>Làm lại bài</span>
          </Button>
          {passed && (
            <Button
              type="button"
              variant="primary"
              onClick={onComplete}
              className="min-h-11 rounded-full px-6 font-bold"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              <span>Xem lại câu hỏi</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
