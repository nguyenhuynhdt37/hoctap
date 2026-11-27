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
import { GlassCard } from "./landing-ui";
import { CourseLecturer } from "./courses/course-card";
import { mayPortrait, StudyImage } from "./study-image";

const RecommendedCourseCard = ({ course, compact = false }: { course: RecommendedItem; compact?: boolean }) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleClick = async () => {
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

  if (compact) {
    return (
      <article className="grid min-h-33 min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-2.5 rounded-lg border border-border bg-background p-2.5">
        <StudyImage src={course.thumbnail} alt={`Ảnh bìa khóa học ${course.title}`} sizes="88px" className="aspect-[4/3] rounded-md" />
        <div className="min-w-0">
          <h4 className="line-clamp-2 text-sm leading-snug font-semibold wrap-anywhere">{course.title}</h4>
          {course.instructor && (
            <p className="mt-1 flex items-center gap-1.5 text-xs wrap-anywhere">
              <StudyImage src={course.instructor.avatar} fallback={mayPortrait} sizes="20px" className="size-5 shrink-0 rounded-full" />
              {course.instructor.name}
            </p>
          )}
          {course.similarity > 0 && <p className="mt-1.5 text-xs leading-snug text-info-foreground">Gần với sở thích đã chọn ({Math.round(course.similarity * 100)}% phù hợp).</p>}
          <Button variant="ghost" className="-ml-2 mt-1 min-h-9 px-2 text-xs text-info-foreground motion-reduce:transition-none"
            rightIcon={<ArrowRight className="size-3.5" />} onClick={() => void handleClick()} isLoading={isChecking} loadingText="Đang mở…">
            Xem khóa học<span className="sr-only"> {course.title}</span>
          </Button>
        </div>
      </article>
    );
  }

  return (
    <GlassCard as="article" className="flex min-w-0 flex-col gap-2 bg-linear-to-br from-surface to-primary-light/60 p-3 sm:flex-row">
      <StudyImage src={course.thumbnail} alt={`Ảnh bìa khóa học ${course.title}`} sizes="(min-width: 1280px) 250px, (min-width: 768px) 22vw, (min-width: 640px) 34vw, 85vw" className="aspect-video shrink-0 sm:w-2/5 sm:self-center" />
      <div className="min-w-0 flex-1 space-y-3 p-5 sm:p-6">
        <h4 className="wrap-anywhere text-lg font-semibold">{course.title}</h4>
        {course.instructor && <CourseLecturer name={course.instructor.name} avatar={course.instructor.avatar} />}
        {Boolean(course.similarity) && (
          <Badge variant="info">{Math.round(course.similarity * 100)}% phù hợp</Badge>
        )}
        <div>
          <Button className="min-h-11 rounded-full" rightIcon={<ArrowRight className="size-4" />} onClick={() => void handleClick()} isLoading={isChecking} loadingText="Đang mở khóa học…">
            Khám phá khóa học
          </Button>
        </div>
      </div>
    </GlassCard>
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
