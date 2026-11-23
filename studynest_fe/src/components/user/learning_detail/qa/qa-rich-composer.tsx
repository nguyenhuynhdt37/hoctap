"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bold,
  Check,
  Code,
  Code2,
  Eye,
  Image as ImageIcon,
  Pencil,
  Quote,
  Send,
  Upload,
  X,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import {
  formatFileSize,
  prepareQaImageUpload,
  type PreparedQaImageResult,
} from "@/lib/prepare-image-upload";
import { uploadFile } from "@/lib/uploadFile";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";
import { QAMarkdownContent, type LightboxImage } from "./qa-media-content";

const MAX_QA_IMAGES = 4;
const MAX_QA_CHARS = 12000;

const CODE_LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash / Terminal" },
  { id: "json", label: "JSON" },
  { id: "text", label: "Văn bản" },
] as const;

interface PendingAttachment {
  id: string;
  previewUrl: string;
  fileName: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  savedPercent: number;
  status: "compressing" | "uploading" | "ready" | "error";
  uploadedUrl?: string;
  errorMessage?: string;
  preparedFile?: File;
}

interface QARichComposerProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: (finalContent: string) => Promise<void> | void;
  onTyping?: () => void;
  onCancel?: () => void;
  onOpenImage?: (image: LightboxImage) => void;
  placeholder?: string;
  submitLabel?: string;
  sending?: boolean;
  compact?: boolean;
  quickPrompts?: readonly string[];
}

