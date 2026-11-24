"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Keyboard, X } from "pulsoicon-react";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Trong lúc xem bài giảng",
    items: [
      { keys: ["Space"], desc: "Phát hoặc tạm dừng video bài giảng" },
      { keys: ["←", "→"], desc: "Tua lùi hoặc tua tiến nhanh 5 giây" },
      { keys: ["M"], desc: "Tắt / bật tiếng trình phát video" },
      { keys: ["F"], desc: "Mở toàn màn hình trình phát YouTube" },
    ],
  },
  {
    title: "Hỏi đáp Realtime & Công cụ",
    items: [
      { keys: ["Ctrl / ⌘", "V"], desc: "Dán trực tiếp ảnh chụp màn hình vào Hỏi đáp (tự nén nhẹ)" },
      { keys: ["Ctrl / ⌘", "Enter"], desc: "Gửi nhanh câu hỏi hoặc phản hồi Hỏi đáp" },
      { keys: ["Esc"], desc: "Đóng hộp thoại, Lightbox phóng to ảnh hoặc menu" },
    ],
  },
] as const;

export default function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-[26px] border border-primary-pastel bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-primary-pastel/70 bg-gradient-to-r from-primary-light/70 via-surface to-accent/35 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
              <Keyboard className="size-5" animated={false} aria-hidden="true" />
            </span>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-foreground">
                Phím tắt học nhanh
              </h2>
              <p className="text-xs text-muted-foreground">
                Thao tác mượt hơn khi xem bài giảng và trao đổi trên Mây Mây
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng phím tắt"
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary-light hover:text-foreground cursor-pointer"
          >
            <X className="size-4" animated={false} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h3 className="text-[11px] font-extrabold tracking-wider text-primary uppercase">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.desc}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5"
                  >
                    <span className="text-xs font-medium text-foreground">{item.desc}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded-lg border border-primary-pastel bg-surface px-2 py-0.5 font-mono text-[11px] font-bold text-primary shadow-2xs"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
