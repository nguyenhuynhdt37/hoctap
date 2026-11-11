"use client";

import { HiCheck } from "react-icons/hi";

interface RequirementsSectionProps {
  requirements: string[];
}

export default function RequirementsSection({
  requirements,
}: RequirementsSectionProps) {
  if (!requirements || requirements.length === 0) return null;

  return (
    <section className="bg-surface rounded-[24px] shadow-xs border border-border p-6 sm:p-8">
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
        Chuẩn bị trước khi học
      </span>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">
        Yêu cầu đầu vào
      </h2>
      <ul className="space-y-2.5">
        {requirements.map((req, index) => (
          <li
            key={index}
            className="flex items-start gap-3 p-3.5 bg-background rounded-2xl border border-border/80"
          >
            <span className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center mt-0.5 shrink-0">
              <HiCheck className="w-3.5 h-3.5" />
            </span>
            <span className="text-foreground text-sm leading-relaxed">
              {req}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
