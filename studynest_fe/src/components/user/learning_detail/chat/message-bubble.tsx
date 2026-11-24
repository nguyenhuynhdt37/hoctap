"use client";

import { memo, useState } from "react";
import { Bot } from "pulsoicon-react";
import { TutorMessage, MessageSource } from "@/types/user/tutor-chat";
import { AgentActivity } from "../agent/agent-activity";
import MarkdownRenderer from "./markdown-renderer";
import { SourceList } from "./chat-chips";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";

interface Props {
  message: TutorMessage;
  onSourceClick: (source: MessageSource) => void;
  currentLessonId?: string;
}

function MessageBubble({ message, onSourceClick, currentLessonId }: Props) {
  const isUser = message.role === "user";
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const timeStr =
    message.timestamp instanceof Date && !Number.isNaN(message.timestamp.getTime())
      ? message.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      : "";

  // User message (Hannes prompt style: ❯ command / prompt pill)
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[88%] flex-col items-end">
          {/* Images Grid */}
          {message.images && message.images.length > 0 ? (
            <div className="mb-2 flex max-w-[300px] flex-wrap justify-end gap-1.5">
              {message.images.map((img, index) => {
                const src = getImageUrl(img.url);
                return (
                  <img
                    key={img.id || index}
                    src={src}
                    alt="Ảnh đính kèm của bạn"
                    className="h-[88px] w-[88px] cursor-zoom-in rounded-xl border border-primary-pastel bg-background object-cover shadow-2xs transition-opacity hover:opacity-90"
                    onClick={() => setViewingImage(src)}
                  />
                );
              })}
            </div>
          ) : null}

          {/* Text */}
          {message.content && (
            <div className="rounded-2xl rounded-br-xs border border-primary/20 bg-primary px-4 py-2.5 text-primary-foreground shadow-xs">
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="select-none font-mono text-xs font-bold opacity-75">
                  ❯
                </span>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          )}
          {timeStr && <span className="mt-1 px-1 text-[10px] text-muted-foreground">{timeStr}</span>}
        </div>

        <ImagePreviewModal src={viewingImage} onClose={() => setViewingImage(null)} />
      </div>
    );
  }

  // Assistant message (Hannes Editorial Co-Pilot card)
  return (
    <div className="group relative w-full rounded-2xl border border-border/80 bg-surface p-3.5 shadow-2xs transition-colors hover:border-primary-pastel/80">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-primary-pastel bg-primary-light text-primary">
            <Bot animated={false} className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-semibold text-foreground">Mây Mây Co-Pilot</span>
          {message.isStreaming && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
              Live
            </span>
          )}
        </div>
        {timeStr && <span className="text-[10px] tabular-nums text-muted-foreground">{timeStr}</span>}
      </div>

      <AgentActivity events={message.activity} running={message.isStreaming} />

      {/* Content */}
      {message.content && (
        <div className="pl-0.5">
          <MarkdownRenderer content={message.content} />
        </div>
      )}

      {/* Loading state when waiting for first event */}
      {message.isStreaming && !message.content && !message.activity?.length && (
        <div className="flex items-center gap-2.5 rounded-xl bg-primary-light/40 px-3 py-2">
          <div className="flex gap-1">
            {[0, 150, 300].map(delay => (
              <div
                key={delay}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-primary">Mây Mây đang khởi động vòng lặp công cụ…</span>
        </div>
      )}

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <SourceList
          sources={message.sources as MessageSource[]}
          onSourceClick={onSourceClick}
          currentLessonId={currentLessonId}
        />
      )}
    </div>
  );
}

export default memo(MessageBubble);
