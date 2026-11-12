import { type ReactNode } from "react";

interface DetailRowProps {
  label: string;
  value: string | ReactNode;
  onCopy?: () => void;
}

export function DetailRow({ label, value, onCopy }: DetailRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-border/70 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

