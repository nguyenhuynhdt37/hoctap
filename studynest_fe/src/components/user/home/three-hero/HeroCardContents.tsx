import * as React from "react";
import { cn } from "@/lib/utils";

/** Nội dung card trang trí cho hero 3D. Chỉ là DOM thuần, không state, không tương tác. */

const SHELL =
  "rounded-3xl border border-border bg-surface/90 shadow-[0_24px_48px_-12px_rgba(53,111,167,0.18)] text-foreground";

export interface LessonCardProps {
  title: string;
  meta: string;
  progress: number; // 0..100
}

export function LessonCard({ title, meta, progress }: LessonCardProps) {
  return (
    <div className={cn(SHELL, "w-[264px] p-4")}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary text-lg font-display font-semibold">
          ∑
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-light">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-medium text-primary">{progress}%</span>
      </div>
    </div>
  );
}

export interface QuizCardProps {
  question: string;
  options: readonly string[];
  correctIndex: number;
}

export function QuizCard({ question, options, correctIndex }: QuizCardProps) {
  return (
    <div className={cn(SHELL, "w-[252px] p-4")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Câu hỏi nhanh
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{question}</p>
      <ul className="mt-3 space-y-1.5">
        {options.map((opt, i) => {
          const correct = i === correctIndex;
          return (
            <li
              key={opt}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-1.5 text-[13px]",
                correct
                  ? "border-success-border bg-success-bg font-semibold text-success-foreground"
                  : "border-border bg-background text-foreground",
              )}
            >
              <span>{opt}</span>
              {correct ? <span aria-hidden>✔</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-[268px] items-start gap-2.5 rounded-3xl rounded-bl-lg border border-accent-border bg-accent p-3.5 text-accent-foreground shadow-[0_24px_48px_-12px_rgba(53,111,167,0.18)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-accent-foreground">
        AI
      </span>
      <p className="text-[13px] leading-snug">{children}</p>
    </div>
  );
}

export type ChipTone = "primary" | "pink" | "vanilla" | "lavender";

const CHIP_TONES: Record<ChipTone, string> = {
  primary: "border-primary-pastel/70 bg-primary-light text-primary",
  pink: "border-secondary-pastel bg-secondary-light text-secondary-foreground",
  vanilla: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
  lavender: "border-accent-border bg-accent text-accent-foreground",
};

export function Chip({
  children,
  tone = "primary",
  display = false,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  display?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold shadow-[0_24px_48px_-12px_rgba(53,111,167,0.18)]",
        display && "font-display italic",
        CHIP_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
