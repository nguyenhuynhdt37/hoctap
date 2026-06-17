"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { HiChat, HiX, HiMenuAlt2, HiPlus } from "react-icons/hi";
import {
  TutorMessage,
  TutorScope,
  GetMessagesResponse,
  MessageResponse,
  ActiveThreadResponse,
  MessageSource,
} from "@/types/user/tutor-chat";
import api from "@/lib/utils/fetcher/client/axios";

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
  onClose?: () => void;
}

// ========== MAIN COMPONENT ==========

function TutorChatPanel({
  lessonId,
  lessonTitle,
  onSeekToTime,
  onClose,
}: TutorChatPanelProps) {
  // State cơ bản
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [scope, setScope] = useState<TutorScope>("lesson");
  const [showHistory, setShowHistory] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // 2. Fetch active thread
    if (!lessonId) return;

    const fetchActiveThread = async () => {
      try {
        const res = await api.get<ActiveThreadResponse>(
          `/tutor-chat/lessons/${lessonId}/threads/active`
        );
        if (res.data.thread) {
          setThreadId(res.data.thread.id);
          setScope(res.data.thread.scope);
        }
      } catch (err) {
        // Ignore
      }
    };

    fetchActiveThread();
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
      switch (source.source_type) {
        case "video":
          // Nếu video thuộc lesson hiện tại và có timestamp -> seek
          if (
            source.lesson_id === lessonId &&
            source.timestamp_seconds !== undefined
          ) {
            onSeekToTime?.(source.timestamp_seconds);
          } else if (source.lesson_id && source.lesson_id !== lessonId) {
            // Video thuộc bài khác -> thông báo
            alert(
              `⚠️ Video này thuộc bài học "${
                source.lesson_title || "khác"
              }". Hiện tại không thể seek tới thời điểm cụ thể.`
            );
          }
          break;

        case "resource":
          if (source.resource_url) {
            window.open(source.resource_url, "_blank");
          }
          break;

        case "code":
          // Có thể mở modal hiển thị code hoặc scroll tới phần code
          if (source.code_content) {
            // Tạm thời alert, sau này có thể mở modal
            console.log("Code content:", source.code_content);
          }
          break;

        case "quiz":
          // Nếu có quizz_option_id -> điều hướng đến câu hỏi đó
          if (source.quizz_option_id) {
            // Emit event hoặc callback để navigate đến quiz
            console.log("Navigate to quiz option:", source.quizz_option_id);
            // TODO: Implement navigation to specific quiz question
            if (source.lesson_id && source.lesson_id !== lessonId) {
              alert(
                `⚠️ Quiz này thuộc bài học "${
                  source.lesson_title || "khác"
                }". Vui lòng chuyển đến bài học đó để xem.`
              );
            }
          }
          break;
      }
    },
    [onSeekToTime, lessonId]
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-lg transition-colors ${
                showHistory
                  ? "bg-green-100 text-green-600"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              <HiMenuAlt2 className="w-5 h-5" />
            </button>
            <HiChat className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-medium text-sm text-gray-900">
                Trợ giảng AI
              </h3>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                {lessonTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(true)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
            >
              <HiPlus className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
              >
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isFetchingHistory ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <HiChat className="w-10 h-10 text-gray-300 mb-3" />
              <h4 className="font-medium text-gray-700 mb-1">Hỏi gì đó đi!</h4>
              <p className="text-xs text-gray-500 mb-4">
                Tôi sẵn sàng hỗ trợ bạn.
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
        />
      </div>
    </div>
  );
}

const MemoizedTutorChatPanel = memo(TutorChatPanel);
export { MemoizedTutorChatPanel as TutorChatPanel };
export default MemoizedTutorChatPanel;

export { default as ResizablePanel } from "./resizable-panel";
