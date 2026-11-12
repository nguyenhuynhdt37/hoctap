"use client";

import { prepareImageUpload } from "@/lib/prepare-image-upload";
import toast from "react-hot-toast";
import { memo, useCallback, useRef, useState, useEffect } from "react";
import { HiPaperAirplane, HiPhotograph, HiX } from "react-icons/hi";
import {
  TutorScope,
  UploadedImage,
  TutorMessage,
  MessageResponse,
} from "@/types/user/tutor-chat";
import api from "@/lib/utils/fetcher/client/axios";
import { postChatStream } from "@/lib/utils/fetcher/client/chat-stream";
import { ScopeSelector } from "./chat-chips";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";

// ========== TYPES ==========

interface MessageInputProps {
  lessonId: string;
  threadId?: string;
  scope: TutorScope;
  isLoading: boolean;
  hasMessages: boolean;
  onScopeChange: (scope: TutorScope) => void;
  onLoadingChange: (loading: boolean) => void;
  onNewMessages: (
    userMsg: TutorMessage,
    assistantMsg: TutorMessage,
    newThreadId?: string
  ) => void;
  onUpdateMessage: (messageId: string, updates: Partial<TutorMessage>) => void;
  onThreadCreated: (threadId: string) => void;
}

interface LocalImage {
  tempId: string;
  previewUrl: string;
  isUploading: boolean;
  data?: UploadedImage;
}

// ========== COMPONENT ==========

