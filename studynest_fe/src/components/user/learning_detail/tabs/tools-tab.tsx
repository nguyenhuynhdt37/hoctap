"use client";

import { LessonOverview } from "@/types/user/learning";

interface ToolsTabProps {
  lessonOverview?: LessonOverview;
}

export default function ToolsTab({ lessonOverview }: ToolsTabProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-foreground mb-4">
        Công cụ học tập (Tài nguyên của bài học)
      </h2>
      <div className="p-4 rounded-2xl border border-border bg-surface">
        {lessonOverview?.resources && lessonOverview.resources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lessonOverview.resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary-light hover:bg-primary-pastel/30 transition"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {r.title || r.url}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(r.resource_type || "file").toUpperCase()}
                  </div>
                </div>
                <span className="text-sm font-medium text-primary">Mở</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Bài học này chưa có tài nguyên.
          </div>
        )}
      </div>
    </div>
  );
}

