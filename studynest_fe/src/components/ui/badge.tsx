"use client";

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
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pill?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-[#E8F2FA] text-[#356FA7] border-[#BFD7ED]/70",
  primary: "bg-[#356FA7] text-white border-[#356FA7]",
  secondary: "bg-[#FCE8EF] text-[#3D4A5A] border-[#F7C9D9]",
  lavender: "bg-[#E3D5F5]/60 text-[#3D4A5A] border-[#E3D5F5]",
  vanilla: "bg-[#F8E9C9]/70 text-[#875415] border-[#F8E9C9]",
  success: "bg-[#E4F3E9] text-[#276749] border-[#C3E4CE]",
  warning: "bg-[#FFF1D9] text-[#875415] border-[#F5D9A6]",
  destructive: "bg-[#FCE8E8] text-[#A23C46] border-[#F5C2C7]",
  outline: "bg-white text-[#6F7C8C] border-[#E7EEF7]",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", pill = true, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
          pill ? "rounded-full" : "rounded-lg",
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
