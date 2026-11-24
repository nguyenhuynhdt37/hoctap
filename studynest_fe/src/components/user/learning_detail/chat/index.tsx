"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { X, AlignLeft, Plus, Mic, Eye, Play, Code, Compass } from "pulsoicon-react";
import { Badge } from "@/components/ui/badge";
import {
  TutorMessage,
  TutorScope,
  GetMessagesResponse,
  MessageResponse,
  ActiveThreadResponse,
  MessageSource,
} from "@/types/user/tutor-chat";
import api from "@/lib/utils/fetcher/client/axios";
import VoiceDialog from "./voice/voice-dialog";
import { AssistantSettings } from "../../assistant/assistant-settings";
import { useAssistantVoice } from "../../assistant/voice-provider";
import { Alert } from "@/components/ui/states";
import { AgentStatus } from "../agent/agent-status";
import { AgentAwareness } from "../agent/agent-awareness";
import { AgentUnavailableError, useLearningAgent } from "../agent/agent-context";

import MessageBubble from "./message-bubble";
import MessageInput from "./message-input";
import { ChatHistorySidebar } from "./history";

// ========== PROPS ==========

interface TutorChatPanelProps {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  sectionId?: string;
  courseTitle: string;
  onSeekToTime?: (seconds: number) => void;
  onNavigateToLesson?: (lessonId: string) => void;
  onClose?: () => void;
  accessToken?: string;
}

// Document-memory only: closing/reopening or SPA navigation keeps this set; F5 resets it.
const shownUnreadableLessonNotices = new Set<string>();

// ========== MAIN COMPONENT ==========

