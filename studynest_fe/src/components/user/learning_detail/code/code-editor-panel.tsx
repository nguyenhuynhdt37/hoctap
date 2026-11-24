"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  CirclePlay,
  Copy,
  FlaskConical,
  RefreshCw,
} from "pulsoicon-react";
import CodeEditor from "@/components/shared/code-editor";
import { Badge } from "@/components/ui";
import type { CodeExercise } from "@/types/user/learning";
import { cn } from "@/lib/utils";
import FileExplorer from "./file-explorer";

interface FileItem {
  id: string;
  filename: string;
  content: string;
  is_main: boolean;
  role?: string;
}

interface CodeEditorPanelProps {
  currentExercise: CodeExercise | undefined;
  files: FileItem[];
  activeFileId: string | null;
  dirtyFileIds?: Set<string>;
  language: string;
  isRunning: boolean;
  runningMode?: "sample" | "full" | null;
  onSelectFile: (fileId: string) => void;
  onUpdateFileContent: (fileId: string, content: string) => void;
  onRunSample?: () => void;
  onTestCode: () => void;
  onResetCode: () => void;
  onSaveFile: () => void;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
}

export default function CodeEditorPanel({
  currentExercise,
  files,
  activeFileId,
  dirtyFileIds,
  language,
  isRunning,
  runningMode = null,
  onSelectFile,
  onUpdateFileContent,
  onRunSample,
  onTestCode,
  onResetCode,
  onSaveFile,
  onSelectionChange,
}: CodeEditorPanelProps) {
  const activeFile = files.find((f) => f.id === activeFileId);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!activeFile?.content) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(activeFile.content)
        .then(() => {
          setCopied(true);
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
        })
        .catch(() => undefined);
    }
  }, [activeFile?.content]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!isRunning && files.length > 0 && !currentExercise?.is_pass) {
        onTestCode();
      }
    }
  };

  const hasDirtyFiles = Boolean(dirtyFileIds && dirtyFileIds.size > 0);
  const lineCount = activeFile?.content ? activeFile.content.split("\n").length : 0;

  return (
    <div
      onKeyDown={handleKeyDown}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-xs"
    >
      {/* Studio Toolbar Header */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-gradient-to-r from-primary-light/70 via-surface to-accent-vanilla/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate font-display text-base font-bold text-foreground sm:text-lg">
            {currentExercise?.title || "Phòng thực hành lập trình"}
          </h2>
          {currentExercise?.language && (
            <Badge variant="primary" size="sm">
              {currentExercise.language.name} {currentExercise.language.version}
            </Badge>
          )}
          {currentExercise?.is_pass && (
            <Badge variant="success" size="sm">
              <CheckCircle2 aria-hidden="true" animated={false} className="size-3" />
              Đã PASS
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onRunSample && (
            <button
              type="button"
              onClick={onRunSample}
              disabled={isRunning || !files.length}
              title="Chạy thử trên các test case mẫu (không nộp bài)"
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3.5 text-xs font-bold text-primary shadow-2xs transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning && runningMode === "sample" ? (
                <>
                  <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Đang chạy mẫu...</span>
                </>
              ) : (
                <>
                  <FlaskConical aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Chạy mẫu</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onTestCode}
            disabled={isRunning || !files.length || currentExercise?.is_pass}
            title="Lưu và chấm toàn bộ test case (Ctrl/⌘ + Enter)"
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning && runningMode !== "sample" ? (
              <>
                <span className="size-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Đang chấm...</span>
              </>
            ) : (
              <>
                <CirclePlay solid aria-hidden="true" className="size-4" />
                <span>{currentExercise?.is_pass ? "Đã hoàn thành" : "Chấm bài"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onResetCode}
            title="Khôi phục mã nguồn ban đầu"
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Workspace: File Explorer + Code Editor */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          dirtyFileIds={dirtyFileIds}
          onSelectFile={onSelectFile}
        />

        {/* Editor — giữ nguyên data-learning-code-editor */}
        <div
          data-learning-code-editor
          className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden bg-surface"
        >
          {/* Thanh trạng thái file hiện tại */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-background/70 px-3.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-xs font-bold text-foreground">
                {activeFile?.filename || "Chưa chọn tệp"}
              </span>
              {activeFile?.role === "starter" && (
                <span className="shrink-0 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-2 py-0.5 text-[10px] font-bold text-accent-vanilla-foreground">
                  Starter
                </span>
              )}
              <span
                className={cn(
                  "hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-block",
                  hasDirtyFiles
                    ? "bg-warning-bg text-warning-foreground"
                    : "bg-success-bg/75 text-success-foreground",
                )}
              >
                {hasDirtyFiles ? "Chưa lưu" : "Đã đồng bộ"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] font-medium text-muted-foreground tabular-nums md:inline">
                {lineCount} dòng · ⌘/Ctrl + Enter để chấm
              </span>
              {activeFile && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  aria-label="Sao chép mã nguồn"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:border-primary-pastel hover:bg-primary-light cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check
                        aria-hidden="true"
                        animated={false}
                        className="size-3 text-success-foreground"
                      />
                      <span className="text-success-foreground">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" animated={false} className="size-3" />
                      <span>Chép</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {activeFile && (
            <div className="min-h-[290px] min-w-0 flex-1 overflow-hidden">
              <CodeEditor
                key={`code-${activeFile.id}-${language}`}
                className="h-full max-w-full min-w-0 [&_.cm-editor]:max-w-full [&_.cm-scroller]:overflow-auto"
                height="100%"
                language={language}
                value={activeFile.content || ""}
                onChange={(value) => {
                  onUpdateFileContent(activeFile.id, value || "");
                }}
                onBlur={onSaveFile}
                onSelectionChange={onSelectionChange}
                options={{ minimap: { enabled: false } }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
