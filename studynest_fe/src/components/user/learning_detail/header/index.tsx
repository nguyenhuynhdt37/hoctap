"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  HiChat,
  HiChevronDown,
  HiClipboardList,
  HiClock,
  HiDownload,
  HiMenuAlt3,
  HiSparkles,
  HiStar,
} from "react-icons/hi";

interface LearningHeaderProps {
  courseTitle: string;
  onOpenProgress: () => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
}

export default function LearningHeader({
  courseTitle,
  onOpenProgress,
  chatOpen,
  onToggleChat,
}: LearningHeaderProps) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const router = useRouter();
  return (
    <header className="bg-white/95 backdrop-blur-md shadow-xs border-b border-[#E7EEF7] sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Left Side */}
          <div className="flex items-center space-x-4 min-w-0">
            {/* Logo */}
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <div
                onClick={() => router.push("/")}
                className="w-9 cursor-pointer h-9 bg-[#E8F2FA] border border-[#BFD7ED]/70 rounded-xl flex items-center justify-center transition-colors hover:bg-[#BFD7ED]/50"
              >
                <img
                  src="/logo/studynest-logo.svg"
                  alt="StudyNest Logo"
                  width={22}
                  height={22}
                  className="w-5 h-5"
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center">
                  <span className="text-lg font-bold text-[#3D4A5A] tracking-tight">
                    Study
                  </span>
                  <span className="text-lg font-bold text-[#356FA7]">
                    Nest
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#8190A3] tracking-widest uppercase -mt-1">
                  Spreading Knowledge
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-[#E7EEF7] flex-shrink-0"></div>

            {/* Course Title */}
            <h1 className="text-sm sm:text-base font-semibold text-[#3D4A5A] truncate">
              {courseTitle}
            </h1>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {/* Tutor Chat Button */}
            {onToggleChat && (
              <button
                onClick={onToggleChat}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition-colors cursor-pointer text-sm font-semibold ${
                  chatOpen
                    ? "bg-[#356FA7] text-white"
                    : "bg-[#E8F2FA] hover:bg-[#BFD7ED]/60 text-[#356FA7]"
                }`}
              >
                <HiChat className="w-4 h-4" />
                <span className="hidden md:inline">
                  {chatOpen ? "Đóng chat" : "Hỏi trợ giảng"}
                </span>
              </button>
            )}

            {/* Progress Button */}
            <button
              onClick={onOpenProgress}
              className="flex items-center space-x-2 px-3.5 py-2 bg-[#F6FAFF] hover:bg-[#E8F2FA] border border-[#E7EEF7] text-[#3D4A5A] rounded-xl transition-colors cursor-pointer text-sm font-medium"
            >
              <HiClock className="w-4 h-4 text-[#356FA7]" />
              <span className="hidden sm:inline">Tiến độ của bạn</span>
              <HiChevronDown className="w-4 h-4 text-[#6F7C8C]" />
            </button>

            {/* Share Button */}
            <button className="hidden lg:flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-[#F6FAFF] border border-[#E7EEF7] text-[#3D4A5A] rounded-xl transition-colors cursor-pointer text-sm font-medium">
              <HiDownload className="w-4 h-4 text-[#356FA7]" />
              <span>Chia sẻ</span>
            </button>

            {/* More Options Button */}
            <div className="relative">
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                aria-label="Tùy chọn thêm"
                className="p-2 text-[#6F7C8C] hover:text-[#3D4A5A] hover:bg-[#F6FAFF] border border-transparent hover:border-[#E7EEF7] rounded-xl transition-colors cursor-pointer"
              >
                <HiMenuAlt3 className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-lg border border-[#E7EEF7] py-2 z-40">
                  <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-[#F6FAFF] transition-colors cursor-pointer">
                    <HiStar className="w-5 h-5 text-[#356FA7]" />
                    <span className="text-[#3D4A5A] text-sm font-medium">
                      Thích khóa học này
                    </span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-[#F6FAFF] transition-colors cursor-pointer">
                    <HiClipboardList className="w-5 h-5 text-[#356FA7]" />
                    <span className="text-[#3D4A5A] text-sm font-medium">
                      Lưu trữ khóa học này
                    </span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-[#F6FAFF] transition-colors cursor-pointer">
                    <HiSparkles className="w-5 h-5 text-[#356FA7]" />
                    <span className="text-[#3D4A5A] text-sm font-medium">
                      Tặng khóa học này
                    </span>
                  </button>

                  <div className="border-t border-[#E7EEF7] my-1.5"></div>

                  <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-[#F6FAFF] transition-colors cursor-pointer">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-3 h-3 bg-[#356FA7] rounded-xs"></div>
                    </div>
                    <span className="text-[#3D4A5A] text-sm font-medium">
                      Email về thông báo mới
                    </span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-[#F6FAFF] transition-colors cursor-pointer">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-3 h-3 bg-[#356FA7] rounded-xs"></div>
                    </div>
                    <span className="text-[#3D4A5A] text-sm font-medium">
                      Email quảng cáo
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
