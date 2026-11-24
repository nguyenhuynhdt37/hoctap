import { CheckCircle2, Clock, XCircle } from "pulsoicon-react";

interface TimelineItemProps {
  title: string;
  time?: string | null;
  description?: string | null;
  done: boolean;
  rejected?: boolean;
  active?: boolean;
  isLast?: boolean;
}

const stripHtml = (input?: string | null) => {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Chưa thực hiện";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

export function TimelineItem({
  title,
  time,
  description,
  done,
  rejected = false,
  active = false,
  isLast = false,
}: TimelineItemProps) {
  const cleanDescription = stripHtml(description);

  return (
    <div className="relative flex gap-3.5">
      {/* Cột node & đường nối */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
            rejected
              ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
              : done
                ? "border-success-border bg-success-bg text-success-foreground"
                : active
                  ? "border-warning-border bg-accent-vanilla text-warning-foreground"
                  : "border-border bg-background text-muted-foreground"
          }`}
        >
          {rejected ? (
            <XCircle animated={false} className="h-4 w-4" aria-hidden="true" />
          ) : done ? (
            <CheckCircle2
              animated={false}
              className="h-4 w-4"
              aria-hidden="true"
            />
          ) : (
            <Clock animated={false} className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        {!isLast && (
          <span
            aria-hidden="true"
            className={`my-1 w-0.5 flex-1 rounded-full ${
              rejected
                ? "bg-destructive-border"
                : done
                  ? "bg-success-border"
                  : "bg-border"
            }`}
          />
        )}
      </div>

      {/* Nội dung bước */}
      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className={`text-sm font-semibold ${
              rejected
                ? "text-destructive-foreground"
                : done || active
                  ? "text-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {title}
          </p>
          <span className="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {formatDateTime(time)}
          </span>
        </div>

        {cleanDescription && (
          <p className="mt-2 rounded-xl border border-border/70 bg-background/70 px-3.5 py-2.5 text-xs leading-relaxed text-foreground/90">
            {cleanDescription}
          </p>
        )}
      </div>
    </div>
  );
}
