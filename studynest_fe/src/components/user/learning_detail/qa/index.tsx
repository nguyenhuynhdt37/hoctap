"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Flame,
  Heart,
  MessageCircle,
  Pencil,
  Search,
  Star,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "pulsoicon-react";
import { Button, Skeleton } from "@/components/ui";
import { EmblemIcon, FramedAvatar, TitleBadge } from "@/components/learning-hub/shop/item-art";
import {
  QAImageLightbox,
  QAMarkdownContent,
  type LightboxImage,
} from "./qa-media-content";
import { QARichComposer } from "./qa-rich-composer";
import { useLearnerEquipment } from "@/lib/learning-hub/shop-hooks";
import type { Equipment } from "@/lib/learning-hub/shop-types";
import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user";

interface QAGamification {
  level: number;
  current_streak: number;
  equipment?: Equipment;
}

interface QAComment {
  id: string;
  root_id: string;
  parent_id: string | null;
  lesson_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  gamification?: QAGamification | null;
  content: string;
  depth: number;
  created_at: string;
  reply_count_all: number;
  is_owner?: boolean;
  is_author?: boolean;
  reactions: {
    total: number;
    has_reacted: boolean;
  };
}

interface QASectionProps {
  lessonId: string;
  lessonAuthorId?: string | null;
  isModal?: boolean;
  onClose?: () => void;
  containerClassName?: string;
}

type FilterTab = "latest" | "popular" | "mine";

