"use client";

import { HiPlay, HiX } from "react-icons/hi";

interface PreviewItem {
  id: string;
  title: string;
  video_url: string;
  duration: number;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  previewUrl: string;
  previewItems: PreviewItem[];
  activeIndex: number;
  isLoading: boolean;
  onSelectItem: (index: number) => void;
  formatSecondsToMmSs: (seconds: number | null | undefined) => string;
}

export default function PreviewModal({
  isOpen,
  onClose,
  title,
  previewUrl,
  previewItems,
  activeIndex,
  isLoading,
  onSelectItem,
  formatSecondsToMmSs,
}: PreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/55 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl bg-surface rounded-[24px] border border-border overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              Học thử trên Mây Mây
            </span>
            <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
              {title || "Xem trước bài giảng"}
            </h3>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-surface border border-border text-muted-foreground hover:text-primary hover:border-primary-pastel flex items-center justify-center transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Đóng"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col">
          <div className="w-full bg-foreground">
            {isLoading ? (
              <div className="aspect-video flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-pastel border-t-transparent mx-auto mb-3" />
                  <div className="text-sm">Đang tải bài giảng...</div>
                </div>
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
                key={previewUrl}
              />
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-primary-light via-surface to-secondary-light/50 p-6">
                <div className="text-center max-w-md">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <HiPlay className="h-7 w-7 translate-x-0.5" />
                  </div>
                  <h4 className="font-bold text-foreground text-base mb-1">
                    Bài giảng mẫu đang được cập nhật
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Bạn có thể tham khảo chi tiết đề cương các chương và mục tiêu bài học ngay trên trang thông tin khóa học.
                  </p>
                </div>
              </div>
            )}
          </div>

          {previewItems.length > 0 && (
            <div className="w-full bg-surface border-t border-border max-h-[34vh] overflow-y-auto p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Danh sách bài học xem trước
              </h4>
              <div className="space-y-2">
                {previewItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(idx)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      idx === activeIndex
                        ? "bg-primary-light/80 border-primary-pastel shadow-2xs"
                        : "bg-background border-border hover:border-primary-pastel"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === activeIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface border border-border text-muted-foreground"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-semibold truncate ${
                            idx === activeIndex
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Học thử • {formatSecondsToMmSs(item.duration)}
                        </div>
                      </div>
                      {idx === activeIndex && (
                        <HiPlay className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
