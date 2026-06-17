"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";
import { useState } from "react";

interface DescriptionSectionProps {
  description: string;
}

export default function DescriptionSection({
  description,
}: DescriptionSectionProps) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Về khóa học này
      </h2>
      <div className={showFull ? "" : "line-clamp-6"}>
        <MarkdownRenderer content={description} isHtml={false} />
      </div>
      {description.length > 500 && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
        >
          {showFull ? "Thu gọn" : "Xem thêm"}
          {showFull ? (
            <HiChevronUp className="h-4 w-4" />
          ) : (
            <HiChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}

