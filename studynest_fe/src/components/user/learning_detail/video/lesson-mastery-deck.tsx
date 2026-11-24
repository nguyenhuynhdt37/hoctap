"use client";

import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  HelpCircle,
  Play,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export const PASS_MASTERY_SCORE = 80;
export const PASS_QUIZ_MIN_PERCENT = 50;
export const HEATMAP_BUCKETS = 48;

interface LessonMasteryDeckProps {
  hasQuizzes: boolean;
  quizzesCount: number;
  isCompleted: boolean;
  isFastForwarding: boolean;
  watchedSecondsCount: number;
  duration: number;
  watchCoveragePercent: number;
  watchPoints: number;
  quizPoints: number;
  quizBestPercent: number;
  totalScore: number;
  heatmap: number[]; // Mảng 48 phần tử giá trị 0..1 biểu thị độ phủ từng đoạn video
  onOpenQuiz: () => void;
  onSeekToSegment?: (seconds: number) => void;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec || 0));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, "0")}`;
}

export function LessonMasteryDeck({
  hasQuizzes,
  quizzesCount,
  isCompleted,
  isFastForwarding,
  watchedSecondsCount,
  duration,
  watchCoveragePercent,
  watchPoints,
  quizPoints,
  quizBestPercent,
  totalScore,
  heatmap,
  onOpenQuiz,
  onSeekToSegment,
}: LessonMasteryDeckProps) {
  const displayScore = isCompleted ? Math.max(PASS_MASTERY_SCORE, totalScore) : totalScore;
  const remainingScore = Math.max(0, PASS_MASTERY_SCORE - displayScore);

  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(100, displayScore) / 100);

  return (
    <div className="border-t border-primary-pastel/70 bg-gradient-to-r from-primary-light/65 via-surface to-accent/25 px-4 py-3.5 sm:px-6">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* ── TRÁI: VÒNG ĐIỂM MASTERY + CHỈ SỐ CHI TIẾT ── */}
        <div className="flex items-center gap-3.5">
          {/* Vòng tròn điểm 0..100 */}
          <div className="relative grid size-16 shrink-0 place-items-center">
            <svg className="size-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
              <circle
                cx="32"
                cy="32"
                r={ringRadius}
                fill="none"
                stroke="var(--color-primary-pastel)"
                strokeWidth="5.5"
              />
              <circle
                cx="32"
                cy="32"
                r={ringRadius}
                fill="none"
                stroke={isCompleted ? "var(--color-success-foreground)" : "var(--color-primary)"}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center leading-none">
              <span
                className={cn(
                  "text-base font-black tabular-nums",
                  isCompleted ? "text-success-foreground" : "text-primary",
                )}
              >
                {displayScore}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground">/100đ</span>
            </div>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[11px] font-extrabold text-success-foreground">
                  <CheckCircle2 className="size-3.5" animated={false} aria-hidden="true" />
                  Đã đạt chuẩn qua bài
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
                  <Award className="size-3.5" animated={false} aria-hidden="true" />
                  Điểm qua bài: cần ≥ {PASS_MASTERY_SCORE}/100đ
                </span>
              )}

              {isFastForwarding && !isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-bg px-2.5 py-0.5 text-[11px] font-bold text-warning-foreground">
                  <AlertCircle className="size-3" animated={false} aria-hidden="true" />
                  Đoạn tua nhảy không được tính điểm
                </span>
              )}
            </div>

            {/* Chi tiết cấu thành điểm */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Clock className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                Xem thực:{" "}
                <strong className="tabular-nums text-primary">
                  {watchCoveragePercent}%
                </strong>{" "}
                <span className="text-muted-foreground tabular-nums">
                  ({formatClock(watchedSecondsCount)} / {formatClock(duration)})
                </span>
                {hasQuizzes && (
                  <span className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-extrabold text-primary tabular-nums">
                    {watchPoints}/40đ
                  </span>
                )}
              </span>

              {hasQuizzes && (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <HelpCircle className="size-3.5 text-secondary-foreground" animated={false} aria-hidden="true" />
                  Quiz:{" "}
                  <strong className="tabular-nums text-foreground">
                    {quizBestPercent}%
                  </strong>
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold text-secondary-foreground tabular-nums">
                    {quizPoints}/60đ
                  </span>
                </span>
              )}

              {!isCompleted && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {hasQuizzes && quizBestPercent < PASS_QUIZ_MIN_PERCENT
                    ? `· Cần Quiz ≥ ${PASS_QUIZ_MIN_PERCENT}% & tổng ≥ ${PASS_MASTERY_SCORE}đ`
                    : remainingScore > 0
                      ? `· Còn thiếu ${remainingScore}đ nữa để qua bài`
                      : "· Sắp hoàn thành!"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── PHẢI: NÚT LÀM QUIZ (NẾU CÓ) ── */}
        {hasQuizzes && (
          <div className="shrink-0">
            <Button
              size="sm"
              variant={isCompleted ? "secondary" : "primary"}
              onClick={onOpenQuiz}
              leftIcon={<Play className="size-3.5" />}
              className="rounded-full px-4 font-extrabold"
            >
              {isCompleted
                ? `Ôn lại Quiz (${quizzesCount} câu)`
                : quizBestPercent > 0
                  ? `Làm lại Quiz (${quizBestPercent}%)`
                  : `Làm Quiz ngay (${quizzesCount} câu)`}
            </Button>
          </div>
        )}
      </div>

      {/* ── THANH HEATMAP ĐOẠN VIDEO ĐÃ XEM (48 PHÂN ĐOẠN) ── */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
          <span>Bản đồ đoạn video đã xem thực tế (bấm vào ô mờ để tua tới đoạn chưa xem)</span>
          <span className="tabular-nums">
            Mốc qua bài: {hasQuizzes ? "Xem ≥ 80% + Quiz ≥ 70%" : "80% thời lượng thực"}
          </span>
        </div>
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${HEATMAP_BUCKETS}, minmax(0, 1fr))` }}
        >
          {heatmap.map((ratio, idx) => {
            const segStartSec = Math.floor((idx / HEATMAP_BUCKETS) * duration);
            const watched = isCompleted || ratio >= 0.45;
            const partial = !watched && ratio > 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSeekToSegment?.(segStartSec)}
                title={`Đoạn ${formatClock(segStartSec)} — ${watched ? "Đã xem" : partial ? "Xem một phần" : "Chưa xem"}`}
                aria-label={`Tua tới ${formatClock(segStartSec)}`}
                className={cn(
                  "h-2 rounded-full transition-all hover:scale-y-150 cursor-pointer",
                  watched
                    ? isCompleted
                      ? "bg-success-foreground/80"
                      : "bg-primary"
                    : partial
                      ? "bg-primary/45"
                      : "bg-primary-pastel/75 hover:bg-primary/60",
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
