"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { DiscountCourse } from "@/types/admin/discount";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiSearch, HiStar, HiX } from "react-icons/hi";

interface CourseSelectorProps {
  selectedCourses: DiscountCourse[];
  onSelect: (course: DiscountCourse) => void;
  onRemove: (courseId: string) => void;
}

export function CourseSelector({
  selectedCourses,
  onSelect,
  onRemove,
}: CourseSelectorProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courses, setCourses] = useState<DiscountCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch courses
  useEffect(() => {
    if (!showDropdown) return;

    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "20",
        });
        if (debouncedSearch.trim()) {
          params.append("search", debouncedSearch.trim());
        }
        const res = await api.get(`/admin/discounts/courses?${params}`);
        setCourses(res.data.items || []);
      } catch {
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [debouncedSearch, showDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCourses = courses.filter(
    (c) => !selectedCourses.some((s) => s.id === c.id)
  );

  const handleSelect = useCallback(
    (course: DiscountCourse) => {
      onSelect(course);
      setSearch("");
      setShowDropdown(false);
    },
    [onSelect]
  );

  return (
    <div ref={containerRef} className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Chọn khóa học <span className="text-red-500">*</span>
      </label>

      {/* Search Input */}
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Tìm kiếm khóa học..."
        />

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Đang tải...</div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Không tìm thấy khóa học
              </div>
            ) : (
              filteredCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSelect(course)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-green-50 transition-colors text-left"
                >
                  <div className="w-12 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {course.thumbnail && (
                      <Image
                        src={getGoogleDriveImageUrl(course.thumbnail)}
                        alt={course.title}
                        width={48}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {course.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <HiStar className="h-3 w-3 text-yellow-500" />
                        {course.rating_avg?.toFixed(1) || "N/A"}
                      </span>
                      <span>•</span>
                      <span>{course.base_price?.toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Courses */}
      {selectedCourses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Đã chọn {selectedCourses.length} khóa học:
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm"
              >
                <span className="text-green-700 truncate max-w-[200px]">
                  {course.title}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(course.id)}
                  className="text-green-600 hover:text-red-500 transition-colors"
                >
                  <HiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
