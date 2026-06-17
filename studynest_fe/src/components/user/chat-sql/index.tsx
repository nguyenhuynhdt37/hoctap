"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { HiChat, HiPaperAirplane, HiTrash, HiSparkles } from "react-icons/hi";
import { ChatSqlMessage, ChatSqlResponse } from "@/types/user/chat-sql";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import api from "@/lib/utils/fetcher/client/axios";

// Gợi ý câu hỏi mẫu
const SAMPLE_QUESTIONS = [
  "Tôi đã đăng ký bao nhiêu khóa học?",
  "Tiến độ học của tôi như thế nào?",
  "Khóa học nào tôi chưa hoàn thành?",
  "Tổng số bài học tôi đã học?",
];

function ChatSql() {
  const [messages, setMessages] = useState<ChatSqlMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMessages = localStorage.getItem("chat_sql_history");
      if (savedMessages) {
        try {
          // Parse date strings back to Date objects
          const parsed = JSON.parse(savedMessages).map(
            (msg: ChatSqlMessage) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })
          );
          setMessages(parsed);
        } catch (e) {
          console.error("Failed to parse chat history", e);
        }
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat_sql_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Auto scroll khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Gửi tin nhắn
  const sendMessage = useCallback(
    async (question?: string) => {
      const text = question || input.trim();
      if (!text || loading) return;

      // Tạo message user
      const userMsg: ChatSqlMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      // Cập nhật state ngay lập tức để hiển thị
      setMessages((prev) => {
        const newMessages = [...prev, userMsg];
        return newMessages;
      });
      setInput("");
      setLoading(true);

      try {
        // Lấy history từ state messages hiện tại (bao gồm cả tin nhắn user vừa thêm nếu dùng functional update,
        // nhưng ở đây messages là state cũ chưa update trong scope này, nên lấy trực tiếp từ messages cũ + userMsg mới là chuẩn nhất để chắc chắn)
        // Tuy nhiên, logic cũ: `const history = messages.map((m) => m.content).slice(-10);`
        // `messages` ở đây là messages TRƯỚC khi userMsg được thêm vào (vì setMessages là async/batch).
        // API yêu cầu history là "Lịch sử chat trước đó".
        // Nếu user hỏi câu Q2, history nên chứa Q1 và A1.
        // Vậy logic cũ lấy `messages` hiện tại (chưa có Q2) là ĐÚNG.

        const history = messages.map((m) => m.content).slice(-10);

        const res = await api.post<ChatSqlResponse>("/chat-sql/complete", {
          question: text,
          history,
        });

        const assistantMsg: ChatSqlMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        // useEffect sẽ tự save vào localStorage
      } catch (error: any) {
        const errorContent =
          error.response?.status === 401
            ? "Vui lòng đăng nhập để sử dụng tính năng này."
            : "Đã xảy ra lỗi. Vui lòng thử lại.";

        const errorMsg: ChatSqlMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, messages]
  );

  // Xóa lịch sử chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setInput("");
    localStorage.removeItem("chat_sql_history");
  }, []);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <HiSparkles className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Trợ lý dữ liệu AI</h3>
            <p className="text-xs text-gray-500">
              Hỏi đáp về khóa học, tiến độ, dữ liệu của bạn
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Xóa lịch sử"
          >
            <HiTrash className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState onSelectQuestion={sendMessage} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Loading */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <HiSparkles className="w-4 h-4 text-green-600" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về dữ liệu của bạn..."
            disabled={loading}
            maxLength={500}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:opacity-50 transition-all"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <HiPaperAirplane className="w-4 h-4 rotate-90" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
        </p>
      </div>
    </div>
  );
}

// Empty state với gợi ý câu hỏi
const EmptyState = memo(function EmptyState({
  onSelectQuestion,
}: {
  onSelectQuestion: (q: string) => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <HiChat className="w-8 h-8 text-green-600" />
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">
        Xin chào! Tôi có thể giúp gì?
      </h4>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        Hỏi tôi về khóa học, tiến độ học tập, hoặc bất kỳ dữ liệu nào của bạn
        trên hệ thống.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelectQuestion(q)}
            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:border-green-500 hover:text-green-600 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
});

// Message bubble component
const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: ChatSqlMessage;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-green-600" : "bg-green-100"
        }`}
      >
        {isUser ? (
          <span className="text-white text-xs font-medium">Bạn</span>
        ) : (
          <HiSparkles className="w-4 h-4 text-green-600" />
        )}
      </div>

      {/* Content */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-green-600 text-white rounded-tr-md"
            : "bg-gray-50 text-gray-900 rounded-tl-md"
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <MarkdownRenderer
            content={message.content}
            className="text-sm [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
          />
        )}
      </div>
    </div>
  );
});

export default memo(ChatSql);