function buildSafeCodeFence(code: string, lang: string): string {
  const matches = code.match(/`{3,}/g) ?? [];
  const maxRun = matches.reduce((max, m) => Math.max(max, m.length), 2);
  const fence = "`".repeat(maxRun + 1);
  const trimmed = code.replace(/^\n+|\n+$/g, "");
  return `${fence}${lang}\n${trimmed}\n${fence}`;
}

function buildFinalContent(text: string, attachments: PendingAttachment[]): string {
  const cleanText = text.trim();
  const readyImages = attachments.filter((a) => a.status === "ready" && a.uploadedUrl);
  if (readyImages.length === 0) return cleanText;

  const imageLines = readyImages
    .map((img, idx) => {
      const safeAlt = (img.fileName.replace(/\.[^.]+$/, "") || `Ảnh ${idx + 1}`).replace(
        /[\[\]()]/g,
        "",
      );
      return `![${safeAlt}](${img.uploadedUrl})`;
    })
    .join("\n");

  return cleanText ? `${cleanText}\n\n${imageLines}` : imageLines;
}

export function QARichComposer({
  value,
  onChange,
  onSubmit,
  onTyping,
  onCancel,
  onOpenImage,
  placeholder = "Đặt câu hỏi, dán ảnh chụp màn hình (Ctrl+V) hoặc chèn đoạn code để thầy cô & các bạn hỗ trợ ngay...",
  submitLabel = "Gửi câu hỏi",
  sending = false,
  compact = false,
  quickPrompts,
}: QARichComposerProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [codeLang, setCodeLang] = useState<string>("python");
  const [codeSnippet, setCodeSnippet] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<PendingAttachment[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Thu hồi object URL khi unmount để tránh rò rỉ bộ nhớ trình duyệt
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const uploadPreparedAttachment = useCallback(async (id: string, file: File) => {
    setAttachments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "uploading", errorMessage: undefined } : item,
      ),
    );
    try {
      const url = await uploadFile(file, "qa/comments", undefined, {
        profile: "qa",
        skipPrepare: true,
      });
      if (!url || typeof url !== "string") {
        throw new Error("Server không trả về đường dẫn ảnh.");
      }
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "ready", uploadedUrl: url } : item,
        ),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as Error)?.message ||
        "Không tải được ảnh lên.";
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "error", errorMessage: msg } : item,
        ),
      );
      showToast.error(msg);
    }
  }, []);

  const handleFilesSelected = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      if (incoming.length === 0) {
        showToast.error("Vui lòng chọn file ảnh (JPG, PNG, WebP, AVIF hoặc GIF).");
        return;
      }

      const remainingSlots = MAX_QA_IMAGES - attachmentsRef.current.length;
      if (remainingSlots <= 0) {
        showToast.info(`Mỗi bình luận đính kèm tối đa ${MAX_QA_IMAGES} ảnh để giữ khung gọn gàng.`);
        return;
      }

      const accepted = incoming.slice(0, remainingSlots);
      if (incoming.length > remainingSlots) {
        showToast.info(`Chỉ nhận thêm ${remainingSlots} ảnh (tối đa ${MAX_QA_IMAGES} ảnh/bình luận).`);
      }

      for (const rawFile of accepted) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempPreview = URL.createObjectURL(rawFile);

        setAttachments((prev) => [
          ...prev,
          {
            id,
            previewUrl: tempPreview,
            fileName: rawFile.name || "anh-chup.webp",
            originalBytes: rawFile.size,
            compressedBytes: rawFile.size,
            width: 0,
            height: 0,
            savedPercent: 0,
            status: "compressing",
          },
        ]);

        try {
          const prepared: PreparedQaImageResult = await prepareQaImageUpload(rawFile);
          const optimizedPreview = URL.createObjectURL(prepared.file);
          URL.revokeObjectURL(tempPreview);

          setAttachments((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    previewUrl: optimizedPreview,
                    fileName: prepared.file.name,
                    originalBytes: prepared.originalBytes,
                    compressedBytes: prepared.compressedBytes,
                    width: prepared.width,
                    height: prepared.height,
                    savedPercent: prepared.savedPercent,
                    preparedFile: prepared.file,
                    status: "uploading",
                  }
                : item,
            ),
          );

          await uploadPreparedAttachment(id, prepared.file);
        } catch (err: unknown) {
          const msg = (err as Error)?.message || "Không xử lý được ảnh này.";
          URL.revokeObjectURL(tempPreview);
          setAttachments((prev) => prev.filter((item) => item.id !== id));
          showToast.error(msg);
        }
      }
    },
    [uploadPreparedAttachment],
  );

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const insertAtCursor = useCallback(
    (snippet: string, selectOffset?: { start: number; end: number }) => {
      const el = textareaRef.current;
      if (!el) {
        onChange(value ? `${value}\n${snippet}` : snippet);
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const next = `${before}${snippet}${after}`;
      onChange(next);
      onTyping?.();

      requestAnimationFrame(() => {
        el.focus();
        if (selectOffset) {
          el.setSelectionRange(start + selectOffset.start, start + selectOffset.end);
        } else {
          const pos = start + snippet.length;
          el.setSelectionRange(pos, pos);
        }
      });
    },
    [onChange, onTyping, value],
  );

  const wrapSelection = (prefix: string, suffix: string, fallbackText: string) => {
    const el = textareaRef.current;
    if (!el) {
      insertAtCursor(`${prefix}${fallbackText}${suffix}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallbackText;
    const inserted = `${prefix}${selected}${suffix}`;
    const next = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
    onChange(next);
    onTyping?.();

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const handleInsertCodeBlock = () => {
    if (!codeSnippet.trim()) {
      showToast.info("Hãy dán hoặc nhập đoạn code trước khi chèn nhé.");
      return;
    }
    const fenced = buildSafeCodeFence(codeSnippet, codeLang);
    const needsLeadingNewline = value.length > 0 && !value.endsWith("\n");
    insertAtCursor(`${needsLeadingNewline ? "\n\n" : ""}${fenced}\n`);
    setCodeSnippet("");
    setCodePanelOpen(false);
    setMode("write");
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      event.preventDefault();
      void handleFilesSelected(imageFiles);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files?.length) {
      void handleFilesSelected(event.dataTransfer.files);
    }
  };

  const isBusyUploading = attachments.some(
    (a) => a.status === "compressing" || a.status === "uploading",
  );
  const hasErrorAttachment = attachments.some((a) => a.status === "error");

  const previewMarkdown = useMemo(() => {
    const cleanText = value.trim();
    const previewImgs = attachments
      .filter((a) => a.status === "ready" || a.status === "uploading")
      .map((a, idx) => `![${a.fileName || `Ảnh ${idx + 1}`}](${a.uploadedUrl || a.previewUrl})`)
      .join("\n");
    if (!cleanText && !previewImgs) return "";
    return cleanText && previewImgs ? `${cleanText}\n\n${previewImgs}` : cleanText || previewImgs;
  }, [attachments, value]);

  const finalLength = useMemo(
    () => buildFinalContent(value, attachments).length,
    [attachments, value],
  );

  const canSubmit =
    !sending &&
    !isBusyUploading &&
    !hasErrorAttachment &&
    finalLength > 0 &&
    finalLength <= MAX_QA_CHARS;

  const triggerSubmit = async () => {
    if (isBusyUploading) {
      showToast.info("Đang nén và tải ảnh lên, vui lòng đợi một chút nhé!");
      return;
    }
    if (hasErrorAttachment) {
      showToast.error("Có ảnh tải lên bị lỗi. Hãy thử lại hoặc gỡ ảnh đó trước khi gửi.");
      return;
    }
    const finalContent = buildFinalContent(value, attachments);
    if (!finalContent) return;
    if (finalContent.length > MAX_QA_CHARS) {
      showToast.error(`Nội dung vượt quá giới hạn ${MAX_QA_CHARS.toLocaleString("vi-VN")} ký tự.`);
      return;
    }

    await onSubmit(finalContent);
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
    setCodePanelOpen(false);
    setMode("write");
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-2xl border bg-background/75 transition-colors",
        isDragging ? "border-primary bg-primary-light/40 ring-2 ring-primary/25" : "border-border",
      )}
    >
      {/* Thanh công cụ soạn thảo */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                void handleFilesSelected(e.target.files);
              }
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= MAX_QA_IMAGES}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-2.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary-light disabled:opacity-50 cursor-pointer"
            title="Đính kèm ảnh (tự động nén nhẹ trước khi gửi, hỗ trợ dán Ctrl+V)"
          >
            <ImageIcon className="size-3.5" animated={false} aria-hidden="true" />
            Ảnh ({attachments.length}/{MAX_QA_IMAGES})
          </button>

          <button
            type="button"
            onClick={() => {
              setCodePanelOpen((prev) => !prev);
              setMode("write");
            }}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold transition-colors cursor-pointer",
              codePanelOpen
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
            )}
            title="Chèn khối code có tô màu cú pháp"
          >
            <Code2 className="size-3.5" animated={false} aria-hidden="true" />
            Khối Code
          </button>

          <button
            type="button"
            onClick={() => wrapSelection("`", "`", "code")}
            aria-label="Chèn mã nội tuyến"
            title="Mã nội tuyến (`code`)"
            className="grid size-7 place-items-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-surface hover:text-foreground cursor-pointer"
          >
            <Code className="size-3.5" animated={false} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection("**", "**", "chữ in đậm")}
            aria-label="In đậm"
            title="In đậm (**chữ**)"
            className="grid size-7 place-items-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-surface hover:text-foreground cursor-pointer"
          >
            <Bold className="size-3.5" animated={false} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection("\n> ", "\n", "Trích dẫn")}
            aria-label="Chèn trích dẫn"
            title="Trích dẫn"
            className="grid size-7 place-items-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-surface hover:text-foreground cursor-pointer"
          >
            <Quote className="size-3.5" animated={false} aria-hidden="true" />
          </button>
        </div>

        {/* Chuyển chế độ Soạn thảo / Xem trước */}
        <div className="flex items-center gap-1 rounded-full bg-surface p-0.5 border border-border/80">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-colors cursor-pointer",
              mode === "write"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Pencil className="size-3" animated={false} aria-hidden="true" />
            Soạn
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-colors cursor-pointer",
              mode === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="size-3" animated={false} aria-hidden="true" />
            Xem trước
          </button>
        </div>
      </div>

      {/* Panel chèn khối Code đa ngôn ngữ */}
      {codePanelOpen && (
        <div className="border-b border-primary-pastel/70 bg-primary-light/35 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">Chèn khối Code</span>
              <select
                value={codeLang}
                onChange={(e) => setCodeLang(e.target.value)}
                aria-label="Chọn ngôn ngữ lập trình"
                className="h-7 rounded-lg border border-primary-pastel bg-surface px-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setCodePanelOpen(false)}
              aria-label="Đóng khung chèn code"
              className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" animated={false} aria-hidden="true" />
            </button>
          </div>
          <textarea
            rows={compact ? 4 : 5}
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="Dán đoạn code của bạn vào đây..."
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-primary-pastel bg-surface p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCodePanelOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={handleInsertCodeBlock}>
              Chèn vào bài viết
            </Button>
          </div>
        </div>
      )}

      {/* Vùng nhập hoặc Xem trước */}
      <div className="p-3">
        {mode === "write" ? (
          <textarea
            ref={textareaRef}
            rows={compact ? 2 : 3}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onTyping?.();
            }}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void triggerSubmit();
              }
            }}
            placeholder={placeholder}
            className="w-full resize-y bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        ) : (
          <div className="min-h-[84px] rounded-xl border border-dashed border-primary-pastel/80 bg-surface p-3">
            {previewMarkdown ? (
              <QAMarkdownContent content={previewMarkdown} onOpenImage={onOpenImage} />
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Chưa có nội dung để xem trước. Hãy nhập câu hỏi, dán ảnh hoặc chèn code nhé!
              </p>
            )}
          </div>
        )}

        {/* Khay ảnh đính kèm đã tối ưu trước khi gửi */}
        {attachments.length > 0 && (
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {attachments.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2 transition-colors",
                  item.status === "error"
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-primary-pastel/70 bg-surface",
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    onOpenImage?.({
                      src: item.uploadedUrl || item.previewUrl,
                      alt: item.fileName,
                    })
                  }
                  className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-background cursor-zoom-in"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.fileName}
                    className="size-full object-cover"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{item.fileName}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                    {item.status === "compressing" && (
                      <span className="text-primary">Đang nén tối ưu ảnh…</span>
                    )}
                    {item.status === "uploading" && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Upload className="size-3" animated={false} aria-hidden="true" />
                        Đang tải lên ({formatFileSize(item.compressedBytes)})…
                      </span>
                    )}
                    {item.status === "ready" && (
                      <span className="inline-flex items-center gap-1 text-success-foreground">
                        <Check className="size-3" animated={false} aria-hidden="true" />
                        {formatFileSize(item.originalBytes)} → {formatFileSize(item.compressedBytes)}
                        {item.savedPercent > 0 ? ` (-${item.savedPercent}%)` : ""}
                        {item.width > 0 ? ` · ${item.width}×${item.height}` : ""}
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <AlertCircle className="size-3" animated={false} aria-hidden="true" />
                        {item.errorMessage || "Lỗi tải ảnh"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {item.status === "error" && item.preparedFile && (
                    <button
                      type="button"
                      onClick={() => void uploadPreparedAttachment(item.id, item.preparedFile!)}
                      className="rounded-lg bg-primary-light px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary-pastel cursor-pointer"
                    >
                      Thử lại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(item.id)}
                    aria-label="Xóa ảnh đính kèm"
                    className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-secondary-foreground cursor-pointer"
                  >
                    <X className="size-3.5" animated={false} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gợi ý nhanh (chỉ cho ô câu hỏi chính khi chưa nhập) */}
        {!compact && quickPrompts && quickPrompts.length > 0 && !value.trim() && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onChange(prompt)}
                className="rounded-full border border-primary-pastel/70 bg-primary-light/50 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-light cursor-pointer"
              >
                + {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer nút gửi & thông tin tối ưu */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>Dán ảnh (Ctrl+V), kéo-thả hoặc chèn Code · tự nén nhẹ trước khi gửi</span>
          <span
            className={cn(
              "font-semibold",
              finalLength > MAX_QA_CHARS ? "text-destructive" : "text-muted-foreground",
            )}
          >
            ({finalLength.toLocaleString("vi-VN")}/{MAX_QA_CHARS.toLocaleString("vi-VN")})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Hủy
            </Button>
          )}
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => void triggerSubmit()}
            leftIcon={<Send className="size-3.5" />}
          >
            {isBusyUploading ? "Đang xử lý ảnh…" : sending ? "Đang gửi…" : submitLabel}
          </Button>
        </div>
      </div>

      {/* Overlay khi kéo thả ảnh vào khung */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-primary-light/85 backdrop-blur-xs">
          <div className="flex items-center gap-2 rounded-full border border-primary bg-surface px-4 py-2 text-xs font-bold text-primary shadow-md">
            <Upload className="size-4" animated={false} aria-hidden="true" />
            Thả ảnh vào đây để tự động nén & đính kèm
          </div>
        </div>
      )}
    </div>
  );
}
