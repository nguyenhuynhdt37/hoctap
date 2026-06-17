"use client";

import { memo } from "react";

interface TypingIndicatorProps {
  typingUsers: Set<string>;
}

export default memo(function TypingIndicator({
  typingUsers,
}: TypingIndicatorProps) {
  if (typingUsers.size === 0) return null;

  return (
    <div className="mb-4 px-4 py-2 bg-[#e0f7f5] border border-[#b3f0ea] rounded-lg">
      <div className="flex items-center gap-2 text-sm text-[#00a896]">
        <div className="flex gap-1">
          <div
            className="w-2 h-2 bg-[#00bba7] rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-[#00bba7] rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-[#00bba7] rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="font-medium">
          {typingUsers.size === 1
            ? "Ai đó đang soạn tin..."
            : `${typingUsers.size} người đang soạn tin...`}
        </span>
      </div>
    </div>
  );
});
