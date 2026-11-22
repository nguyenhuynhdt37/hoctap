export const HIDDEN_COMMENT_MARKER = "[Bình luận đã bị ẩn]";

export const DEPTH_REPLY_REFUSAL =
  "Không thể phản hồi comment có độ sâu >= 2.";

export interface CommentActionInput {
  content: string;
  depth: number;
  is_owner: boolean;
  is_author: boolean;
}

export interface CommentActionFlags {
  showAuthorBadge: boolean;
  showReaction: boolean;
  showReply: boolean;
  showEdit: boolean;
  showDelete: boolean;
}

export interface QaListComment {
  id: string;
  depth: number;
  created_at: string;
  content: string;
  root_id?: string | null;
  reply_count_all?: number;
  user_name: string;
  user_avatar: string | null;
  reactions: {
    total: number;
    has_reacted: boolean;
    counts?: Record<string, number>;
    my_reaction?: string | null;
  };
}

export type CommentListEvent<T extends QaListComment> =
  | { type: "comment_created"; comment: T }
  | {
      type: "comment_updated";
      comment: {
        id: string;
        content: string;
        depth?: number;
        user_name?: string;
        user_avatar?: string | null;
      };
    }
  | { type: "comment_deleted"; comment: { id: string } }
  | {
      type: "comment_hidden";
      comment: { id: string; content?: string | null };
    }
  | {
      type: "comment_reacted" | "comment_unreacted";
      comment_id: string;
      reactions: { total: number; has_reacted: boolean };
    };

export function isSendEnabled(draft: string): boolean {
  return draft.trim().length > 0;
}

export function isHiddenComment(content: string): boolean {
  return content === HIDDEN_COMMENT_MARKER;
}

export function commentActionFlags(
  comment: CommentActionInput
): CommentActionFlags {
  const hidden = isHiddenComment(comment.content);
  return {
    showAuthorBadge: comment.is_author,
    showReaction: !hidden,
    showReply: !hidden && comment.depth < 2,
    showEdit: !hidden && comment.is_owner,
    showDelete: !hidden && comment.is_owner,
  };
}

export function replyRefusalMessage(parentDepth: number): string | null {
  if (parentDepth >= 2) return DEPTH_REPLY_REFUSAL;
  return null;
}

export interface IncomingCreatedComment {
  id: string;
  root_id?: string | null;
  parent_id?: string | null;
  lesson_id: string;
  user_id: string;
  user_name?: string | null;
  user_avatar?: string | null;
  content: string;
  depth: number;
  created_at: string;
}

export interface CreatedCommentIdentity {
  currentUserId?: string | null;
  lessonAuthorId?: string | null;
}

export interface MappedCreatedComment extends QaListComment {
  root_id: string | null;
  parent_id: string | null;
  lesson_id: string;
  user_id: string;
  is_owner: boolean;
  is_author: boolean;
  reactions: {
    counts: Record<string, number>;
    total: number;
    has_reacted: boolean;
    my_reaction: string | null;
  };
}

function sameUserId(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  if (left == null || right == null) return false;
  const a = String(left);
  const b = String(right);
  return a.length > 0 && a === b;
}

export function mapCreatedComment(
  comment: IncomingCreatedComment,
  identity: CreatedCommentIdentity
): MappedCreatedComment {
  const userId = comment.user_id ? String(comment.user_id) : "";
  return {
    id: String(comment.id),
    root_id: comment.root_id ?? null,
    parent_id: comment.parent_id ?? null,
    lesson_id: String(comment.lesson_id),
    user_id: userId,
    user_name: comment.user_name || "",
    user_avatar: comment.user_avatar || null,
    content: comment.content,
    depth: comment.depth,
    created_at: comment.created_at,
    reply_count_all: 0,
    is_owner: sameUserId(userId, identity.currentUserId),
    is_author: sameUserId(userId, identity.lessonAuthorId),
    reactions: {
      counts: {},
      total: 0,
      has_reacted: false,
      my_reaction: null,
    },
  };
}

function createdAtMillis(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function applyCommentListEvent<T extends QaListComment>(
  items: readonly T[],
  event: CommentListEvent<T>
): T[] {
  switch (event.type) {
    case "comment_created": {
      const comment = event.comment;
      if (comment.depth === 0) {
        if (items.some((item) => item.id === comment.id)) {
          return [...items];
        }
        return [comment, ...items].sort(
          (a, b) => createdAtMillis(b.created_at) - createdAtMillis(a.created_at)
        );
      }
      if (!comment.root_id) return [...items];
      return items.map((item) =>
        item.id === comment.root_id
          ? { ...item, reply_count_all: (item.reply_count_all || 0) + 1 }
          : item
      );
    }
    case "comment_updated": {
      const updated = event.comment;
      return items.map((item) => {
        if (item.id !== updated.id) return item;
        return {
          ...item,
          content: updated.content,
          user_name: updated.user_name || item.user_name,
          user_avatar: updated.user_avatar || item.user_avatar,
        };
      });
    }
    case "comment_deleted": {
      const deletedId = event.comment.id;
      if (items.some((item) => item.id === deletedId)) {
        return items.filter((item) => item.id !== deletedId);
      }
      return items.map((item) =>
        (item.reply_count_all || 0) > 0
          ? {
              ...item,
              reply_count_all: Math.max((item.reply_count_all || 0) - 1, 0),
            }
          : item
      );
    }
    case "comment_hidden": {
      const hidden = event.comment;
      return items.map((item) =>
        item.id === hidden.id
          ? {
              ...item,
              content: hidden.content || HIDDEN_COMMENT_MARKER,
            }
          : item
      );
    }
    case "comment_reacted":
    case "comment_unreacted": {
      return items.map((item) => {
        if (item.id !== event.comment_id) return item;
        return {
          ...item,
          reactions: {
            ...item.reactions,
            total: event.reactions.total,
            has_reacted: event.reactions.has_reacted,
          },
        };
      });
    }
    default:
      return [...items];
  }
}
