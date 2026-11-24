"use client";

import { CheckCircle2, CircleX, Lightbulb } from "pulsoicon-react";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";

interface QuestionDisplayProps {
  question: {
    id: string;
    question: string;
    options: string[];
    correct_answer: number;
    explanation?: string;
  };
  selectedAnswer: number | undefined;
  isAnswered: boolean;
  onSelectAnswer: (answerIndex: number) => void;
}

export default function QuestionDisplay({
  question,
  selectedAnswer,
  isAnswered,
  onSelectAnswer,
}: QuestionDisplayProps) {
  const isCorrect = selectedAnswer === question.correct_answer;
  const correctOption = question.options[question.correct_answer];

  return (
    <div className="space-y-5">
      {/* Đề câu hỏi */}
      <div className="rounded-2xl border border-primary-pastel/75 bg-gradient-to-br from-primary-light/45 via-surface to-background p-4 sm:p-5">
        <div className="min-w-0 break-words text-base font-bold leading-relaxed text-foreground sm:text-lg [&_pre]:max-w-full [&_pre]:overflow-x-auto">
          <MarkdownRenderer
            content={question.question}
            isHtml={false}
            className="prose prose-sm max-w-none text-foreground"
          />
        </div>
      </div>

      {/* Danh sách đáp án */}
      <div className="space-y-2.5">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrectAnswer = index === question.correct_answer;
          const letter = String.fromCharCode(65 + index);

          return (
            <button
              key={index}
              type="button"
              onClick={() => !isAnswered && onSelectAnswer(index)}
              disabled={isAnswered}
              className={cn(
                "group w-full rounded-2xl border-2 p-3.5 text-left transition-all duration-150 sm:p-4",
                !isAnswered && "cursor-pointer hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                isAnswered
                  ? isCorrectAnswer
                    ? "border-success-border bg-success-bg/65 text-foreground"
                    : isSelected
                      ? "border-destructive-border bg-destructive-bg/65 text-foreground"
                      : "border-border/70 bg-background/60 text-muted-foreground opacity-80"
                  : isSelected
                    ? "border-primary bg-primary-light/70 text-foreground shadow-xs"
                    : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/35",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-xl border text-xs font-extrabold transition-colors",
                    isAnswered
                      ? isCorrectAnswer
                        ? "border-success-border bg-success-foreground text-primary-foreground"
                        : isSelected
                          ? "border-destructive-border bg-destructive text-primary-foreground"
                          : "border-border bg-surface text-muted-foreground"
                      : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground group-hover:border-primary-pastel group-hover:bg-primary-light group-hover:text-primary",
                  )}
                >
                  {letter}
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <MarkdownRenderer
                    content={option}
                    isHtml={false}
                    className="prose prose-sm max-w-none text-current"
                  />
                </div>

                {isAnswered && (
                  <div className="shrink-0 pt-0.5">
                    {isCorrectAnswer ? (
                      <CheckCircle2
                        aria-hidden="true"
                        animated={false}
                        className="size-5 text-success-foreground"
                      />
                    ) : isSelected ? (
                      <CircleX
                        aria-hidden="true"
                        animated={false}
                        className="size-5 text-destructive-foreground"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Giải thích sau khi chọn */}
      {isAnswered && (
        <div
          className={cn(
            "rounded-2xl border p-4",
            isCorrect
              ? "border-success-border bg-success-bg/55"
              : "border-warning-border bg-warning-bg/65",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-xl",
                isCorrect
                  ? "bg-success-foreground text-primary-foreground"
                  : "bg-warning-foreground text-primary-foreground",
              )}
            >
              {isCorrect ? (
                <CheckCircle2 animated={false} className="size-4" />
              ) : (
                <CircleX animated={false} className="size-4" />
              )}
            </span>

            <div className="min-w-0 flex-1 space-y-2">
              <p
                className={cn(
                  "text-sm font-bold",
                  isCorrect ? "text-success-foreground" : "text-warning-foreground",
                )}
              >
                {isCorrect
                  ? "Chính xác! Bạn đã nắm chắc ý này."
                  : "Chưa đúng rồi — cùng xem đáp án chuẩn nhé:"}
              </p>

              {!isCorrect && (
                <div className="rounded-xl border border-border/80 bg-surface/90 px-3 py-2 text-xs font-semibold text-foreground">
                  <span className="font-extrabold text-primary">
                    {String.fromCharCode(65 + question.correct_answer)}.{" "}
                  </span>
                  <MarkdownRenderer
                    content={correctOption || ""}
                    isHtml={false}
                    className="prose prose-sm inline max-w-none text-foreground"
                  />
                </div>
              )}

              {question.explanation && (
                <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-surface/80 px-3 py-2.5 text-xs text-foreground">
                  <Lightbulb
                    aria-hidden="true"
                    animated={false}
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-primary">Giải thích: </span>
                    <MarkdownRenderer
                      content={question.explanation}
                      isHtml={false}
                      className="prose prose-sm inline max-w-none text-foreground/90"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
