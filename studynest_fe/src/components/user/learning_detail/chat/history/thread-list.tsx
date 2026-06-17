"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { HiChat, HiX, HiRefresh } from "react-icons/hi";
import api from "@/lib/utils/fetcher/client/axios";
import {
  ChatThread,
  ThreadsResponse,
  ActiveThreadResponse,
  ChatSession,
  TutorScope,
} from "@/types/user/tutor-chat";
import ChatHistoryItem from "./thread-item";
import CreateButton from "./create-button";

interface ChatHistorySidebarProps {
  lessonId: string;
  activeSessionId?: string;
  onSelectSession: (sessionId: string, scope: TutorScope) => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
  onActiveThreadFound?: (threadId: string | null, scope?: TutorScope) => void;
}

// Map API response to ChatSession
function mapThreadToSession(thread: ChatThread): ChatSession {
  return {
    id: thread.id,
    title: thread.title,
    scope: thread.scope,
    isActive: thread.is_active,
    messageCount: thread.message_count,
    createdAt: new Date(thread.created_at),
    updatedAt: new Date(thread.updated_at),
  };
}

function ChatHistorySidebar({
  lessonId,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onClose,
  onActiveThreadFound,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch threads từ API
  const fetchThreads = useCallback(async () => {
    if (!lessonId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch threads list và active thread song song
      const [threadsRes, activeRes] = await Promise.all([
        api.get<ThreadsResponse>(`/tutor-chat/lessons/${lessonId}/threads`, {
          params: { limit: 20 },
        }),
        api
          .get<ActiveThreadResponse>(
            `/tutor-chat/lessons/${lessonId}/threads/active`
          )
          .catch(() => ({ data: { thread: null } })), // Fallback nếu chưa có active thread
      ]);

      const mappedSessions = threadsRes.data.threads.map(mapThreadToSession);
      setSessions(mappedSessions);

      // Thông báo active thread và scope lên component cha
      if (activeRes.data.thread?.id) {
        onActiveThreadFound?.(
          activeRes.data.thread.id,
          activeRes.data.thread.scope
        );
      } else {
        onActiveThreadFound?.(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch chat threads:", err);
      setError(err?.response?.data?.message || "Không thể tải danh sách chat");
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, onActiveThreadFound]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleDeleteSession = (sessionId: string) => {
    onDeleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleSelectSession = (sessionId: string, scope: TutorScope) => {
    // Cập nhật isActive trong local state
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        isActive: s.id === sessionId,
      }))
    );
    onSelectSession(sessionId, scope);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Lịch sử chat</span>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchThreads}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Làm mới"
          >
            <HiRefresh
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Đóng"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-gray-100">
        <CreateButton
          lessonId={lessonId}
          onCreated={(thread) => {
            // Thêm thread mới vào đầu danh sách
            const newSession = mapThreadToSession(thread);
            setSessions((prev) => [
              newSession,
              ...prev.map((s) => ({ ...s, isActive: false })),
            ]);
            // Chọn thread mới
            onSelectSession(thread.id, thread.scope);
            onActiveThreadFound?.(thread.id, thread.scope);
          }}
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button
              onClick={fetchThreads}
              className="text-xs text-green-600 hover:underline"
            >
              Thử lại
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <HiChat className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Chưa có cuộc trò chuyện nào</p>
            <p className="text-xs text-gray-400 mt-1">
              Bấm nút ở trên để bắt đầu
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <ChatHistoryItem
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onSelected={handleSelectSession}
                onDeleted={() => handleDeleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatHistorySidebar);
