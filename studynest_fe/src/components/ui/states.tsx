"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "destructive";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
  hideDefaultIcon?: boolean;
  onClose?: () => void;
}

const alertVariants: Record<AlertVariant, string> = {
  info: "bg-info-bg text-info-foreground border-info-border",
  success: "bg-success-bg text-success-foreground border-success-border",
  warning: "bg-warning-bg text-warning-foreground border-warning-border",
  destructive:
    "bg-destructive-bg text-destructive-foreground border-destructive-border",
};

const defaultAlertIcons: Record<AlertVariant, React.ReactNode> = {
  info: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  destructive: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "info",
      title,
      icon,
      hideDefaultIcon = false,
      onClose,
      children,
      ...props
    },
    ref
  ) => {
    const resolvedIcon =
      icon !== undefined ? icon : hideDefaultIcon ? null : defaultAlertIcons[variant];

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
        {resolvedIcon && <div className="shrink-0 mt-0.5">{resolvedIcon}</div>}
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div>{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thông báo"
            className="shrink-0 rounded-lg p-1 text-current/70 hover:text-current hover:bg-surface/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rect" | "circle" | "text";
}

export function Skeleton({
  className,
  variant = "rect",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-primary-light/85",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4 rounded-md",
        variant === "rect" && "rounded-xl",
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
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[20px] border border-border bg-surface text-center shadow-xs",
        compact ? "p-6" : "p-10",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-2xl bg-primary-light text-primary",
            compact ? "h-11 w-11" : "h-14 w-14"
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          "font-semibold text-foreground mb-1.5",
          compact ? "text-base" : "text-lg"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "max-w-md text-sm text-muted-foreground leading-relaxed",
            action ? "mb-5" : "mb-0"
          )}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export type ProgressVariant =
  | "primary"
  | "success"
  | "warning"
  | "destructive";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: "sm" | "md" | "lg";
  label?: React.ReactNode;
  showValue?: boolean;
}

const progressBarColors: Record<ProgressVariant, string> = {
  primary: "bg-primary",
  success: "bg-success-foreground",
  warning: "bg-warning-foreground",
  destructive: "bg-destructive-foreground",
};

const progressSizes = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

export function Progress({
  value,
  max = 100,
  variant = "primary",
  size = "md",
  label,
  showValue = false,
  className,
  ...props
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(0, value), safeMax);
  const percentage = Math.round((clamped / safeMax) * 100);

  return (
    <div className={cn("w-full", className)} {...props}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
          {label && <span className="text-foreground">{label}</span>}
          {showValue && (
            <span className="text-muted-foreground">{percentage}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={typeof label === "string" ? label : "Tiến độ"}
        className={cn(
          "w-full overflow-hidden rounded-full bg-primary-light",
          progressSizes[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-200",
            progressBarColors[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  label?: React.ReactNode;
}

export function Divider({
  orientation = "horizontal",
  label,
  className,
  ...props
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("h-full w-px shrink-0 bg-border", className)}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn("relative flex items-center py-2", className)}
        {...props}
      >
        <div className="grow border-t border-border" />
        <span className="mx-3 shrink-0 text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <div className="grow border-t border-border" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("h-px w-full shrink-0 bg-border", className)}
      {...props}
    />
  );
}
