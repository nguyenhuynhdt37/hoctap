"use client";

import { safeUUID } from "@/lib/utils/uuid";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  BookOpen,
  Compass,
  Eye,
  Mic,
  MousePointerClick,
  Send,
  Shield,
  SquarePen,
  X,
} from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/states";
import MessageBubble from "../learning_detail/chat/message-bubble";
import { AgentStatus } from "../learning_detail/agent/agent-status";
import { AssistantSettings } from "./assistant-settings";
import { useLearningAgent } from "../learning_detail/agent/agent-context";
import { useAssistantVoice } from "./voice-provider";
import { useChatImages, ChatImageAttachments, ChatImagePreviews } from "./chat-images";
import { DictationButton } from "./dictation-button";
import type { MessageSource, TutorMessage } from "@/types/user/tutor-chat";

const SUGGESTIONS = [
  {
    icon: MousePointerClick,
    title: "Mở khóa đang học",
    prompt: "Hãy quét màn hình hiện tại (browser_snapshot) và nhấn vào nút Học tiếp hoặc khóa học đang học giúp mình.",
  },
  {
    icon: Compass,
    title: "Gợi ý khóa học nổi bật",
    prompt: "Hãy tìm khóa học nổi bật trong hệ thống rồi điều hướng mở trực tiếp trang khóa học đó trên màn hình cho mình xem.",
  },
  {
    icon: BookOpen,
    title: "Xem tiến độ học tập",
    prompt: "Cho mình xem tiến độ các khóa học đang học từ dữ liệu tài khoản.",
  },
];

