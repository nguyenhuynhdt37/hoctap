"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { HoldCourse } from "@/types/lecturer/hold";
import { Check, Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import useSWR from "swr";

interface CourseItemProps {
  course: HoldCourse;
  isSelected: boolean;
  onSelect: () => void;
}

function CourseItem({ course, isSelected, onSelect }: CourseItemProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const thumbnailSrc = course.thumbnail
    ? getImageUrl(course.thumbnail)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-light/60 transition-colors text-left ${
        isSelected ? "bg-primary-light/80" : ""
      }`}
    >
      <div className="relative w-12 h-8 shrink-0 rounded-lg overflow-hidden bg-background border border-border">
        {thumbnailSrc && !thumbnailError ? (
          <Image
            src={thumbnailSrc}
            alt={course.title}
            fill
            className="object-cover"
            onError={() => setThumbnailError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-light/40">
            <span className="text-muted-foreground text-[10px]">No img</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground line-clamp-1">
          {course.title}
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          {course.id.slice(0, 8)}...
        </div>
      </div>
      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

interface CourseSelectorProps {
  value: string;
  onChange: (courseId: string) => void;
}

export function CourseSelector({ value, onChange }: CourseSelectorProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<HoldCourse | null>(null);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch courses for dropdown
  const { data: coursesData, isLoading } = useSWR<HoldCourse[]>(
    showDropdown ? `/lecturer/transactions/courses?limit=20` : null,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch selected course when value changes and we don't have it in state
  const { data: allCoursesData } = useSWR<HoldCourse[]>(
    value && !selectedCourse
      ? `/lecturer/transactions/courses?limit=100`
      : null,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Update selected course when value changes
  useEffect(() => {
    if (value) {
      // First check if we have it in dropdown data
      const found = coursesData?.find((c) => c.id === value);
      if (found) {
        setSelectedCourse(found);
        return;
      }
      // Then check if we have it in all courses data
      const foundInAll = allCoursesData?.find((c) => c.id === value);
      if (foundInAll) {
        setSelectedCourse(foundInAll);
        return;
      }
      // If not found and we have data, keep current selection
      if (!coursesData && !allCoursesData) {
        // Data is loading, keep current
        return;
      }
    } else {
      setSelectedCourse(null);
    }
  }, [value, coursesData, allCoursesData]);

  const filteredCourses = coursesData?.filter((course) =>
    debouncedSearch
      ? course.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        course.id.toLowerCase().includes(debouncedSearch.toLowerCase())
      : true
  ) || [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-left flex items-center justify-between"
      >
        <span
          className={
            selectedCourse ? "text-foreground" : "text-muted-foreground"
          }
        >
          {selectedCourse ? selectedCourse.title : "Chọn khóa học..."}
        </span>
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute z-20 w-full mt-2 bg-surface border border-border rounded-2xl shadow-soft-md max-h-96 overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm khóa học..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Đang tải...
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Không tìm thấy khóa học
                </div>
              ) : (
                <div className="p-2">
                  {filteredCourses.map((course) => (
                    <CourseItem
                      key={course.id}
                      course={course}
                      isSelected={value === course.id}
                      onSelect={() => {
                        setSelectedCourse(course);
                        onChange(course.id);
                        setShowDropdown(false);
                        setSearch("");
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {value && (
              <div className="p-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCourse(null);
                    onChange("");
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive-bg rounded-xl transition-colors"
                >
                  Xóa lựa chọn
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

