"use client";

import { memo, useState } from "react";
import { TutorMessage, MessageSource } from "@/types/user/tutor-chat";
import MarkdownRenderer from "./markdown-renderer";
import { SourceList } from "./chat-chips";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";

interface Props {
  message: TutorMessage;
  onSourceClick: (source: MessageSource) => void;
  currentLessonId?: string;
}

function MessageBubble({ message, onSourceClick, currentLessonId }: Props) {
  const isUser = message.role === "user";
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // User message
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] flex flex-col items-end">
          {/* Images Grid */}
          {message.images && message.images.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1 mb-2 max-w-[300px]">
              {message.images.map((img, index) => {
                const src = getGoogleDriveImageUrl(img.url);
                return (
                  <img
                    key={img.id || index}
                    src={src}
                    alt=""
                    className="w-[90px] h-[90px] object-cover rounded-lg cursor-zoom-in border border-gray-100 bg-gray-50 hover:opacity-90 transition-opacity shadow-sm"
                    onClick={() => setViewingImage(src)}
                  />
                );
              })}
            </div>
          ) : null}

          {/* Text */}
          {message.content && (
            <div className="bg-green-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          )}
        </div>

        <ImagePreviewModal
          src={viewingImage}
          onClose={() => setViewingImage(null)}
        />
      </div>
    );
  }

  // Assistant message
  return (
    <div className="w-full">
      {/* Content */}
      {message.content && <MarkdownRenderer content={message.content} />}

      {/* Loading dots */}
      {message.isStreaming && !message.content && (
        <div className="flex items-center gap-2 py-2">
          <div className="flex gap-1">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">Thinking...</span>
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
