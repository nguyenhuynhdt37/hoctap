"use client";

import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useUserStore } from "@/stores/user";
import { CommentItem, CommentResponse } from "@/types/user/comment";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiChat, HiX } from "react-icons/hi";
import useSWR from "swr";
import CommentWithReplies from "./comment-with-replies";
import NewCommentForm from "./new-comment-form";
import TypingIndicator from "./typing-indicator";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface QASectionProps {
  lessonId: string;
  accessToken?: string;
  isModal?: boolean;
  onClose?: () => void;
  containerClassName?: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

const usePreventBodyScroll = (isOpen: boolean) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
};

// ============================================================================
// MAIN COMPONENT - QASection
// ============================================================================

export default function QASection({
  lessonId,
  accessToken,
  isModal = false,
  onClose,
  containerClassName,
}: QASectionProps) {
  usePreventBodyScroll(isModal);
  const user = useUserStore((s) => s.user);
  const currentUserId = user?.id ? String(user.id) : null;

  // State management
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [expandedDepth1Replies, setExpandedDepth1Replies] = useState<
    Set<string>
  >(new Set());
  const [depth2RepliesData, setDepth2RepliesData] = useState<{
    [parentId: string]: CommentResponse;
  }>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(
    null
  );
  const [reloadRepliesFor, setReloadRepliesFor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected" | "reconnecting"
  >("connecting");

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingSentRef = useRef<number>(0);
  const updateRepliesCallbacksRef = useRef<Map<string, () => void>>(new Map());
  const updateDepth2RepliesCallbacksRef = useRef<Map<string, () => void>>(
    new Map()
  );
  // Ref để lưu expandedReplies mới nhất, tránh stale closure
  const expandedRepliesRef = useRef<Set<string>>(new Set());
  const expandedDepth1RepliesRef = useRef<Set<string>>(new Set());
  // Refs cho reconnect logic
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // SWR - Fetch root comments
  const {
    data: rootCommentsData,
    error: rootError,
    isLoading: isLoadingRoot,
    mutate: mutateRoot,
  } = useSWR<CommentResponse>(
    lessonId ? `comments-root-${lessonId}` : null,
    async () => {
      const params = new URLSearchParams({ depth_target: "0", limit: "20" });
      const response = await api.get<CommentResponse>(
        `/learning/${lessonId}/comments?${params.toString()}`
      );
      return response.data;
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  // Fetch replies function
  const fetchReplies = useCallback(
    async (
      rootId: string,
      depthTarget: number = 1,
      cursor: string | null = null
    ) => {
      const params = new URLSearchParams({
        root_id: rootId,
        depth_target: depthTarget.toString(),
        limit: "20",
      });
      if (cursor) params.append("cursor", cursor);
      const response = await api.get<CommentResponse>(
        `/learning/${lessonId}/comments?${params.toString()}`
      );
      return response.data;
    },
    [lessonId]
  );

  // Load more root comments
  const loadMoreRoot = useCallback(async () => {
    if (!rootCommentsData?.has_next || !rootCommentsData.next_cursor) return;
    try {
      const params = new URLSearchParams({
        depth_target: "0",
        limit: "20",
        cursor: rootCommentsData.next_cursor,
      });
      const response = await api.get<CommentResponse>(
        `/learning/${lessonId}/comments?${params.toString()}`
      );
      if (response.data.items.length > 0) {
        mutateRoot(
          {
            ...rootCommentsData,
            items: [...rootCommentsData.items, ...response.data.items],
            next_cursor: response.data.next_cursor,
            has_next: response.data.has_next,
          },
          false
        );
      }
    } catch (err) {
      console.error("Failed to load more comments:", err);
    }
  }, [rootCommentsData, lessonId, mutateRoot]);

  const reloadAllExpandedReplies = useCallback(() => {
    const allExpandedRootIds = Array.from(expandedRepliesRef.current);
    allExpandedRootIds.forEach((rootId) => {
      const updateCallback = updateRepliesCallbacksRef.current.get(rootId);
      if (updateCallback) {
        updateCallback();
      } else {
        setReloadRepliesFor(rootId);
      }
    });

    const allExpandedDepth1Ids = Array.from(expandedDepth1RepliesRef.current);
    allExpandedDepth1Ids.forEach((depth1Id) => {
      const updateDepth2Callback =
        updateDepth2RepliesCallbacksRef.current.get(depth1Id);
      if (updateDepth2Callback) {
        updateDepth2Callback();
      }
    });

    if (allExpandedRootIds.length > 0) {
      setTimeout(() => setReloadRepliesFor(null), 200);
    }
  }, []);

  // WebSocket connection với auto-reconnect
  useEffect(() => {
    if (!lessonId || !accessToken) return;
    isMountedRef.current = true;

    const connect = async (isReconnect = false) => {
      if (!isMountedRef.current) return;

      if (isReconnect) {
        setWsStatus("reconnecting");
      } else {
        setWsStatus("connecting");
      }

      try {
        const ws = await connectWebSocket(
          `/api/v1/learning/ws/comments/${lessonId}`,
          accessToken,
          "USER",
          (data) => {
            // Handle errors
            if (data.error) {
              console.error("WebSocket error:", data.error);
              showToast.error(`Lỗi: ${data.error}`);
              setIsSubmitting(false);
              setIsCreatingComment(false);
              return;
            }

            // Typing event
            if (data.type === "typing" && data.user_id) {
              const typingUserId = String(data.user_id);

              if (
                currentUserId &&
                String(typingUserId) === String(currentUserId)
              ) {
                return; // Skip own typing indicator
              }

              setTypingUsers((prev) => {
                const newSet = new Set(prev);
                newSet.add(typingUserId);
                return newSet;
              });

              const existingTimeout =
                typingTimeoutRef.current.get(typingUserId);
              if (existingTimeout) {
                clearTimeout(existingTimeout);
              }
              const timeout = setTimeout(() => {
                setTypingUsers((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(typingUserId);
                  return newSet;
                });
                typingTimeoutRef.current.delete(typingUserId);
              }, 3000);
              typingTimeoutRef.current.set(typingUserId, timeout);
              return;
            }

            // Comment updated
            if (data.type === "comment_updated" && data.comment) {
              const updatedComment = data.comment;

              if (updatedComment.depth === 0) {
                mutateRoot((current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    items: current.items.map((item) => {
                      if (item.id === updatedComment.id) {
                        return {
                          ...item,
                          content: updatedComment.content,
                          user_name: updatedComment.user_name || item.user_name,
                          user_avatar:
                            updatedComment.user_avatar || item.user_avatar,
                        };
                      }
                      return item;
                    }),
                  };
                }, false);
              } else {
                const rootId = updatedComment.root_id;
                if (rootId) {
                  if (updatedComment.depth === 1) {
                    const updateCallback =
                      updateRepliesCallbacksRef.current.get(rootId);
                    if (updateCallback && expandedReplies.has(rootId)) {
                      updateCallback();
                    }
                  } else if (
                    updatedComment.depth === 2 &&
                    updatedComment.parent_id
                  ) {
                    const updateDepth2Callback =
                      updateDepth2RepliesCallbacksRef.current.get(
                        updatedComment.parent_id
                      );
                    if (updateDepth2Callback) {
                      updateDepth2Callback();
                    }
                  }
                }
              }

              setEditingComment(null);
              setIsSubmitting(false);
              return;
            }

            // Comment reacted (user đã react)
            if (data.type === "comment_reacted" && data.comment_id) {
              const commentId = data.comment_id;
              const reactions = data.reactions || {
                total: 0,
                has_reacted: false,
              };

              mutateRoot((current) => {
                if (!current) return current;
                return {
                  ...current,
                  items: current.items.map((item) => {
                    if (item.id === commentId) {
                      return {
                        ...item,
                        reactions: {
                          ...item.reactions,
                          total: reactions.total,
                          has_reacted: reactions.has_reacted,
                        },
                      };
                    }
                    return item;
                  }),
                };
              }, false);

              reloadAllExpandedReplies();
              return;
            }

            // Comment unreacted (user đã unreact)
            if (data.type === "comment_unreacted" && data.comment_id) {
              const commentId = data.comment_id;
              const reactions = data.reactions || {
                total: 0,
                has_reacted: false,
              };

              mutateRoot((current) => {
                if (!current) return current;
                return {
                  ...current,
                  items: current.items.map((item) => {
                    if (item.id === commentId) {
                      return {
                        ...item,
                        reactions: {
                          ...item.reactions,
                          total: reactions.total,
                          has_reacted: reactions.has_reacted,
                        },
                      };
                    }
                    return item;
                  }),
                };
              }, false);

              reloadAllExpandedReplies();
              return;
            }

            // Comment hidden (có con, không thể xóa hoàn toàn)
            if (data.type === "comment_hidden" && data.comment) {
              const hiddenComment = data.comment;

              mutateRoot((current) => {
                if (!current) return current;
                const foundItem = current.items.find(
                  (item) => item.id === hiddenComment.id
                );
                if (foundItem && foundItem.depth === 0) {
                  return {
                    ...current,
                    items: current.items.map((item) => {
                      if (item.id === hiddenComment.id) {
                        return {
                          ...item,
                          content:
                            hiddenComment.content || "[Bình luận đã bị ẩn]",
                        };
                      }
                      return item;
                    }),
                  };
                }
                return current;
              }, false);

              reloadAllExpandedReplies();

              if (editingComment === hiddenComment.id) {
                setEditingComment(null);
              }
              setIsSubmitting(false);
              setIsDeletingComment(null);
              return;
            }

            // Comment deleted (không có con, xóa hoàn toàn)
            if (data.type === "comment_deleted" && data.comment) {
              const deletedCommentId = data.comment.id;

              let isRootCommentDeleted = false;
              mutateRoot((current) => {
                if (!current) return current;
                const foundItem = current.items.find(
                  (item) => item.id === deletedCommentId
                );
                if (foundItem && foundItem.depth === 0) {
                  isRootCommentDeleted = true;
                  return {
                    ...current,
                    items: current.items.filter(
                      (item) => item.id !== deletedCommentId
                    ),
                  };
                }
                return current;
              }, false);

              if (isRootCommentDeleted) {
                if (editingComment === deletedCommentId) {
                  setEditingComment(null);
                }
                if (replyingTo === deletedCommentId) {
                  setReplyingTo(null);
                }
                setIsSubmitting(false);
                setIsDeletingComment(null);
                return;
              }

              let foundComment: CommentItem | null = null;
              let foundRootId: string | null = null;

              mutateRoot((current) => {
                if (!current) return current;
                const foundItem = current.items.find(
                  (item) => item.id === deletedCommentId
                );
                if (foundItem) {
                  foundComment = foundItem;
                  foundRootId = foundItem.root_id || foundItem.id;
                }
                return current;
              }, false);

              reloadAllExpandedReplies();

              if (foundComment && foundRootId) {
                mutateRoot((current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    items: current.items.map((item) => {
                      if (item.id === foundRootId) {
                        return {
                          ...item,
                          reply_count_all: Math.max(
                            (item.reply_count_all || 0) - 1,
                            0
                          ),
                        };
                      }
                      return item;
                    }),
                  };
                }, false);
              } else {
                mutateRoot((current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    items: current.items.map((item) => {
                      if ((item.reply_count_all || 0) > 0) {
                        return {
                          ...item,
                          reply_count_all: Math.max(
                            (item.reply_count_all || 0) - 1,
                            0
                          ),
                        };
                      }
                      return item;
                    }),
                  };
                }, false);
              }

              if (editingComment === deletedCommentId) {
                setEditingComment(null);
              }
              if (replyingTo === deletedCommentId) {
                setReplyingTo(null);
              }
              setIsSubmitting(false);
              setIsDeletingComment(null);
              return;
            }

            // Comment created
            if (data.type === "comment_created" && data.comment) {
              const newComment = data.comment;
              const commentUserId = String(newComment.user_id || "");
              const isOwner =
                !!currentUserId &&
                !!commentUserId &&
                String(commentUserId) === String(currentUserId);
              const commentItem: CommentItem = {
                id: newComment.id,
                root_id: newComment.root_id,
                parent_id: newComment.parent_id,
                lesson_id: newComment.lesson_id,
                user_id: newComment.user_id,
                user_name: (newComment as any).user_name || "",
                user_avatar: (newComment as any).user_avatar || null,
                content: newComment.content,
                depth: newComment.depth,
                created_at: newComment.created_at,
                reply_count_all: 0,
                is_owner: isOwner,
                is_author: isOwner,
                reactions: {
                  counts: {},
                  total: 0,
                  has_reacted: false,
                  my_reaction: null,
                },
              };

              if (newComment.depth === 0) {
                mutateRoot((current) => {
                  if (!current) return current;
                  if (current.items.some((item) => item.id === commentItem.id))
                    return current;
                  return {
                    ...current,
                    items: [commentItem, ...current.items].sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    ),
                  };
                }, false);
              } else {
                const rootId = newComment.root_id;
                if (rootId) {
                  mutateRoot((current) => {
                    if (!current) return current;
                    return {
                      ...current,
                      items: current.items.map((item) =>
                        item.id === rootId
                          ? {
                              ...item,
                              reply_count_all: (item.reply_count_all || 0) + 1,
                            }
                          : item
                      ),
                    };
                  }, false);

                  if (newComment.depth === 1) {
                    const isExpanded = expandedRepliesRef.current.has(rootId);

                    if (!isExpanded) {
                      setExpandedReplies((prev) => {
                        const newSet = new Set(prev);
                        newSet.add(rootId);
                        return newSet;
                      });
                      setTimeout(() => {
                        setReloadRepliesFor(rootId);
                        setTimeout(() => setReloadRepliesFor(null), 100);
                      }, 100);
                    } else {
                      const updateCallback =
                        updateRepliesCallbacksRef.current.get(rootId);
                      if (updateCallback) {
                        updateCallback();
                      } else {
                        setReloadRepliesFor(rootId);
                        setTimeout(() => setReloadRepliesFor(null), 100);
                      }
                    }
                  } else if (newComment.depth === 2 && newComment.parent_id) {
                    const depth1ReplyId = newComment.parent_id;
                    const rootId = newComment.root_id;

                    const isDepth1Expanded =
                      expandedDepth1RepliesRef.current.has(depth1ReplyId);
                    const isRootExpanded =
                      rootId && expandedRepliesRef.current.has(rootId);

                    if (rootId && !isRootExpanded) {
                      setExpandedReplies((prev) => {
                        const newSet = new Set(prev);
                        newSet.add(rootId);
                        return newSet;
                      });
                    }

                    if (isDepth1Expanded) {
                      const updateDepth2Callback =
                        updateDepth2RepliesCallbacksRef.current.get(
                          depth1ReplyId
                        );
                      if (updateDepth2Callback) {
                        updateDepth2Callback();
                      } else {
                        setTimeout(() => {
                          const callback =
                            updateDepth2RepliesCallbacksRef.current.get(
                              depth1ReplyId
                            );
                          if (callback) {
                            callback();
                          } else {
                            setReloadRepliesFor(rootId);
                            setTimeout(() => setReloadRepliesFor(null), 100);
                          }
                        }, 500);
                      }
                    } else {
                      setExpandedDepth1Replies((prev) => {
                        const newSet = new Set(prev);
                        newSet.add(depth1ReplyId);
                        return newSet;
                      });
                      setTimeout(() => {
                        const callback =
                          updateDepth2RepliesCallbacksRef.current.get(
                            depth1ReplyId
                          );
                        if (callback) {
                          callback();
                        } else {
                          if (rootId) {
                            setReloadRepliesFor(rootId);
                            setTimeout(() => setReloadRepliesFor(null), 100);
                          }
                        }
                      }, 400);
                    }
                  }
                }
              }
            }
          }
        );
        wsRef.current = ws;
        setWsStatus("connected");
        reconnectAttemptsRef.current = 0;

        ws.onclose = (closeEvent) => {
          wsRef.current = null;
          setIsSubmitting(false);
          setIsCreatingComment(false);

          if (!isMountedRef.current) return;
          if (closeEvent.code === 1000) return;

          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect(true);
            }
          }, delay);
        };

        ws.onerror = () => {
          if (isMountedRef.current) {
            setWsStatus("disconnected");
          }
        };
      } catch (err) {
        console.error("WebSocket connection failed:", err);
        wsRef.current = null;
        setIsSubmitting(false);
        setIsCreatingComment(false);

        if (!isMountedRef.current) return;

        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect(true);
          }
        }, delay);
      }
    };

    connect();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          try {
            wsRef.current.close(1000);
          } catch (error) {
            // Ignore close errors
          }
        }
        wsRef.current = null;
      }
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [
    lessonId,
    accessToken,
    mutateRoot,
    expandedReplies,
    currentUserId,
    updateRepliesCallbacksRef,
    updateDepth2RepliesCallbacksRef,
    reloadAllExpandedReplies,
  ]);

  // Sync expandedReplies với ref để tránh stale closure
  useEffect(() => {
    expandedRepliesRef.current = expandedReplies;
  }, [expandedReplies]);

  // Sync expandedDepth1Replies với ref
  useEffect(() => {
    expandedDepth1RepliesRef.current = expandedDepth1Replies;
  }, [expandedDepth1Replies]);

  // Toggle replies
  const toggleReplies = useCallback((rootId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rootId)) newSet.delete(rootId);
      else newSet.add(rootId);
      return newSet;
    });
  }, []);

  // Toggle depth 1 replies
  const toggleDepth1Reply = useCallback(
    (replyId: string, rootId: string) => {
      setExpandedDepth1Replies((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(replyId)) {
          newSet.delete(replyId);
        } else {
          newSet.add(replyId);
          if (!depth2RepliesData[replyId]) {
            fetchReplies(rootId, 2, null).then((depth2Data) => {
              const filteredItems = depth2Data.items.filter(
                (r) => r.parent_id === replyId
              );
              setDepth2RepliesData((prev) => {
                return {
                  ...prev,
                  [replyId]: { ...depth2Data, items: filteredItems },
                };
              });
            });
          }
        }
        setTimeout(() => {
          const element = document.getElementById(`reply-${replyId}`);
          if (element)
            element.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
        }, 100);
        return newSet;
      });
    },
    [depth2RepliesData, fetchReplies]
  );

  // Send WebSocket message
  const sendWebSocketMessage = useCallback((message: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("❌ Error sending WebSocket message:", error);
      return false;
    }
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    sendWebSocketMessage({ type: "typing" });
  }, [sendWebSocketMessage]);

  // Handlers
  const handleCreateComment = useCallback(
    async (content: string) => {
      if (!content.trim() || isCreatingComment) return;
      setIsCreatingComment(true);
      try {
        sendWebSocketMessage({
          type: "create",
          create: { content: content.trim() },
        });
      } catch (err) {
        console.error("Failed to create comment:", err);
        showToast.error("Không thể tạo bình luận. Vui lòng thử lại.");
      } finally {
        setIsCreatingComment(false);
      }
    },
    [isCreatingComment, sendWebSocketMessage]
  );

  const handleCreateReply = useCallback(
    async (parentId: string, content: string) => {
      if (!content.trim() || isSubmitting) return;

      if (rootCommentsData?.items) {
        const parentInRoot = rootCommentsData.items.find(
          (item) => item.id === parentId
        );
        if (parentInRoot && parentInRoot.depth >= 2) {
          showToast.error("Không thể phản hồi comment có độ sâu >= 2.");
          return;
        }
      }

      setIsSubmitting(true);
      try {
        if (
          sendWebSocketMessage({
            type: "create",
            create: { content: content.trim(), parent_id: parentId },
          })
        ) {
          setReplyingTo(null);
        }
      } catch (err) {
        console.error("Failed to create reply:", err);
        showToast.error("Không thể tạo phản hồi. Vui lòng thử lại.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, sendWebSocketMessage, rootCommentsData]
  );

  const handleReaction = useCallback(async (commentId: string) => {
    try {
      await api.post(`/learning/comments/${commentId}/reacts`);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
      showToast.error("Không thể cập nhật reaction. Vui lòng thử lại.");
    }
  }, []);

  const handleEditComment = useCallback(
    async (commentId: string, content: string) => {
      if (!content.trim() || isSubmitting) return;
      setIsSubmitting(true);
      try {
        if (
          sendWebSocketMessage({
            type: "comment_update",
            update: {
              id: commentId,
              content: content.trim(),
            },
          })
        ) {
          // Content will be updated via WebSocket event
        } else {
          showToast.error("WebSocket chưa kết nối. Vui lòng thử lại.");
          setIsSubmitting(false);
        }
      } catch (err) {
        showToast.error("Không thể chỉnh sửa bình luận. Vui lòng thử lại.");
        setIsSubmitting(false);
      }
    },
    [isSubmitting, sendWebSocketMessage]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
      if (isDeletingComment) return;
      setIsDeletingComment(commentId);
      try {
        if (
          sendWebSocketMessage({
            type: "comment_delete",
            id: commentId,
          })
        ) {
          if (editingComment === commentId) {
            setEditingComment(null);
          }
        } else {
          showToast.error("WebSocket chưa kết nối. Vui lòng thử lại.");
          setIsDeletingComment(null);
        }
      } catch (err) {
        showToast.error("Không thể xóa bình luận. Vui lòng thử lại.");
        setIsDeletingComment(null);
      }
    },
    [isDeletingComment, sendWebSocketMessage, editingComment]
  );

  // Handlers for CommentWithReplies
  const handleReply = useCallback((commentId: string) => {
    setEditingComment(null);
    setReplyingTo(commentId);
  }, []);

  const handleEdit = useCallback((commentId: string) => {
    if (commentId === "") {
      setEditingComment(null);
      return;
    }
    setReplyingTo(null);
    setEditingComment(commentId);
  }, []);

  const handleToggleDepth1Reply = useCallback(
    (replyId: string, rootId: string) => {
      toggleDepth1Reply(replyId, rootId);
    },
    [toggleDepth1Reply]
  );

  // Render
  const content = (
    <>
      <div
        className={
          isModal
            ? "flex items-center justify-between mb-4 pb-4 border-b border-gray-200"
            : "mb-4"
        }
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <HiChat className="w-6 h-6 text-[#00bba7]" />
            Hỏi đáp
          </h2>
          <p className="text-sm text-gray-600">
            Đặt câu hỏi hoặc thảo luận về bài học này
          </p>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Đóng"
          >
            <HiX className="w-6 h-6" />
          </button>
        )}
      </div>

      <NewCommentForm
        onSubmit={handleCreateComment}
        isSubmitting={isCreatingComment}
        onTyping={sendTypingIndicator}
      />

      <TypingIndicator typingUsers={typingUsers} />

      {/* WebSocket connection status */}
      {wsStatus === "reconnecting" && (
        <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="font-medium">Đang kết nối lại...</span>
          </div>
        </div>
      )}
      {wsStatus === "connecting" && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="font-medium">Đang kết nối...</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg">
        {isLoadingRoot ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Đang tải bình luận...
          </div>
        ) : rootError ? (
          <div className="text-center py-8 text-sm text-red-600">
            Không thể tải bình luận. Vui lòng thử lại sau.
          </div>
        ) : !rootCommentsData || rootCommentsData.items.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi!
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {rootCommentsData.items.map((comment) => (
                <CommentWithReplies
                  key={comment.id}
                  comment={comment}
                  expandedReplies={expandedReplies}
                  expandedDepth1Replies={expandedDepth1Replies}
                  depth2RepliesData={depth2RepliesData}
                  replyingTo={replyingTo}
                  editingComment={editingComment}
                  isDeletingComment={isDeletingComment}
                  reloadRepliesFor={reloadRepliesFor}
                  fetchReplies={fetchReplies}
                  onToggleReplies={toggleReplies}
                  onToggleDepth1Reply={handleToggleDepth1Reply}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDeleteComment}
                  onReaction={handleReaction}
                  onSubmitReply={handleCreateReply}
                  onSubmitEdit={handleEditComment}
                  onTyping={sendTypingIndicator}
                  isSubmitting={isSubmitting}
                  updateRepliesCallbacksRef={updateRepliesCallbacksRef}
                  updateDepth2RepliesCallbacksRef={
                    updateDepth2RepliesCallbacksRef
                  }
                  setExpandedDepth1Replies={setExpandedDepth1Replies}
                  setDepth2RepliesData={setDepth2RepliesData}
                />
              ))}
            </div>
            {rootCommentsData.has_next && (
              <div className="p-4 text-center border-t border-gray-200">
                <button
                  onClick={loadMoreRoot}
                  className="text-sm text-[#00bba7] hover:text-[#00a896] font-semibold transition-colors"
                >
                  Xem thêm bình luận
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        containerClassName || "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      }
    >
      {content}
    </div>
  );
}
