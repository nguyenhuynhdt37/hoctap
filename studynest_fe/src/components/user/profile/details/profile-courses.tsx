"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { formatDate, formatDuration } from "@/lib/utils/helpers/date";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { CoursesMeResponse } from "@/types/user/courses-me";
import Link from "next/link";
import { useState } from "react";
import { HiAcademicCap, HiOutlineStar } from "react-icons/hi";
import useSWR from "swr";

interface ProfileCoursesProps {
  userId: string;
  isOwnProfile: boolean;
}

const fallbackThumbnail =
  "https://placehold.co/600x400/0fbba7/FFFFFF?text=Study+Course";

const levelLabels: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

const fetchCourses = async (url: string) => {
  const response = await api.get<CoursesMeResponse>(url);
  return response.data;
};

export default function ProfileCourses({
  userId,
  isOwnProfile,
}: ProfileCoursesProps) {
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Chỉ fetch courses đã mua nếu là profile của chính mình
  const { data, error, isLoading } = useSWR<CoursesMeResponse>(
    isOwnProfile
      ? `/course-enrolls/courses/user/${userId}?page=${page}&size=${pageSize}&sort_by=enrolled_at&order=desc`
      : null,
    fetchCourses
  );

  // Nếu không phải profile của chính mình, không hiển thị section này
  if (!isOwnProfile) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Khóa học đã mua
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 rounded-xl h-64"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Khóa học đã mua
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-600">
            Không thể tải danh sách khóa học. Vui lòng thử lại sau.
          </p>
        </div>
      </div>
    );
  }

  const courses = data?.courses || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  if (courses.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Khóa học đã mua
        </h3>
        <div className="text-center py-8">
          <HiAcademicCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Chưa có khóa học nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Khóa học đã mua</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const thumbnailSrc = getGoogleDriveImageUrl(
            course.thumbnail_url || fallbackThumbnail
          );
          const progress = Math.round(course.progress_percent || 0);
          const level = levelLabels[course.level] || "Không xác định";

          return (
            <Link
              key={course.id}
              href={`/learning/${course.slug}`}
              className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2"
            >
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={thumbnailSrc}
                    alt={course.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = fallbackThumbnail;
                    }}
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-600 shadow-sm">
                    {level}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-6">
                  <header className="space-y-2">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <HiOutlineStar className="h-4 w-4 text-amber-400" />
                        {course.rating_avg.toFixed(1)}
                        <span className="text-xs text-slate-400">
                          ({course.review_count})
                        </span>
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{formatDuration(course.total_length_seconds)}</span>
                    </div>
                  </header>

                  <div className="flex items-center justify-between rounded-xl bg-green-50/70 p-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase text-green-500">
                        Tiến độ
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {progress}%
                      </p>
                    </div>
                    <div className="relative h-2 flex-1 rounded-full bg-green-100 ml-4">
                      <span
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <footer className="mt-auto flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Ngôn ngữ: {course.language?.toUpperCase() || "N/A"}
                    </span>
                    <span>
                      Đăng ký:{" "}
                      {course.enrolled_at
                        ? formatDate(course.enrolled_at)
                        : formatDate(course.created_at)}
                    </span>
                  </footer>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-100 transition-colors"
          >
            Trước
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-100 transition-colors"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
