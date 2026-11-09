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
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-primary-light text-primary border-primary-pastel/60",
  primary: "bg-primary text-primary-foreground border-transparent",
  secondary: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  lavender: "bg-accent text-accent-foreground border-accent-border",
  vanilla:
    "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  success: "bg-success-bg text-success-foreground border-success-border",
  warning: "bg-warning-bg text-warning-foreground border-warning-border",
  destructive:
    "bg-destructive-bg text-destructive-foreground border-destructive-border",
  info: "bg-info-bg text-info-foreground border-info-border",
  outline: "bg-surface text-muted-foreground border-border",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium leading-none transition-colors",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
