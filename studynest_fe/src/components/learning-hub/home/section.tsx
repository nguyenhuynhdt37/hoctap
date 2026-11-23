"use client";

import { Skeleton } from "@/components/ui";
import { courseActionClass, courseLinkFocusClass } from "@/components/user/home/courses/course-card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

export { vietnamTimeZone } from "./journey-state";
export const number = new Intl.NumberFormat("vi-VN");
export const homeWidth = "mx-auto w-full max-w-7xl px-5 sm:px-8";

export function HomeLink({ href, children, primary, icon, className, endIcon = true, onClick, describedBy }: {
  href: string;
  children: ReactNode;
  primary?: boolean;
  icon?: ReactNode;
  className?: string;
  endIcon?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  describedBy?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-describedby={describedBy}
      className={cn(
        courseActionClass, courseLinkFocusClass,
        "inline-flex w-fit max-w-full items-center justify-center gap-2 px-4 py-2.5 text-start text-sm font-semibold transition-colors",
        primary ? "bg-primary text-primary-foreground shadow-ambient-sm hover:bg-primary-hover"
          : "border border-primary-pastel bg-surface text-info-foreground hover:bg-primary-light",
        className,
      )}
    >
      {icon}
      {children}
      {endIcon && <ArrowRight aria-hidden="true" className="size-4 shrink-0" />}
    </Link>
  );
}

export function SectionLoading({ label, className, children }: {
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" aria-label={label} className={cn("space-y-3 rounded-xl border border-border bg-surface p-4 [&_.animate-pulse]:motion-reduce:animate-none", className)}>
      {children ?? <>
        <Skeleton className="h-5 w-2/5 rounded-full" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-3 w-3/4 rounded-full" />
      </>}
    </div>
  );
}
