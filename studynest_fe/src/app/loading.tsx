"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";

/**
 * Root Loading chuẩn Cloudy Blue Design System V2 (Korean Pastel Minimalism)
 * Hiển thị toàn cục khi chuyển trang hoặc tải dữ liệu ở tầng ứng dụng
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang chuẩn bị không gian học tập Mây Mây"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md text-foreground select-none overflow-hidden"
    >
      {/* Vùng đốm mây Ambient Pastel trang trí nền */}
      <div
        className="pointer-events-none absolute -top-16 left-1/4 w-96 h-96 bg-primary-light/70 blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 right-1/4 w-80 h-80 bg-secondary-light/45 blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-accent/25 blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />

      {/* Thẻ Kính Mờ Trung Tâm */}
      <div className="relative flex flex-col items-center max-w-sm w-full mx-4 px-8 py-10 rounded-[28px] bg-surface/92 backdrop-blur-2xl border border-primary-pastel/80 shadow-lg ring-1 ring-white/80 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Cụm biểu tượng linh vật & Vòng xoay Pastel */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Vòng xoay chuyển động mượt mà */}
          <div
            className="w-24 h-24 rounded-full border-2 border-primary-pastel/60 border-t-primary animate-spin"
            style={{ animationDuration: "1.8s" }}
            aria-hidden="true"
          />

          {/* Vầng sáng sau logo */}
          <div
            className="absolute w-16 h-16 rounded-full bg-primary-light/70 blur-md animate-pulse"
            aria-hidden="true"
          />

          {/* Khối logo trung tâm */}
          <div className="absolute w-14 h-14 rounded-2xl bg-surface border border-primary-pastel/80 shadow-xs flex items-center justify-center">
            <Image
              src="/logo/studynest-logo.svg"
              alt="Mây Mây Logo"
              width={32}
              height={32}
              className="w-7 h-7 object-contain transition-transform duration-300 hover:scale-105"
              priority
            />
          </div>
        </div>

        {/* Tiêu đề & Thông điệp biên tập */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-1.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Study<span className="text-primary">Nest</span>
            </h1>
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Học viện trên mây • Đang chuẩn bị nội dung...
          </p>
        </div>

        {/* Thanh tiến độ loading mảnh mai */}
        <div className="w-48 h-1.5 bg-primary-light rounded-full overflow-hidden shadow-inner mb-4">
          <div className="h-full bg-gradient-to-r from-primary via-primary-hover to-primary-pastel rounded-full animate-progress" />
        </div>

        {/* 3 chấm Pastel Bouncing */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "900ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-secondary-pastel animate-bounce"
            style={{ animationDelay: "180ms", animationDuration: "900ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-accent-border animate-bounce"
            style={{ animationDelay: "360ms", animationDuration: "900ms" }}
          />
        </div>
      </div>

      {/* Keyframe Animation tiến độ */}
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(20%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-progress {
          animation: progress 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
