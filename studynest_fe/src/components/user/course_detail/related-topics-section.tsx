"use client";

import { CategoryItem } from "@/types/user/course_detail";
import Link from "next/link";
import { HiAcademicCap, HiBookOpen } from "react-icons/hi";

interface RelatedTopicsSectionProps {
  categories: CategoryItem[];
}

export default function RelatedTopicsSection({
  categories,
}: RelatedTopicsSectionProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="bg-surface rounded-[24px] shadow-xs border border-border p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-primary-light border border-primary-pastel rounded-2xl flex items-center justify-center text-primary shrink-0">
          <HiAcademicCap className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
            Chuyên đề liên kết
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Khám phá các chủ đề liên quan
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group bg-background rounded-2xl p-4 border border-border hover:border-primary-pastel hover:bg-primary-light/40 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-surface border border-primary-pastel rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <HiBookOpen className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-sm">
                  {category.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Lộ trình Mây Mây
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
