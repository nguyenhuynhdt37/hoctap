"use client";

import { prepareImageUpload } from "@/lib/prepare-image-upload";
import toast from "react-hot-toast";
import { memo, useCallback, useRef, useState, useEffect } from "react";
import { Send, Image, X, Eye, Play, Code, Shield, Compass } from "pulsoicon-react";
import { Badge } from "@/components/ui/badge";
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
import { useAssistantVoice } from "../../assistant/voice-provider";
import { DictationButton } from "../../assistant/dictation-button";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";
import { AgentUnavailableError, useLearningAgent } from "../agent/agent-context";

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
  const agent = useLearningAgent();
  const voice = useAssistantVoice();
  // State
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const historyIdx = useRef(-1);

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
    const imageFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, 3 - localImages.length));
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
            "/agent/attachments/image",
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
  }, [localImages.length]);

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

      if ((!text && !uploadedImages.length) || isLoading || isUploading || dictating || voice?.active) return;

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
        const delta = (text: string) => {
          streamedContent += text;
          onUpdateMessage(assistantMsgId, { content: streamedContent, isStreaming: true });
        };
        const legacy = () => postChatStream<MessageResponse>(
          `/tutor-chat/lessons/${lessonId}/chat`,
          { message: text, thread_id: threadId, images: userMessage.images?.map(img => ({ url: img.url, file_size: img.file_size, mime_type: img.mime_type, ocr_text: img.ocr_text })) },
          delta, streamRef.current!.signal,
        );
        const activity: import("../agent/contracts").AgentEvent[] = [];
        let response: MessageResponse;
        if (agent) {
          try { response = await agent.send(text, threadId, delta, event => {
            activity.push(event); onUpdateMessage(assistantMsgId, { activity: [...activity] });
          }, uploadedImages); }
          catch (error) { if (error instanceof AgentUnavailableError) response = await legacy(); else throw error; }
        } else response = await legacy();

        // 6. Cập nhật assistant message
        onUpdateMessage(assistantMsgId, {
          id: response.id,
          content: response.content,
          sources: response.sources,
          activity: response.activity,
          isStreaming: false,
        });

        if (!threadId && response.thread_id) {
          onThreadCreated(response.thread_id);
        }
      } catch (err) {
        console.error("Send failed:", err);
        onUpdateMessage(assistantMsgId, {
          content: err instanceof Error ? err.message : "Không hoàn tất được yêu cầu. Hãy kiểm tra lịch sử trước khi thử lại.",
          isStreaming: false,
        });
      } finally {
        onLoadingChange(false);
      }
    },
    [
      agent,
      localImages,
      isLoading,
      isUploading,
      dictating,
      voice?.active,
      lessonId,
      threadId,
      onNewMessages,
      onUpdateMessage,
      onThreadCreated,
      onLoadingChange,
    ]
  );

  // ========== HANDLERS ==========

  const expandSlashCommand = useCallback((raw: string): string | null => {
    const trimmed = raw.trim();
    if (trimmed === "/mode") {
      agent?.cyclePermissionMode();
      if (inputRef.current) inputRef.current.value = "";
      return null;
    }
    if (trimmed === "/verbose" || trimmed === "/detail") {
      agent?.setDetailedTranscript(v => !v);
      if (inputRef.current) inputRef.current.value = "";
      return null;
    }
    if (trimmed === "/xray") {
      agent?.setXrayActive(v => !v);
      if (inputRef.current) inputRef.current.value = "";
      return null;
    }
    if (trimmed.startsWith("/screen")) {
      const rest = trimmed.slice(7).trim();
      return rest
        ? `Hãy đọc màn hình hiện tại (browser_snapshot) và thực hiện: ${rest}`
        : "Hãy dùng công cụ đọc màn hình hiện tại (browser_snapshot) và tóm tắt những phần quan trọng đang hiển thị cho mình.";
    }
    if (trimmed.startsWith("/highlight")) {
      const rest = trimmed.slice(10).trim();
      return rest
        ? `Hãy đọc màn hình hiện tại rồi khoanh vùng chỉ điểm (browser_highlight) vào: ${rest}`
        : "Hãy đọc màn hình hiện tại rồi khoanh vùng chỉ điểm (browser_highlight) vào phần quan trọng nhất đang hiển thị trên trang.";
    }
    if (trimmed.startsWith("/scroll")) {
      const rest = trimmed.slice(7).trim();
      return rest ? `Hãy cuộn màn hình ${rest}` : "Hãy cuộn màn hình xuống dưới";
    }
    if (trimmed.startsWith("/video")) {
      const rest = trimmed.slice(6).trim();
      return rest ? `Với video bài giảng hiện tại: ${rest}` : "Hãy kiểm tra trạng thái video đang mở và tóm tắt nội dung tại mốc hiện tại.";
    }
    if (trimmed.startsWith("/code")) {
      const rest = trimmed.slice(5).trim();
      return rest
        ? `Hãy đọc buffer code hiện tại của mình trên editor và ${rest}`
        : "Hãy đọc buffer code đang mở trên editor, phân tích lỗi và gợi ý hướng cải thiện.";
    }
    if (trimmed.startsWith("/quiz")) {
      const rest = trimmed.slice(5).trim();
      return rest
        ? `Hãy đọc câu hỏi trắc nghiệm đang hiển thị trên màn hình (quiz.get_state) và ${rest}`
        : "Hãy đọc câu hỏi trắc nghiệm đang hiển thị trên màn hình (quiz.get_state), giải thích từng phương án và gợi ý cách suy luận.";
    }
    return trimmed;
  }, [agent]);

  const handleSubmit = useCallback(() => {
    const rawText = inputRef.current?.value.trim() || (localImages.some(image=>image.data) ? "Bạn hãy xem và giải thích ảnh này." : "");
    const expanded = expandSlashCommand(rawText);
    if (expanded === null) return;
    agent?.recordPrompt(rawText);
    historyIdx.current = -1;
    const pinned = agent?.pinnedTarget;
    if (pinned) {
      agent?.setPinnedTarget(null);
      sendMessage(`[Phần tử người dùng vừa chỉ điểm bằng X-Ray trên màn hình: role="${pinned.role}", tên="${pinned.name}"${pinned.href ? `, href="${pinned.href}"` : ""}, nội dung="${pinned.text.slice(0, 240)}"]\nYêu cầu: ${expanded}`);
      return;
    }
    sendMessage(expanded);
  }, [sendMessage, localImages, expandSlashCommand, agent]);

  useEffect(() => {
    const onQuickPrompt = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) void sendMessage(prompt);
    };
    window.addEventListener("maymay:quick-prompt", onQuickPrompt);
    return () => window.removeEventListener("maymay:quick-prompt", onQuickPrompt);
  }, [sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
        return;
      }
      if (e.key === "ArrowUp" && agent?.promptHistory.length) {
        const el = e.currentTarget;
        if (el.selectionStart === 0 || !el.value.includes("\n")) {
          e.preventDefault();
          const nextIdx = Math.min(agent.promptHistory.length - 1, historyIdx.current + 1);
          historyIdx.current = nextIdx;
          if (inputRef.current) inputRef.current.value = agent.promptHistory[nextIdx] || "";
        }
      } else if (e.key === "ArrowDown" && historyIdx.current >= 0 && agent?.promptHistory.length) {
        const el = e.currentTarget;
        if (!el.value.includes("\n")) {
          e.preventDefault();
          const nextIdx = historyIdx.current - 1;
          historyIdx.current = nextIdx;
          if (inputRef.current) inputRef.current.value = nextIdx >= 0 ? agent.promptHistory[nextIdx] || "" : "";
        }
      }
    },
    [handleSubmit, agent]
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

  const disabled = isLoading || isUploading || dictating || Boolean(voice?.active);

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
                aria-label="Xóa ảnh đính kèm"
                onClick={() => removeImage(img.tempId)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-sm z-10 transition-opacity"
              >
                <X animated={false} className="w-3 h-3" />
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
          <Image animated={false} className="w-8 h-8 text-primary mx-auto mb-1" />
          <p className="text-sm text-primary">Thả ảnh vào đây</p>
        </div>
      )}

      {/* Pinned X-Ray Target Chip */}
      {agent?.pinnedTarget && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-primary-pastel bg-primary-light/60 px-2.5 py-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <Compass animated={false} className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate font-medium text-foreground">
              Đã ghim: <strong>{agent.pinnedTarget.name.slice(0, 45)}</strong>
            </span>
          </div>
          <button
            type="button"
            aria-label="Bỏ ghim phần tử"
            onClick={() => agent.setPinnedTarget(null)}
            className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X animated={false} className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hannes-Lite Co-Pilot Slash Bar & Permission Mode Pill */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => agent?.setXrayActive(v => !v)}
            title="Bật Tia X-Ray để chỉ thẳng vào bất kỳ vùng nào trên bài học"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              agent?.xrayActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary-pastel bg-primary-light/70 text-primary hover:bg-primary-light"
            }`}
          >
            <Compass animated={false} className="h-3 w-3" />
            <span>{agent?.xrayActive ? "X-Ray Bật" : "Tia X-Ray"}</span>
          </button>
          {[
            { label: "/screen", prompt: "/screen", title: "Quét & đọc màn hình realtime", icon: Eye },
            { label: "/highlight", prompt: "/highlight ", title: "Khoanh vùng chỉ điểm trên màn hình", icon: Compass },
            { label: "/video", prompt: "Tạm dừng video", title: "Điều khiển video nhanh", icon: Play },
            { label: "/code", prompt: "/code", title: "Đọc & kiểm tra buffer code hiện tại", icon: Code },
          ].map((chip) => {
            const ChipIcon = chip.icon;
            return (
              <button
                key={chip.label}
                type="button"
                disabled={disabled}
                title={chip.title}
                onClick={() => {
                  if (chip.prompt.endsWith(" ")) {
                    if (inputRef.current) {
                      inputRef.current.value = chip.prompt;
                      inputRef.current.focus();
                    }
                  } else {
                    const expanded = expandSlashCommand(chip.prompt);
                    if (expanded) void sendMessage(expanded);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light/50 px-2.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-light disabled:opacity-40"
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
            title="Chế độ quyền Co-Pilot (Shift+Tab để chuyển: Auto-Pilot -> Hỏi trước -> Chỉ đọc)"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Badge
              variant={
                agent.permissionMode === "autoPilot"
                  ? "primary"
                  : agent.permissionMode === "default"
                    ? "vanilla"
                    : "lavender"
              }
              size="sm"
              className="cursor-pointer gap-1"
            >
              <Shield animated={false} className="h-3 w-3" />
              <span>
                {agent.permissionMode === "autoPilot"
                  ? "Auto-Pilot"
                  : agent.permissionMode === "default"
                    ? "Hỏi trước"
                    : "Plan"}
              </span>
            </Badge>
          </button>
        )}
      </div>

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
          aria-label="Đính kèm ảnh"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary-pastel/50 rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Image animated={false} className="w-5 h-5" />
        </button>

        <DictationButton disabled={isLoading || isUploading || Boolean(voice?.active)} onBusyChange={setDictating} getValue={()=>inputRef.current?.value || ""} onValueChange={text=>{if(inputRef.current){inputRef.current.value=text;inputRef.current.scrollTop=inputRef.current.scrollHeight;}}} />
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
          aria-label="Gửi tin nhắn"
          onClick={handleSubmit}
          disabled={disabled}
          className={`px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-40 transition-all ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send animated={false} className="w-4 h-4 rotate-90" />
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
