"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "destructive";
  title?: string;
  icon?: React.ReactNode;
}

const alertVariants = {
  info: "bg-[#E8F2FA] text-[#3D4A5A] border-[#BFD7ED]",
  success: "bg-[#E4F3E9] text-[#276749] border-[#C3E4CE]",
  warning: "bg-[#FFF1D9] text-[#875415] border-[#F5D9A6]",
  destructive: "bg-[#FCE8E8] text-[#A23C46] border-[#F5C2C7]",
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
        "animate-pulse rounded-xl bg-[#E8F2FA]/80",
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
        "flex flex-col items-center justify-center rounded-2xl border border-[#E7EEF7] bg-white p-10 text-center shadow-sm",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F2FA] text-[#356FA7]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#3D4A5A] mb-1.5">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-[#6F7C8C] leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
