"use client";

import { useState } from "react";
import { HiDownload } from "react-icons/hi";
import { cn } from "@/lib/utils";

export interface ExportButtonProps {
  onExport: () => Promise<void>;
  loading?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export default function ExportButton({
  onExport,
  loading = false,
  className = "",
  variant = "outline",
  size = "md",
  children,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active border border-transparent shadow-2xs",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary-hover border border-secondary-pastel/70",
    outline:
      "bg-surface text-foreground border border-border hover:bg-background hover:border-primary-pastel",
  };

  const sizeClasses = {
    sm: "h-9 px-3.5 text-sm gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2.5",
  };

  const isLoading = loading || isExporting;

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-75 disabled:cursor-wait",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {isLoading ? (
        <div
          className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        <HiDownload className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      <span>{children || (isLoading ? "Đang xuất..." : "Xuất Excel")}</span>
    </button>
  );
}
