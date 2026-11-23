"use client";

import { Skeleton } from "@/components/ui";
import type { useCurrentLesson, usePurchasedCourses } from "@/lib/learning-hub/home-api";
import { cn } from "@/lib/utils";
import type { CoursesMeItem } from "@/types/user/courses-me";
import Link from "next/link";
import { HubLoadError } from "../hub-page-state";
import { stretchedLink, ThinBar, TicketCard } from "./home-ui";
import { HomeLink } from "./section";

const widths = ["w-[17.5rem] sm:w-[20rem]", "w-[13.5rem] sm:w-[15rem]", "w-[15.5rem] sm:w-[17.5rem]"];
const tilts = ["-rotate-1", "rotate-1", "rotate-[0.5deg]"];

export function MyCourses({ current, purchases }: {
  current: ReturnType<typeof useCurrentLesson>;
  purchases: ReturnType<typeof usePurchasedCourses>;
}) {
  const others = purchases.data?.courses.filter(({ id }) => id !== current.course?.id) ?? [];
  if (!purchases.error && purchases.data && others.length === 0) return null;

  return (
    <section id="studying" tabIndex={-1} aria-labelledby="studying-title" className="scroll-mt-24 focus-visible:outline-2 focus-visible:outline-ring">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 id="studying-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Khóa học của bạn</h2>
        {!!purchases.data?.total && <HomeLink href="/my-learning" endIcon={false} className="bg-surface text-sm">Tất cả khóa học</HomeLink>}
      </div>
      {purchases.error ? (
        <HubLoadError title="Chưa tải được danh sách khóa học" message="Tải lại để xem các khóa bạn đã đăng ký." onRetry={() => void purchases.mutate().catch(() => undefined)} isRetrying={purchases.isValidating} />
      ) : !purchases.data ? (
        <div role="status" aria-label="Đang tải khóa học của bạn" className="flex items-start gap-5 overflow-hidden py-4 [&_.animate-pulse]:motion-reduce:animate-none">
          {[0, 1, 2].map((i) => <Skeleton key={i} className={cn("aspect-[16/12] shrink-0 rounded-[1.5rem]", widths[i])} />)}
        </div>
      ) : (
        <ul aria-label="Khóa học của bạn" className="relative -mx-5 flex snap-x items-start gap-5 overflow-x-auto px-5 py-5 sm:-mx-8 sm:px-8">
          {others.map((course, index) => <TicketCourse key={course.id} course={course} index={index} />)}
        </ul>
      )}
    </section>
  );
}

function TicketCourse({ course, index }: { course: CoursesMeItem; index: number }) {
  const progress = Math.round(course.progress_percent ?? 0);
  return (
    <li className={cn("relative shrink-0 snap-start", widths[index % 3], tilts[index % 3])}>
      <TicketCard src={course.thumbnail_url} alt={`Ảnh bìa khóa học ${course.title}`} sizes="(min-width: 640px) 320px, 280px" captionClassName="space-y-1">
        <h3 className="line-clamp-1 text-base font-bold">
          <Link href={`/learning/${encodeURIComponent(course.slug)}`} className={stretchedLink}>
            {course.title}<span className="sr-only"> — {progress >= 100 ? "xem lại" : progress > 0 ? "học tiếp" : "bắt đầu học"}</span>
          </Link>
        </h3>
        <p className="text-xs font-semibold">{progress >= 100 ? "Đã hoàn thành" : progress > 0 ? `Đã học ${progress}%` : "Chưa bắt đầu"}</p>
        <ThinBar value={progress} label={`Tiến độ ${course.title}`} />
      </TicketCard>
    </li>
  );
}
