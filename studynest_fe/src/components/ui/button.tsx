"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "pastel";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#356FA7] text-white hover:bg-[#285C90] active:bg-[#214B75] shadow-sm border border-transparent",
  secondary:
    "bg-[#FCE8EF] text-[#3D4A5A] hover:bg-[#F7C9D9] active:bg-[#F0ACC4] border border-[#F7C9D9]/60",
  pastel:
    "bg-[#E8F2FA] text-[#356FA7] hover:bg-[#BFD7ED] active:bg-[#9BC2E6] border border-[#BFD7ED]/60",
  outline:
    "bg-white text-[#356FA7] border border-[#BFD7ED] hover:bg-[#E8F2FA] hover:border-[#356FA7]/40 active:bg-[#BFD7ED]/40",
  ghost:
    "bg-transparent text-[#3D4A5A] hover:bg-[#E8F2FA] hover:text-[#356FA7] active:bg-[#BFD7ED]/40 border border-transparent",
  destructive:
    "bg-[#FCE8E8] text-[#A23C46] hover:bg-[#A23C46] hover:text-white active:bg-[#872F38] border border-[#F5C2C7]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 py-3 text-base rounded-xl gap-2.5",
  icon: "h-10 w-10 p-2 rounded-xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#356FA7] focus-visible:ring-offset-2",
          "disabled:opacity-55 disabled:pointer-events-none disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span
            className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
            aria-hidden="true"
          />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
