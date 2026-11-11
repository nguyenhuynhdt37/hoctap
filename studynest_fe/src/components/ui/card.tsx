import * as React from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "surface" | "muted" | "pastel-blue" | "pastel-pink";
export type CardDensity = "default" | "compact" | "none";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  density?: CardDensity;
  interactive?: boolean;
  selected?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  surface: "bg-surface border-border text-foreground",
  muted: "bg-surface-muted border-border text-foreground",
  "pastel-blue": "bg-primary-light/70 border-primary-pastel text-foreground",
  "pastel-pink": "bg-secondary-light/65 border-secondary-pastel text-foreground",
};

const densityStyles: Record<CardDensity, string> = {
  default: "p-6",
  compact: "p-4",
  none: "p-0",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "surface",
      density = "default",
      interactive = false,
      selected = false,
      tabIndex,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        tabIndex={interactive && tabIndex === undefined ? 0 : tabIndex}
        data-selected={selected ? "true" : undefined}
        className={cn(
          "rounded-[20px] border shadow-xs transition-all duration-200",
          variantStyles[variant],
          densityStyles[density],
          interactive &&
            "cursor-pointer hover:border-primary-pastel hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected &&
            "border-primary ring-2 ring-primary/20 shadow-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5",
        compact ? "p-4" : "p-6",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-snug tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(compact ? "p-4 pt-0" : "p-6 pt-0", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center border-t border-border",
        compact ? "p-4 pt-3" : "p-6 pt-4",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
