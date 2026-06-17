"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import { CommentItem } from "@/types/user/comment";

interface ReactionUser {
  id: string;
  comment_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  is_owner: boolean;
  created_at: string;
}

interface ReactionSummaryProps {
  comment: CommentItem;
}

export default memo(function ReactionSummary({
  comment,
}: ReactionSummaryProps) {
  const reactions = comment.reactions || { total: 0, has_reacted: false };
  const [showTooltip, setShowTooltip] = useState(false);
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const user = useUserStore((s) => s.user);
  const currentUserId = user?.id ? String(user.id) : null;

  const fetchReactionUsers = useCallback(async () => {
    if (reactions.total === 0 || isLoadingReactions || reactionUsers.length > 0)
      return;
    setIsLoadingReactions(true);
    try {
      const response = await api.get<ReactionUser[]>(
        `/learning/comments/${comment.id}/reacts`
      );
      setReactionUsers(response.data);
    } catch (err) {
      console.error("Failed to fetch reaction users:", err);
    } finally {
      setIsLoadingReactions(false);
    }
  }, [comment.id, reactions.total, isLoadingReactions, reactionUsers.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };
    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTooltip]);

  if (reactions.total === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        onMouseEnter={() => {
          if (reactions.total > 0) {
            setShowTooltip(true);
            if (reactionUsers.length === 0) fetchReactionUsers();
          }
        }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="text-base">❤️</span>
        <span className="font-medium">{reactions.total}</span>
      </button>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-sm text-gray-900">
              {reactions.total} lượt thích
            </h3>
          </div>
          <div className="p-2">
            {isLoadingReactions ? (
              <div className="text-center py-4 text-sm text-gray-500">
                Đang tải...
              </div>
            ) : reactionUsers.length > 0 ? (
              <div className="space-y-1">
                {reactionUsers.map((reactionUser) => {
                  const isCurrentUser =
                    currentUserId &&
                    String(reactionUser.user_id) === String(currentUserId);
                  return (
                    <Link
                      key={reactionUser.id}
                      href={`/users/${reactionUser.user_id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#00bba7] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {reactionUser.user_avatar ? (
                          <img
                            src={getGoogleDriveImageUrl(reactionUser.user_avatar)}
                            alt={reactionUser.user_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          reactionUser.user_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate hover:text-[#00bba7] transition-colors">
                          {reactionUser.user_name}
                          {isCurrentUser && (
                            <span className="ml-1 text-xs text-[#00bba7]">
                              (Bạn)
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

