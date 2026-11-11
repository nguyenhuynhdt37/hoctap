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
    <div className="border-b border-border bg-gradient-to-r from-primary-pastel/40 to-secondary-pastel/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex space-x-0">
          <button
            onClick={() => setActiveTab("lesson")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              activeTab === "lesson"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-surface/60"
            }`}
          >
            Tổng quan bài học
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              activeTab === "tools"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-surface/60"
            }`}
          >
            Công cụ học tập
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              activeTab === "notes"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-surface/60"
            }`}
          >
            Ghi chú
          </button>
          <button
            onClick={onOpenQA}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              isQAModalOpen
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-surface/60"
            }`}
          >
            Hỏi đáp
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              activeTab === "overview"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-surface/60"
            }`}
          >
            Tổng quan khóa học
          </button>
        </div>
      </div>
    </div>
  );
}

