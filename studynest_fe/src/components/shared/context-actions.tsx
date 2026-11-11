"use client";

import ContextMenu from "@/components/shared/context-menu";
import React from "react";

export interface ActionItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextActionsProps {
  actions: ActionItem[];
  children: React.ReactElement<{ onContextMenu?: React.MouseEventHandler }>;
}

export function ContextActions({ actions, children }: ContextActionsProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  const cloned = React.cloneElement(children, {
    onContextMenu: (e: React.MouseEvent) => {
      children.props?.onContextMenu?.(e);
      handleContextMenu(e);
    },
  });

  return (
    <>
      {cloned}
      {open && ContextMenu && (
        <ContextMenu
          x={pos.x}
          y={pos.y}
          onClose={() => setOpen(false)}
          items={actions
            .filter((a) => !a.disabled)
            .map((a) => ({
              label: a.label,
              danger: a.danger,
              onClick: () => {
                a.onClick();
                setOpen(false);
              },
            }))}
        />
      )}
    </>
  );
}

interface MobileTriggerProps {
  onOpen: (el: HTMLElement | null) => void;
}

export function MobileTrigger({ onOpen }: MobileTriggerProps) {
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  return (
    <button
      ref={btnRef}
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary hover:bg-primary-pastel/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors sm:hidden cursor-pointer"
      aria-label="Mở menu thao tác"
      onClick={() => onOpen(btnRef.current)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M10 4a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 20a2 2 0 110-4 2 2 0 010 4z" />
      </svg>
    </button>
  );
}

export default ContextActions;
