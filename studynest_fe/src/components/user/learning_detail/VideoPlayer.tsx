"use client";

import { MutableRefObject } from "react";
import {
  HiAdjustments,
  HiArrowsExpand,
  HiChevronRight,
  HiPlay,
  HiPlus,
  HiRefresh,
  HiVolumeOff,
  HiVolumeUp,
} from "react-icons/hi";

interface VideoPlayerProps {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  progressRef: MutableRefObject<HTMLDivElement | null>;
  currentVideoSource: string;
  instructorName: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  playbackRate: number;
  showPlaybackMenu: boolean;
  showSettingsMenu: boolean;
  setShowPlaybackMenu: (v: boolean) => void;
  setShowSettingsMenu: (v: boolean) => void;
  setPlaybackRate: (r: number) => void;
  setIsPlaying: (v: boolean) => void;
  setCurrentTime: (s: number) => void;
  setDuration: (d: number) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function VideoPlayer(props: VideoPlayerProps) {
  const {
    videoRef,
    progressRef,
    currentVideoSource,
    instructorName,
    isPlaying,
    currentTime,
    duration,
    isMuted,
    playbackRate,
    showPlaybackMenu,
    showSettingsMenu,
    setShowPlaybackMenu,
    setShowSettingsMenu,
    setPlaybackRate,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    togglePlay,
    toggleMute,
    handleProgressClick,
  } = props;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="bg-black relative"
      style={{ height: "calc(100vh - 80px - 300px)" }}
    >
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          poster="https://via.placeholder.com/1280x720/1f2937/ffffff?text=Video+Player"
          controls={false}
        >
          <source src={currentVideoSource} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="absolute bottom-20 left-6">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg">
            <span className="text-sm font-semibold">{instructorName}</span>
          </div>
        </div>

        <div className="absolute top-1/2 right-6 transform -translate-y-1/2">
          <button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl">
            <HiChevronRight className="h-5 w-5" />
            <span className="text-sm font-semibold">Bài tiếp theo</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
          <div className="mb-4">
            <div
              ref={progressRef}
              className="w-full h-2 bg-gray-600 rounded-full cursor-pointer relative"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <div
                className="absolute top-0 h-full bg-gray-400 rounded-full"
                style={{ width: "60%" }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className="text-white hover:text-teal-300 transition-colors"
              >
                {isPlaying ? (
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <div className="w-3 h-5 bg-white rounded-sm"></div>
                    <div className="w-3 h-5 bg-white rounded-sm ml-1"></div>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <HiPlay className="h-5 w-5 text-white ml-1" />
                  </div>
                )}
              </button>

              <button className="text-white hover:text-teal-300 transition-colors">
                <HiRefresh className="h-6 w-6" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowPlaybackMenu(!showPlaybackMenu)}
                  className="text-white hover:text-teal-300 transition-colors text-sm font-semibold bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm"
                >
                  {playbackRate}x
                </button>
                {showPlaybackMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-xl shadow-xl py-2 min-w-32 backdrop-blur-sm">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          setShowPlaybackMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          playbackRate === rate
                            ? "text-teal-400 font-semibold"
                            : "text-white"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="text-white hover:text-teal-300 transition-colors">
                <HiChevronRight className="h-6 w-6" />
              </button>

              <div className="text-white text-sm font-semibold bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <button className="text-white hover:text-teal-300 transition-colors">
                <HiPlus className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-teal-300 transition-colors"
                >
                  {isMuted ? (
                    <HiVolumeOff className="h-6 w-6" />
                  ) : (
                    <HiVolumeUp className="h-6 w-6" />
                  )}
                </button>
                <div className="w-20 h-2 bg-gray-600 rounded-full">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                    style={{ width: `100%` }}
                  />
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="text-white hover:text-teal-300 transition-colors"
                >
                  <HiAdjustments className="h-6 w-6" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-gray-800 rounded-xl shadow-xl py-2 min-w-48 backdrop-blur-sm">
                    <div className="px-4 py-2 text-white text-sm font-semibold border-b border-gray-700">
                      Độ phân giải
                    </div>
                    {["1080p", "720p", "576p", "432p", "360p", "Auto"].map(
                      (quality) => (
                        <button
                          key={quality}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-white transition-colors"
                        >
                          {quality}
                        </button>
                      )
                    )}
                    <div className="border-t border-gray-700 my-2"></div>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-white transition-colors">
                      Tự động phát
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-white transition-colors">
                      Tải bài giảng xuống
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-white transition-colors">
                      Lối tắt bàn phím
                    </button>
                  </div>
                )}
              </div>

              <button className="text-white hover:text-teal-300 transition-colors">
                <HiArrowsExpand className="h-6 w-6" />
              </button>

              <button className="text-white hover:text-teal-300 transition-colors">
                <HiArrowsExpand className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
