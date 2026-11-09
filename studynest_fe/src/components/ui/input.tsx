"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, hint, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-muted-foreground pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-11 rounded-xl bg-surface border border-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground",
              "transition-all duration-150",
              "focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/15",
              "disabled:bg-disabled disabled:text-disabled-foreground disabled:border-disabled-border disabled:cursor-not-allowed",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error &&
                "border-destructive-foreground focus:border-destructive-foreground focus:ring-destructive-foreground/15",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-muted-foreground flex items-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-destructive-foreground">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, hint, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            "w-full min-h-[100px] rounded-xl bg-surface border border-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground",
            "transition-all duration-150",
            "focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/15",
            "disabled:bg-disabled disabled:text-disabled-foreground disabled:border-disabled-border disabled:cursor-not-allowed",
            error &&
              "border-destructive-foreground focus:border-destructive-foreground focus:ring-destructive-foreground/15",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-destructive-foreground">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            "w-full h-11 rounded-xl bg-surface border border-input px-3.5 py-2.5 text-sm text-foreground",
            "transition-all duration-150",
            "focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/15",
            "disabled:bg-disabled disabled:text-disabled-foreground disabled:border-disabled-border disabled:cursor-not-allowed",
            error &&
              "border-destructive-foreground focus:border-destructive-foreground focus:ring-destructive-foreground/15",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-destructive-foreground">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
