"use client";

interface TabButtonsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isQAModalOpen: boolean;
  onOpenQA: () => void;
}

export default function TabButtons({
  activeTab,
  setActiveTab,
  isQAModalOpen,
  onOpenQA,
}: TabButtonsProps) {
  return (
    <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex space-x-0">
          <button
            onClick={() => setActiveTab("lesson")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === "lesson"
                ? "border-teal-500 text-teal-600 bg-white"
                : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-white/50"
            }`}
          >
            Tổng quan bài học
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === "tools"
                ? "border-teal-500 text-teal-600 bg-white"
                : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-white/50"
            }`}
          >
            Công cụ học tập
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === "notes"
                ? "border-teal-500 text-teal-600 bg-white"
                : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-white/50"
            }`}
          >
            Ghi chú
          </button>
          <button
            onClick={onOpenQA}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
              isQAModalOpen
                ? "border-teal-500 text-teal-600 bg-white"
                : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-white/50"
            }`}
          >
            Hỏi đáp
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === "overview"
                ? "border-teal-500 text-teal-600 bg-white"
                : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-white/50"
            }`}
          >
            Tổng quan khóa học
          </button>
        </div>
      </div>
    </div>
  );
}

