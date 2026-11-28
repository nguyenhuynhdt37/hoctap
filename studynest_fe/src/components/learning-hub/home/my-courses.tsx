"use client";

import { CourseTicketCard, CourseTicketCardSkeleton } from "@/components/user/shared/course-ticket-card";
import type { useCurrentLesson, usePurchasedCourses } from "@/lib/learning-hub/home-api";
import type { CoursesMeItem } from "@/types/user/courses-me";
import { HubLoadError } from "../hub-page-state";
import { HomeLink } from "./section";

export function MyCourses({ current, purchases }: {
  current: ReturnType<typeof useCurrentLesson>;
  purchases: ReturnType<typeof usePurchasedCourses>;
}) {
  const others = purchases.data?.courses.filter(({ id }) => id !== current.course?.id) ?? [];
  if (!purchases.error && purchases.data && others.length === 0) return null;

  return (
    <section id="studying" tabIndex={-1} aria-labelledby="studying-title" className="scroll-mt-24 focus-visible:outline-2 focus-visible:outline-ring">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="studying-title" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Khóa học của bạn</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Tiếp tục nhanh các khóa học bạn đã đăng ký.</p>
        </div>
        {!!purchases.data?.total && <HomeLink href="/my-learning" endIcon={false} className="bg-surface text-sm">Tất cả khóa học</HomeLink>}
      </div>
      {purchases.error ? (
        <HubLoadError title="Chưa tải được danh sách khóa học" message="Tải lại để xem các khóa bạn đã đăng ký." onRetry={() => void purchases.mutate().catch(() => undefined)} isRetrying={purchases.isValidating} />
      ) : !purchases.data ? (
        <div role="status" aria-label="Đang tải khóa học của bạn" className="user-four-column-grid">
          {[0, 1, 2, 3].map((i) => <CourseTicketCardSkeleton key={i} />)}
        </div>
      ) : (
        <ul aria-label="Khóa học của bạn" className="user-four-column-grid">
          {others.slice(0, 8).map((course) => <TicketCourse key={course.id} course={course} />)}
        </ul>
      )}
    </section>
  );
}

function TicketCourse({ course }: { course: CoursesMeItem }) {
  const progress = Math.round(course.progress_percent ?? 0);
  const completed = progress >= 100;

  return (
    <li className="flex min-w-0 flex-col">
      <CourseTicketCard
        href={`/learning/${encodeURIComponent(course.slug)}`}
        title={course.title}
        thumbnail={course.thumbnail_url}
        alt={`Ảnh bìa khóa học ${course.title}`}
        badge={{
          label: completed ? "Đã hoàn thành" : progress > 0 ? "Đang học" : "Chưa bắt đầu",
          tone: completed ? "success" : "primary",
        }}
        metaParts={[
          typeof course.total_lessons === "number" && course.total_lessons > 0
            ? `${course.completed_lessons ?? 0}/${course.total_lessons} bài`
            : null,
        ]}
        progress={{
          percent: progress,
          label: completed ? "Đã hoàn thành" : progress > 0 ? `Đã học ${progress}%` : "Chưa bắt đầu",
        }}
        srLabel={`— ${completed ? "xem lại" : progress > 0 ? "học tiếp" : "bắt đầu học"}`}
      />
    </li>
  );
}
