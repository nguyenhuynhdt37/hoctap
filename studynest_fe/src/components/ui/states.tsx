"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "destructive";
  title?: string;
  icon?: React.ReactNode;
}

const alertVariants = {
  info: "bg-info-bg text-info-foreground border-info-border",
  success: "bg-success-bg text-success-foreground border-success-border",
  warning: "bg-warning-bg text-warning-foreground border-warning-border",
  destructive:
    "bg-destructive-bg text-destructive-foreground border-destructive-border",
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed",
          alertVariants[variant],
          className
        )}
        {...props}
      >
        {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div>{children}</div>
        </div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-primary-light/80",
        className
      )}
      {...props}
    />
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-10 text-center shadow-sm",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
