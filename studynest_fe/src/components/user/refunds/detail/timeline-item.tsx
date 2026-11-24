import { Check, Clock } from "pulsoicon-react";
import { cn } from "@/lib/utils";

interface TimelineItemProps {
  title: string;
  timeLabel: string;
  description?: string | null;
  isDone: boolean;
  isActive?: boolean;
  isLast?: boolean;
}

function stripHtml(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function TimelineItem({
  title,
  timeLabel,
  description,
  isDone,
  isActive = false,
  isLast = false,
}: TimelineItemProps) {
  const cleanDescription = stripHtml(description);

  return (
    <div className="relative flex items-start gap-3.5 pb-4 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-7 bottom-0 left-[13px] w-0.5",
            isDone ? "bg-success-border" : "bg-border",
          )}
        />
      )}

      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2",
          isDone
            ? "border-success-border bg-success-bg text-success-foreground"
            : isActive
              ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
              : "border-border bg-background text-muted-foreground",
        )}
      >
        {isDone ? (
          <Check animated={false} className="size-3.5" />
        ) : (
          <Clock animated={false} className="size-3.5" />
        )}
      </span>

      <div className="min-w-0 flex-1 rounded-2xl border border-border/75 bg-background/65 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-foreground">{title}</p>
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
            {timeLabel}
          </span>
        </div>
        {cleanDescription && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {cleanDescription}
          </p>
        )}
      </div>
    </div>
  );
}
