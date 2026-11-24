import { Card } from "@/components/ui";
import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  rightSlot?: ReactNode;
  accent?: "primary" | "secondary" | "vanilla";
  children: ReactNode;
}

const headerBgMap = {
  primary: "bg-primary-light/35",
  secondary: "bg-secondary-light/35",
  vanilla: "bg-accent-vanilla/55",
};

export function SectionCard({
  title,
  subtitle,
  icon,
  rightSlot,
  accent = "primary",
  children,
}: SectionCardProps) {
  return (
    <Card
      variant="surface"
      density="none"
      className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 ${headerBgMap[accent]}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel/70 bg-surface text-primary shadow-2xs">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-foreground truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}
