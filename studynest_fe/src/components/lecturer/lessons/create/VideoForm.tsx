"use client";

import { Card } from "@/components/ui";
import { Check, Play, Upload, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

interface VideoFormProps {
  onVideoUrlChange: (url: string) => void;
  onVideoFileChange: (file: File | null) => void;
  onErrorsChange: (
    updater: (prev: { video_url?: string }) => { video_url?: string }
  ) => void;
  errors: {
    video_url?: string;
  };
  videoUrl: string;
  videoFile: File | null;
}

// Validation function - đơn giản, chỉ check có file hoặc URL
export const validateVideo = (
  video_url: string | undefined,
  video_file: File | null | undefined
): { video_url?: string } => {
  if (video_file) return {};
  const url = (video_url || "").trim();
  return !url
    ? { video_url: "Vui lòng tải lên video hoặc nhập link YouTube" }
    : {};
};

// Helper: Extract YouTube ID từ URL
const extractYoutubeId = (url: string): string | null => {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]?.length === 11) return match[1];
  }
  return null;
};

const VideoForm = memo(
  ({
    onVideoUrlChange,
    onVideoFileChange,
    onErrorsChange,
    errors,
    videoUrl,
    videoFile,
  }: VideoFormProps) => {
    // Tab state - tự động chuyển dựa trên giá trị
    const [activeTab, setActiveTab] = useState<"file" | "url">(
      videoFile ? "file" : videoUrl ? "url" : "file"
    );

    // Preview URL - memoized để tránh tính toán lại
    const previewUrl = useMemo(() => {
      if (!videoUrl?.trim()) return null;
      const youtubeId = extractYoutubeId(videoUrl);
      return youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;
    }, [videoUrl]);

    // Auto-switch tab khi có giá trị
    useEffect(() => {
      if (videoFile) setActiveTab("file");
      else if (videoUrl) setActiveTab("url");
    }, [videoFile, videoUrl]);

    // Handlers - memoized với useCallback
    const handleUrlChange = useCallback(
      (url: string) => {
        onVideoUrlChange(url);
        onVideoFileChange(null);
        onErrorsChange((prev) => {
          const { video_url, ...rest } = prev;
          return rest;
        });
      },
      [onVideoUrlChange, onVideoFileChange, onErrorsChange]
    );

    const handleFileChange = useCallback(
      (file: File | null) => {
        onVideoFileChange(file);
        onVideoUrlChange("");
        onErrorsChange((prev) => ({ ...prev, video_url: undefined }));
      },
      [onVideoFileChange, onVideoUrlChange, onErrorsChange]
    );

    const handleTabChange = useCallback((tab: "file" | "url") => {
      setActiveTab(tab);
    }, []);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-light border border-primary-pastel rounded-xl flex items-center justify-center text-primary">
            <Play className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Tải lên video
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Chọn một trong hai cách: tải lên file video hoặc dán link YouTube
            </p>
          </div>
        </div>

        {/* Tabs Container */}
        <Card className="overflow-hidden p-0">
          {/* Tab Buttons */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => handleTabChange("file")}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors cursor-pointer ${
                activeTab === "file"
                  ? "bg-primary text-white"
                  : "bg-background/60 text-muted-foreground hover:bg-primary-light/50 hover:text-primary"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="h-5 w-5" />
                <span>Tải lên video</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("url")}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors cursor-pointer ${
                activeTab === "url"
                  ? "bg-primary text-white"
                  : "bg-background/60 text-muted-foreground hover:bg-primary-light/50 hover:text-primary"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    activeTab === "url"
                      ? "bg-white/20 text-white"
                      : "bg-destructive-bg text-destructive-foreground border border-destructive-border"
                  }`}
                >
                  YT
                </div>
                <span>Link YouTube</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "file" ? (
              <div className="space-y-4">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      handleFileChange(file);
                    } else {
                      handleFileChange(null);
                    }
                  }}
                  className="hidden"
                  id="video-file-input"
                />
                <label
                  htmlFor="video-file-input"
                  className="flex flex-col items-center justify-center p-8 bg-background/50 rounded-xl transition-colors cursor-pointer border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/30"
                >
                  <Upload className="h-10 w-10 text-primary mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    {videoFile ? videoFile.name : "Chọn file video để tải lên"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP4, AVI, MOV hoặc các định dạng video khác
                  </p>
                </label>

                {videoFile && (
                  <div className="flex items-center justify-between bg-success-bg border border-success-border rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-success-foreground" />
                      <span className="text-sm font-medium text-success-foreground">
                        {videoFile.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="text-destructive-foreground hover:opacity-80 cursor-pointer transition-opacity"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Link YouTube{" "}
                    <span className="text-destructive-foreground">*</span>
                  </label>
                  <input
                    type="text"
                    value={videoUrl || ""}
                    onChange={(e) => {
                      handleUrlChange(e.target.value);
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full px-4 py-3 bg-surface border rounded-xl focus:outline-none focus:ring-2 transition-all text-foreground placeholder:text-muted-foreground ${
                      errors.video_url
                        ? "border-destructive-border focus:ring-destructive-border/40 focus:border-destructive-foreground"
                        : "border-border focus:ring-primary/25 focus:border-primary"
                    }`}
                  />
                  {errors.video_url && (
                    <p className="text-destructive-foreground text-sm mt-1">
                      {errors.video_url}
                    </p>
                  )}
                </div>

                {previewUrl && (
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <p className="text-sm font-medium text-foreground mb-3">
                      Preview video:
                    </p>
                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={previewUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube video preview"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }
);

VideoForm.displayName = "VideoForm";

export default VideoForm;
