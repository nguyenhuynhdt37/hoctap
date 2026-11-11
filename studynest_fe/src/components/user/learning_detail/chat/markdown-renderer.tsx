"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

export default function ChatMarkdown({
  content,
  className = "",
}: ChatMarkdownProps) {
  if (!content?.trim()) {
    return null;
  }

  return (
    <MarkdownRenderer
      content={content}
      className={`!text-[13px] !leading-relaxed ${className}`}
    />
  );
}
