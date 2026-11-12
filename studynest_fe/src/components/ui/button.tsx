"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "pastel"
  | "outline"
  | "ghost"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  selected?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-2xs border border-transparent",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active border border-secondary-pastel/70",
  pastel:
    "bg-primary-light text-primary hover:bg-primary-pastel/65 active:bg-primary-pastel border border-primary-pastel/70",
  outline:
    "bg-surface text-foreground border border-border hover:bg-background hover:border-primary-pastel active:bg-primary-light/60",
  ghost:
    "bg-transparent text-foreground hover:bg-primary-light/70 hover:text-primary active:bg-primary-light border border-transparent",
  destructive:
    "bg-destructive-bg text-destructive-foreground hover:bg-destructive-border/70 active:bg-destructive-border border border-destructive-border",
};

/**
 * Standardized Button Geometry (STEP 2):
 * - Small (sm): 36px height (h-9), 12px radius (rounded-xl)
 * - Medium (md): 40px height (h-10), 12px radius (rounded-xl)
 * - Large (lg): 48px height (h-12), 12px radius (rounded-xl)
 * - Icon (icon): 40x40px (h-10 w-10), 12px radius (rounded-xl)
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2.5",
  icon: "h-10 w-10 rounded-xl p-0 shrink-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      selected = false,
      fullWidth = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled);

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled || isLoading}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || isLoading || undefined}
        aria-pressed={selected || undefined}
        data-loading={isLoading ? "true" : undefined}
        data-selected={selected ? "true" : undefined}
        className={cn(
          "inline-flex items-center justify-center font-medium leading-none transition-all duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:translate-y-[0.5px]",
          variantClasses[variant],
          sizeClasses[size],
          selected &&
            "ring-2 ring-primary/30 border-primary bg-primary-light/80 text-primary",
          isLoading &&
            "cursor-wait opacity-85 pointer-events-none active:translate-y-0",
          isDisabled &&
            !isLoading &&
            "cursor-not-allowed opacity-50 pointer-events-none bg-disabled text-disabled-foreground border-disabled-border shadow-none active:translate-y-0",
          fullWidth && "w-full",
          !isDisabled && !isLoading && "cursor-pointer",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-85"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          leftIcon && (
            <span className="inline-flex shrink-0 items-center" aria-hidden="true">
              {leftIcon}
            </span>
          )
        )}
        {/* Keep the label element stable when loading changes. Translation
            tools may wrap its text nodes; React can safely replace the label's
            content without removing a moved text node from the button. */}
        <span className="inline-flex min-w-0 items-center justify-center gap-2">
          {isLoading && loadingText ? loadingText : children}
        </span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0 items-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
