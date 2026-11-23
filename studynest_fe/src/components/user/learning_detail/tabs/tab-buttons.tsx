"use client";

import {
  BookOpen,
  FileText,
  Layers,
  MessageCircle,
  SlidersHorizontal,
} from "pulsoicon-react";

interface TabButtonsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isQAModalOpen: boolean;
  onOpenQA: () => void;
}

const TABS = [
  { id: "lesson", label: "Tổng quan bài học", icon: BookOpen },
  { id: "notes", label: "Ghi chú", icon: FileText },
  { id: "qa", label: "Hỏi đáp", icon: MessageCircle },
  { id: "tools", label: "Công cụ học tập", icon: SlidersHorizontal },
  { id: "overview", label: "Thông tin khóa học", icon: Layers },
] as const;

export default function TabButtons({
  activeTab,
  setActiveTab,
  isQAModalOpen,
  onOpenQA,
}: TabButtonsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-primary-pastel/70 bg-surface/90 p-1.5 shadow-2xs backdrop-blur-md">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = id === "qa" ? isQAModalOpen : activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => (id === "qa" ? onOpenQA() : setActiveTab(id))}
            aria-pressed={active}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-primary-light hover:text-primary"
            }`}
          >
            <Icon className="size-4" animated={false} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
