"use client";

import { HiCheckCircle, HiCloud } from "react-icons/hi";

interface OutcomesSectionProps {
  outcomes: string[];
}

export default function OutcomesSection({ outcomes }: OutcomesSectionProps) {
  if (!outcomes || outcomes.length === 0) return null;

  return (
    <section className="rounded-[24px] bg-gradient-to-br from-primary-light/85 via-surface to-secondary-light/35 border border-primary-pastel p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-2xs shrink-0">
          <HiCloud className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
            Mục tiêu khóa học
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Bạn sẽ đạt được gì sau khóa học?
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {outcomes.map((outcome, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-4 bg-surface/90 rounded-2xl border border-white/90 shadow-2xs hover:border-primary-pastel transition-all"
          >
            <HiCheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground font-medium leading-relaxed">
              {outcome}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
