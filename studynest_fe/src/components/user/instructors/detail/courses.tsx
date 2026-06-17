"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { Course } from "@/types/user/course";
import {
  InstructorCourseItem,
  InstructorCoursesResponse,
} from "@/types/user/instructor";
import { CategoryListItem } from "@/types/user/category";
import CourseCard from "@/components/user/home/CourseCard";
import SkeletonCard from "@/components/user/home/SkeletonCard";
import useSWR from "swr";
import { useState, useEffect, useMemo, useCallback } from "react";
import { HiOutlineRefresh } from "react-icons/hi";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const transformCourse = (item: InstructorCourseItem): Course => ({
  id: item.id,
  slug: item.slug,
  title: item.title,
  instructor: undefined,
  rating: item.rating_avg || 0,
  students: item.total_enrolls || 0,
  price: item.base_price ?? null,
  image: item.thumbnail,
  tags: [],
});

interface InstructorCoursesProps {
  instructorId: string;
}

const InstructorCourses = ({ instructorId }: InstructorCoursesProps) => {
  const [allCourses, setAllCourses] = useState<InstructorCourseItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [sort, setSort] = useState<string>("created_at_desc");
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");

  const { data: categoriesData } = useSWR<CategoryListItem[]>(
    "/categories/all",
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      limit: "20",
      sort,
    });
    if (debouncedKeyword) params.set("keyword", debouncedKeyword);
    if (categorySlug) params.set("category_slug", categorySlug);
    if (level) params.set("level", level);
    return `/users/instructors/${instructorId}/courses?${params.toString()}`;
  }, [instructorId, sort, debouncedKeyword, categorySlug, level]);

  const { data, isLoading } = useSWR<InstructorCoursesResponse>(url, fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setAllCourses([]);
    setCursor(null);
  }, [url]);

  useEffect(() => {
    if (data?.items) {
      setAllCourses(data.items);
      setCursor(data.next_cursor);
    }
  }, [data]);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: "20",
        sort,
        cursor,
      });
      if (debouncedKeyword) params.set("keyword", debouncedKeyword);
      if (categorySlug) params.set("category_slug", categorySlug);
      if (level) params.set("level", level);
      const res = await api.get<InstructorCoursesResponse>(
        `/users/instructors/${instructorId}/courses?${params.toString()}`
      );
      setAllCourses((prev) => [...prev, ...res.data.items]);
      setCursor(res.data.next_cursor);
    } catch (error) {
      console.error("Error loading more courses:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    cursor,
    instructorId,
    sort,
    debouncedKeyword,
    categorySlug,
    level,
    isLoadingMore,
  ]);

  const courses = allCourses.map(transformCourse);

  const hasFilters = categorySlug || level;
  const clearFilters = () => {
    setCategorySlug("");
    setLevel("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-green-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên khóa học..."
              className="w-full px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh mục
            </label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
            >
              <option value="">Tất cả</option>
              {categoriesData?.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cấp độ
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
            >
              <option value="">Tất cả</option>
              <option value="beginner">Cơ bản</option>
              <option value="intermediate">Trung bình</option>
              <option value="advanced">Nâng cao</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sắp xếp
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
            >
              <option value="created_at_desc">Mới nhất</option>
              <option value="created_at_asc">Cũ nhất</option>
              <option value="rating_desc">Đánh giá cao</option>
              <option value="enrolls_desc">Nhiều học viên</option>
              <option value="views_desc">Nhiều lượt xem</option>
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-4 pt-4 border-t border-green-100">
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <HiOutlineRefresh className="w-4 h-4" />
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                section="recommended"
              />
            ))}
          </div>

          {cursor && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? "Đang tải..." : "Xem thêm"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Không có khóa học nào</p>
        </div>
      )}
    </div>
  );
};

export default InstructorCourses;
