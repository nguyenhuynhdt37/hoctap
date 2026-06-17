"use client";

import { HiAcademicCap } from "react-icons/hi";

interface MiniLoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export default function MiniLoading({
  text = "Đang tải...",
  size = "md",
}: MiniLoadingProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-2xl",
    md: "w-12 h-12 text-3xl",
    lg: "w-16 h-16 text-4xl",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-green-200 border-t-green-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${sizeClasses[size]} bg-green-600 rounded-xl flex items-center justify-center`}>
            <HiAcademicCap className="text-white" />
          </div>
        </div>
      </div>
      {text && (
        <div className="flex items-center gap-2">
          <span className={`${textSizes[size]} font-medium text-gray-600`}>
            {text}
          </span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      )}
    </div>
  );
}
