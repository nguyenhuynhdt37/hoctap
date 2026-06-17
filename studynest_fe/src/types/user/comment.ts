export interface CommentReactions {
  counts: Record<string, number>; // {"like": 3, "love": 1}
  total: number;
  has_reacted: boolean;
  my_reaction: string | null; // "like" | "love" | null
}

export interface CommentItem {
  id: string;
  root_id: string | null;
  parent_id: string | null;
  lesson_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  depth: number;
  created_at: string;
  reply_count_all?: number;
  is_owner: boolean;
  is_author: boolean;
  reactions: CommentReactions;
}

export interface CommentResponse {
  type: string;
  root_id: string | null;
  items: CommentItem[];
  next_cursor: string | null;
  has_next: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: string | null;
  root_id?: string | null;
}

export interface ReactionRequest {
  reaction_type: string; // "like" | "love" | "haha" | "wow" | "sad" | "angry"
}
