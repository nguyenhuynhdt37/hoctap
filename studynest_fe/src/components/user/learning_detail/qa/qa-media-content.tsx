"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X } from "pulsoicon-react";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  src: string;
  alt: string;
}

interface QAMarkdownContentProps {
  content: string;
  onOpenImage?: (image: LightboxImage) => void;
  className?: string;
}

/**
 * Bọc MarkdownRenderer dành riêng cho Hỏi đáp Realtime:
 * - Giới hạn kích thước ảnh và khối code để không bao giờ tràn/bể layout.
 * - Tự động gắn nút "Sao chép" ở góc mỗi khối code.
 * - Click vào bất kỳ ảnh nào để phóng to trong Lightbox.
 */
export function QAMarkdownContent({
  content,
  onOpenImage,
  className,
}: QAMarkdownContentProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    const pres = Array.from(root.querySelectorAll("pre"));
    const cleanups: Array<() => void> = [];

    pres.forEach((pre) => {
      if (pre.querySelector("[data-qa-copy-btn]")) return;

      pre.style.position = "relative";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-qa-copy-btn", "true");
      btn.setAttribute("aria-label", "Sao chép đoạn code");
      btn.textContent = "Sao chép";
      btn.className =
        "absolute top-2.5 right-2.5 z-10 rounded-lg border border-white/20 bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs transition-colors hover:bg-slate-800 cursor-pointer";

      let resetTimer: number | null = null;
      const onClick = async (event: MouseEvent) => {
        event.stopPropagation();
        const codeEl = pre.querySelector("code");
        const text = codeEl?.textContent ?? pre.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Đã chép ✓";
          if (resetTimer) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            btn.textContent = "Sao chép";
          }, 1800);
        } catch {
          btn.textContent = "Không chép được";
          if (resetTimer) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            btn.textContent = "Sao chép";
          }, 1800);
        }
      };

      btn.addEventListener("click", onClick);
      pre.appendChild(btn);

      cleanups.push(() => {
        if (resetTimer) window.clearTimeout(resetTimer);
        btn.removeEventListener("click", onClick);
        btn.remove();
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [content]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onOpenImage) return;
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      if (img.src) {
        onOpenImage({ src: img.src, alt: img.alt || "Ảnh đính kèm" });
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      onClick={handleClick}
      className={cn(
        "min-w-0 max-w-full overflow-hidden break-words text-sm leading-relaxed text-foreground",
        "[&_.markdown-content]:text-[14px]! [&_.markdown-content]:leading-relaxed!",
        "[&_pre]:my-2.5! [&_pre]:max-h-[360px]! [&_pre]:max-w-full! [&_pre]:overflow-auto! [&_pre]:rounded-2xl! [&_pre]:border! [&_pre]:border-primary-pastel/50! [&_pre]:p-3.5! [&_pre]:pr-20!",
        "[&_pre_code]:whitespace-pre! [&_pre_code]:break-normal! [&_pre_code]:text-xs!",
        "[&_:not(pre)>code]:break-all! [&_:not(pre)>code]:rounded-md! [&_:not(pre)>code]:bg-primary-light/80! [&_:not(pre)>code]:px-1.5! [&_:not(pre)>code]:py-0.5! [&_:not(pre)>code]:text-[12.5px]! [&_:not(pre)>code]:font-semibold! [&_:not(pre)>code]:text-primary!",
        "[&_img]:my-2! [&_img]:max-h-[300px]! [&_img]:w-auto! [&_img]:max-w-full! [&_img]:cursor-zoom-in! [&_img]:rounded-2xl! [&_img]:border! [&_img]:border-primary-pastel/80! [&_img]:bg-background! [&_img]:object-contain! [&_img]:shadow-2xs! [&_img]:transition-transform! [&_img:hover]:scale-[1.01]!",
        "[&_table]:block! [&_table]:max-w-full! [&_table]:overflow-x-auto!",
        className,
      )}
    >
      <MarkdownRenderer content={content} isHtml={false} />
    </div>
  );
}

export function QAImageLightbox({
  image,
  onClose,
}: {
  image: LightboxImage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!image) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/75 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90dvh] max-w-[92vw] flex-col items-center gap-3"
      >
        <div className="flex w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-surface/95 px-4 py-2 text-xs text-foreground shadow-lg">
          <span className="truncate font-semibold">{image.alt || "Ảnh đính kèm"}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={image.src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 font-bold text-primary transition-colors hover:bg-primary-pastel"
            >
              <ExternalLink className="size-3.5" animated={false} aria-hidden="true" />
              Mở ảnh gốc
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng xem ảnh"
              className="grid size-7 cursor-pointer place-items-center rounded-full bg-background text-foreground transition-colors hover:bg-secondary"
            >
              <X className="size-4" animated={false} aria-hidden="true" />
            </button>
          </div>
        </div>

        <img
          src={image.src}
          alt={image.alt}
          className="max-h-[80dvh] max-w-full rounded-2xl border border-white/20 bg-surface object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
