"use client";

import { Badge, Button, EmptyState, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import { RecommendedItem, RecommendedResponse } from "@/types/user/course";
import useEmblaCarousel from "embla-carousel-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "pulsoicon-react";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import Link from "next/link";
import { ArrowRight } from "pulsoicon-react";
import { CourseTicketCard } from "@/components/user/shared/course-ticket-card";
import { GlassCard } from "./landing-ui";
import { CourseLecturer } from "./courses/course-card";
import { mayPortrait, StudyImage } from "./study-image";

const RecommendedCourseCard = ({ course }: { course: RecommendedItem; compact?: boolean }) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (isChecking) return;
    setIsChecking(true);
    try {
      const res = await api.get(`/courses/${course.id}/is_enroll`);
      router.push(
        res.data.is_enroll
          ? `/learning/${course.slug}`
          : `/course/${course.slug}`
      );
    } catch {
      router.push(`/course/${course.slug}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <CourseTicketCard
      href={`/course/${course.slug}`}
      onClick={(event) => void handleClick(event)}
      ariaBusy={isChecking}
      title={course.title}
      thumbnail={course.thumbnail}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={
        course.similarity > 0
          ? { label: `${Math.round(course.similarity * 100)}% phù hợp`, tone: "lavender" }
          : { label: "Gợi ý cho bạn", tone: "primary" }
      }
      metaParts={[course.instructor?.name]}
      srLabel={isChecking ? "(đang mở)" : "— xem khóa học"}
    />
  );
};

const RecommendedCourses = ({ embedded = false }: { embedded?: boolean }) => {
  const user = useUserStore((s) => s.user);
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const { data, error, isValidating, mutate } = useAuthedSWR<RecommendedResponse>(
    user ? "/courses/feed/recommend" : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const courses = data?.items || [];

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: courses.length > 1,
    breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const hasLoop = courses.length > 1;
    if (hasLoop) {
      setPrevBtnDisabled(false);
      setNextBtnDisabled(false);
    } else {
      setPrevBtnDisabled(!emblaApi.canScrollPrev());
      setNextBtnDisabled(!emblaApi.canScrollNext());
    }
  }, [emblaApi, courses.length]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && courses.length > 0) {
      emblaApi.reInit();
    }
  }, [emblaApi, courses.length]);

  if (!user) return null;
  if (embedded) {
    return (
      <section aria-label="Khóa học gợi ý" className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold">Khóa học</h3>
        {error ? (
          <div role="alert" className="space-y-2 rounded-lg border border-destructive-border bg-destructive-bg p-3 text-destructive-foreground">
            <p className="text-sm">Chưa tải được khóa gợi ý. Tải lại để xem khóa hợp sở thích.</p>
            <Button variant="outline" size="sm" isLoading={isValidating} loadingText="Đang thử lại…" onClick={() => void mutate().catch(() => undefined)}>Thử lại</Button>
          </div>
        ) : !data ? (
          <div role="status" aria-label="Đang tải khóa học gợi ý" className="flex gap-2.5 rounded-lg border border-border bg-background p-2.5 motion-reduce:[&_div]:animate-none">
            <Skeleton className="h-16 w-22 shrink-0" />
            <div className="w-full space-y-2"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-9 w-28" /></div>
          </div>
        ) : courses.length ? (
          <ul className="relative flex snap-x gap-2 overflow-x-auto p-1">
            {courses.map((course) => <li key={course.id} className="min-w-0 flex-[0_0_min(92%,24rem)] snap-start"><RecommendedCourseCard course={course} compact /></li>)}
          </ul>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg bg-background p-3">
            <StudyImage fallback={mayPortrait} sizes="52px" className="size-13 shrink-0 rounded-lg" />
            <p className="text-xs leading-relaxed">Chọn một môn trong danh mục để tìm khóa hợp sở thích.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Khóa học gợi ý" className="relative overflow-hidden border-b border-border bg-background py-16">
      <div className="user-container relative z-10">
        <div className="mb-8">
          <h3 className="mb-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Khóa học gợi ý cho bạn
          </h3>
        </div>

        {error ? (
          <div role="alert" className="space-y-3 rounded-2xl border border-destructive-border bg-destructive-bg p-5 text-destructive-foreground">
            <p>Mây chưa tải được khóa học gợi ý.</p>
            <Button variant="outline" isLoading={isValidating} loadingText="Đang thử lại…" onClick={() => void mutate().catch(() => undefined)}>
              Thử lại
            </Button>
          </div>
        ) : !data ? (
          <div role="status" aria-label="Đang tải khóa học gợi ý">
            <GlassCard tilt={false} className="grid gap-4 p-3 sm:grid-cols-[2fr_3fr]">
              <Skeleton className="h-40 rounded-2xl motion-reduce:animate-none sm:h-48" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-6 w-3/4 motion-reduce:animate-none" />
                <Skeleton className="h-4 w-1/2 motion-reduce:animate-none" />
                <Skeleton className="h-11 w-40 rounded-full motion-reduce:animate-none" />
              </div>
            </GlassCard>
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            compact
            title="Mây chưa tìm được khóa học gợi ý cho bạn"
            action={<Link href="/courses" className="font-semibold text-primary underline">Xem tất cả khóa học</Link>}
          />
        ) : (
          <div className="relative">
            {courses.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollPrev}
                  disabled={prevBtnDisabled}
                  className="absolute top-1/2 -translate-y-1/2 z-30 -left-3 sm:-left-5 w-10 h-10 md:w-11 md:h-11 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
                  aria-label="Khóa học trước"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollNext}
                  disabled={nextBtnDisabled}
                  className="absolute top-1/2 -translate-y-1/2 z-30 -right-3 sm:-right-5 w-10 h-10 md:w-11 md:h-11 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
                  aria-label="Khóa học tiếp theo"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {courses.map((course) => (
                  <div key={course.id} className="flex-[0_0_100%] min-w-0">
                    <RecommendedCourseCard course={course} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedCourses;
