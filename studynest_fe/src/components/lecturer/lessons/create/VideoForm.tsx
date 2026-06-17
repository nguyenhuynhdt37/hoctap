"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { HiCheck, HiPlay, HiUpload, HiX } from "react-icons/hi";

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
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
            <HiPlay className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tải lên video</h2>
            <p className="text-gray-600 mt-1">
              Chọn một trong hai cách: tải lên file video hoặc dán link YouTube
            </p>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Tab Buttons */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => handleTabChange("file")}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === "file"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HiUpload className="h-5 w-5" />
                <span>Tải lên video</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("url")}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === "url"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">YT</span>
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
                  className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg transition-colors cursor-pointer border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-gray-100"
                >
                  <HiUpload className="h-10 w-10 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {videoFile ? videoFile.name : "Chọn file video để tải lên"}
                  </p>
                  <p className="text-xs text-gray-500">
                    MP4, AVI, MOV hoặc các định dạng video khác
                  </p>
                </label>

                {videoFile && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <HiCheck className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        {videoFile.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="text-red-600 hover:text-red-700 cursor-pointer transition-colors"
                    >
                      <HiX className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Link YouTube <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={videoUrl || ""}
                    onChange={(e) => {
                      handleUrlChange(e.target.value);
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                      errors.video_url
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                    }`}
                  />
                  {errors.video_url && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.video_url}
                    </p>
                  )}
                </div>

                {previewUrl && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Preview video:
                    </p>
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
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
        </div>
      </div>
    );
  }
);

VideoForm.displayName = "VideoForm";

export default VideoForm;
