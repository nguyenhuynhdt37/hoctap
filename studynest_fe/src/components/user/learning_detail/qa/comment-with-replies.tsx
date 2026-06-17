"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { memo, useCallback, useEffect, useState } from "react";
import { HiPencil, HiTrash } from "react-icons/hi";
import { CommentItem, CommentResponse } from "@/types/user/comment";
import CommentContent from "./comment-content";
import CommentForm from "./comment-form";
import ReactionButton from "./reaction-button";
import ReactionSummary from "./reaction-summary";

// Helper functions (inline trong component)
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
};

const sanitizeUserNameForMention = (name: string): string => {
  if (!name) return "user";
  return name.replace(/[\[\]\(\){}*_`~>#+=!|]/g, "").trim() || "user";
};

const buildUserMentionMarkdown = (
  userName: string,
  userId: string
): string => {
  const safeName = sanitizeUserNameForMention(userName);
  const safeId = encodeURIComponent(userId);
  return `[@${safeName}](/users/${safeId})\u00A0\u200B`;
};

interface CommentWithRepliesProps {
  comment: CommentItem;
  expandedReplies: Set<string>;
  expandedDepth1Replies: Set<string>;
  depth2RepliesData: { [parentId: string]: CommentResponse };
  replyingTo: string | null;
  editingComment: string | null;
  isDeletingComment: string | null;
  reloadRepliesFor: string | null;
  fetchReplies: (
    rootId: string,
    depthTarget: number,
    cursor: string | null
  ) => Promise<CommentResponse>;
  onToggleReplies: (rootId: string) => void;
  onToggleDepth1Reply: (replyId: string, rootId: string) => void;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReaction: (commentId: string) => void;
  onSubmitReply: (parentId: string, content: string) => void;
  onSubmitEdit: (commentId: string, content: string) => void;
  onTyping?: () => void;
  isSubmitting: boolean;
  updateRepliesCallbacksRef: React.MutableRefObject<Map<string, () => void>>;
  updateDepth2RepliesCallbacksRef: React.MutableRefObject<
    Map<string, () => void>
  >;
  setExpandedDepth1Replies: React.Dispatch<React.SetStateAction<Set<string>>>;
  setDepth2RepliesData: React.Dispatch<
    React.SetStateAction<{ [parentId: string]: CommentResponse }>
  >;
}

export default memo(function CommentWithReplies({
  comment,
  expandedReplies,
  expandedDepth1Replies,
  depth2RepliesData,
  replyingTo,
  editingComment,
  isDeletingComment,
  reloadRepliesFor,
  fetchReplies,
  onToggleReplies,
  onToggleDepth1Reply,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onSubmitReply,
  onSubmitEdit,
  onTyping,
  isSubmitting,
  updateRepliesCallbacksRef,
  updateDepth2RepliesCallbacksRef,
  setExpandedDepth1Replies,
  setDepth2RepliesData,
}: CommentWithRepliesProps) {
  const [repliesData, setRepliesData] = useState<CommentResponse | null>(null);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isExpanded = expandedReplies.has(comment.id);
  const shouldReload = reloadRepliesFor === comment.id;
  const hasReplies = (comment.reply_count_all || 0) > 0;

  const loadReplies = useCallback(async () => {
    if (!hasReplies) return;
    setIsLoadingReplies(true);
    try {
      const data = await fetchReplies(comment.id, 1, null);
      setRepliesData(data);
    } catch (err) {
      console.error("Failed to load replies:", err);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [comment.id, fetchReplies, hasReplies]);

  const loadMoreReplies = useCallback(async () => {
    if (!repliesData?.has_next || !repliesData.next_cursor || isLoadingMore)
      return;
    setIsLoadingMore(true);
    try {
      const moreData = await fetchReplies(
        comment.id,
        1,
        repliesData.next_cursor
      );
      setRepliesData((prev) =>
        prev
          ? {
              ...prev,
              items: [...prev.items, ...moreData.items],
              next_cursor: moreData.next_cursor,
              has_next: moreData.has_next,
            }
          : null
      );
    } catch (err) {
      console.error("Failed to load more replies:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [repliesData, comment.id, fetchReplies, isLoadingMore]);

  const loadDepth2Replies = useCallback(
    async (parentId: string) => {
      try {
        const depth2Data = await fetchReplies(comment.id, 2, null);
        const filteredItems = depth2Data.items.filter(
          (r) => r.parent_id === parentId
        );
        setDepth2RepliesData((prev) => {
          return {
            ...prev,
            [parentId]: { ...depth2Data, items: filteredItems },
          };
        });
      } catch (err) {
        console.error("Failed to load depth 2+ replies:", err);
      }
    },
    [comment.id, fetchReplies, setDepth2RepliesData]
  );

  useEffect(() => {
    const depth1Replies =
      repliesData?.items.filter((r) => r.depth === 1) || [];
    depth1Replies.forEach((reply) => {
      if (expandedDepth1Replies.has(reply.id)) {
        const updateCallback = async () => {
          try {
            await loadDepth2Replies(reply.id);
          } catch (err) {
            console.error("Failed to reload depth 2 replies:", err);
          }
        };
        updateDepth2RepliesCallbacksRef.current.set(reply.id, updateCallback);
      } else {
        updateDepth2RepliesCallbacksRef.current.delete(reply.id);
      }
    });
    return () => {
      depth1Replies.forEach((reply) => {
        updateDepth2RepliesCallbacksRef.current.delete(reply.id);
      });
    };
  }, [
    repliesData,
    expandedDepth1Replies,
    loadDepth2Replies,
    updateDepth2RepliesCallbacksRef,
  ]);

  useEffect(() => {
    if (isExpanded) {
      const updateCallback = async () => {
        try {
          const data = await fetchReplies(comment.id, 1, null);
          setRepliesData(data);
        } catch (err) {
          console.error("Failed to reload replies:", err);
        }
      };
      updateRepliesCallbacksRef.current.set(comment.id, updateCallback);
      return () => {
        updateRepliesCallbacksRef.current.delete(comment.id);
      };
    } else {
      updateRepliesCallbacksRef.current.delete(comment.id);
    }
  }, [isExpanded, comment.id, fetchReplies, updateRepliesCallbacksRef]);

  useEffect(() => {
    if (isExpanded && !repliesData) {
      loadReplies();
    }
  }, [isExpanded, repliesData, loadReplies]);

  useEffect(() => {
    if (shouldReload && isExpanded) {
      setRepliesData(null);
      loadReplies();
    }
  }, [shouldReload, isExpanded, loadReplies]);

  const depth1Replies = repliesData?.items.filter((r) => r.depth === 1) || [];
  const isHidden = comment.content === "[Bình luận đã bị ẩn]";

  return (
    <div className="p-3 border-b border-gray-200 last:border-b-0">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user_avatar ? (
            <img
              src={getGoogleDriveImageUrl(comment.user_avatar)}
              alt={comment.user_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#00bba7] flex items-center justify-center text-white font-semibold text-sm">
              {comment.user_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">
                {comment.user_name}
              </span>
              {comment.is_author && (
                <span className="px-1.5 py-0.5 text-xs bg-[#e0f7f5] text-[#00a896] rounded font-medium">
                  Tác giả
                </span>
              )}
              <span className="text-xs text-gray-500">
                {formatDate(comment.created_at)}
              </span>
            </div>
            {/* Owner actions */}
            {comment.is_owner && !isHidden && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(comment.id)}
                  disabled={isDeletingComment === comment.id}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 hover:text-[#00bba7] transition-colors disabled:opacity-50"
                  title="Chỉnh sửa"
                >
                  <HiPencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  disabled={
                    isDeletingComment === comment.id ||
                    editingComment === comment.id
                  }
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Xóa"
                >
                  <HiTrash className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="text-gray-900 mb-2 text-sm leading-relaxed">
            <CommentContent content={comment.content} />
          </div>

          <div className="flex items-center gap-4">
            {/* Reactions */}
            {comment.reactions?.total > 0 && (
              <ReactionSummary comment={comment} />
            )}
            {/* Actions */}
            {!isHidden && (
              <div className="flex items-center gap-4 pt-1">
                <ReactionButton comment={comment} onReaction={onReaction} />
                <button
                  onClick={() => onReply(comment.id)}
                  disabled={editingComment === comment.id}
                  className="text-sm text-gray-600 hover:text-[#00bba7] font-medium disabled:opacity-50 transition-colors"
                >
                  Phản hồi
                </button>
                {hasReplies && (
                  <button
                    onClick={() => onToggleReplies(comment.id)}
                    className="text-sm text-gray-600 hover:text-[#00bba7] font-medium transition-colors"
                  >
                    {isExpanded ? "Ẩn phản hồi" : "Xem phản hồi"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Edit form */}
          {editingComment === comment.id && (
            <div className="mt-3">
              <CommentForm
                initialContent={comment.content}
                onSubmit={(content) => onSubmitEdit(comment.id, content)}
                onCancel={() => onEdit("")}
                isSubmitting={isSubmitting}
                placeholder="Chỉnh sửa bình luận..."
                submitLabel="Lưu"
              />
            </div>
          )}

          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-3">
              <CommentForm
                onSubmit={(content) => onSubmitReply(comment.id, content)}
                onCancel={() => onReply("")}
                isSubmitting={isSubmitting}
                onTyping={onTyping}
                placeholder="Viết phản hồi..."
                submitLabel="Gửi"
                initialContent={buildUserMentionMarkdown(
                  comment.user_name,
                  comment.user_id
                )}
                autoFocus
              />
            </div>
          )}

          {/* Replies */}
          {isExpanded && !isHidden && (
            <div className="mt-3 space-y-3">
              {isLoadingReplies ? (
                <div className="text-sm text-gray-500 py-2">
                  Đang tải phản hồi...
                </div>
              ) : depth1Replies.length > 0 ? (
                <>
                  {depth1Replies.map((reply) => {
                    const isDepth1Expanded = expandedDepth1Replies.has(
                      reply.id
                    );
                    const depth2Replies =
                      depth2RepliesData[reply.id]?.items || [];
                    const hasDepth2Replies = (reply.reply_count_all || 0) > 0;
                    const isReplyHidden =
                      reply.content === "[Bình luận đã bị ẩn]";

                    return (
                      <div
                        key={reply.id}
                        id={`reply-${reply.id}`}
                        className="flex gap-3"
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {reply.user_avatar ? (
                            <img
                              src={getGoogleDriveImageUrl(reply.user_avatar)}
                              alt={reply.user_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#00bba7] flex items-center justify-center text-white font-semibold text-xs">
                              {reply.user_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">
                                {reply.user_name}
                              </span>
                              {reply.is_author && (
                                <span className="px-1.5 py-0.5 text-xs bg-[#e0f7f5] text-[#00a896] rounded font-medium">
                                  Tác giả
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>
                            {/* Owner actions */}
                            {reply.is_owner && !isReplyHidden && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => onEdit(reply.id)}
                                  disabled={isDeletingComment === reply.id}
                                  className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-[#00bba7] transition-colors disabled:opacity-50"
                                  title="Chỉnh sửa"
                                >
                                  <HiPencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDelete(reply.id)}
                                  disabled={
                                    isDeletingComment === reply.id ||
                                    editingComment === reply.id
                                  }
                                  className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                                  title="Xóa"
                                >
                                  <HiTrash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="text-gray-900 mb-2 text-sm leading-relaxed">
                            <CommentContent content={reply.content} />
                          </div>

                          {/* Reactions */}
                          {reply.reactions?.total > 0 && (
                            <div className="mb-2">
                              <ReactionSummary comment={reply} />
                            </div>
                          )}

                          {/* Actions */}
                          {!isReplyHidden && (
                            <div className="flex items-center gap-4 pt-1">
                              <ReactionButton
                                comment={reply}
                                onReaction={onReaction}
                              />
                              {reply.depth < 2 && (
                                <button
                                  onClick={() => onReply(reply.id)}
                                  disabled={editingComment === reply.id}
                                  className="text-sm text-gray-600 hover:text-[#00bba7] font-medium disabled:opacity-50 transition-colors"
                                >
                                  Phản hồi
                                </button>
                              )}
                              {hasDepth2Replies && (
                                <button
                                  onClick={() =>
                                    onToggleDepth1Reply(reply.id, comment.id)
                                  }
                                  className="text-sm text-gray-600 hover:text-[#00bba7] font-medium transition-colors"
                                >
                                  {isDepth1Expanded
                                    ? "Ẩn phản hồi"
                                    : "Xem phản hồi"}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Edit form for reply */}
                          {editingComment === reply.id && (
                            <div className="mt-3">
                              <CommentForm
                                initialContent={reply.content}
                                onSubmit={(content) =>
                                  onSubmitEdit(reply.id, content)
                                }
                                onCancel={() => onEdit("")}
                                isSubmitting={isSubmitting}
                                placeholder="Chỉnh sửa bình luận..."
                                submitLabel="Lưu"
                              />
                            </div>
                          )}

                          {/* Reply form for reply */}
                          {replyingTo === reply.id && (
                            <div className="mt-3">
                              <CommentForm
                                onSubmit={(content) =>
                                  onSubmitReply(reply.id, content)
                                }
                                onCancel={() => onReply("")}
                                isSubmitting={isSubmitting}
                                onTyping={onTyping}
                                placeholder="Viết phản hồi..."
                                submitLabel="Gửi"
                              />
                            </div>
                          )}

                          {/* Depth 2 replies */}
                          {isDepth1Expanded && !isReplyHidden && (
                            <div className="mt-3 space-y-3">
                              {depth2Replies.length > 0 ? (
                                depth2Replies.map((nestedReply) => {
                                  const isNestedHidden =
                                    nestedReply.content ===
                                    "[Bình luận đã bị ẩn]";
                                  return (
                                    <div
                                      key={nestedReply.id}
                                      className="flex gap-3"
                                    >
                                      {/* Avatar */}
                                      <div className="flex-shrink-0">
                                        {nestedReply.user_avatar ? (
                                          <img
                                            src={getGoogleDriveImageUrl(nestedReply.user_avatar)}
                                            alt={nestedReply.user_name}
                                            className="w-7 h-7 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-7 h-7 rounded-full bg-[#00bba7] flex items-center justify-center text-white font-semibold text-xs">
                                            {nestedReply.user_name
                                              .charAt(0)
                                              .toUpperCase()}
                                          </div>
                                        )}
                                      </div>

                                      {/* Content */}
                                      <div className="flex-1 min-w-0">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 text-sm">
                                              {nestedReply.user_name}
                                            </span>
                                            {nestedReply.is_author && (
                                              <span className="px-1.5 py-0.5 text-xs bg-[#e0f7f5] text-[#00a896] rounded font-medium">
                                                Tác giả
                                              </span>
                                            )}
                                            <span className="text-xs text-gray-500">
                                              {formatDate(nestedReply.created_at)}
                                            </span>
                                          </div>
                                          {/* Owner actions */}
                                          {nestedReply.is_owner &&
                                            !isNestedHidden && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() =>
                                                    onEdit(nestedReply.id)
                                                  }
                                                  disabled={
                                                    isDeletingComment ===
                                                    nestedReply.id
                                                  }
                                                  className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-[#00bba7] transition-colors disabled:opacity-50"
                                                  title="Chỉnh sửa"
                                                >
                                                  <HiPencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    onDelete(nestedReply.id)
                                                  }
                                                  disabled={
                                                    isDeletingComment ===
                                                      nestedReply.id ||
                                                    editingComment ===
                                                      nestedReply.id
                                                  }
                                                  className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                                                  title="Xóa"
                                                >
                                                  <HiTrash className="w-3 h-3" />
                                                </button>
                                              </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="text-gray-900 mb-2 text-sm leading-relaxed">
                                          <CommentContent
                                            content={nestedReply.content}
                                          />
                                        </div>

                                        {/* Reactions */}
                                        {nestedReply.reactions?.total > 0 && (
                                          <div className="mb-2">
                                            <ReactionSummary
                                              comment={nestedReply}
                                            />
                                          </div>
                                        )}

                                        {/* Actions */}
                                        {!isNestedHidden && (
                                          <div className="flex items-center gap-4 pt-1">
                                            <ReactionButton
                                              comment={nestedReply}
                                              onReaction={onReaction}
                                            />
                                          </div>
                                        )}

                                        {/* Edit form for nested reply */}
                                        {editingComment === nestedReply.id && (
                                          <div className="mt-3">
                                            <CommentForm
                                              initialContent={
                                                nestedReply.content
                                              }
                                              onSubmit={(content) =>
                                                onSubmitEdit(
                                                  nestedReply.id,
                                                  content
                                                )
                                              }
                                              onCancel={() => onEdit("")}
                                              isSubmitting={isSubmitting}
                                              placeholder="Chỉnh sửa bình luận..."
                                              submitLabel="Lưu"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-sm text-gray-500 py-2">
                                  Đang tải phản hồi...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more replies */}
                  {repliesData?.has_next && (
                    <div className="pt-2">
                      <button
                        onClick={loadMoreReplies}
                        disabled={isLoadingMore}
                        className="text-sm text-[#00bba7] hover:text-[#00a896] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoadingMore ? "Đang tải..." : "Xem thêm phản hồi"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500 py-2">
                  Chưa có phản hồi nào.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

