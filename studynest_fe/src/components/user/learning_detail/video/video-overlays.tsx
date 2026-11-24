"use client";

import { AlertCircle } from "pulsoicon-react";

interface VideoOverlaysProps {
  isCompleted: boolean;
  isPaused: boolean;
  isFastForwarding: boolean;
}

export default function VideoOverlays({
  isCompleted,
  isPaused,
  isFastForwarding,
}: VideoOverlaysProps) {
  if (!isFastForwarding || isPaused || isCompleted) return null;

  return (
    <div className="pointer-events-none absolute top-4 right-4 z-30">
      <div className="flex items-center gap-2 rounded-2xl border border-warning-border bg-surface/95 px-3.5 py-2 text-xs font-bold text-warning-foreground shadow-lg backdrop-blur-sm">
        <AlertCircle className="size-4 shrink-0" animated={false} aria-hidden="true" />
        <div>
          <div>Phát hiện tua nhanh</div>
          <div className="text-[10px] font-medium text-muted-foreground">
            Đoạn bị bỏ qua sẽ không được cộng điểm qua bài
          </div>
        </div>
      </div>
    </div>
  );
}
