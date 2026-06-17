"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ResizablePanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

export default function ResizablePanel({
  children,
  isOpen,
  minWidth = 320,
  maxWidth = 800,
  defaultWidth = 400,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const deltaX = startXRef.current - e.clientX;
      let newWidth = startWidthRef.current + deltaX;
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      panelRef.current.style.width = `${newWidth}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      setIsResizing(false);

      if (panelRef.current) {
        const finalWidth = parseInt(panelRef.current.style.width, 10);
        if (!isNaN(finalWidth)) {
          setWidth(finalWidth);
        }
      }
    };

    // Capture tất cả mouse events khi đang resize
    document.addEventListener("mousemove", handleMouseMove, { capture: true });
    document.addEventListener("mouseup", handleMouseUp, { capture: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, {
        capture: true,
      });
      document.removeEventListener("mouseup", handleMouseUp, { capture: true });
    };
  }, [isResizing, minWidth, maxWidth]);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      setIsResizing(true);
    },
    [width]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay toàn màn hình khi đang resize - bắt tất cả mouse events */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[9999]"
          style={{ cursor: "ew-resize" }}
        />
      )}

      {/* Tắt transition khi resize */}
      {isResizing && (
        <style jsx global>{`
          * {
            transition: none !important;
            animation: none !important;
          }
        `}</style>
      )}

      <div
        ref={panelRef}
        className="relative flex-shrink-0 bg-white border-l border-gray-200"
        style={{ width }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="absolute left-0 top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-50 flex items-center justify-center group"
        >
          <div className="absolute inset-0 group-hover:bg-green-500/10" />
          <div
            className={`w-1 h-8 rounded-full transition-colors ${
              isResizing
                ? "bg-green-500"
                : "bg-gray-300 group-hover:bg-green-500"
            }`}
          />
        </div>

        {/* Content */}
        <div className="h-full overflow-hidden">{children}</div>
      </div>
    </>
  );
}
