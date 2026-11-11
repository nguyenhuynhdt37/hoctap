"use client";

import { HiUserGroup } from "react-icons/hi";

interface TargetAudienceSectionProps {
  targetAudience: string[];
}

export default function TargetAudienceSection({
  targetAudience,
}: TargetAudienceSectionProps) {
  if (!targetAudience || targetAudience.length === 0) return null;

  return (
    <section className="bg-surface rounded-[24px] shadow-xs border border-border p-6 sm:p-8">
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
        Phù hợp với ai?
      </span>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">
        Đối tượng học viên
      </h2>
      <ul className="space-y-2.5">
        {targetAudience.map((audience, index) => (
          <li
            key={index}
            className="flex items-start gap-3 p-3.5 bg-secondary-light/40 rounded-2xl border border-secondary-pastel/70"
          >
            <span className="w-6 h-6 rounded-full bg-secondary-light text-secondary-foreground flex items-center justify-center mt-0.5 shrink-0">
              <HiUserGroup className="w-3.5 h-3.5" />
            </span>
            <span className="text-foreground text-sm leading-relaxed">
              {audience}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
