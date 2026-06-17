"use client";

import { CategoryItem } from "@/types/user/course_detail";
import { HiAcademicCap, HiBookOpen } from "react-icons/hi";

interface RelatedTopicsSectionProps {
  categories: CategoryItem[];
}

export default function RelatedTopicsSection({
  categories,
}: RelatedTopicsSectionProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="bg-emerald-50 rounded-lg shadow-sm border border-emerald-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
          <HiAcademicCap className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Khám phá các chủ đề liên quan
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((category) => (
          <a
            key={category.id}
            href={`/category/${category.slug}`}
            className="group bg-white rounded-lg p-3 border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <HiBookOpen className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 group-hover:text-emerald-600 transition-colors truncate text-sm">
                  {category.name}
                </h3>
                <p className="text-xs text-gray-500">Chủ đề liên quan</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-4 text-center">
        <a
          href="/categories"
          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm cursor-pointer"
        >
          Xem tất cả chủ đề
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}

