"use client";

import { useEffect, useState } from "react";
import { HiAcademicCap } from "react-icons/hi";

const tips = [
  "Mỗi ngày học một chút, bạn sẽ xây được cả một kho tri thức lớn",
  "Thất bại chỉ là bước đệm để bạn hiểu sâu hơn và tiến xa hơn",
  "Kiên nhẫn là chiếc chìa khóa mở ra mọi cánh cửa thành công",
  "Chia sẻ kiến thức giúp bạn ghi nhớ lâu và học nhanh hơn",
  "Học đa dạng kỹ năng sẽ giúp bạn thích ứng tốt với mọi thay đổi",
];

export default function StudyNestLoading() {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = Math.random() * 8 + 2;
        return Math.min(prev + increment, 92);
      });
    }, 300);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 2500);

    const timer = setTimeout(() => {
      setProgress(100);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-[#F6FAFF]">
      <div className="bg-white rounded-[24px] shadow-md border border-[#E7EEF7] p-8 max-w-md w-full mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-[#BFD7ED] border-t-[#356FA7] animate-spin" />
            <div className="absolute inset-2 flex items-center justify-center">
              <div className="w-full h-full bg-[#E8F2FA] rounded-2xl flex items-center justify-center">
                <HiAcademicCap className="text-[#356FA7] text-4xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-[#3D4A5A] mb-1">
            StudyNest
          </h1>
          <p className="text-sm text-[#6F7C8C]">Nền tảng học trực tuyến</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-[#6F7C8C] mb-2">
            <span>Đang tải</span>
            <span className="text-[#356FA7] font-semibold">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-[#E8F2FA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#356FA7] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Tips */}
        <div className="text-center">
          <p className="text-sm text-[#6F7C8C] min-h-12 flex items-center justify-center leading-relaxed">
            {tips[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