const QUICK_PROMPTS = [
  "Thầy/cô giải thích kỹ hơn đoạn này giúp em với ạ!",
  "Cho em xin thêm 1 ví dụ thực tế cho kiến thức này được không ạ?",
  "Em làm theo nhưng bị vướng ở bước này, mọi người xem giúp em nhé:",
] as const;

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 45) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function IdentityHeader({
  name,
  avatar,
  gamification,
  isAuthor,
  isOwner,
  createdAt,
  compact = false,
}: {
  name: string | null;
  avatar: string | null;
  gamification?: QAGamification | null;
  isAuthor?: boolean;
  isOwner?: boolean;
  createdAt?: string;
  compact?: boolean;
}) {
  const displayName = name?.trim() || "Học viên Mây Mây";
  const level = gamification?.level ?? 1;
  const streak = gamification?.current_streak ?? 0;
  const equipment = gamification?.equipment;

  return (
    <div className="flex items-start gap-3">
      <div className="relative shrink-0">
        <FramedAvatar
          src={avatar ? getImageUrl(avatar) : null}
          name={displayName}
          equipment={equipment}
          className={compact ? "size-10 text-xs" : "size-12 text-sm"}
        />
        <EmblemIcon
          item={equipment?.emblem}
          decorative
          className={cn(
            "absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-surface",
            compact ? "size-4" : "size-5",
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-extrabold text-foreground">{displayName}</span>

          {isAuthor && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-2 py-0.5 text-[10px] font-extrabold text-accent-vanilla-foreground">
              <Crown className="size-3" animated={false} aria-hidden="true" />
              Giảng viên
            </span>
          )}

          {isOwner && !isAuthor && (
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
              Bạn
            </span>
          )}

          <TitleBadge item={equipment?.title} className="max-w-44 [&>span]:truncate" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-primary-pastel/80 bg-primary-light/70 px-2 py-0.2 text-primary tabular-nums">
            <Star className="size-2.5" animated={false} aria-hidden="true" />
            Cấp {level}
          </span>

          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-secondary-pastel bg-secondary/75 px-2 py-0.2 text-secondary-foreground tabular-nums">
              <Flame className="size-2.5" animated={false} aria-hidden="true" />
              {streak} ngày
            </span>
          )}

          {createdAt && (
            <span className="font-medium text-muted-foreground">· {formatRelativeTime(createdAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QASection({
  lessonId,
  lessonAuthorId,
  isModal = false,
  onClose,
  containerClassName,
}: QASectionProps) {
  const user = useUserStore((s) => s.user);
  const myEquipment = useLearnerEquipment();

  const [comments, setComments] = useState<QAComment[]>([]);
  const [repliesByRoot, setRepliesByRoot] = useState<Record<string, QAComment[]>>({});
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});

  const [filter, setFilter] = useState<FilterTab>("latest");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const fetchRootComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: QAComment[] }>(
        `/learning/${lessonId}/comments`,
        { params: { depth_target: 0, limit: 40 } },
      );
      setComments(res.data?.items ?? []);
    } catch {
      showToast.error("Chưa tải được danh sách hỏi đáp.");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  const fetchReplies = useCallback(
    async (rootId: string) => {
      setLoadingReplies((prev) => ({ ...prev, [rootId]: true }));
      try {
        const res = await api.get<{ items: QAComment[] }>(
          `/learning/${lessonId}/comments`,
          { params: { root_id: rootId, depth_target: 1, limit: 50 } },
        );
        setRepliesByRoot((prev) => ({ ...prev, [rootId]: res.data?.items ?? [] }));
      } catch {
        showToast.error("Không tải được các phản hồi.");
      } finally {
        setLoadingReplies((prev) => ({ ...prev, [rootId]: false }));
      }
    },
    [lessonId],
  );

  useEffect(() => {
    void fetchRootComments();
  }, [fetchRootComments]);

  // Kết nối WebSocket Realtime cho phòng bài học
  useEffect(() => {
    if (!lessonId || !user?.id) return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const handleFrame = (event: any) => {
      if (!active || !event) return;

      if (event.type === "comment_created" && event.comment) {
        const incoming: QAComment = {
          ...event.comment,
          reply_count_all: 0,
          is_owner: event.comment.user_id === user.id,
          is_author: Boolean(lessonAuthorId && event.comment.user_id === lessonAuthorId),
          reactions: event.comment.reactions ?? { total: 0, has_reacted: false },
        };
        if (incoming.depth === 0 || !incoming.parent_id) {
          setComments((prev) =>
            prev.some((c) => c.id === incoming.id) ? prev : [incoming, ...prev],
          );
        } else {
          const rootId = incoming.root_id || incoming.parent_id;
          setComments((prev) =>
            prev.map((c) =>
              c.id === rootId ? { ...c, reply_count_all: (c.reply_count_all || 0) + 1 } : c,
            ),
          );
          setRepliesByRoot((prev) => {
            const list = prev[rootId] ?? [];
            if (list.some((r) => r.id === incoming.id)) return prev;
            return { ...prev, [rootId]: [...list, incoming] };
          });
          setExpandedRoots((prev) => new Set(prev).add(rootId));
        }
        return;
      }

      if (event.type === "comment_updated" && event.comment) {
        const { id, content } = event.comment;
        setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
        setRepliesByRoot((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map((r) => (r.id === id ? { ...r, content } : r));
          }
          return next;
        });
        return;
      }

      if (event.type === "comment_deleted") {
        const deletedId = event.id || event.comment_id || event.comment?.id;
        if (!deletedId) return;
        setComments((prev) => prev.filter((c) => c.id !== deletedId));
        setRepliesByRoot((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            const before = next[key].length;
            next[key] = next[key].filter((r) => r.id !== deletedId);
            if (next[key].length < before) {
              setComments((roots) =>
                roots.map((c) =>
                  c.id === key ? { ...c, reply_count_all: Math.max(0, c.reply_count_all - 1) } : c,
                ),
              );
            }
          }
          return next;
        });
        return;
      }

      if (event.type === "typing" && event.user_id && event.user_id !== user.id) {
        setTypingUsers((prev) => ({ ...prev, [event.user_id]: Date.now() }));
      }
    };

    const connect = async () => {
      if (!active) return;
      try {
        const ws = await connectWebSocket(
          `/api/v1/learning/ws/comments/${lessonId}`,
          null,
          handleFrame,
        );
        if (!active) {
          ws.close(1000);
          return;
        }
        socketRef.current = ws;
        setWsConnected(true);
        attempts = 0;
        ws.onclose = (ev) => {
          socketRef.current = null;
          setWsConnected(false);
          if (!active || ev.code === 1000) return;
          retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 10_000));
        };
      } catch {
        setWsConnected(false);
        if (active) {
          retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 10_000));
        }
      }
    };

    void connect();
    return () => {
      active = false;
      clearTimeout(retryTimer);
      socketRef.current?.close(1000);
      socketRef.current = null;
    };
  }, [lessonId, user?.id, lessonAuthorId]);

  // Tự xóa typing indicator sau 3s
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const entries = Object.entries(prev).filter(([, ts]) => now - ts < 3000);
        return entries.length === Object.keys(prev).length ? prev : Object.fromEntries(entries);
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1800) return;
    lastTypingSentRef.current = now;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing" }));
    }
  };

  async function submitComment(content: string, parentId: string | null = null) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "create",
            content: trimmed,
            parent_id: parentId,
          }),
        );
      } else {
        await api.post(`/learning/${lessonId}/lesson_comments`, {
          content: trimmed,
          parent_id: parentId,
        });
        await fetchRootComments();
        if (parentId) await fetchReplies(parentId);
      }
      if (parentId) {
        setReplyDraft("");
        setReplyTargetId(null);
      } else {
        setDraft("");
      }
    } catch {
      showToast.error("Không thể gửi nội dung lúc này.");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleReact(commentId: string, rootId?: string) {
    try {
      const res = await api.post<{ total?: number; has_reacted?: boolean; reacted?: boolean }>(
        `/learning/comments/${commentId}/reacts`,
      );
      const applyUpdate = (item: QAComment) => {
        if (item.id !== commentId) return item;
        const nextReacted =
          res.data?.has_reacted ?? res.data?.reacted ?? !item.reactions.has_reacted;
        const nextTotal =
          typeof res.data?.total === "number"
            ? res.data.total
            : Math.max(0, item.reactions.total + (nextReacted ? 1 : -1));
        return { ...item, reactions: { total: nextTotal, has_reacted: nextReacted } };
      };
      if (rootId) {
        setRepliesByRoot((prev) => ({
          ...prev,
          [rootId]: (prev[rootId] ?? []).map(applyUpdate),
        }));
      } else {
        setComments((prev) => prev.map(applyUpdate));
      }
    } catch {
      showToast.error("Không thể cập nhật lượt thích.");
    }
  }

  function handleSaveEdit(commentId: string) {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "comment_update", id: commentId, content: trimmed }),
      );
      setEditingId(null);
      setEditDraft("");
    } else {
      showToast.error("Mất kết nối realtime, thử lại sau giây lát.");
    }
  }

  function handleDelete(commentId: string) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "comment_delete", id: commentId }));
    } else {
      showToast.error("Mất kết nối realtime, thử lại sau giây lát.");
    }
  }

  function toggleReplies(rootId: string) {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) {
        next.delete(rootId);
      } else {
        next.add(rootId);
        if (!repliesByRoot[rootId]) {
          void fetchReplies(rootId);
        }
      }
      return next;
    });
  }

  const visibleComments = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...comments];
    if (filter === "mine") {
      list = list.filter((c) => c.user_id === user?.id || c.is_owner);
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          (c.user_name ?? "").toLowerCase().includes(q),
      );
    }
    if (filter === "popular") {
      list.sort(
        (a, b) =>
          (b.reactions?.total ?? 0) + b.reply_count_all - ((a.reactions?.total ?? 0) + a.reply_count_all),
      );
    }
    return list;
  }, [comments, filter, search, user?.id]);

  const someoneTyping = Object.keys(typingUsers).length > 0;

  const contentBody = (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ── HEADER SẢNH HỎI ĐÁP REALTIME ── */}
      <div className="shrink-0 border-b border-primary-pastel/70 bg-gradient-to-r from-primary-light/80 via-surface to-secondary/35 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-primary-foreground uppercase">
                <MessageCircle className="size-3" animated={false} aria-hidden="true" />
                Live Q&amp;A Lounge
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                  wsConnected
                    ? "border-success-border bg-success-bg text-success-foreground"
                    : "border-warning-border bg-warning-bg text-warning-foreground",
                )}
              >
                {wsConnected ? (
                  <>
                    <Wifi className="size-3" animated={false} aria-hidden="true" />
                    Trực tuyến realtime
                  </>
                ) : (
                  <>
                    <WifiOff className="size-3" animated={false} aria-hidden="true" />
                    Đang kết nối lại…
                  </>
                )}
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Hỏi đáp bài học ({comments.length})
            </h2>
          </div>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hỏi đáp"
              className="grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Thanh lọc & tìm kiếm */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "latest", label: "Mới nhất" },
                { id: "popular", label: "Nổi bật nhất" },
                { id: "mine", label: "Câu hỏi của tôi" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                  filter === tab.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="relative block w-full sm:w-60">
            <span className="sr-only">Tìm câu hỏi</span>
            <Search
              aria-hidden="true"
              animated={false}
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-primary"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nhanh câu hỏi…"
              className="h-9 w-full rounded-full border border-border bg-surface pr-3 pl-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>
      </div>

      {/* ── NỘI DUNG CUỘN ── */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
        {/* COMPOSER ĐẶT CÂU HỎI MỚI */}
        <div className="rounded-[24px] border border-primary-pastel/80 bg-surface p-4 shadow-xs sm:p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="relative shrink-0">
              <FramedAvatar
                src={user?.avatar ? getImageUrl(user.avatar) : null}
                name={user?.fullname}
                equipment={myEquipment}
                className="size-11 text-xs"
              />
              <EmblemIcon
                item={myEquipment?.emblem}
                decorative
                className="absolute -right-0.5 -bottom-0.5 size-4.5 rounded-full ring-2 ring-surface"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-extrabold text-foreground">
                  {user?.fullname || "Bạn"}
                </span>
                <TitleBadge item={myEquipment?.title} className="max-w-44 [&>span]:truncate" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Hỗ trợ đính kèm ảnh (tự nén nhẹ), dán Ctrl+V và chèn khối Code đa ngôn ngữ · Tự báo về thiết bị khi có phản hồi
              </p>
            </div>
          </div>

          <QARichComposer
            value={draft}
            onChange={setDraft}
            onTyping={notifyTyping}
            onOpenImage={setLightboxImage}
            onSubmit={(finalContent) => submitComment(finalContent, null)}
            sending={sending}
            submitLabel="Gửi câu hỏi"
            quickPrompts={QUICK_PROMPTS}
            placeholder="Bạn đang thắc mắc điều gì? Dán ảnh chụp màn hình (Ctrl+V), kéo-thả ảnh hoặc bấm Khối Code để chia sẻ đoạn mã..."
          />
        </div>

        {/* TYPING INDICATOR REALTIME */}
        {someoneTyping && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-primary-light/70 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span>Có học viên đang soạn tin nhắn realtime…</span>
          </div>
        )}

        {/* DANH SÁCH CÂU HỎI */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-32 rounded-[24px]" />
            ))}
          </div>
        ) : visibleComments.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-primary-pastel bg-surface/70 p-10 text-center">
            <p className="font-display text-lg font-bold text-foreground">
              {search ? `Không tìm thấy câu hỏi cho “${search}”` : "Chưa có câu hỏi nào trong bài học này"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hãy là người đầu tiên mở màn thảo luận cùng thầy cô và các bạn nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleComments.map((comment) => {
              const isExpanded = expandedRoots.has(comment.id);
              const replies = repliesByRoot[comment.id] ?? [];
              const isMine = comment.user_id === user?.id || comment.is_owner;
              const isInstructor =
                comment.is_author || Boolean(lessonAuthorId && comment.user_id === lessonAuthorId);

              return (
                <article
                  key={comment.id}
                  className={cn(
                    "rounded-[24px] border bg-surface p-4 shadow-2xs transition-colors sm:p-5",
                    isInstructor ? "border-accent-vanilla-border bg-accent-vanilla/20" : "border-border/80",
                  )}
                >
                  <IdentityHeader
                    name={comment.user_name}
                    avatar={comment.user_avatar}
                    gamification={comment.gamification}
                    isAuthor={isInstructor}
                    isOwner={isMine}
                    createdAt={comment.created_at}
                  />

                  {/* Nội dung câu hỏi / Sửa inline */}
                  <div className="mt-3 pl-0 sm:pl-15">
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          className="w-full rounded-xl border border-primary bg-background p-2.5 text-sm text-foreground focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(comment.id)} leftIcon={<Check className="size-3.5" />}>
                            Lưu thay đổi
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <QAMarkdownContent
                        content={comment.content}
                        onOpenImage={setLightboxImage}
                      />
                    )}

                    {/* Action Bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => void handleToggleReact(comment.id)}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-bold transition-colors cursor-pointer",
                          comment.reactions?.has_reacted
                            ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-secondary-pastel hover:text-secondary-foreground",
                        )}
                      >
                        <Heart
                          className="size-3.5"
                          solid={comment.reactions?.has_reacted}
                          animated={false}
                          aria-hidden="true"
                        />
                        <span className="tabular-nums">{comment.reactions?.total ?? 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyTargetId((cur) => (cur === comment.id ? null : comment.id));
                          setReplyDraft("");
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
                      >
                        <MessageCircle className="size-3.5" animated={false} aria-hidden="true" />
                        <span>Trả lời</span>
                      </button>

                      {(comment.reply_count_all > 0 || replies.length > 0) && (
                        <button
                          type="button"
                          onClick={() => toggleReplies(comment.id)}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-light/70 px-3 font-bold text-primary hover:bg-primary-light cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="size-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {isExpanded ? "Thu gọn" : `Xem ${Math.max(comment.reply_count_all, replies.length)} phản hồi`}
                          </span>
                        </button>
                      )}

                      {isMine && (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditDraft(comment.content);
                            }}
                            aria-label="Sửa câu hỏi"
                            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-primary-light hover:text-primary cursor-pointer"
                          >
                            <Pencil className="size-3.5" animated={false} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(comment.id)}
                            aria-label="Xóa câu hỏi"
                            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground cursor-pointer"
                          >
                            <Trash2 className="size-3.5" animated={false} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Khung trả lời inline */}
                    {replyTargetId === comment.id && (
                      <div className="mt-3">
                        <QARichComposer
                          compact
                          value={replyDraft}
                          onChange={setReplyDraft}
                          onTyping={notifyTyping}
                          onOpenImage={setLightboxImage}
                          onCancel={() => setReplyTargetId(null)}
                          onSubmit={(finalContent) => submitComment(finalContent, comment.id)}
                          sending={sending}
                          submitLabel="Gửi phản hồi"
                          placeholder={`Trả lời ${comment.user_name || "học viên"}… (hỗ trợ dán ảnh Ctrl+V và chèn Code)`}
                        />
                      </div>
                    )}

                    {/* Danh sách phản hồi */}
                    {isExpanded && (
                      <div className="mt-3.5 space-y-3 border-l-2 border-dashed border-primary-pastel pl-4">
                        {loadingReplies[comment.id] ? (
                          <Skeleton className="h-16 rounded-2xl" />
                        ) : (
                          replies.map((reply) => {
                            const rMine = reply.user_id === user?.id || reply.is_owner;
                            const rAuthor =
                              reply.is_author || Boolean(lessonAuthorId && reply.user_id === lessonAuthorId);
                            return (
                              <div
                                key={reply.id}
                                className={cn(
                                  "rounded-2xl border p-3.5",
                                  rAuthor
                                    ? "border-accent-vanilla-border bg-accent-vanilla/35"
                                    : "border-border/70 bg-background/70",
                                )}
                              >
                                <IdentityHeader
                                  name={reply.user_name}
                                  avatar={reply.user_avatar}
                                  gamification={reply.gamification}
                                  isAuthor={rAuthor}
                                  isOwner={rMine}
                                  createdAt={reply.created_at}
                                  compact
                                />
                                <div className="mt-2 min-w-0 pl-0 sm:pl-13">
                                  <QAMarkdownContent
                                    content={reply.content}
                                    onOpenImage={setLightboxImage}
                                  />
                                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() => void handleToggleReact(reply.id, comment.id)}
                                      className={cn(
                                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 font-bold cursor-pointer",
                                        reply.reactions?.has_reacted
                                          ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                                          : "border-border bg-surface text-muted-foreground hover:text-secondary-foreground",
                                      )}
                                    >
                                      <Heart
                                        className="size-3"
                                        solid={reply.reactions?.has_reacted}
                                        animated={false}
                                        aria-hidden="true"
                                      />
                                      <span className="tabular-nums">{reply.reactions?.total ?? 0}</span>
                                    </button>
                                    {rMine && (
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(reply.id)}
                                        className="text-muted-foreground hover:text-destructive-foreground cursor-pointer"
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hỏi đáp bài học trực tuyến"
          className="fixed inset-0 z-50 flex items-center justify-end bg-foreground/30 backdrop-blur-xs"
          onClick={onClose}
        >
          <div
            className="h-dvh w-full max-w-3xl overflow-hidden border-l border-primary-pastel bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {contentBody}
          </div>
        </div>
        <QAImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      </>
    );
  }

  return (
    <div className={cn(containerClassName)}>
      <div className="overflow-hidden rounded-[26px] border border-primary-pastel/70 shadow-xs">
        {contentBody}
      </div>
      <QAImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
