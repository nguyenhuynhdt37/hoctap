"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { useState } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";

interface DescriptionSectionProps {
  description: string;
}

export default function DescriptionSection({
  description,
}: DescriptionSectionProps) {
  const [showFull, setShowFull] = useState(false);

  if (!description) return null;

  return (
    <section className="bg-surface rounded-[24px] shadow-xs border border-border p-6 sm:p-8">
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
        Giới thiệu chi tiết
      </span>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">
        Về khóa học này
      </h2>
      <div
        className={`text-sm sm:text-base text-muted-foreground leading-relaxed ${
          showFull ? "" : "line-clamp-6"
        }`}
      >
        <MarkdownRenderer content={description} isHtml={false} />
      </div>
      {description.length > 420 && (
        <button
          type="button"
          onClick={() => setShowFull(!showFull)}
          className="mt-4 px-4 py-2 rounded-full bg-primary-light/80 hover:bg-primary-pastel/70 text-xs sm:text-sm text-primary font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <span>{showFull ? "Thu gọn nội dung" : "Xem đầy đủ giới thiệu"}</span>
          {showFull ? (
            <HiChevronUp className="h-4 w-4" />
          ) : (
            <HiChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
    </section>
  );
}
