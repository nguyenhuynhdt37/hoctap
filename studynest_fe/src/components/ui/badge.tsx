import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "lavender"
  | "vanilla"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "neutral"
  | "outline";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-primary-light text-primary border-primary-pastel/70",
  primary: "bg-primary text-primary-foreground border-transparent",
  secondary:
    "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  lavender: "bg-accent text-accent-foreground border-accent-border",
  vanilla:
    "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  success: "bg-success-bg text-success-foreground border-success-border",
  warning: "bg-warning-bg text-warning-foreground border-warning-border",
  destructive:
    "bg-destructive-bg text-destructive-foreground border-destructive-border",
  info: "bg-info-bg text-info-foreground border-info-border",
  neutral: "bg-background text-muted-foreground border-border",
  outline: "bg-surface text-muted-foreground border-border",
};

const badgeDotColors: Record<BadgeVariant, string> = {
  default: "bg-primary",
  primary: "bg-primary-foreground",
  secondary: "bg-secondary-foreground",
  lavender: "bg-accent-foreground",
  vanilla: "bg-accent-vanilla-foreground",
  success: "bg-success-foreground",
  warning: "bg-warning-foreground",
  destructive: "bg-destructive-foreground",
  info: "bg-info-foreground",
  neutral: "bg-muted-foreground",
  outline: "bg-muted-foreground",
};

const badgeSizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium leading-none tracking-tight select-none transition-colors",
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            badgeDotColors[variant]
          )}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
