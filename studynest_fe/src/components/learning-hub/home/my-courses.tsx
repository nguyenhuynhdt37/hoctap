"use client";

import { Skeleton } from "@/components/ui";
import type { useCurrentLesson, usePurchasedCourses } from "@/lib/learning-hub/home-api";
import type { CoursesMeItem } from "@/types/user/courses-me";
import Link from "next/link";
import { HubLoadError } from "../hub-page-state";
import { stretchedLink, ThinBar, TicketCard } from "./home-ui";
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
        <div role="status" aria-label="Đang tải khóa học của bạn" className="user-four-column-grid [&_.animate-pulse]:motion-reduce:animate-none">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-[16/12] w-full rounded-3xl" />)}
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
  return (
    <li className="relative flex min-w-0 flex-col">
      <TicketCard
        src={course.thumbnail_url}
        alt={`Ảnh bìa khóa học ${course.title}`}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="h-full flex-col border border-border shadow-ambient-sm transition-shadow hover:shadow-ambient-md"
        captionClassName="flex flex-1 flex-col justify-between space-y-2"
      >
        <h3 className="line-clamp-2 text-base font-bold text-foreground">
          <Link href={`/learning/${encodeURIComponent(course.slug)}`} className={stretchedLink}>
            {course.title}<span className="sr-only"> — {progress >= 100 ? "xem lại" : progress > 0 ? "học tiếp" : "bắt đầu học"}</span>
          </Link>
        </h3>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">{progress >= 100 ? "Đã hoàn thành" : progress > 0 ? `Đã học ${progress}%` : "Chưa bắt đầu"}</p>
          <ThinBar value={progress} label={`Tiến độ ${course.title}`} />
        </div>
      </TicketCard>
    </li>
  );
}