export default function AccountAssistantPanel() {
  const agent = useLearningAgent();
  const voice = useAssistantVoice();
  const router = useRouter();
  const pathname = usePathname();
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [before, setBefore] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const historyIdx = useRef(-1);
  const attachments = useChatImages();
  const mounted = useRef(true);
  const end = useRef<HTMLDivElement>(null);
  // Zero-lag Uncontrolled Textarea Ref: typing never triggers parent re-renders
  const inputElement = useRef<HTMLTextAreaElement>(null);

  const setComposerValue = useCallback((val: string) => {
    if (inputElement.current) {
      inputElement.current.value = val;
      inputElement.current.scrollTop = inputElement.current.scrollHeight;
    }
  }, []);

  const getComposerValue = useCallback(() => inputElement.current?.value || "", []);

  const historyPositioned = useRef(false);
  const load = useCallback(async (cursor?: string) => {
    const { data } = await api.get("/agent/conversation", { params: cursor ? { before: cursor } : {} });
    if (!mounted.current) return;
    setThreadId(data.thread.id);
    setBefore(data.before);
    const rows: TutorMessage[] = data.messages.map((item: TutorMessage & { created_at: string }) => ({
      ...item,
      timestamp: new Date(item.created_at),
    }));
    setMessages(previous => (cursor ? [...rows, ...previous] : rows));
    if (!cursor && !historyPositioned.current) {
      historyPositioned.current = true;
      requestAnimationFrame(() => end.current?.scrollIntoView({ block: "nearest" }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load()
      .catch(() => setError("Chưa tải được lịch sử Mây Mây. Bạn có thể thử lại."))
      .finally(() => setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const newChat = useCallback(async () => {
    if (sending || agent?.busy) return;
    setError("");
    try {
      const { data } = await api.post("/agent/conversation/new");
      setThreadId(data.thread.id);
      setMessages([]);
      setBefore(null);
      setQueuedPrompt(null);
      historyIdx.current = -1;
      setComposerValue("");
      inputElement.current?.focus();
    } catch {
      setError("Chưa tạo được đoạn chat mới. Vui lòng thử lại.");
    }
  }, [agent?.busy, sending, setComposerValue]);

  useEffect(() => {
    if (sending) end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, sending]);

  const sourceClick = useCallback(
    (source: MessageSource) => {
      if (source.lesson_id)
        void api
          .get(`/agent/lessons/${encodeURIComponent(source.lesson_id)}/destination`)
          .then(async ({ data }) => {
            await api.post(`/learning/${data.course_id}/active/${data.lesson_id}`, {});
            router.push(`/learning/${encodeURIComponent(data.course_slug)}`);
          })
          .catch(() => setError("Chưa mở được bài học nguồn hoặc quyền truy cập đã thay đổi."));
      else if (source.resource_url && /^https?:\/\//i.test(source.resource_url))
        window.open(source.resource_url, "_blank", "noopener,noreferrer");
    },
    [router]
  );

  const expandSlash = useCallback(
    (raw: string): string | null => {
      const trimmed = raw.trim();
      if (trimmed === "/mode") {
        agent?.cyclePermissionMode();
        setComposerValue("");
        return null;
      }
      if (trimmed === "/detail" || trimmed === "/verbose") {
        agent?.setDetailedTranscript(v => !v);
        setComposerValue("");
        return null;
      }
      if (trimmed === "/xray") {
        agent?.setXrayActive(v => !v);
        setComposerValue("");
        return null;
      }
      if (trimmed.startsWith("/screen")) {
        const rest = trimmed.slice(7).trim();
        return rest
          ? `Hãy đọc màn hình hiện tại (browser_snapshot) và thực hiện: ${rest}`
          : "Hãy đọc màn hình hiện tại (browser_snapshot) và tóm tắt các mục đang hiển thị.";
      }
      if (trimmed.startsWith("/highlight")) {
        const rest = trimmed.slice(10).trim();
        return rest
          ? `Hãy đọc màn hình hiện tại rồi khoanh vùng chỉ điểm (browser_highlight) vào: ${rest}`
          : "Hãy đọc màn hình hiện tại rồi khoanh vùng chỉ điểm (browser_highlight) vào phần quan trọng nhất trên trang.";
      }
      if (trimmed.startsWith("/open")) {
        const rest = trimmed.slice(5).trim();
        return rest
          ? `Hãy tìm và điều hướng mở trực tiếp trên màn hình (browser_navigate hoặc browser_click) tới: ${rest}`
          : "Hãy đọc màn hình và mở khóa học đang hiển thị giúp mình.";
      }
      if (trimmed.startsWith("/scroll")) {
        const rest = trimmed.slice(7).trim();
        return rest ? `Hãy cuộn màn hình ${rest}` : "Hãy cuộn màn hình xuống dưới";
      }
      return trimmed;
    },
    [agent, setComposerValue]
  );

  const submitMessage = useCallback(
    async (rawText?: string) => {
      const typed = rawText !== undefined ? rawText : getComposerValue();
      const candidate = typed.trim() || (attachments.images.length ? "Bạn hãy xem và giải thích ảnh này." : "");
      if (!candidate) return false;

      // Hannes Steer/Queue: If AI is currently busy, queue the prompt to auto-send right after!
      if (sending || agent?.busy) {
        setQueuedPrompt(candidate);
        if (rawText === undefined) setComposerValue("");
        return true;
      }

      const expanded = expandSlash(candidate);
      if (!expanded) return false;
      if (!agent || !attachments.ready || dictating) return false;

      const pinned = agent.pinnedTarget;
      const finalExpanded = pinned
        ? `[Phần tử người dùng vừa chỉ điểm bằng X-Ray trên màn hình: role="${pinned.role}", tên="${pinned.name}"${pinned.href ? `, href="${pinned.href}"` : ""}, nội dung="${pinned.text.slice(0, 240)}"]\nYêu cầu: ${expanded}`
        : expanded;

      agent.recordPrompt(candidate);
      historyIdx.current = -1;
      agent.setPinnedTarget(null);
      setError("");
      setSending(true);
      if (rawText === undefined) setComposerValue("");

      const id = safeUUID();
      const images = attachments.images;
      setMessages(previous => [
        ...previous,
        { id: safeUUID(), role: "user", content: candidate, images, timestamp: new Date() },
        { id, role: "assistant", content: "", timestamp: new Date(), isStreaming: true, activity: [] },
      ]);
      try {
        const response = await agent.send(
          finalExpanded,
          threadId,
          delta => {
            if (mounted.current)
              setMessages(previous =>
                previous.map(item => (item.id === id ? { ...item, content: item.content + delta } : item))
              );
          },
          activity => {
            if (mounted.current)
              setMessages(previous =>
                previous.map(item =>
                  item.id === id ? { ...item, activity: [...(item.activity || []), activity] } : item
                )
              );
          },
          images
        );
        attachments.clear();
        if (mounted.current) {
          setThreadId(response.thread_id);
          setMessages(previous =>
            previous.map(item =>
              item.id === id
                ? {
                    ...item,
                    id: response.id,
                    content: response.content,
                    sources: response.sources,
                    activity: response.activity || item.activity,
                    isStreaming: false,
                    timestamp: new Date(response.created_at),
                  }
                : item
            )
          );
        }
        return true;
      } catch (cause) {
        if (mounted.current) {
          if (!getComposerValue()) setComposerValue(candidate);
          setError(cause instanceof Error ? cause.message : "Mây Mây chưa trả lời được. Vui lòng thử lại.");
          setMessages(previous =>
            previous.map(item =>
              item.id === id ? { ...item, isStreaming: false, content: item.content || "Yêu cầu chưa hoàn tất." } : item
            )
          );
        }
        return false;
      } finally {
        if (mounted.current) setSending(false);
      }
    },
    [agent, attachments, dictating, expandSlash, getComposerValue, sending, setComposerValue, threadId]
  );

  // Drain queued prompt automatically when current turn finishes (Hannes Steer Queue)
  useEffect(() => {
    if (!sending && !agent?.busy && queuedPrompt) {
      const next = queuedPrompt;
      setQueuedPrompt(null);
      void submitMessage(next);
    }
  }, [sending, agent?.busy, queuedPrompt, submitMessage]);

  // Listen to Quick Selection Telekinesis prompts
  useEffect(() => {
    const onQuickPrompt = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) void submitMessage(prompt);
    };
    window.addEventListener("maymay:quick-prompt", onQuickPrompt);
    return () => window.removeEventListener("maymay:quick-prompt", onQuickPrompt);
  }, [submitMessage]);

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    await submitMessage();
  };

  const startVoice = async () => {
    if (attachments.images.length && !(await submitMessage())) return;
    try {
      await voice?.open({
        lessonTitle: "Mây Mây · Co-Pilot Tài khoản",
        onSourceClick: sourceClick,
        onClose: () => {
          void load().catch(() => undefined);
        },
      });
    } catch {
      setError("Chưa mở được cuộc gọi. Vui lòng thử lại.");
    }
  };

  return (
    <div
      data-agent-private
      onDragOver={event => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={event => {
        const files = Array.from(event.dataTransfer.files);
        if (files.length) {
          event.preventDefault();
          if (!sending && !dictating && !voice?.active) void attachments.add(files);
        }
      }}
      className="relative flex h-full min-h-0 flex-col bg-gradient-to-b from-background/60 via-surface to-surface"
    >
      {/* Thanh công cụ gọn: đoạn chat mới + các công cụ dạng icon */}
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5">
        <Button
          size="sm"
          variant="pastel"
          onClick={() => void newChat()}
          disabled={sending || agent?.busy || loading}
          leftIcon={<SquarePen animated={false} size="1em" />}
          className="rounded-xl"
        >
          Đoạn chat mới
        </Button>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant={agent?.xrayActive ? "primary" : "ghost"}
            onClick={() => agent?.setXrayActive(v => !v)}
            aria-pressed={Boolean(agent?.xrayActive)}
            aria-label="Tia X-Ray: chỉ vào phần tử trên trang để hỏi Mây Mây"
            title="Tia X-Ray: chỉ vào phần tử trên trang để hỏi Mây Mây"
            className="h-8 w-8 rounded-xl"
          >
            <Compass animated={false} size="1em" />
          </Button>
          <Button
            size="icon"
            variant={agent?.detailedTranscript ? "pastel" : "ghost"}
            onClick={() => agent?.setDetailedTranscript(v => !v)}
            aria-pressed={Boolean(agent?.detailedTranscript)}
            aria-label="Xem chi tiết từng thao tác"
            title="Xem chi tiết từng thao tác (Ctrl+O)"
            className="h-8 w-8 rounded-xl"
          >
            <Eye animated={false} size="1em" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => void startVoice()}
            disabled={agent?.busy || dictating || !attachments.ready}
            aria-label={voice?.active ? "Mở lại cuộc gọi" : "Trò chuyện bằng giọng nói"}
            title={voice?.active ? "Mở lại cuộc gọi" : "Trò chuyện bằng giọng nói"}
            className="h-8 w-8 rounded-xl"
          >
            <Mic animated={false} size="1em" />
          </Button>
          <AssistantSettings />
        </div>
      </div>

      <AgentStatus />

      {error && (
        <Alert variant="warning" className="mx-3.5 mt-2 rounded-2xl text-xs">
          {error}
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void load()
                .then(() => setError(""))
                .catch(() => undefined)
            }
          >
            Tải lại
          </Button>
        </Alert>
      )}

      {/* Conversation Transcript */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-label="Hội thoại Mây Mây Co-Pilot">
        {before && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => void load(before).catch(() => setError("Chưa tải được tin nhắn cũ."))}
            >
              Xem tin nhắn trước
            </Button>
          </div>
        )}

        {loading ? (
          <div role="status" className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Đang đồng bộ bộ nhớ & hội thoại…</span>
          </div>
        ) : (
          messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Bot animated={false} className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">Mình giúp gì được cho bạn?</h2>
                <p className="mt-1 text-xs text-muted-foreground">Hỏi về bài học, khóa học hoặc nhờ mình thao tác trên trang.</p>
              </div>
              <div className="flex w-full flex-col gap-1.5">
                {SUGGESTIONS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      disabled={sending || agent?.busy}
                      onClick={() => void submitMessage(item.prompt)}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <Icon animated={false} className="h-4 w-4 shrink-0 text-primary" />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} onSourceClick={sourceClick} />
        ))}
        <div ref={end} />
      </div>

      <ChatImagePreviews attachments={attachments} />

      {/* Bottom Co-Pilot Command Deck */}
      <div className="border-t border-border bg-surface/95 px-3 pb-3 pt-2 backdrop-blur-sm">
        {/* Pinned X-Ray Target Chip */}
        {agent?.pinnedTarget && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-primary-pastel bg-primary-light/60 px-2.5 py-1.5 text-xs">
            <div className="flex min-w-0 items-center gap-1.5">
              <Compass animated={false} className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-medium text-foreground">
                Đã ghim: <strong>{agent.pinnedTarget.name.slice(0, 45)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1">
              {agent.pinnedTarget.href && (
                <button
                  type="button"
                  onClick={() => void submitMessage(`Hãy điều hướng mở trực tiếp đường dẫn ${agent.pinnedTarget?.href}`)}
                  className="rounded-lg bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  Mở ngay
                </button>
              )}
              <button
                type="button"
                aria-label="Bỏ ghim phần tử"
                onClick={() => agent.setPinnedTarget(null)}
                className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X animated={false} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Queued Steer Prompt Notice */}
        {queuedPrompt && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-accent-vanilla-border bg-accent-vanilla/60 px-2.5 py-1 text-xs text-accent-vanilla-foreground">
            <span className="truncate">Đã xếp hàng gửi tiếp: &ldquo;{queuedPrompt}&rdquo;</span>
            <button
              type="button"
              onClick={() => setQueuedPrompt(null)}
              className="text-[11px] font-semibold underline"
            >
              Hủy
            </button>
          </div>
        )}

        {agent && (
          <div className="mb-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => agent.cyclePermissionMode()}
              title="Đổi chế độ quyền (Shift+Tab)"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary"
            >
              <Shield animated={false} className="h-3 w-3" />
              <span>
                {agent.permissionMode === "autoPilot" ? "Tự động" : agent.permissionMode === "default" ? "Hỏi trước" : "Chỉ lập kế hoạch"}
              </span>
            </button>
          </div>
        )}

        <form
          onPaste={event => {
            const files = Array.from(event.clipboardData.files);
            if (files.length && !sending && !dictating && !voice?.active) {
              event.preventDefault();
              void attachments.add(files);
            }
          }}
          onSubmit={send}
          className="flex items-end gap-2 rounded-2xl border border-primary-pastel/80 bg-background p-1.5 shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        >
          <div className="flex items-center gap-0.5 pl-1">
            <ChatImageAttachments attachments={attachments} disabled={sending || dictating || voice?.active} />
            <DictationButton
              disabled={sending || voice?.active}
              onBusyChange={setDictating}
              getValue={getComposerValue}
              onValueChange={setComposerValue}
            />
          </div>
          <textarea
            ref={inputElement}
            aria-label="Nhắn Mây Mây Co-Pilot"
            placeholder={
              sending || agent?.busy
                ? "Gõ tiếp để xếp hàng tin nhắn kế tiếp…"
                : "Nhắn cho Mây Mây…"
            }
            rows={1}
            maxLength={12000}
            readOnly={dictating}
            defaultValue=""
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submitMessage();
                return;
              }
              // Hannes Up/Down Prompt History Recall
              if (event.key === "ArrowUp" && agent?.promptHistory.length) {
                const el = event.currentTarget;
                if (el.selectionStart === 0 || !el.value.includes("\n")) {
                  event.preventDefault();
                  const nextIdx = Math.min(agent.promptHistory.length - 1, historyIdx.current + 1);
                  historyIdx.current = nextIdx;
                  setComposerValue(agent.promptHistory[nextIdx] || "");
                }
              } else if (event.key === "ArrowDown" && historyIdx.current >= 0 && agent?.promptHistory.length) {
                const el = event.currentTarget;
                if (!el.value.includes("\n")) {
                  event.preventDefault();
                  const nextIdx = historyIdx.current - 1;
                  historyIdx.current = nextIdx;
                  setComposerValue(nextIdx >= 0 ? agent.promptHistory[nextIdx] || "" : "");
                }
              }
            }}
            className="min-h-11 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl shadow-xs"
            disabled={!attachments.ready || loading || dictating || Boolean(voice?.active)}
            aria-label="Gửi lệnh cho Mây Mây"
          >
            <Send animated={false} size="1em" />
          </Button>
        </form>
      </div>
    </div>
  );
}
