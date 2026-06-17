"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { WeakCourse } from "@/types/admin/discount";
import { useEffect, useState } from "react";
import { HiExclamation, HiStar, HiUsers } from "react-icons/hi";

interface WeakCoursesListProps {
  isEnabled: boolean;
}

export function WeakCoursesList({ isEnabled }: WeakCoursesListProps) {
  const [courses, setCourses] = useState<WeakCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      setCourses([]);
      return;
    }

    const fetchWeakCourses = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/admin/discounts/weak-courses");
        setCourses(res.data || []);
      } catch {
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeakCourses();
  }, [isEnabled]);

  if (!isEnabled) return null;

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách khóa học yếu...</span>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-700">
          <HiExclamation className="h-5 w-5" />
          <span>Không tìm thấy khóa học yếu nào</span>
        </div>
      </div>
    );
  }

  const displayCourses = showAll ? courses : courses.slice(0, 5);

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-sm font-medium text-green-700 mb-3">
        Sẽ áp dụng cho {courses.length} khóa học yếu nhất:
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {displayCourses.map((course, index) => (
          <div
            key={course.course_id}
            className="flex items-center justify-between p-2 bg-white rounded border border-green-100"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-gray-400 w-6">
                #{index + 1}
              </span>
              <span className="text-sm text-gray-900 truncate">
                {course.title}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
              <span className="flex items-center gap-1">
                <HiStar className="h-3 w-3 text-yellow-500" />
                {course.rating_avg?.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <HiUsers className="h-3 w-3" />
                {course.total_enrolls}
              </span>
            </div>
          </div>
        ))}
      </div>
      {courses.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
        >
          {showAll ? "Thu gọn" : `Xem thêm ${courses.length - 5} khóa học`}
        </button>
      )}
    </div>
  );
}
