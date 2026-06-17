"use client";

interface VideoOverlaysProps {
  hasQuizzes: boolean;
  isCompleted: boolean;
  isHoveringVideo: boolean;
  isPaused: boolean;
  watchTime: number;
  duration: number;
  isFastForwarding: boolean;
  quizzesCount: number;
  onOpenQuiz: () => void;
  onVideoMouseEnter: () => void;
  onVideoMouseLeave: () => void;
}

export default function VideoOverlays({
  hasQuizzes,
  isCompleted,
  isHoveringVideo,
  isPaused,
  watchTime,
  duration,
  isFastForwarding,
  quizzesCount,
  onOpenQuiz,
  onVideoMouseEnter,
  onVideoMouseLeave,
}: VideoOverlaysProps) {
  return (
    <>
      {/* Thông báo yêu cầu 85% */}
      {hasQuizzes && !isCompleted && (
        <div
          className={`absolute top-4 right-4 z-10 transition-all duration-500 ${
            isHoveringVideo
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-5"
          }`}
          onMouseEnter={onVideoMouseEnter}
          onMouseLeave={onVideoMouseLeave}
        >
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg shadow-lg border border-orange-400/20">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                🎯
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Hoàn thành Quiz</div>
                <div className="text-xs text-orange-100">
                  trên 85% để qua bài tiếp theo
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nút Quiz */}
      {hasQuizzes && (
        <div
          className={`absolute top-1/2 right-4 z-10 transition-all duration-500 ${
            isHoveringVideo
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-5"
          }`}
          onMouseEnter={onVideoMouseEnter}
          onMouseLeave={onVideoMouseLeave}
        >
          <button
            onClick={onOpenQuiz}
            className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-6 py-3 rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border border-teal-500/20 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">
                  {isCompleted ? "Luyện tập Quiz" : "Làm Quiz"}
                </div>
                <div className="text-xs text-teal-100">
                  {quizzesCount} câu hỏi
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Thời gian đã xem */}
      {!hasQuizzes &&
        !isCompleted &&
        !isPaused &&
        watchTime > 0 &&
        isHoveringVideo && (
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg shadow-lg border border-green-400/20">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                  ⏱️
                </div>
                <div>
                  <div className="text-sm font-semibold">Đã xem</div>
                  <div className="text-xs text-green-100">
                    {Math.floor(watchTime / 60)}:
                    {(watchTime % 60).toString().padStart(2, "0")} /{" "}
                    {Math.floor(duration / 60)}:
                    {(duration % 60).toString().padStart(2, "0")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Cảnh báo khi tua video quá nhiều */}
      {isFastForwarding && !isPaused && (
        <div className="absolute top-4 right-4 z-30">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg shadow-lg border border-green-400/20">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                ⚠️
              </div>
              <div>
                <div className="text-sm font-semibold">Cảnh báo tua video</div>
                <div className="text-xs text-green-100">
                  Thời gian tua sẽ không được tính vào thời gian xem
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
