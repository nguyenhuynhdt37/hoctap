"use client";

import { HiCode } from "react-icons/hi";

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
    <div className="w-48 bg-background border-r border-border flex flex-col flex-shrink-0">
      <div className="px-3 py-2 bg-surface border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Files
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => onSelectFile(file.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
              activeFileId === file.id
                ? "bg-primary-pastel/50 text-foreground border-r-2 border-r-primary"
                : "text-foreground/80 hover:bg-surface"
            }`}
          >
            <HiCode
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

