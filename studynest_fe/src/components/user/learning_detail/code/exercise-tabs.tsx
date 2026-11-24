"use client";

import {
  CheckCircle2,
  Code2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Trophy,
} from "pulsoicon-react";
import { cn } from "@/lib/utils";

interface ExerciseTabsProps {
  exercises: Array<{ id: string; title?: string; is_pass?: boolean }>;
  currentIndex: number;
  onSelectExercise: (index: number) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  onOpenQa?: () => void;
}

export default function ExerciseTabs({
  exercises,
  currentIndex,
  onSelectExercise,
  focusMode = false,
  onToggleFocusMode,
  onOpenQa,
}: ExerciseTabsProps) {
  const passedCount = exercises.filter((ex) => ex.is_pass).length;
  const totalCount = exercises.length;
  const progressPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <div className="min-w-0 max-w-full rounded-[22px] border border-primary-pastel/75 bg-gradient-to-r from-surface via-surface to-primary-light/45 p-2.5 shadow-xs sm:px-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Dải bước nhảy bài tập */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-2.5 py-1 text-[11px] font-bold text-primary md:inline-flex">
            <Code2 aria-hidden="true" animated={false} className="size-3.5" />
            <span>Thử thách</span>
          </span>

          {exercises.map((ex, index) => {
            const active = index === currentIndex;
            const passed = Boolean(ex.is_pass);

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => onSelectExercise(index)}
                aria-current={active ? "step" : undefined}
                title={ex.title || `Bài ${index + 1}`}
                className={cn(
                  "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : passed
                      ? "border-success-border bg-success-bg/80 text-success-foreground hover:bg-success-bg"
                      : "border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[10px] font-extrabold tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : passed
                        ? "bg-surface text-success-foreground"
                        : "bg-surface text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span>Bài {index + 1}</span>
                {passed && (
                  <CheckCircle2
                    aria-hidden="true"
                    animated={false}
                    className={cn(
                      "size-3.5 shrink-0",
                      active ? "text-primary-foreground" : "text-success-foreground",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tiến độ hoàn thành bài học + Nút Tập trung Code */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5">
            {allPassed && (
              <Trophy
                aria-hidden="true"
                animated={false}
                className="size-3.5 text-accent-vanilla-foreground"
              />
            )}
            <span className="text-[11px] font-bold text-foreground tabular-nums">
              {passedCount}/{totalCount} PASS
            </span>
            <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-primary-light sm:block">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  allPassed ? "bg-success-foreground" : "bg-primary",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {onOpenQa && (
            <button
              type="button"
              onClick={onOpenQa}
              title="Mở phòng Hỏi đáp toàn màn hình"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/80 px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary-light cursor-pointer"
            >
              <MessageCircle aria-hidden="true" animated={false} className="size-3.5" />
              <span>Hỏi đáp</span>
            </button>
          )}

          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              aria-pressed={focusMode}
              title={focusMode ? "Hiện lại cột đề bài" : "Mở rộng vùng viết code"}
              className={cn(
                "hidden min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer lg:inline-flex",
                focusMode
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary",
              )}
            >
              {focusMode ? (
                <>
                  <Minimize2 aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Hiện đề bài</span>
                </>
              ) : (
                <>
                  <Maximize2 aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Tập trung Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
