"use client";

import { LessonResource } from "@/types/user/curriculum";
import {
  HiCloudDownload,
  HiDocumentText,
  HiDownload,
  HiExternalLink,
  HiPhotograph,
  HiVideoCamera,
  HiX,
} from "react-icons/hi";

interface ResourcesModalProps {
  open: boolean;
  onClose: () => void;
  resources: LessonResource[];
  lessonTitle?: string;
}

export default function ResourcesModal(props: ResourcesModalProps) {
  const { open, onClose, resources, lessonTitle } = props;

  // Helper function để lấy icon và màu cho resource type
  const getResourceIcon = (resourceType: string) => {
    const type = resourceType?.toLowerCase() || "file";
    switch (type) {
      case "pdf":
        return <HiDocumentText className="h-5 w-5" />;
      case "link":
      case "url":
        return <HiExternalLink className="h-5 w-5" />;
      case "image":
      case "img":
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <HiPhotograph className="h-5 w-5" />;
      case "zip":
      case "archive":
      case "rar":
      case "7z":
        return <HiCloudDownload className="h-5 w-5" />;
      case "video":
      case "mp4":
      case "avi":
      case "mov":
      case "mkv":
        return <HiVideoCamera className="h-5 w-5" />;
      default:
        return <HiDocumentText className="h-5 w-5" />;
    }
  };

  const getResourceTypeLabel = (resourceType: string) => {
    const type = resourceType?.toLowerCase() || "file";
    const labels: { [key: string]: string } = {
      pdf: "PDF",
      link: "Liên kết",
      url: "Liên kết",
      image: "Hình ảnh",
      img: "Hình ảnh",
      jpg: "Hình ảnh",
      jpeg: "Hình ảnh",
      png: "Hình ảnh",
      gif: "Hình ảnh",
      webp: "Hình ảnh",
      zip: "ZIP",
      archive: "Archive",
      rar: "RAR",
      "7z": "7Z",
      video: "Video",
      mp4: "Video",
      avi: "Video",
      mov: "Video",
      mkv: "Video",
      file: "File",
    };
    return labels[type] || "File";
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes === null) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary-pastel/50 to-secondary-pastel/40 flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h3 className="text-lg font-bold text-foreground truncate">
              Tài nguyên bài học
            </h3>
            {lessonTitle && (
              <p className="text-sm text-primary truncate mt-1">
                {lessonTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {resources.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary-pastel rounded-full flex items-center justify-center mx-auto mb-4">
                <HiDocumentText className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-medium">Không có tài nguyên</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bài học này chưa có tài liệu đính kèm
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((res) => (
                <a
                  key={res.id}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background/60 hover:border-primary-light hover:bg-primary-pastel/30 transition-all duration-200 group cursor-pointer"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-pastel rounded-xl flex items-center justify-center text-primary group-hover:bg-primary-light/50 transition-colors">
                    {getResourceIcon(res.resource_type || "file")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {res.title || "Tài nguyên"}
                      </h4>
                      <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary-pastel text-primary font-medium">
                        {getResourceTypeLabel(res.resource_type || "file")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {formatFileSize(res.file_size) && (
                        <>
                          <span>{formatFileSize(res.file_size)}</span>
                          <span>•</span>
                        </>
                      )}
                      <span className="truncate">{res.url}</span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white group-hover:bg-primary-hover transition-colors">
                      <HiDownload className="w-4 h-4" />
                      <span className="text-sm font-medium">Tải</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-background/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
