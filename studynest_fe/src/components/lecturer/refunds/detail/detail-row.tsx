"use client";

import { Check, Copy } from "pulsoicon-react";
import { ReactNode, useState } from "react";

interface DetailRowProps {
  label: string;
  value: ReactNode;
  onCopy?: () => void;
}

export function DetailRow({ label, value, onCopy }: DetailRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    if (!onCopy) return;
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex flex-col gap-1 border-b border-border/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-2 sm:justify-end">
        <div className="min-w-0 break-words text-sm font-medium text-foreground sm:text-right">
          {value}
        </div>
        {onCopy && (
          <button
            type="button"
            onClick={handleCopyClick}
            aria-label={`Sao chép ${label}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer print:hidden"
          >
            {copied ? (
              <>
                <Check animated={false} className="h-3 w-3 text-primary" />
                <span className="text-primary">Đã chép</span>
              </>
            ) : (
              <>
                <Copy animated={false} className="h-3 w-3" />
                <span>Chép</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
