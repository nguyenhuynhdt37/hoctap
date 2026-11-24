"use client";

import type { ReactNode } from "react";
import { Copy } from "pulsoicon-react";

interface DetailRowProps {
  label: string;
  value: ReactNode;
  onCopy?: () => void;
}

export function DetailRow({ label, value, onCopy }: DetailRowProps) {
  return (
    <div className="flex flex-col justify-between gap-2 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-center">
      <span className="text-xs font-semibold text-muted-foreground sm:min-w-[170px]">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:justify-end">
        <div className="min-w-0 break-words text-xs font-semibold text-foreground sm:text-right">
          {value}
        </div>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Sao chép ${label}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:border-primary-pastel hover:bg-primary-light cursor-pointer"
          >
            <Copy aria-hidden="true" animated={false} className="size-3" />
            <span>Chép</span>
          </button>
        )}
      </div>
    </div>
  );
}
