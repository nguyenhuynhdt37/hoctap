"use client";

import { HiPlay } from "react-icons/hi";

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
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl bg-white rounded-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {title || "Xem trước khóa học"}
          </h3>
          <button
            className="text-gray-500 hover:text-gray-700 text-2xl"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col">
          <div className="w-full bg-black">
            {isLoading ? (
              <div className="aspect-video flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <div>Đang tải video...</div>
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
              <div className="aspect-video flex items-center justify-center text-white">
                <div className="text-center">
                  <HiPlay className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <div>Không có video xem trước</div>
                </div>
              </div>
            )}
          </div>

          <div className="w-full bg-white border-t border-gray-200 max-h-[40vh] overflow-y-auto">
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Danh sách xem trước
              </h4>
              <div className="space-y-2">
                {previewItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      idx === activeIndex
                        ? "bg-teal-50 border-teal-200 shadow-sm"
                        : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          idx === activeIndex
                            ? "bg-teal-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium leading-tight ${
                            idx === activeIndex
                              ? "text-teal-700"
                              : "text-gray-900"
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Xem trước • {formatSecondsToMmSs(item.duration)}
                        </div>
                      </div>
                      {idx === activeIndex && (
                        <div className="mt-1">
                          <HiPlay className="h-4 w-4 text-teal-600" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

