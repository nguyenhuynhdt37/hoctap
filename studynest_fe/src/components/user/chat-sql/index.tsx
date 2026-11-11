"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { postChatStream } from "@/lib/utils/fetcher/client/chat-stream";
import { ChatSqlMessage, ChatSqlResponse } from "@/types/user/chat-sql";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { HiPaperAirplane, HiCloud, HiTrash } from "react-icons/hi";

const SAMPLE_QUESTIONS = [
  "Tôi đã đăng ký bao nhiêu khóa học trên Mây Mây?",
  "Tiến độ học tập của tôi như thế nào?",
  "Khóa học nào tôi chưa hoàn thành?",
  "Tổng số bài học tôi đã hoàn thành?",
];

function ChatSql() {
  const [messages, setMessages] = useState<ChatSqlMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      streamRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMessages = localStorage.getItem("chat_sql_history");
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages).map(
            (msg: ChatSqlMessage) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })
          );
          setMessages(parsed);
        } catch {
          // Ignore corrupted history
        }
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat_sql_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (question?: string) => {
      const text = question || input.trim();
      if (!text || loading) return;

      const userMsg: ChatSqlMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);
      setInput("");
      setLoading(true);

      try {
        const history = messages.map((m) => m.content).slice(-10);

        streamRef.current = new AbortController();
        let content = "";
        const result = await postChatStream<ChatSqlResponse>(
          "/chat-sql/complete",
          {
            question: text,
            history,
          },
          (delta) => {
            content += delta;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content } : msg
              )
            );
          },
          streamRef.current.signal
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: result.response } : msg
          )
        );
      } catch (error: any) {
        const errorContent =
          error.response?.status === 401
            ? "Vui lòng đăng nhập vào Mây Mây để sử dụng trợ lý AI."
            : "Mây Mây AI đang bận một chút. Bạn vui lòng thử lại nhé!";

        const errorMsg: ChatSqlMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
        };
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    (msg.content ? msg.content + "\n\n" : "") + errorMsg.content,
                }
              : msg
          )
        );
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, messages]
  );

  const clearChat = useCallback(() => {
    streamRef.current?.abort();
    setMessages([]);
    setInput("");
    localStorage.removeItem("chat_sql_history");
  }, []);

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
    <div className="flex flex-col h-full bg-surface rounded-[24px] border border-primary-pastel shadow-lg overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-primary-light/90 via-surface to-secondary-light/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-surface border border-primary-pastel rounded-full flex items-center justify-center shadow-2xs shrink-0">
            <img
              src="/logo/studynest-logo.svg"
              alt="Mây Mây AI"
              className="w-5 h-5 object-contain"
            />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <span>Mây Mây AI</span>
              <HiCloud className="w-3.5 h-3.5 text-primary" />
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Trợ lý học tập trên mây của bạn
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="p-2 text-muted-foreground hover:text-destructive-foreground hover:bg-destructive-bg rounded-xl transition-colors cursor-pointer"
            title="Xóa lịch sử trò chuyện"
          >
            <HiTrash className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/40">
        {messages.length === 0 ? (
          <EmptyState onSelectQuestion={sendMessage} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-light border border-primary-pastel flex items-center justify-center shrink-0">
              <img
                src="/logo/studynest-logo.svg"
                alt="Mây Mây AI"
                className="w-4.5 h-4.5 object-contain"
              />
            </div>
            <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-4 py-3 shadow-2xs">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-surface">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn tin cho Mây Mây AI..."
            disabled={loading}
            maxLength={500}
            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary disabled:opacity-50 transition-all"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
          >
            <HiPaperAirplane className="w-4 h-4 rotate-90" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Mây Mây AI luôn đồng hành cùng bạn trong suốt lộ trình học tập.
        </p>
      </div>
    </div>
  );
}

const EmptyState = memo(function EmptyState({
  onSelectQuestion,
}: {
  onSelectQuestion: (q: string) => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-primary-light border border-primary-pastel rounded-full flex items-center justify-center mb-4 shadow-xs">
        <img
          src="/logo/studynest-logo.svg"
          alt="Mây Mây AI"
          className="w-9 h-9 object-contain"
        />
      </div>
      <h4 className="font-display font-bold text-lg text-foreground mb-1.5">
        Xin chào! Mình là Mây Mây AI ☁️
      </h4>
      <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
        Hỏi Mây Mây về các khóa học, lộ trình học tập hoặc dữ liệu tiến độ của bạn bất cứ lúc nào nhé.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="px-3.5 py-1.5 text-xs bg-surface border border-border rounded-full hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
});

const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: ChatSqlMessage;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-primary-light border border-primary-pastel"
        }`}
      >
        {isUser ? (
          <span className="text-[11px] font-bold">Bạn</span>
        ) : (
          <img
            src="/logo/studynest-logo.svg"
            alt="Mây Mây"
            className="w-4.5 h-4.5 object-contain"
          />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md shadow-2xs"
            : "bg-surface border border-border text-foreground rounded-tl-md shadow-2xs"
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
