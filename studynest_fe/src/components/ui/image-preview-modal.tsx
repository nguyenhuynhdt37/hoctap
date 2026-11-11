"use client";

import * as React from "react";
import { HiX } from "react-icons/hi";

export interface ImagePreviewModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImagePreviewModal({
  src,
  alt = "Xem trước hình ảnh",
  onClose,
}: ImagePreviewModalProps) {
  React.useEffect(() => {
    if (!src) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full flex items-center justify-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng xem trước ảnh"
          className="absolute -top-12 right-0 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface/90 text-foreground hover:bg-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HiX className="w-5 h-5" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-[20px] border border-border bg-surface shadow-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
