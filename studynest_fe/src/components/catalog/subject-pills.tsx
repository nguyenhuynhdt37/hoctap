"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { BrowseSubjectOption } from "@/types/catalog";

interface SubjectPillsProps {
  subjects: BrowseSubjectOption[];
  selectedSubjectSlug?: string;
  onSelectSubject: (slug: string) => void;
}

export function SubjectPills({
  subjects,
  selectedSubjectSlug,
  onSelectSubject,
}: SubjectPillsProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -240 : 240;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const isAll = !selectedSubjectSlug;

  return (
    <div className="relative flex items-center w-full">
      {/* Nút cuộn trái */}
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Cuộn môn học sang trái"
        className="hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-primary hover:border-primary-pastel shadow-xs shrink-0 mr-2 cursor-pointer transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Dải Pills cuộn ngang */}
      <div
        ref={scrollRef}
        role="group"
        aria-label="Chọn nhanh môn học"
        className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5 w-full"
      >
        {/* Nút "Tất cả môn" */}
        <button
          type="button"
          aria-pressed={isAll}
          onClick={() => onSelectSubject("")}
          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
            isAll
              ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
              : "bg-surface border border-border text-foreground hover:bg-primary-light/70 hover:border-primary-pastel hover:text-primary"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tất cả môn</span>
        </button>

        {/* Danh sách các môn */}
        {subjects.map((sub) => {
          const slug = sub.slug ?? sub.code;
          const isSelected = selectedSubjectSlug === slug;

          return (
            <button
              key={sub.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectSubject(isSelected ? "" : slug)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                  : "bg-surface border border-border text-foreground hover:bg-primary-light/70 hover:border-primary-pastel hover:text-primary"
              }`}
            >
              <span>{sub.name}</span>
            </button>
          );
        })}
      </div>

      {/* Nút cuộn phải */}
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Cuộn môn học sang phải"
        className="hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-primary hover:border-primary-pastel shadow-xs shrink-0 ml-2 cursor-pointer transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
