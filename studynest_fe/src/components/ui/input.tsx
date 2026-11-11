"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  success?: string | boolean;
  hint?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      id,
      label,
      error,
      success,
      hint,
      helperText,
      leftIcon,
      rightIcon,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const description = helperText ?? hint;
    const successMessage = typeof success === "string" ? success : undefined;
    const messageId = `${inputId}-message`;
    const hasMessage = Boolean(error || successMessage || description);

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "mb-1.5 block text-sm font-medium text-foreground",
              disabled && "text-disabled-foreground"
            )}
          >
            {label}
            {required && (
              <span className="ml-1 text-destructive-foreground" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="pointer-events-none absolute left-3.5 flex items-center text-muted-foreground"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className={cn(
              "h-11 w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground",
              "transition-all duration-150",
              "hover:border-primary-pastel",
              "focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/15",
              "disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              Boolean(success) &&
                !error &&
                "border-success-foreground focus:border-success-foreground focus:ring-success-foreground/15",
              error &&
                "border-destructive-foreground focus:border-destructive-foreground focus:ring-destructive-foreground/15",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 flex items-center text-muted-foreground">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p
            id={messageId}
            role="alert"
            className="mt-1.5 text-xs font-medium text-destructive-foreground"
          >
            {error}
          </p>
        ) : successMessage ? (
          <p
            id={messageId}
            className="mt-1.5 text-xs font-medium text-success-foreground"
          >
            {successMessage}
          </p>
        ) : description ? (
          <p id={messageId} className="mt-1.5 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: string;
  success?: string | boolean;
  hint?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      containerClassName,
      id,
      label,
      error,
      success,
      hint,
      helperText,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const description = helperText ?? hint;
    const successMessage = typeof success === "string" ? success : undefined;
    const messageId = `${textareaId}-message`;
    const hasMessage = Boolean(error || successMessage || description);

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              "mb-1.5 block text-sm font-medium text-foreground",
              disabled && "text-disabled-foreground"
            )}
          >
            {label}
            {required && (
              <span className="ml-1 text-destructive-foreground" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            "min-h-[104px] w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground",
            "transition-all duration-150",
            "hover:border-primary-pastel",
            "focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/15",
            "disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
            Boolean(success) &&
              !error &&
              "border-success-foreground focus:border-success-foreground focus:ring-success-foreground/15",
            error &&
              "border-destructive-foreground focus:border-destructive-foreground focus:ring-destructive-foreground/15",
            className
          )}
          {...props}
        />
        {error ? (
          <p
            id={messageId}
            role="alert"
            className="mt-1.5 text-xs font-medium text-destructive-foreground"
          >
            {error}
          </p>
        ) : successMessage ? (
          <p
            id={messageId}
            className="mt-1.5 text-xs font-medium text-success-foreground"
          >
            {successMessage}
          </p>
        ) : description ? (
          <p id={messageId} className="mt-1.5 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: string;
  success?: string | boolean;
  hint?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      id,
      label,
      error,
      success,
      hint,
      helperText,
      required,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const description = helperText ?? hint;
    const successMessage = typeof success === "string" ? success : undefined;
    const messageId = `${selectId}-message`;
    const hasMessage = Boolean(error || successMessage || description);

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              "mb-1.5 block text-sm font-medium text-foreground",
              disabled && "text-disabled-foreground"
            )}
          >
            {label}
            {required && (
              <span className="ml-1 text-destructive-foreground" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            required={required}
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className={cn(
              "h-11 w-full appearance-none rounded-xl border border-input bg-surface pl-3.5 pr-10 py-2.5 text-sm text-foreground",
              "transition-all duration-150",
              "hover:border-primary-pastel",
              "focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/15",
              "disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
              Boolean(success) &&
                !error &&
                "border-success-foreground focus:border-success-foreground focus:ring-success-foreground/15",
              error &&
                "border-destructive-foreground focus:border-destructive-foreground focus:ring-destructive-foreground/15",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <span
            className="pointer-events-none absolute right-3.5 flex items-center text-muted-foreground"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 8l4 4 4-4"
              />
            </svg>
          </span>
        </div>
        {error ? (
          <p
            id={messageId}
            role="alert"
            className="mt-1.5 text-xs font-medium text-destructive-foreground"
          >
            {error}
          </p>
        ) : successMessage ? (
          <p
            id={messageId}
            className="mt-1.5 text-xs font-medium text-success-foreground"
          >
            {successMessage}
          </p>
        ) : description ? (
          <p id={messageId} className="mt-1.5 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = "Select";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, id, label, description, error, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;
    const descId = `${checkboxId}-desc`;

    return (
      <div className="flex flex-col">
        <div className="flex items-start gap-2.5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={description || error ? descId : undefined}
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 rounded-md border border-border-strong bg-surface text-primary accent-primary",
              "transition-colors duration-150 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive-foreground",
              className
            )}
            {...props}
          />
          {(label || description) && (
            <div className="flex flex-col text-sm leading-snug">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "font-medium text-foreground cursor-pointer select-none",
                    disabled && "cursor-not-allowed text-disabled-foreground"
                  )}
                >
                  {label}
                </label>
              )}
              {description && (
                <p id={descId} className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        {error && (
          <p
            id={descId}
            role="alert"
            className="mt-1 text-xs font-medium text-destructive-foreground"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export interface SwitchProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onChange"
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  size?: "sm" | "md";
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      id,
      checked,
      defaultChecked = false,
      onCheckedChange,
      label,
      description,
      size = "md",
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;
    const [internalChecked, setInternalChecked] =
      React.useState(defaultChecked);
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : internalChecked;

    const handleToggle = () => {
      if (disabled) return;
      const next = !isChecked;
      if (!isControlled) {
        setInternalChecked(next);
      }
      onCheckedChange?.(next);
    };

    const trackSize =
      size === "sm" ? "h-5 w-9 p-0.5" : "h-6 w-11 p-0.5";
    const thumbSize =
      size === "sm"
        ? cn("h-4 w-4", isChecked ? "translate-x-4" : "translate-x-0")
        : cn("h-5 w-5", isChecked ? "translate-x-5" : "translate-x-0");

    return (
      <div className="inline-flex items-start gap-3">
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={isChecked}
          disabled={disabled}
          onClick={handleToggle}
          className={cn(
            "relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isChecked
              ? "bg-primary"
              : "bg-primary-pastel/75 hover:bg-primary-pastel",
            disabled &&
              "cursor-not-allowed opacity-50 bg-disabled border-disabled-border",
            trackSize,
            className
          )}
          {...props}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none inline-block rounded-full bg-surface shadow-2xs transition-transform duration-200",
              thumbSize
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col text-sm leading-snug">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  "font-medium text-foreground cursor-pointer select-none",
                  disabled && "cursor-not-allowed text-disabled-foreground"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Switch.displayName = "Switch";
