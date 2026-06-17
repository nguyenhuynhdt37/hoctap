"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import TiptapEditor from "@/components/shared/tiptap_editor";

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  onTyping?: () => void;
  initialContent?: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}

export default memo(function CommentForm({
  onSubmit,
  onCancel,
  isSubmitting,
  onTyping,
  initialContent = "",
  placeholder = "Viết bình luận...",
  submitLabel,
  autoFocus = false,
}: CommentFormProps) {
  const [localContent, setLocalContent] = useState(initialContent);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<string>("");
  const mentionSpacerInsertedRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const isApplyingSpacerRef = useRef(false);

  const insertSpacerOutsideLink = useCallback(() => {
    if (!autoFocus) return;
    const editor = editorRef.current;
    if (!editor || isApplyingSpacerRef.current) return;

    const docSize = editor.state.doc.content.size;
    const hasLinkMark =
      docSize > 0 &&
      editor.state.doc.rangeHasMark(
        Math.max(0, docSize - 1),
        docSize,
        editor.schema.marks.link
      );

    if (hasLinkMark) {
      isApplyingSpacerRef.current = true;
      editor
        .chain()
        .focus("end")
        .unsetLink()
        .insertContent(" ")
        .focus("end")
        .run();
      isApplyingSpacerRef.current = false;
    }
  }, [autoFocus]);

  useEffect(() => {
    setLocalContent(initialContent);
    contentRef.current = initialContent;
    mentionSpacerInsertedRef.current = false;
    isApplyingSpacerRef.current = false;
  }, [initialContent]);

  useEffect(() => {
    if (!autoFocus || !initialContent.trim() || !editorRef.current) return;
    const normalizedInitial = initialContent.trimEnd();
    const normalizedCurrent = localContent.trimEnd();
    if (normalizedCurrent === normalizedInitial) {
      insertSpacerOutsideLink();
      mentionSpacerInsertedRef.current = true;
    }
  }, [autoFocus, initialContent, insertSpacerOutsideLink, localContent]);

  const handleChange = useCallback(
    (content: string) => {
      setLocalContent(content);
      contentRef.current = content;

      if (onTyping && content.trim().length > 0) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        onTyping();
        typingTimeoutRef.current = setTimeout(() => {
          if (contentRef.current.trim().length > 0) {
            onTyping();
          }
        }, 2000);
      } else if (content.trim().length === 0) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    [onTyping]
  );

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (localContent.trim()) {
      onSubmit(localContent.trim());
      if (!onCancel) {
        setLocalContent("");
        contentRef.current = "";
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [localContent, onSubmit, onCancel]);

  const handleCancel = useCallback(() => {
    setLocalContent(initialContent);
    contentRef.current = initialContent;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onCancel?.();
  }, [initialContent, onCancel]);

  return (
    <div className="space-y-2">
      <TiptapEditor
        value={localContent}
        onChange={handleChange}
        placeholder={placeholder}
        maxHeight="120px"
        showToolbar={false}
        autoFocus={autoFocus}
        onEditorReady={(editor) => {
          editorRef.current = editor;
          if (
            autoFocus &&
            initialContent.trim().length > 0 &&
            !mentionSpacerInsertedRef.current
          ) {
            insertSpacerOutsideLink();
            mentionSpacerInsertedRef.current = true;
          }
        }}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
          >
            Hủy
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!localContent.trim() || isSubmitting}
          className="px-4 py-1.5 bg-[#00bba7] text-white text-sm font-semibold rounded-lg hover:bg-[#00a896] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? "Đang gửi..."
            : submitLabel || (onCancel ? "Lưu" : "Gửi")}
        </button>
      </div>
    </div>
  );
});

