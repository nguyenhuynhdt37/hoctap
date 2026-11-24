import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, icon, children }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-xs">
      <div className="flex items-center gap-2.5 border-b border-border/70 bg-primary-light/40 px-5 py-3.5 sm:px-6">
        {icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary-pastel bg-surface text-primary shadow-2xs">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
