"use client";

import React from "react";

interface ContextMenuItem {
  label: string;
  onClick: () => void;
}

interface ContextMenuProps {
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
      className="fixed z-50 min-w-[220px] bg-white border border-green-200 rounded-lg shadow-lg p-1"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors"
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

