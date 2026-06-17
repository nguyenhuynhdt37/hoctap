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
    <div className="bg-white shadow-lg border-b border-teal-100 sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div
                onClick={() => router.push("/")}
                className="w-10 cursor-pointer h-10 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center"
              >
                <img
                  src="/logo/studynest-logo.svg"
                  alt="StudyNest Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-xl font-black text-gray-900 tracking-wide">
                    STUDY
                  </span>
                  <span className="text-xl font-black text-teal-500 ml-0.5">
                    NEST
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500 tracking-widest uppercase -mt-1">
                  Spreading Knowledge
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-gray-200"></div>

            {/* Course Title */}
            <h1 className="text-lg font-semibold text-gray-900">
              {courseTitle}
            </h1>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Tutor Chat Button */}
            {onToggleChat && (
              <button
                onClick={onToggleChat}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  chatOpen
                    ? "bg-green-600 text-white"
                    : "bg-green-50 hover:bg-green-100 text-green-700"
                }`}
              >
                <HiChat className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {chatOpen ? "Đóng chat" : "Hỏi trợ giảng"}
                </span>
              </button>
            )}

            {/* Progress Button */}
            <button
              onClick={onOpenProgress}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors"
            >
              <HiClock className="w-5 h-5" />
              <span className="text-sm font-medium">Tiến độ của bạn</span>
              <HiChevronDown className="w-4 h-4" />
            </button>

            {/* Share Button */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors">
              <HiDownload className="w-5 h-5" />
              <span className="text-sm font-medium">Chia sẻ</span>
            </button>

            {/* More Options Button */}
            <div className="relative">
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HiMenuAlt3 className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-40">
                  <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors">
                    <HiStar className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-900 text-sm font-medium">
                      Thích khóa học này
                    </span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors">
                    <HiClipboardList className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-900 text-sm font-medium">
                      Lưu trữ khóa học này
                    </span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors">
                    <HiSparkles className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-900 text-sm font-medium">
                      Tặng khóa học này
                    </span>
                  </button>

                  <div className="border-t border-gray-200 my-2"></div>

                  <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-3 h-3 bg-teal-500 rounded-sm"></div>
                    </div>
                    <span className="text-gray-900 text-sm font-medium">
                      Email về thông báo mới
                    </span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-3 h-3 bg-teal-500 rounded-sm"></div>
                    </div>
                    <span className="text-gray-900 text-sm font-medium">
                      Email quảng cáo
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
