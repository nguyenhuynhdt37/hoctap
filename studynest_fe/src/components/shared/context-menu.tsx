"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: ContextMenuProps) {
  React.useEffect(() => {
    const close = () => onClose();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  return (
    <div
      role="menu"
      aria-orientation="vertical"
      className="fixed z-50 min-w-[220px] rounded-2xl border border-border bg-surface p-1.5 shadow-md"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className={cn(
            "w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-150 cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            item.danger
              ? "text-destructive-foreground hover:bg-destructive-bg"
              : "text-foreground hover:bg-primary-light hover:text-primary"
          )}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
