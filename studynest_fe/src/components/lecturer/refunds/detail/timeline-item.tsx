interface TimelineItemProps {
  title: string;
  timeLabel: string;
  description?: string | null;
  isDone: boolean;
  isActive: boolean;
  isLast: boolean;
}

export function TimelineItem({
  title,
  timeLabel,
  description,
  isDone,
  isActive,
  isLast,
}: TimelineItemProps) {
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 mt-1 ${
            isDone
              ? "border-primary bg-primary"
              : isActive
                ? "border-warning-foreground bg-warning-bg"
                : "border-border bg-surface"
          }`}
        />
        {!isLast && <div className="flex-1 w-px bg-border mt-1" />}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{timeLabel}</span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

