"use client";

import { Code, FolderOpen } from "pulsoicon-react";
import { cn } from "@/lib/utils";

interface FileItem {
  id: string;
  filename: string;
  is_main: boolean;
}

interface FileExplorerProps {
  files: FileItem[];
  activeFileId: string | null;
  dirtyFileIds?: Set<string>;
  onSelectFile: (fileId: string) => void;
}

export default function FileExplorer({
  files,
  activeFileId,
  dirtyFileIds,
  onSelectFile,
}: FileExplorerProps) {
  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-border bg-background/80 xl:w-52 xl:border-r xl:border-b-0">
      <div className="flex items-center justify-between border-b border-border/80 bg-surface px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          <FolderOpen aria-hidden="true" animated={false} className="size-3.5 text-primary" />
          <span>Tệp mã nguồn</span>
        </span>
        <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary tabular-nums">
          {files.length}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto p-1.5 xl:flex-1 xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto">
        {files.map((file) => {
          const active = activeFileId === file.id;
          const isDirty = Boolean(dirtyFileIds?.has(file.id));

          return (
            <button
              key={file.id}
              type="button"
              onClick={() => onSelectFile(file.id)}
              className={cn(
                "flex w-auto shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer xl:w-full",
                active
                  ? "border-primary-pastel bg-primary-light/85 text-primary shadow-2xs"
                  : "border-transparent text-foreground/85 hover:border-border hover:bg-surface",
              )}
            >
              <Code
                aria-hidden="true"
                animated={false}
                className={cn(
                  "size-3.5 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="flex-1 truncate font-mono text-xs">{file.filename}</span>
              {isDirty && (
                <span
                  title="Có thay đổi chưa lưu"
                  aria-label="Có thay đổi chưa lưu"
                  className="size-2 shrink-0 rounded-full bg-accent-vanilla-foreground"
                />
              )}
              {file.is_main && (
                <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Main
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
