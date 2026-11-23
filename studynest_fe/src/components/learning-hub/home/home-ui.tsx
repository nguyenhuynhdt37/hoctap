import { StudyImage } from "@/components/user/home/study-image";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/** Đám mây phồng vẽ bằng SVG, tô theo màu chữ hiện tại. */
export function CloudShape({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 90" className={cn("fill-current", className)}>
      <circle cx="58" cy="54" r="26" />
      <circle cx="96" cy="38" r="32" />
      <circle cx="138" cy="48" r="28" />
      <circle cx="168" cy="62" r="18" />
      <circle cx="34" cy="66" r="16" />
      <rect x="34" y="56" width="148" height="24" rx="12" />
    </svg>
  );
}

/** Vé có hai khuyết tròn ở mép trái/phải tại độ cao `y`. Bọc ngoài bằng drop-shadow. */
export function ticketMask(y: string, radius = 12): CSSProperties {
  const mask = `radial-gradient(circle ${radius}px at 0 ${y}, transparent 96%, black 100%), radial-gradient(circle ${radius}px at 100% ${y}, transparent 96%, black 100%)`;
  return { WebkitMask: mask, mask, WebkitMaskComposite: "source-in", maskComposite: "intersect" } as CSSProperties;
}

/** Phiếu có đường đục lỗ dọc tại `x`: hai khuyết tròn ở mép trên và dưới. */
export function voucherMask(x: string, radius = 10): CSSProperties {
  const mask = `radial-gradient(circle ${radius}px at ${x} 0, transparent 96%, black 100%), radial-gradient(circle ${radius}px at ${x} 100%, transparent 96%, black 100%)`;
  return { WebkitMask: mask, mask, WebkitMaskComposite: "source-in", maskComposite: "intersect" } as CSSProperties;
}

export function ProgressRing({ value, max = 100, size = 56, stroke = 6, label, tone = "primary", className, children }: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label: string;
  tone?: "primary" | "success";
  className?: string;
  children?: ReactNode;
}) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(safeMax, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={clamped}
      className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-primary-pastel/70" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped / safeMax)}
          className={cn("transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none", tone === "success" ? "stroke-success-foreground" : "stroke-primary")} />
      </svg>
      <span className="relative grid place-items-center">{children}</span>
    </span>
  );
}

/** Con dấu tròn "đã dán". `fresh` chạy chuyển động đóng dấu một lần. */
export function Seal({ children, fresh = false, className }: { children: ReactNode; fresh?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn(
      "grid size-16 -rotate-[8deg] place-items-center rounded-full border-4 border-double border-success-foreground bg-success-bg text-success-foreground",
      fresh && "stamp-down", className,
    )}>
      {children}
    </span>
  );
}

export function ThinBar({ value, className, label }: { value: number; className?: string; label: string }) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      className={cn("block h-2 w-full overflow-hidden rounded-full bg-primary-light", className)}>
      <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </span>
  );
}

/**
 * Ảnh khóa/combo/lộ trình: khung 16:9 cố định, hiển thị TOÀN BỘ ảnh (object-contain),
 * nền là chính ảnh đó làm mờ để ảnh khác tỉ lệ vẫn không có thanh trống.
 */
export function CourseThumb({ src, alt = "", sizes, fallback, priority = false, className }: {
  src?: string | null; alt?: string; sizes: string; fallback?: string; priority?: boolean; className?: string;
}) {
  return (
    <span className={cn("relative block aspect-video w-full overflow-hidden bg-primary-light", className)}>
      <span aria-hidden="true" className="absolute inset-0 block">
        <StudyImage src={src} fallback={fallback} sizes="64px" className="absolute inset-0 size-full scale-125 rounded-none blur-xl" />
      </span>
      <StudyImage src={src} fallback={fallback} alt={alt} sizes={sizes} priority={priority} imageClassName="object-contain" className="absolute inset-0 size-full rounded-none bg-transparent" />
    </span>
  );
}

/** Vé khóa học: ảnh 16:9 nguyên vẹn ở trên, chữ nằm dưới ảnh. Khuyết tròn chỉ nằm ở vùng chữ. */
export function TicketCard({ src, alt, sizes, fallback, priority, className, captionClassName, children }: {
  src?: string | null; alt?: string; sizes: string; fallback?: string; priority?: boolean;
  className?: string; captionClassName?: string; children: ReactNode;
}) {
  return (
    <div className={cn("relative drop-shadow-lg", className)}>
      <article style={ticketMask("calc(100% - 2.25rem)", 9)} className="relative flex flex-col overflow-hidden rounded-[1.5rem] bg-surface text-foreground">
        <CourseThumb src={src} alt={alt} sizes={sizes} fallback={fallback} priority={priority} />
        <div className={cn("relative min-w-0 border-t-2 border-dashed border-primary-pastel px-5 py-3", captionClassName)}>{children}</div>
      </article>
    </div>
  );
}

export const stretchedLink = "rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-4 focus-visible:after:ring-inset focus-visible:after:ring-ring";
