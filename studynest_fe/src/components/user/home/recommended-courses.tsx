"use client";

import { Badge, Button, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useUserStore } from "@/stores/user";
import { RecommendedItem, RecommendedResponse } from "@/types/user/course";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import useSWR from "swr";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const RecommendedCourseCard = ({ course }: { course: RecommendedItem }) => {
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

  return (
    <Card
      density="none"
      interactive
      onClick={handleClick}
      className="w-full group rounded-[24px] overflow-hidden flex flex-col md:flex-row h-[280px] md:h-[320px] relative"
    >
      <div className="w-full md:w-[38rem] flex-shrink-0 h-full relative overflow-hidden bg-primary-light">
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/25 via-transparent to-transparent z-10" />
        <img
          src={getImageUrl(course.thumbnail || "")}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/logo/maymay-logo.svg";
          }}
        />
        {course.similarity && (
          <div className="absolute top-4 right-4 z-20">
            <Badge
              variant="default"
              size="md"
              className="bg-primary-light/95 backdrop-blur-sm shadow-xs"
            >
              {Math.round(course.similarity * 100)}% phù hợp
            </Badge>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative z-10">
        <div>
          <Badge variant="default" size="sm" className="uppercase tracking-wider mb-3">
            Đề xuất cá nhân hóa
          </Badge>
          <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-4 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {course.title}
          </h3>
          {course.instructor && (
            <div className="flex items-center gap-3 mb-6">
              {course.instructor.avatar && (
                <div className="relative">
                  <img
                    src={getImageUrl(course.instructor.avatar)}
                    alt={course.instructor.name}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover ring-2 ring-primary-light group-hover:ring-primary-pastel transition-all"
                    onError={(e) => {
                      (
                        e.target as HTMLImageElement
                      ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        course.instructor.name
                      )}&size=48`;
                    }}
                  />
                </div>
              )}
              <div>
                <p className="text-xs text-subtle-foreground font-medium">
                  Giảng viên
                </p>
                <p className="text-sm text-foreground font-semibold group-hover:text-primary transition-colors">
                  {course.instructor.name}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
          <span>Khám phá khóa học</span>
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      </div>
    </Card>
  );
};

const RecommendedCourses = () => {
  const user = useUserStore((s) => s.user);
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const { data, isLoading } = useSWR<RecommendedResponse>(
    user ? "/courses/feed/recommend" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const courses = data?.items || [];

  const plugins = useMemo(() => {
    return [Autoplay({ delay: 4000, stopOnInteraction: false })];
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: courses.length > 1, duration: 20 },
    courses.length > 1 ? plugins : []
  );

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
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && courses.length > 0) {
      emblaApi.reInit();
      onSelect();
    }
  }, [emblaApi, courses.length, onSelect]);

  if (!user || (!isLoading && courses.length === 0)) return null;

  return (
    <section className="py-16 bg-background relative overflow-hidden border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
            Khóa học gợi ý cho bạn
          </h2>
          <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-primary rounded-full" />
            Dựa trên sở thích và hành vi học tập của bạn
          </p>
        </div>

        {isLoading ? (
          <Card density="none" className="w-full rounded-[24px] overflow-hidden flex">
            <Skeleton className="w-64 md:w-80 flex-shrink-0 h-48 rounded-none" />
            <div className="flex-1 p-6 space-y-3">
              <Skeleton variant="text" className="h-6 w-3/4" />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          </Card>
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
                  aria-label="Slide trước"
                >
                  <HiChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollNext}
                  disabled={nextBtnDisabled}
                  className="absolute top-1/2 -translate-y-1/2 z-30 -right-3 sm:-right-5 w-10 h-10 md:w-11 md:h-11 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
                  aria-label="Slide tiếp theo"
                >
                  <HiChevronRight className="h-5 w-5" />
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
