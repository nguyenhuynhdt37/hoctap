"use client";

import { CourseTicketCard, CourseTicketCardSkeleton } from "@/components/user/shared/course-ticket-card";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { formatDuration } from "@/lib/utils/helpers/date";
import { CoursesMeResponse } from "@/types/user/courses-me";
import { GraduationCap } from "pulsoicon-react";
import useSWR from "swr";

interface ProfileCoursesProps {
  userId: string;
  isOwnProfile: boolean;
}

const PROFILE_COURSES_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
} as const;

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
  const { values, setParam } = useUrlQueryState(PROFILE_COURSES_QUERY_SCHEMA);
  const { page } = values;
  const pageSize = 8;

  const { data, error, isLoading } = useSWR<CoursesMeResponse>(
    isOwnProfile
      ? `/course-enrolls/courses/user/${userId}?page=${page}&size=${pageSize}&sort_by=enrolled_at&order=desc`
      : null,
    fetchCourses,
  );

  if (!isOwnProfile) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-ambient-sm sm:p-8">
        <h3 className="mb-6 text-xl font-bold text-foreground">
          Khóa học đã mua
        </h3>
        <div className="user-four-column-grid">
          {[0, 1, 2, 3].map((i) => (
            <CourseTicketCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-ambient-sm sm:p-8">
        <h3 className="mb-4 text-xl font-bold text-foreground">
          Khóa học đã mua
        </h3>
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
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
      <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-ambient-sm sm:p-8">
        <h3 className="mb-4 text-xl font-bold text-foreground">
          Khóa học đã mua
        </h3>
        <div className="py-8 text-center">
          <GraduationCap className="mx-auto mb-4 size-14 text-primary/60" aria-hidden="true" />
          <p className="text-muted-foreground">Chưa có khóa học nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-ambient-sm sm:p-8">
      <h3 className="mb-6 text-xl font-bold text-foreground">Khóa học đã mua</h3>

      <div className="user-four-column-grid">
        {courses.map((course) => {
          const progress = Math.round(course.progress_percent || 0);
          const completed = progress >= 100;
          const level = levelLabels[course.level] || "Mọi cấp độ";

          return (
            <CourseTicketCard
              key={course.id}
              href={`/learning/${course.slug}`}
              title={course.title}
              thumbnail={course.thumbnail_url}
              alt={`Ảnh bìa khóa học ${course.title}`}
              badge={{
                label: completed ? "Đã hoàn thành" : level,
                tone: completed ? "success" : "lavender",
              }}
              metaParts={[
                course.total_length_seconds
                  ? formatDuration(course.total_length_seconds)
                  : null,
                course.rating_avg > 0 ? `${course.rating_avg.toFixed(1)}★` : null,
              ]}
              progress={{
                percent: progress,
                label: completed ? "Đã hoàn thành" : progress > 0 ? "Tiến độ học" : "Chưa bắt đầu",
              }}
              srLabel="— tiếp tục học"
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setParam("page", page - 1)}
            className="cursor-pointer rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trước
          </button>
          <span className="px-3 text-sm font-medium text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setParam("page", page + 1)}
            className="cursor-pointer rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