function TutorChatPanel({
  lessonId,
  lessonTitle,
  onSeekToTime,
  onNavigateToLesson,
  onClose,
}: TutorChatPanelProps) {
  const agent = useLearningAgent();
  const sharedVoice = useAssistantVoice();
  const [voiceError, setVoiceError] = useState("");
  const openVoice = async () => {
    if (agent?.busy) return;
    setVoiceError("");
    try {
      if (sharedVoice) await sharedVoice.open({ lessonId, lessonTitle,
        onSourceClick: handleSourceClick, onClose: id => { if (id) { setThreadId(id); void fetchMessages(id); } } });
      else { await agent?.prepareSession(); setVoiceOpen(true); }
    } catch (error) { if (error instanceof AgentUnavailableError) setVoiceOpen(true); else setVoiceError("Chưa kết nối được phiên học. Hãy thử lại."); }
  };
  // State cơ bản
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [scope, setScope] = useState<TutorScope>("lesson");
  const [showHistory, setShowHistory] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showUnreadableNotice, setShowUnreadableNotice] = useState(false);

  // ========== API FETCH MESSAGES ==========

  const fetchMessages = useCallback(async (tId: string) => {
    setIsFetchingHistory(true);
    try {
      const res = await api.get<GetMessagesResponse>(
        `/tutor-chat/threads/${tId}/messages?limit=20`
      );

      const mappedMessages: TutorMessage[] = res.data.messages.map(
        (msg: MessageResponse) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          images: msg.images,
          sources: msg.sources,
          activity: msg.activity,
        })
      );

      setMessages(mappedMessages);
    } catch (err) {
      console.error("Fetch history failed:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  }, []);

  // Fetch khi threadId thay đổi
  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId);
    }
  }, [threadId, fetchMessages]);

  // Reset khi đổi lesson & Fetch active thread
  useEffect(() => {
    // 1. Reset state
    setMessages([]);
    setThreadId(undefined);
    setScope("lesson");
    setShowUnreadableNotice(false);
    let cancelled = false;

    // 2. Fetch active thread
    if (!lessonId) return;

    const fetchActiveThread = async () => {
      try {
        const res = await api.get<ActiveThreadResponse>(
          `/tutor-chat/lessons/${lessonId}/threads/active`
        );
        if (cancelled) return;
        if (res.data.can_read_lesson === false && !shownUnreadableLessonNotices.has(lessonId)) {
          shownUnreadableLessonNotices.add(lessonId);
          setShowUnreadableNotice(true);
        }
        if (res.data.thread) {
          setThreadId(res.data.thread.id);
          setScope(res.data.thread.scope);
        }
      } catch (err) {
        // Ignore
      }
    };

    fetchActiveThread();
    return () => { cancelled = true; };
  }, [lessonId]);

  // Auto scroll
  useEffect(() => {
    if (!isFetchingHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFetchingHistory]);

  // ========== CALLBACKS ==========

  // Nhận tin nhắn mới từ MessageInput
  const handleNewMessages = useCallback(
    (
      userMsg: TutorMessage,
      assistantMsg: TutorMessage,
      newThreadId?: string
    ) => {
      setMessages((prev) => {
        // Prevent duplicate IDs
        const existsUser = prev.some((m) => m.id === userMsg.id);
        const existsAssistant = prev.some((m) => m.id === assistantMsg.id);

        let nextMessages = [...prev];
        if (!existsUser) nextMessages.push(userMsg);
        if (!existsAssistant) nextMessages.push(assistantMsg);

        return nextMessages;
      });
      if (newThreadId && !threadId) {
        setThreadId(newThreadId);
        // Không fetch lại vì tin mới đã append
      }
    },
    [threadId]
  );

  // Cập nhật assistant message (khi API response)
  const handleUpdateMessage = useCallback(
    (messageId: string, updates: Partial<TutorMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
      );
    },
    []
  );

  // Click source trong tin nhắn
  const handleSourceClick = useCallback(
    (source: MessageSource) => {
      if (source.source_type === "resource" && source.resource_url) {
        // Do not execute arbitrary schemes in historical/model-generated URLs.
        try {
          const url = new URL(source.resource_url, window.location.origin);
          if (["http:", "https:"].includes(url.protocol)) {
            window.open(url.href, "_blank", "noopener,noreferrer");
          }
        } catch { /* malformed historical URL */ }
        return;
      }
      if (!source.lesson_id) return;
      if (source.lesson_id === lessonId && source.source_type === "video"
          && source.timestamp_seconds !== undefined) {
        onSeekToTime?.(source.timestamp_seconds);
      } else {
        onNavigateToLesson?.(source.lesson_id);
      }
    },
    [onSeekToTime, onNavigateToLesson, lessonId]
  );

  // Chọn thread từ history
  const handleSelectThread = useCallback(
    (id: string, threadScope: TutorScope) => {
      if (id !== threadId) {
        setThreadId(id);
        setScope(threadScope);
        setMessages([]); // Clear cũ để show loading
      }
      setShowHistory(false);
    },
    [threadId]
  );

  // Xóa thread
  const handleDeleteThread = useCallback(
    (id: string) => {
      if (threadId === id) {
        setThreadId(undefined);
        setMessages([]);
      }
    },
    [threadId]
  );

  // Thread được tìm thấy từ sidebar (active thread ban đầu)
  const handleActiveThreadFound = useCallback(
    (id: string | null, foundScope?: TutorScope) => {
      if (id && !threadId) {
        // Chỉ set nếu chưa có (tránh loop)
        setThreadId(id);
      }
      if (foundScope) setScope(foundScope);
    },
    [threadId]
  );

  // ========== RENDER ==========

  return (
    <div data-agent-private className="relative flex h-full min-w-0 bg-surface">
      {/* History Sidebar */}
      {showHistory && (
        <div className="w-64 max-w-[70%] shrink-0 border-r border-border">
          <ChatHistorySidebar
            lessonId={lessonId}
            activeSessionId={threadId}
            onSelectSession={handleSelectThread}
            onDeleteSession={handleDeleteThread}
            onClose={() => setShowHistory(false)}
            onActiveThreadFound={handleActiveThreadFound}
          />
        </div>
      )}

      {voiceOpen && <VoiceDialog lessonId={lessonId} lessonTitle={lessonTitle} agentSessionId={agent?.sessionId} onAgentEvent={agent?.handleEvent}
        onSourceClick={handleSourceClick}
        onClose={(id) => { setVoiceOpen(false); if (id) { setThreadId(id); void fetchMessages(id); } }} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between gap-2 border-b border-primary-pastel/70 bg-gradient-to-r from-primary-light/80 via-surface to-secondary-light/40 px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              aria-label={showHistory ? "Ẩn lịch sử trò chuyện" : "Mở lịch sử trò chuyện"}
              onClick={() => setShowHistory(!showHistory)}
              className={`rounded-xl p-1.5 transition-colors ${
                showHistory
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-primary-light hover:text-primary"
              }`}
            >
              <AlignLeft animated={false} className="h-4 w-4" />
            </button>
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-surface shadow-2xs">
              <img
                src="/logo/maymay-mark.svg"
                alt="Mây Mây AI"
                className="h-5 w-5 object-contain"
              />
              <span
                aria-hidden="true"
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-surface ${
                  agent?.busy ? "animate-ping bg-primary" : "bg-success-foreground"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate font-display text-sm font-bold text-foreground">
                  Mây Mây Co-Pilot
                </h3>
                <Badge variant="info" size="sm" className="px-1.5 py-0 text-[10px]">
                  Live
                </Badge>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {lessonTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <AssistantSettings />
            <button
              type="button"
              onClick={() => agent?.setDetailedTranscript(v => !v)}
              title="Bật/tắt chế độ xem chi tiết từng lệnh công cụ (Ctrl+O)"
              aria-label="Chuyển đổi log chi tiết"
              className={`rounded-xl p-1.5 transition-colors ${
                agent?.detailedTranscript
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:bg-primary-light hover:text-primary"
              }`}
            >
              <Eye animated={false} className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => void openVoice()} disabled={agent?.busy} title="Trò chuyện bằng giọng nói" aria-label="Mở voice Mây Mây"
              className="rounded-xl p-1.5 text-primary transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Mic animated={false} className="h-4 w-4" />
            </button>
            <button
              aria-label="Mở danh sách cuộc trò chuyện"
              onClick={() => setShowHistory(true)}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-primary-light hover:text-primary"
            >
              <Plus animated={false} className="h-4 w-4" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng trợ giảng"
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-background"
              >
                <X animated={false} className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        <AgentAwareness lessonTitle={lessonTitle} />
        <AgentStatus />
        {voiceError && <Alert variant="warning" className="mx-3 mt-3">{voiceError}</Alert>}

        {showUnreadableNotice && (
          <Alert
            variant="info"
            role="status"
            className="mx-3 mt-3 rounded-xl px-3 py-2 text-xs"
            onClose={() => setShowUnreadableNotice(false)}
          >
            Bài này chưa có nội dung được lập chỉ mục cho AI. Bạn vẫn có thể đặt câu hỏi về kiến thức chung hoặc gửi nội dung cần giải thích.
          </Alert>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isFetchingHistory ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col justify-center space-y-4 py-4">
              <div className="rounded-2xl border border-primary-pastel bg-gradient-to-br from-primary-light/75 via-surface to-secondary-light/40 p-4 shadow-2xs">
                <div className="mb-2 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-pastel bg-surface">
                    <img
                      src="/logo/maymay-mark.svg"
                      alt="Mây Mây AI"
                      className="h-5 w-5 object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-foreground">
                      Mây Mây Co-Pilot sẵn sàng!
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Điều khiển màn hình · Tua video · Đọc & Sửa code · Trắc nghiệm
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  Bạn có thể dùng thanh lệnh nhanh <code className="rounded bg-primary-light px-1 py-0.5 text-primary">/screen</code>,{" "}
                  <code className="rounded bg-primary-light px-1 py-0.5 text-primary">/highlight</code>,{" "}
                  <code className="rounded bg-primary-light px-1 py-0.5 text-primary">/video</code>,{" "}
                  <code className="rounded bg-primary-light px-1 py-0.5 text-primary">/code</code> bên dưới hoặc trò chuyện tự nhiên để mình thao tác trực tiếp trên màn hình bài học.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  { icon: Eye, title: "Quét màn hình", desc: "Đọc & tóm tắt giao diện hiện tại" },
                  { icon: Compass, title: "Chỉ điểm Spotlight", desc: "Khoanh vùng sáng mục quan trọng" },
                  { icon: Play, title: "Điều khiển Video", desc: "Tua, phát, dừng & giải thích theo mốc" },
                  { icon: Code, title: "Đồng hành Code & Quiz", desc: "Đọc buffer, tạo bản sửa & gợi ý đáp án" },
                ].map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-border bg-surface p-3 shadow-2xs"
                    >
                      <span className="mb-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light text-primary">
                        <ItemIcon animated={false} className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onSourceClick={handleSourceClick}
                  currentLessonId={lessonId}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <MessageInput
          lessonId={lessonId}
          threadId={threadId}
          scope={scope}
          isLoading={isLoading}
          hasMessages={messages.length > 0}
          onScopeChange={setScope}
          onLoadingChange={setIsLoading}
          onNewMessages={handleNewMessages}
          onUpdateMessage={handleUpdateMessage}
          onThreadCreated={setThreadId}
        />
      </div>
    </div>
  );
}

const MemoizedTutorChatPanel = memo(TutorChatPanel);
export { MemoizedTutorChatPanel as TutorChatPanel };
export default MemoizedTutorChatPanel;

export { default as ResizablePanel } from "./resizable-panel";
