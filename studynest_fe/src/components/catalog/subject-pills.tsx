"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "pulsoicon-react";
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
    const offset = direction === "left" ? -260 : 260;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const isAll = !selectedSubjectSlug;

  return (
    <div className="relative flex w-full items-center gap-2">
      {/* Nút cuộn trái */}
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Cuộn môn học sang trái"
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary cursor-pointer md:flex"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Dải Pills cuộn ngang */}
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollRef}
          role="group"
          aria-label="Chọn nhanh môn học"
          className="flex w-full items-center gap-2 overflow-x-auto px-0.5 py-1 scrollbar-none"
        >
          {/* Nút "Tất cả môn" */}
          <button
            type="button"
            aria-pressed={isAll}
            onClick={() => onSelectSubject("")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
              isAll
                ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_rgba(53,111,167,0.45)]"
                : "border border-border bg-background/70 text-foreground/90 hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
            }`}
          >
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
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_rgba(53,111,167,0.45)]"
                    : "border border-border bg-background/70 text-foreground/90 hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
                }`}
              >
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nút cuộn phải */}
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Cuộn môn học sang phải"
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary cursor-pointer md:flex"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
