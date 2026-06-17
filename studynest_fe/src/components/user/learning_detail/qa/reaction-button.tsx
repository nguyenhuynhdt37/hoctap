"use client";

import { memo } from "react";
import { HiHeart } from "react-icons/hi";
import { CommentItem } from "@/types/user/comment";

interface ReactionButtonProps {
  comment: CommentItem;
  onReaction: (commentId: string) => void;
}

export default memo(function ReactionButton({
  comment,
  onReaction,
}: ReactionButtonProps) {
  const isActive = comment.reactions?.has_reacted || false;

  return (
    <button
      onClick={() => onReaction(comment.id)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
        isActive
          ? "bg-red-50 text-red-600"
          : "text-gray-600 hover:bg-gray-100 hover:text-[#00bba7]"
      }`}
      title={isActive ? "Bỏ thích" : "Thích"}
    >
      <HiHeart className={`w-4 h-4 ${isActive ? "text-red-600" : ""}`} />
      <span className="text-sm font-medium">
        {isActive ? "Đã thích" : "Thích"}
      </span>
    </button>
  );
});

