"use client";

import { memo, useState } from "react";
import MarkdownRenderer from "@/components/shared/markdown-renderer";

interface CommentContentProps {
  content: string;
  maxLength?: number;
}

export default memo(function CommentContent({
  content,
  maxLength = 500,
}: CommentContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = content.length > maxLength;
  const displayContent =
    isExpanded || !shouldTruncate
      ? content
      : content.substring(0, maxLength) + "...";

  if (!content) return null;

  return (
    <div>
      <MarkdownRenderer content={displayContent} />
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-sm text-[#00bba7] hover:text-[#00a896] font-medium"
        >
          {isExpanded ? "Ẩn bớt" : "Xem thêm"}
        </button>
      )}
    </div>
  );
});

