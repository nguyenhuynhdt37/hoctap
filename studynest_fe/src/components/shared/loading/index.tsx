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
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-2 border-green-200 border-t-green-600 animate-spin" />
            <div className="absolute inset-2 flex items-center justify-center">
              <div className="w-full h-full bg-green-600 rounded-xl flex items-center justify-center">
                <HiAcademicCap className="text-white text-5xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">StudyNest</h1>
          <p className="text-sm text-gray-600">Nền tảng học trực tuyến</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Đang tải</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Tips */}
        <div className="text-center">
          <p className="text-sm text-gray-600 min-h-12 flex items-center justify-center">
            {tips[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
