"use client";

import { HiX } from "react-icons/hi";

interface ImagePreviewModalProps {
  src: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({ src, onClose }: ImagePreviewModalProps) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <HiX className="w-8 h-8" />
        </button>
        <img
          src={src}
          alt="Preview"
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
