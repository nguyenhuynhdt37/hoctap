"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { HiChat, HiX, HiMenuAlt2, HiPlus, HiMicrophone } from "react-icons/hi";
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
import { Alert } from "@/components/ui/states";

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
  accessToken,
}: TutorChatPanelProps) {
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
    <div className="h-full flex bg-white">
      {/* History Sidebar */}
      {showHistory && (
        <div className="w-64 flex-shrink-0 border-r border-gray-200">
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

      {voiceOpen && <VoiceDialog lessonId={lessonId} lessonTitle={lessonTitle} accessToken={accessToken}
        onSourceClick={handleSourceClick}
        onClose={(id) => { setVoiceOpen(false); if (id) { setThreadId(id); void fetchMessages(id); } }} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary-light/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-lg transition-colors ${
                showHistory
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:bg-background"
              }`}
            >
              <HiMenuAlt2 className="w-5 h-5" />
            </button>
            <img
              src="/logo/studynest-logo.svg"
              alt="Mây Mây AI"
              className="w-5 h-5 object-contain"
            />
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Trợ giảng Mây Mây AI
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {lessonTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setVoiceOpen(true)} title="Trò chuyện bằng giọng nói" aria-label="Mở voice Mây Mây"
              className="rounded-lg p-2 text-primary transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <HiMicrophone className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary-light rounded-lg"
            >
              <HiPlus className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:bg-background rounded-lg"
              >
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {showUnreadableNotice && (
          <Alert
            variant="info"
            role="status"
            className="mx-3 mt-3 rounded-xl px-3 py-2 text-xs"
            onClose={() => setShowUnreadableNotice(false)}
          >
            Mây Mây chưa hỗ trợ đọc nội dung bài giảng này. Bạn vẫn có thể đặt câu hỏi về kiến thức chung hoặc gửi nội dung cần giải thích.
          </Alert>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isFetchingHistory ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <img
                src="/logo/studynest-logo.svg"
                alt="Mây Mây AI"
                className="w-11 h-11 object-contain mb-3"
              />
              <h4 className="font-semibold text-foreground mb-1">
                Hỏi Trợ giảng Mây Mây nhé!
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Mây Mây sẵn sàng giải đáp bài học cho bạn.
              </p>
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
