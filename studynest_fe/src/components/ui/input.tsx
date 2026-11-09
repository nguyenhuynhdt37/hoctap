"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          aria-invalid={error}
          className={cn(
            "flex h-11 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#3D4A5A] placeholder:text-[#8190A3] transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#356FA7]/25 focus:border-[#356FA7]",
            "disabled:cursor-not-allowed disabled:bg-[#F6FAFF] disabled:text-[#8190A3] disabled:opacity-70",
            error
              ? "border-[#A23C46] bg-[#FCE8E8]/20 focus:border-[#A23C46] focus:ring-[#A23C46]/20"
              : "border-[#E7EEF7] hover:border-[#BFD7ED]",
            className
          )}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-[#A23C46] font-medium" : "text-[#6F7C8C]"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          aria-invalid={error}
          className={cn(
            "flex min-h-[100px] w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#3D4A5A] placeholder:text-[#8190A3] transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#356FA7]/25 focus:border-[#356FA7]",
            "disabled:cursor-not-allowed disabled:bg-[#F6FAFF] disabled:text-[#8190A3] disabled:opacity-70",
            error
              ? "border-[#A23C46] bg-[#FCE8E8]/20 focus:border-[#A23C46] focus:ring-[#A23C46]/20"
              : "border-[#E7EEF7] hover:border-[#BFD7ED]",
            className
          )}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-[#A23C46] font-medium" : "text-[#6F7C8C]"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={error}
        className={cn(
          "flex h-11 w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-[#3D4A5A] transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[#356FA7]/25 focus:border-[#356FA7]",
          "disabled:cursor-not-allowed disabled:bg-[#F6FAFF] disabled:text-[#8190A3] disabled:opacity-70",
          error
            ? "border-[#A23C46] bg-[#FCE8E8]/20"
            : "border-[#E7EEF7] hover:border-[#BFD7ED]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#356FA7] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[#356FA7]" : "bg-[#E7EEF7]",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";
