"use client";

import { Code } from "pulsoicon-react";

interface File {
  id: string;
  filename: string;
  is_main: boolean;
}

interface FileExplorerProps {
  files: File[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

export default function FileExplorer({
  files,
  activeFileId,
  onSelectFile,
}: FileExplorerProps) {
  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-border bg-background xl:w-48 xl:border-b-0 xl:border-r">
      <div className="border-b border-border bg-surface px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Files
        </span>
      </div>
      <div className="flex gap-1 overflow-x-auto p-1 xl:flex-1 xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => onSelectFile(file.id)}
            className={`flex w-auto shrink-0 cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors xl:w-full ${
              activeFileId === file.id
                ? "bg-primary-pastel/50 text-foreground border-r-2 border-r-primary"
                : "text-foreground/80 hover:bg-surface"
            }`}
          >
            <Code
              className={`w-4 h-4 flex-shrink-0 ${
                activeFileId === file.id
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
            <span className="text-sm truncate flex-1">{file.filename}</span>
            {file.is_main && (
              <span className="text-xs bg-primary text-white px-1 py-0.5 rounded flex-shrink-0">
                M
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

