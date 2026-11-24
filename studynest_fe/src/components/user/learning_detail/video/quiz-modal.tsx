"use client";

import { cn } from "@/lib/utils";
import type { ActiveLessonQuiz } from "@/types/user/activeLesson";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CircleCheck,
  CircleX,
  HelpCircle,
  RotateCcw,
  Target,
  Trophy,
  X,
} from "pulsoicon-react";
import { PASS_QUIZ_MIN_PERCENT } from "./lesson-mastery-deck";

interface QuizModalProps {
  lessonTitle: string;
  quizzes: ActiveLessonQuiz[];
  isCompleted: boolean;
  showResults: boolean;
  isSubmitting?: boolean;
  currentQuestionIndex: number;
  selectedAnswers: { [key: string]: number };
  answeredQuestions: Set<string>;
  quizScore: number;
  onAnswerSelect: (questionId: string, answerIndex: number) => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  onResetQuiz: () => void;
  onCloseQuiz: () => void;
}

export default function QuizModal({
  lessonTitle,
  quizzes,
  isCompleted,
  showResults,
  isSubmitting = false,
  currentQuestionIndex,
  selectedAnswers,
  answeredQuestions,
  quizScore,
  onAnswerSelect,
  onNextQuestion,
  onPrevQuestion,
  onResetQuiz,
  onCloseQuiz,
}: QuizModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseQuiz();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCloseQuiz]);

  const currentQuiz = quizzes[currentQuestionIndex];
  if (!mounted || !currentQuiz) return null;

  const isAnswered = answeredQuestions.has(currentQuiz.id);
  const selectedAnswer = selectedAnswers[currentQuiz.id];
  const scorePercent = Math.round(
    (quizScore / Math.max(1, quizzes.length)) * 100,
  );
  const isPassed = scorePercent >= PASS_QUIZ_MIN_PERCENT;
  const isLastQuestion = currentQuestionIndex === quizzes.length - 1;
  const stepPercent = Math.round(
    ((currentQuestionIndex + 1) / Math.max(1, quizzes.length)) * 100,
  );

  // Vòng tròn SVG cho màn hình kết quả
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (scorePercent / 100) * circumference;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-xs"
      onClick={onCloseQuiz}
      role="dialog"
      aria-modal="true"
      aria-label={`Kiểm tra nhanh: ${lessonTitle}`}
    >
      <div
        className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-primary-pastel bg-surface shadow-[0_30px_70px_-16px_rgba(53,111,167,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER CLOUDY BLUE PASTEL SÁNG */}
        <div className="relative shrink-0 overflow-hidden border-b border-border bg-gradient-to-br from-primary-light/90 via-surface to-accent/45 px-6 py-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/80 blur-2xl"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/95 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary shadow-2xs">
                  <HelpCircle
                    aria-hidden="true"
                    animated={false}
                    className="size-3.5"
                  />
                  <span>Kiểm tra nhanh</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/70 px-2.5 py-0.5 text-[11px] font-bold text-accent-vanilla-foreground">
                  <Target
                    aria-hidden="true"
                    animated={false}
                    className="size-3"
                  />
                  <span>Đạt từ {PASS_QUIZ_MIN_PERCENT}% để qua bài</span>
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-foreground sm:text-xl line-clamp-1">
                {lessonTitle}
              </h3>
            </div>

            <button
              type="button"
              onClick={onCloseQuiz}
              aria-label="Đóng bài kiểm tra"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface/90 text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          {/* Dải chấm tiến độ câu hỏi (khi đang làm bài) */}
          {!showResults && (
            <div className="relative mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {quizzes.map((q, idx) => {
                  const answered = answeredQuestions.has(q.id);
                  const chosenIdx = selectedAnswers[q.id];
                  const correct =
                    answered &&
                    chosenIdx !== undefined &&
                    Boolean(q.options[chosenIdx]?.is_correct);
                  const isCurrent = idx === currentQuestionIndex;

                  return (
                    <span
                      key={q.id}
                      className={cn(
                        "flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-bold transition-all tabular-nums",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground shadow-2xs scale-105"
                          : answered
                            ? correct
                              ? "border-success-border bg-success-bg text-success-foreground"
                              : "border-destructive-border bg-destructive-bg text-destructive-foreground"
                            : "border-border bg-surface text-muted-foreground",
                      )}
                    >
                      {answered && !isCurrent ? (
                        correct ? (
                          <Check
                            aria-hidden="true"
                            animated={false}
                            className="size-3"
                          />
                        ) : (
                          <X
                            aria-hidden="true"
                            animated={false}
                            className="size-3"
                          />
                        )
                      ) : (
                        idx + 1
                      )}
                    </span>
                  );
                })}
              </div>

              <span className="shrink-0 text-xs font-bold text-primary tabular-nums">
                {stepPercent}%
              </span>
            </div>
          )}
        </div>

        {/* NỘI DUNG CUỘN */}
        <div className="flex-1 overflow-y-auto p-6">
          {showResults ? (
            /* ── MÀN HÌNH KẾT QUẢ PHÁ CÁCH ── */
            <div className="flex flex-col items-center py-2 text-center">
              <div className="relative flex size-32 items-center justify-center">
                <svg className="size-32 -rotate-90" viewBox="0 0 112 112">
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    fill="none"
                    stroke="var(--sn-blue-100)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    fill="none"
                    stroke={
                      isPassed
                        ? "var(--color-success-foreground)"
                        : "var(--color-warning-foreground)"
                    }
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={cn(
                      "font-display text-3xl font-bold tabular-nums",
                      isPassed
                        ? "text-success-foreground"
                        : "text-warning-foreground",
                    )}
                  >
                    {scorePercent}%
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                    {quizScore}/{quizzes.length} câu đúng
                  </span>
                </div>
              </div>

              {isPassed ? (
                <div className="mt-5 w-full max-w-md rounded-[24px] border border-success-border bg-success-bg/65 p-5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1 text-xs font-bold text-success-foreground shadow-2xs">
                    <Trophy
                      aria-hidden="true"
                      animated={false}
                      className="size-4"
                    />
                    <span>Xuất sắc · Đã vượt qua bài học!</span>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-foreground">
                    {isCompleted
                      ? "Bài học này đã được ghi nhận hoàn thành."
                      : "Hệ thống đã đánh dấu hoàn thành và mở khóa cho phép bạn qua bài tiếp theo!"}
                  </p>
                </div>
              ) : (
                <div className="mt-5 w-full max-w-md rounded-[24px] border border-warning-border bg-warning-bg/70 p-5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1 text-xs font-bold text-warning-foreground shadow-2xs">
                    <Award
                      aria-hidden="true"
                      animated={false}
                      className="size-4"
                    />
                    <span>Chưa đạt mốc {PASS_QUIZ_MIN_PERCENT}%</span>
                  </div>
                  <p className="mt-2.5 text-sm font-medium text-foreground">
                    Bạn chỉ cần trả lời đúng tối thiểu{" "}
                    <strong>{PASS_QUIZ_MIN_PERCENT}%</strong> số câu hỏi để mở khóa qua bài. Thử lại lần nữa nhé!
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onResetQuiz}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-xs font-bold text-foreground shadow-2xs transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
                >
                  <span className="inline-flex items-center">
                    <RotateCcw
                      aria-hidden="true"
                      animated={false}
                      className="size-3.5"
                    />
                  </span>
                  <span>Làm lại</span>
                </button>

                <button
                  type="button"
                  onClick={onCloseQuiz}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover cursor-pointer"
                >
                  <span>
                    {isPassed ? "Tiếp tục hành trình" : "Đóng bài kiểm tra"}
                  </span>
                  <span className="inline-flex items-center">
                    <ArrowRight
                      aria-hidden="true"
                      animated={false}
                      className="size-3.5"
                    />
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* ── MÀN HÌNH CÂU HỎI ── */
            <div className="space-y-5">
              {/* Khung câu hỏi */}
              <div className="rounded-[24px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/45 via-background to-surface p-5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  Câu hỏi {currentQuestionIndex + 1} / {quizzes.length}
                </span>
                <h4 className="mt-2 text-base font-bold leading-relaxed text-foreground sm:text-lg">
                  {currentQuiz.question}
                </h4>
              </div>

              {/* Các đáp án A/B/C/D */}
              <div className="space-y-3">
                {currentQuiz.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = option.is_correct;
                  const isWrong = isSelected && !isCorrect;
                  const letter = String.fromCharCode(65 + index);

                  return (
                    <div key={option.id} className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          !isAnswered && onAnswerSelect(currentQuiz.id, index)
                        }
                        disabled={isAnswered}
                        className={cn(
                          "group flex w-full items-center gap-3.5 rounded-[20px] border-2 p-4 text-left transition-all duration-150",
                          !isAnswered && "cursor-pointer",
                          isAnswered
                            ? isCorrect
                              ? "border-success-border bg-success-bg/65 shadow-2xs"
                              : isWrong
                                ? "border-destructive-border bg-destructive-bg/65"
                                : "border-border bg-background/60 opacity-70"
                            : isSelected
                              ? "border-primary bg-primary-light/65 shadow-xs"
                              : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary-pastel hover:bg-primary-light/30 hover:shadow-2xs",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-extrabold transition-colors",
                            isAnswered
                              ? isCorrect
                                ? "border-success-border bg-success-foreground text-white"
                                : isWrong
                                  ? "border-destructive-border bg-destructive-foreground text-white"
                                  : "border-border bg-surface text-muted-foreground"
                              : isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary-pastel bg-primary-light/70 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                          )}
                        >
                          {isAnswered && isCorrect ? (
                            <Check
                              aria-hidden="true"
                              animated={false}
                              className="size-4"
                            />
                          ) : isAnswered && isWrong ? (
                            <X
                              aria-hidden="true"
                              animated={false}
                              className="size-4"
                            />
                          ) : (
                            letter
                          )}
                        </span>

                        <span className="flex-1 text-sm font-medium leading-snug text-foreground">
                          {option.text}
                        </span>
                      </button>

                      {isAnswered && (isSelected || isCorrect) && (
                        <div
                          className={cn(
                            "ml-4 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs leading-relaxed",
                            isCorrect
                              ? "border-success-border bg-success-bg/50 text-success-foreground"
                              : "border-destructive-border bg-destructive-bg/50 text-destructive-foreground",
                          )}
                        >
                          {isCorrect ? (
                            <CircleCheck
                              solid
                              aria-hidden="true"
                              animated={false}
                              className="mt-0.5 size-4 shrink-0"
                            />
                          ) : (
                            <CircleX
                              solid
                              aria-hidden="true"
                              animated={false}
                              className="mt-0.5 size-4 shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-bold">
                              {isCorrect ? "Chính xác!" : "Chưa chính xác"}
                            </p>
                            {option.feedback && (
                              <p className="mt-0.5 text-foreground/90">
                                {option.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Điều hướng Trước / Tiếp theo / Nộp bài */}
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={onPrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold transition",
                    currentQuestionIndex === 0
                      ? "border-border bg-background text-subtle-foreground cursor-not-allowed opacity-60"
                      : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer",
                  )}
                >
                  <span className="inline-flex items-center">
                    <ArrowLeft
                      aria-hidden="true"
                      animated={false}
                      className="size-3.5"
                    />
                  </span>
                  <span>Câu trước</span>
                </button>

                <button
                  type="button"
                  onClick={onNextQuestion}
                  disabled={selectedAnswer === undefined || isSubmitting}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold shadow-xs transition",
                    selectedAnswer !== undefined && !isSubmitting
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer"
                      : "bg-background text-subtle-foreground border border-border cursor-not-allowed opacity-65",
                  )}
                >
                  <span>
                    {isSubmitting
                      ? "Đang chấm bài..."
                      : isLastQuestion
                        ? "Nộp bài & Xem kết quả"
                        : "Câu tiếp theo"}
                  </span>
                  <span className="inline-flex items-center">
                    <ArrowRight
                      aria-hidden="true"
                      animated={false}
                      className="size-3.5"
                    />
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
