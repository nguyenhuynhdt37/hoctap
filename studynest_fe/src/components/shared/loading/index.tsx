"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Cloud, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const quotes = [
  "Mỗi bước tiến nhỏ giữa tầng mây đều mở ra một chân trời tri thức lớn.",
  "Kiên trì như dòng mây trôi, êm đềm nhưng không ngừng tiến bước.",
  "Học tập là hành trình khám phá, hãy để tâm trí bạn bay bổng tự do.",
  "Mây Mây luôn đồng hành cùng bạn trên từng trang sách và bài giảng.",
  "Tích lũy từng ngày, thành công sẽ nở rộ như ánh bình minh rạng rỡ.",
];

export interface CloudyLoadingProps {
  fullscreen?: boolean;
  message?: string;
  className?: string;
}

export default function CloudyLoading({
  fullscreen = true,
  message = "Học viện trên mây • Đang chuẩn bị nội dung...",
  className,
}: CloudyLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const step = Math.random() * 9 + 3;
        return Math.min(prev + step, 95);
      });
    }, 250);

    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 2800);

    const completeTimer = setTimeout(() => {
      setProgress(100);
    }, 3800);

    return () => {
      clearInterval(interval);
      clearInterval(quoteInterval);
      clearTimeout(completeTimer);
    };
  }, []);

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải dữ liệu Mây Mây"
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-[28px] border border-primary-pastel/90 bg-surface/95 p-8 text-center shadow-lg ring-1 ring-white/80 backdrop-blur-2xl transition-all duration-300",
        className
      )}
    >
      {/* Vầng sáng nền dịu nhẹ */}
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary-light/50 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-secondary-light/40 blur-2xl"
        aria-hidden="true"
      />

      {/* Mascot / Logo Cloud Animation */}
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
        <div
          className="absolute inset-0 animate-spin rounded-full border-2 border-primary-pastel/60 border-t-primary"
          style={{ animationDuration: "2.4s" }}
          aria-hidden="true"
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-pastel/70 bg-primary-light/80 shadow-2xs">
          <Image
            src="/logo/studynest-logo.svg"
            alt="Mây Mây Logo"
            width={34}
            height={34}
            className="h-8 w-8 object-contain transition-transform duration-300"
            priority
          />
        </div>
      </div>

      {/* Brand Text */}
      <div className="mb-6 space-y-1">
        <div className="inline-flex items-center gap-1.5">
          <Cloud className="h-4 w-4 text-primary" />
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Study<span className="text-primary">Nest</span>
          </span>
          <Sparkles className="h-3 w-3 text-secondary-foreground animate-pulse" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{message}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-subtle-foreground">Tiến độ</span>
          <span className="font-semibold text-primary">
            {Math.round(progress)}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-primary-light"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary-hover to-primary-pastel transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Inspirational Quote */}
      <div className="min-h-12 flex items-center justify-center">
        <p className="text-xs italic leading-relaxed text-muted-foreground transition-opacity duration-300">
          &ldquo;{quotes[quoteIndex]}&rdquo;
        </p>
      </div>
    </div>
  );

  if (!fullscreen) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md select-none">
      {content}
    </div>
  );
}
