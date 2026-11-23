"use client";

import CodeEditor from "@/components/shared/code-editor";
import { CodeExercise } from "@/types/user/learning";
import { CirclePlay, RefreshCw } from "pulsoicon-react";
import FileExplorer from "./file-explorer";

interface File {
  id: string;
  filename: string;
  content: string;
  is_main: boolean;
  role?: string;
}

interface CodeEditorPanelProps {
  currentExercise: CodeExercise | undefined;
  files: File[];
  activeFileId: string | null;
  language: string;
  isRunning: boolean;
  onSelectFile: (fileId: string) => void;
  onUpdateFileContent: (fileId: string, content: string) => void;
  onTestCode: () => void;
  onResetCode: () => void;
  onSaveFile: () => void;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
}

export default function CodeEditorPanel({
  currentExercise,
  files,
  activeFileId,
  language,
  isRunning,
  onSelectFile,
  onUpdateFileContent,
  onTestCode,
  onResetCode,
  onSaveFile,
  onSelectionChange,
}: CodeEditorPanelProps) {
  const activeFile = files.find((f) => f.id === activeFileId);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-primary-pastel/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-bold text-foreground sm:text-lg">
            {currentExercise?.title || "Luyện tập code"}
          </h2>
          {currentExercise?.language && (
            <span className="shrink-0 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
              {currentExercise.language.name} {currentExercise.language.version}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onTestCode}
            disabled={
              isRunning || !files.length || currentExercise?.is_pass
            }
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang test...</span>
              </>
            ) : (
              <>
                <CirclePlay solid className="w-4 h-4" />
                <span>Chạy</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onResetCode}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-border"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={onSelectFile}
        />

        {/* Editor */}
        <div
          data-learning-code-editor
          className="flex min-h-[300px] min-w-0 flex-1 flex-col overflow-hidden bg-surface"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
            <span className="truncate text-xs font-medium text-muted-foreground">
              {activeFile?.filename || "No file selected"}
            </span>
            {activeFile?.role === "starter" && (
              <span className="shrink-0 rounded bg-accent-vanilla px-2 py-0.5 text-xs text-accent-vanilla-foreground">
                Starter
              </span>
            )}
          </div>
          {activeFile && (
            <div className="min-h-[280px] min-w-0 flex-1 overflow-hidden">
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

