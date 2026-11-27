"use client";

/**
 * Bộ primitive dùng chung cho các section bên dưới hero (đồng nhất với hero Three.js).
 * Ngôn ngữ: Cloudy Blue — nền pastel gradient + "mây" mờ, thẻ kính nổi, tiêu đề Lora.
 * CHỈ dùng semantic tokens; không hardcode màu neon/xanh lục.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ElementType, ReactNode } from "react";

export type Tone = "blue" | "pink" | "lavender" | "vanilla" | "success";

/** Cặp class nền/chữ/viền pastel theo tone (đã kiểm tra tương phản AA). */
export const TONE: Record<Tone, { bg: string; fg: string; border: string; solid: string }> = {
  blue: { bg: "bg-primary-light", fg: "text-primary", border: "border-primary-pastel", solid: "bg-primary text-primary-foreground" },
  pink: { bg: "bg-secondary", fg: "text-secondary-foreground", border: "border-secondary-pastel", solid: "bg-secondary-foreground text-primary-foreground" },
  lavender: { bg: "bg-accent", fg: "text-accent-foreground", border: "border-accent-border", solid: "bg-accent-foreground text-primary-foreground" },
  vanilla: { bg: "bg-accent-vanilla", fg: "text-accent-vanilla-foreground", border: "border-accent-vanilla-border", solid: "bg-accent-vanilla-foreground text-primary-foreground" },
  success: { bg: "bg-success-bg", fg: "text-success-foreground", border: "border-success-border", solid: "bg-success-foreground text-primary-foreground" },
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

/** Fade-up khi vào viewport; tắt khi prefers-reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "article" | "section";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as ElementType;
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Đốm "mây" mờ trang trí. */
export function CloudBlob({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cx("pointer-events-none absolute rounded-full bg-white/70 blur-3xl", className)}
    />
  );
}

const SHELL_BG = {
  /** Nối từ hero: kem/hồng nhạt → trắng ánh xanh */
  sky: "bg-gradient-to-b from-surface-muted/80 via-surface/80 to-background/80",
  plain: "bg-gradient-to-b from-background/80 via-surface/80 to-background/80",
  warm: "bg-gradient-to-b from-background/80 via-surface-muted/80 to-surface-muted/80",
  blue: "bg-gradient-to-b from-background/80 via-primary-light/50 to-background/80",
} as const;

/** Vỏ section: nền gradient + mây mờ + container chuẩn. */
export function SectionShell({
  id,
  tone = "plain",
  clouds = true,
  className,
  innerClassName,
  children,
  label,
}: {
  id?: string;
  tone?: keyof typeof SHELL_BG;
  clouds?: boolean;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  label?: string;
}) {
  return (
    <section id={id} aria-label={label} className={cx("relative overflow-hidden", SHELL_BG[tone], className)}>
      {clouds && (
        <>
          <CloudBlob className="-left-24 top-10 h-64 w-96" />
          <CloudBlob className="-right-32 bottom-8 h-72 w-[28rem] bg-primary-pastel/40" />
        </>
      )}
      <div className={cx("relative mx-auto w-full max-w-none px-3 py-12 sm:px-5 md:py-16 lg:px-8 group-data-[layout=updated]/user-layout:user-container group-data-[layout=updated]/user-layout:py-10 sm:group-data-[layout=updated]/user-layout:py-14", innerClassName)}>{children}</div>
    </section>
  );
}

/** Eyebrow pill + tiêu đề Lora + mô tả. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  tone = "blue",
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: Tone;
  align?: "center" | "left";
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <Reveal className={cx("mb-12 flex flex-col gap-4 md:mb-16 group-data-[layout=updated]/user-layout:mb-7 group-data-[layout=updated]/user-layout:gap-3 sm:group-data-[layout=updated]/user-layout:mb-10", align === "center" ? "items-center text-center" : "items-start text-left", className)}>
      {eyebrow && (
        <span className={cx("inline-flex rounded-full border px-3.5 py-1 text-xs font-semibold", t.bg, t.fg, t.border)}>
          {eyebrow}
        </span>
      )}
      <h2 className="font-display max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">{title}</h2>
      {description && <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>}
    </Reveal>
  );
}

/** Thẻ kính nổi giống thẻ trong hero; hover nâng + nghiêng nhẹ. */
export function GlassCard({
  children,
  className,
  tilt = true,
  as: Comp = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
  as?: ElementType;
} & Record<string, unknown>) {
  return (
    <Comp
      {...rest}
      className={cx(
        "rounded-3xl border border-border bg-surface/90 shadow-[0_24px_48px_-12px_rgba(53,111,167,0.18)] backdrop-blur-sm",
        "transition-transform duration-300 ease-out motion-reduce:transition-none",
        tilt &&
          "hover:-translate-y-1.5 hover:[transform:perspective(900px)_translateY(-6px)_rotateX(2deg)_rotateY(-3deg)] motion-reduce:hover:transform-none",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/** Vòng tròn/ô vuông bo chứa icon, nền pastel theo tone. */
export function IconBubble({
  tone = "blue",
  children,
  className,
  shape = "squircle",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  shape?: "circle" | "squircle";
}) {
  const t = TONE[tone];
  return (
    <span
      className={cx(
        "inline-flex h-14 w-14 shrink-0 items-center justify-center border",
        shape === "circle" ? "rounded-full" : "rounded-2xl",
        t.bg,
        t.fg,
        t.border,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Chip/pill nhỏ. */
export function Pill({ tone = "blue", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", t.bg, t.fg, t.border, className)}>
      {children}
    </span>
  );
}
