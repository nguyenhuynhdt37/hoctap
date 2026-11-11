"use client";

import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MiniLoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function MiniLoading({
  text = "Đang tải...",
  size = "md",
  className,
}: MiniLoadingProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-14 h-14",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4.5 h-4.5",
    lg: "w-6 h-6",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 select-none",
        className
      )}
    >
      <div className={cn(sizeClasses[size], "relative flex items-center justify-center")}>
        {/* Vòng xoay ngoài */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary-pastel/60 border-t-primary animate-spin"
          style={{ animationDuration: "1.2s" }}
          aria-hidden="true"
        />

        {/* Khối nền icon trung tâm */}
        <div className="w-3/4 h-3/4 rounded-xl bg-primary-light flex items-center justify-center border border-primary-pastel/50 shadow-2xs">
          <Cloud className={cn(iconSizes[size], "text-primary fill-primary/10")} aria-hidden="true" />
        </div>
      </div>

      {text && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              textSizes[size],
              "font-medium text-muted-foreground tracking-tight"
            )}
          >
            {text}
          </span>
          <div className="flex gap-1 items-center" aria-hidden="true">
            <span
              className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "800ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-secondary-pastel rounded-full animate-bounce"
              style={{ animationDelay: "160ms", animationDuration: "800ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-accent-border rounded-full animate-bounce"
              style={{ animationDelay: "320ms", animationDuration: "800ms" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