function MessageInput({
  lessonId,
  threadId,
  scope,
  isLoading,
  hasMessages,
  onScopeChange,
  onLoadingChange,
  onNewMessages,
  onUpdateMessage,
  onThreadCreated,
}: MessageInputProps) {
  // State
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Derived state
  const isUploading = localImages.some((img) => img.isUploading);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<AbortController | null>(null);
  useEffect(() => () => { streamRef.current?.abort(); }, [lessonId, threadId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // UseEffect to cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      localImages.forEach((img) => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on unmount

  // ========== UPLOAD ==========

  const uploadFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    // 1. Create optimistic placeholders
    const newItems: LocalImage[] = imageFiles.map((file) => ({
      tempId: Math.random().toString(36).substr(2, 9),
      previewUrl: URL.createObjectURL(file),
      isUploading: true,
    }));

    setLocalImages((prev) => [...prev, ...newItems]);

    // 2. Upload in parallel
    await Promise.all(
      newItems.map(async (item, index) => {
        const file = imageFiles[index];
        try {
          const form = new FormData();
          form.append("file", await prepareImageUpload(file, "chat"));
          const res = await api.post<UploadedImage>(
            "/tutor-chat/upload/image",
            form,
            { headers: { "Content-Type": "multipart/form-data" } }
          );

          setLocalImages((prev) =>
            prev.map((img) =>
              img.tempId === item.tempId
                ? { ...img, isUploading: false, data: res.data }
                : img
            )
          );
        } catch (err) {
          console.error("Upload failed:", err);
          toast.error(err instanceof Error ? err.message : "Không tải được ảnh. Vui lòng thử lại.");
          // Remove failed image and cleanup URL
          setLocalImages((prev) => {
            const target = prev.find((i) => i.tempId === item.tempId);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((i) => i.tempId !== item.tempId);
          });
        }
      })
    );
  }, []);

  const removeImage = useCallback((tempId: string) => {
    setLocalImages((prev) => {
      const target = prev.find((i) => i.tempId === tempId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.tempId !== tempId);
    });
  }, []);

  // ========== SEND MESSAGE (API CALL) ==========

  const sendMessage = useCallback(
    async (text: string) => {
      // Check uploaded images
      const uploadedImages = localImages
        .filter((img) => !img.isUploading && img.data)
        .map((img) => img.data!);

      if ((!text && !uploadedImages.length) || isLoading || isUploading) return;

      // 1. Tạo optimistically
      const userMsgId = `user-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const userMessage: TutorMessage = {
        id: userMsgId,
        role: "user",
        content: text,
        timestamp: new Date(),
        images: uploadedImages,
      };

      const assistantMsgId = `assistant-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const assistantMessage: TutorMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      // 3. Thông báo lên parent
      onNewMessages(userMessage, assistantMessage);
      onLoadingChange(true);

      // 4. Clear input & images
      if (inputRef.current) inputRef.current.value = "";
      setLocalImages([]); // Clears UI state, URLs cleaned up by logic/effect?
      // Need to revoke URLs? The useEffect cleanup runs on unmount.
      // Manually revoke current listing:
      localImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));

      try {
        // 5. Gọi API
        streamRef.current = new AbortController();
        let streamedContent = "";
        const response = await postChatStream<MessageResponse>(
          `/tutor-chat/lessons/${lessonId}/chat`,
          {
            message: text,
            thread_id: threadId,
            images: userMessage.images?.map((img) => ({
              url: img.url,
              file_size: img.file_size,
              mime_type: img.mime_type,
              ocr_text: img.ocr_text,
            })),
          },
          (delta) => {
            streamedContent += delta;
            onUpdateMessage(assistantMsgId, { content: streamedContent, isStreaming: true });
          },
          streamRef.current.signal
        );

        // 6. Cập nhật assistant message
        onUpdateMessage(assistantMsgId, {
          id: response.id,
          content: response.content,
          sources: response.sources,
          isStreaming: false,
        });

        if (!threadId && response.thread_id) {
          onThreadCreated(response.thread_id);
        }
      } catch (err) {
        console.error("Send failed:", err);
        onUpdateMessage(assistantMsgId, {
          content: "Lỗi! Vui lòng thử lại.",
          isStreaming: false,
        });
      } finally {
        onLoadingChange(false);
      }
    },
    [
      localImages,
      isLoading,
      isUploading,
      lessonId,
      threadId,
      onNewMessages,
      onUpdateMessage,
      onThreadCreated,
      onLoadingChange,
    ]
  );

  // ========== HANDLERS ==========

  const handleSubmit = useCallback(() => {
    const text = inputRef.current?.value.trim() || "";
    sendMessage(text);
  }, [sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      uploadFiles(Array.from(e.dataTransfer.files));
    },
    [uploadFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) uploadFiles(files);
    },
    [uploadFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        uploadFiles(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  // Scope change -> gọi API update
  const handleScopeChange = useCallback(
    async (newScope: TutorScope) => {
      onScopeChange(newScope);

      if (!threadId) return;
      try {
        await api.patch(`/tutor-chat/threads/${threadId}`, { scope: newScope });
      } catch {
        console.error("Update scope failed");
      }
    },
    [threadId, onScopeChange]
  );

  // ========== RENDER ==========

  const disabled = isLoading || isUploading;

  return (
    <div
      className={`border-t border-border p-3 transition-colors ${
        isDragging ? "bg-primary-pastel/40" : ""
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Scope selector hidden to enforce lesson-only scope */}
      {/* 
      <div className="mb-2 flex justify-center">
        <ScopeSelector scope={scope} onScopeChange={handleScopeChange} />
      </div> 
      */}

      {/* Image previews */}
      {localImages.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {localImages.map((img) => (
            <div
              key={img.tempId}
              className="relative group w-16 h-16 rounded-lg border border-border bg-background overflow-hidden"
            >
              <img
                src={
                  img.previewUrl ||
                  (img.data?.url ? getImageUrl(img.data.url) : "")
                }
                alt=""
                className={`w-full h-full object-cover transition-opacity cursor-zoom-in ${
                  img.isUploading ? "opacity-50" : "opacity-100"
                }`}
                onClick={() =>
                  setViewingImage(
                    img.previewUrl ||
                      (img.data?.url
                        ? getImageUrl(img.data.url)
                        : "")
                  )
                }
              />

              {/* Loading Overlay */}
              {img.isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Remove Button */}
              <button
                onClick={() => removeImage(img.tempId)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-sm z-10 transition-opacity"
              >
                <HiX className="w-3 h-3" />
              </button>

              {/* OCR Badge */}
              {img.data?.ocr_text && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 pointer-events-none">
                  OCR ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="mb-2 p-4 border-2 border-dashed border-primary-light rounded-xl bg-primary-pastel/40 text-center">
          <HiPhotograph className="w-8 h-8 text-primary mx-auto mb-1" />
          <p className="text-sm text-primary">Thả ảnh vào đây</p>
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary-pastel/50 rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
        >
          <HiPhotograph className="w-5 h-5" />
        </button>

        <textarea
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={localImages.length ? "Mô tả ảnh..." : "Hỏi trợ giảng Mây Mây..."}
          className="flex-1 px-3 py-2 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-foreground"
          rows={1}
          disabled={disabled}
        />

        <button
          onClick={handleSubmit}
          disabled={disabled}
          className={`px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-40 transition-all ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <HiPaperAirplane className="w-4 h-4 rotate-90" />
          )}
        </button>
      </div>
      <ImagePreviewModal
        src={viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
}

export default memo(MessageInput);
