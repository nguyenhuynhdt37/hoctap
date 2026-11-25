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
  Star,
  X,
} from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { Badge } from "@/components/ui/badge";
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

const QUICK_MISSIONS = [
  {
    icon: MousePointerClick,
    title: "Mở khóa đang học",
    subtitle: "Quét màn hình & bấm vào nút Học tiếp giúp mình",
    prompt: "Hãy quét màn hình hiện tại (browser_snapshot) và nhấn vào nút Học tiếp hoặc khóa học đang học giúp mình.",
    badge: "Auto-Pilot",
  },
  {
    icon: Compass,
    title: "Khám phá & Mở khóa nổi bật",
    subtitle: "Tìm khóa học phù hợp rồi tự điều hướng mở trang khóa học",
    prompt: "Hãy tìm khóa học nổi bật trong hệ thống rồi điều hướng mở trực tiếp trang khóa học đó trên màn hình cho mình xem.",
    badge: "Telekinesis",
  },
  {
    icon: Eye,
    title: "Chỉ điểm trên trang này",
    subtitle: "Quét DOM và khoanh vùng Spotlight các mục quan trọng",
    prompt: "Hãy đọc màn hình hiện tại (browser_snapshot) và khoanh vùng chỉ điểm (browser_highlight) vào mục quan trọng nhất trên trang này.",
    badge: "Spotlight",
  },
  {
    icon: BookOpen,
    title: "Báo cáo tiến độ tài khoản",
    subtitle: "Truy vấn SQL sandbox để thống kê tiến độ học tập",
    prompt: "Cho mình xem tiến độ các khóa học đang học từ dữ liệu tài khoản.",
    badge: "SQL Sandbox",
  },
];

const SLASH_CHIPS = [
  { label: "/screen", text: "Hãy đọc màn hình hiện tại (browser_snapshot) và tóm tắt những gì đang hiển thị.", icon: Eye },
  { label: "/highlight", text: "/highlight ", icon: Compass },
  { label: "/open", text: "/open ", icon: MousePointerClick },
  { label: "/courses", text: "Hãy tìm các khóa học công khai hiện có và gợi ý cho mình.", icon: Star },
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
      {/* Top Action, X-Ray Inspector & Radar Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-surface/80 px-3.5 py-2 backdrop-blur-xs">
        <div className="flex items-center gap-1.5">
          <AssistantSettings />
          <button
            type="button"
            onClick={() => agent?.setXrayActive(v => !v)}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors ${
              agent?.xrayActive
                ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                : "border-primary-pastel bg-primary-light/60 text-primary hover:bg-primary-light"
            }`}
            title="Tia X-Ray: Rê chuột lên trang web và click vào bất kỳ phần tử nào để hỏi hoặc ra lệnh cho Mây Mây"
          >
            <Compass animated={false} className="h-3.5 w-3.5" />
            <span>{agent?.xrayActive ? "Đang bật X-Ray…" : "Tia X-Ray"}</span>
          </button>
          <button
            type="button"
            onClick={() => agent?.setDetailedTranscript(v => !v)}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors ${
              agent?.detailedTranscript
                ? "border-primary-pastel bg-primary-light text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
            title="Bật/tắt chế độ xem chi tiết từng lệnh công cụ (Ctrl+O)"
          >
            <Eye animated={false} className="h-3.5 w-3.5" />
            <span>Log</span>
          </button>
        </div>

        <Button
          size="sm"
          variant="pastel"
          onClick={() => void startVoice()}
          disabled={agent?.busy || dictating || !attachments.ready}
          leftIcon={<Mic animated={false} size="1em" />}
          className="rounded-xl"
        >
          {voice?.active ? "Mở lại cuộc gọi" : "Voice Live"}
        </Button>
      </div>

      {/* Live Screen Radar Strip */}
      {agent?.lastScreenAction && (
        <div className="mx-3.5 mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-primary-pastel bg-primary-light/45 px-3 py-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <MousePointerClick animated={false} className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate font-medium text-foreground">
              Thao tác vừa thực thi: <code className="text-primary">{agent.lastScreenAction.name}</code>
            </span>
          </div>
          <Badge variant={agent.lastScreenAction.verified ? "success" : "warning"} size="sm">
            {agent.lastScreenAction.verified ? "Đã xác minh" : "Chưa xong"}
          </Badge>
        </div>
      )}

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
            <div className="space-y-4 py-3">
              {/* Hero Welcome Card */}
              <div className="rounded-2xl border border-primary-pastel bg-gradient-to-br from-primary-light/70 via-surface to-secondary-light/40 p-4 shadow-2xs">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Bot animated={false} className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">Mây Mây Co-Pilot ☁️</h2>
                    <p className="text-[11px] text-muted-foreground">
                      Kiến trúc Hannes-Lite · Tia X-Ray · Bôi đen Hỏi nhanh
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  Bấm <strong>Tia X-Ray</strong> ở trên để chỉ thẳng vào bất kỳ nút/khóa học nào trên màn hình, hoặc{" "}
                  <strong>bôi đen một đoạn chữ bất kỳ</strong> trên trang để triệu hồi thanh giải thích tức thì tại{" "}
                  <code className="rounded bg-primary-light px-1 py-0.5 text-[11px] text-primary">{pathname}</code>.
                </p>
              </div>

              {/* Quick Interactive Mission Bento Cards */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {QUICK_MISSIONS.map(mission => {
                  const Icon = mission.icon;
                  return (
                    <button
                      key={mission.title}
                      type="button"
                      disabled={sending || agent?.busy}
                      onClick={() => void submitMessage(mission.prompt)}
                      className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-3 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:bg-primary-light/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon animated={false} className="h-3.5 w-3.5" />
                        </span>
                        <Badge variant="info" size="sm" className="text-[10px]">
                          {mission.badge}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{mission.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {mission.subtitle}
                        </p>
                      </div>
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
            <span className="truncate">⏳ Đã xếp hàng gửi tiếp: &ldquo;{queuedPrompt}&rdquo;</span>
            <button
              type="button"
              onClick={() => setQueuedPrompt(null)}
              className="text-[11px] font-semibold underline"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Quick Slash Command Chips */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {SLASH_CHIPS.map(chip => {
              const ChipIcon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  disabled={dictating}
                  onClick={() => {
                    if (chip.text.endsWith(" ")) {
                      setComposerValue(chip.text);
                      inputElement.current?.focus();
                    } else {
                      void submitMessage(chip.text);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light/45 px-2.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-light disabled:opacity-40"
                >
                  <ChipIcon animated={false} className="h-3 w-3" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {agent && (
            <button
              type="button"
              onClick={() => agent.cyclePermissionMode()}
              title="Đổi chế độ quyền Co-Pilot (Shift+Tab)"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-primary-pastel hover:text-primary"
            >
              <Shield animated={false} className="h-2.5 w-2.5" />
              <span>Shift+Tab</span>
            </button>
          )}
        </div>

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
                ? "Gõ tiếp để xếp hàng lệnh kế tiếp (Enter để xếp hàng)…"
                : "Ra lệnh điều khiển màn hình, gõ /screen, /xray, hoặc nhấn ↑ lấy lại lệnh cũ…"
            }
            rows={2}
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
