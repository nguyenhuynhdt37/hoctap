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
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
        isActive
          ? "bg-[#FCE8EF] text-[#8A3B58]"
          : "text-[#6F7C8C] hover:bg-[#F6FAFF] hover:text-[#356FA7]"
      }`}
      title={isActive ? "Bỏ thích" : "Thích"}
    >
      <HiHeart className={`w-4 h-4 ${isActive ? "text-[#8A3B58]" : ""}`} />
      <span className="text-sm font-medium">
        {isActive ? "Đã thích" : "Thích"}
      </span>
    </button>
  );
});
