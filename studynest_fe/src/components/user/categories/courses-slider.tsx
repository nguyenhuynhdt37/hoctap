"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { Course, FeedResponse } from "@/types/user/course";
import useSWR from "swr";
import { useState, useCallback, useEffect, useMemo } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import CourseCard from "@/components/user/home/CourseCard";
import SkeletonCard from "@/components/user/home/SkeletonCard";
import useEmblaCarousel from "embla-carousel-react";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const transformCourse = (item: FeedResponse["items"][0]): Course => ({
  id: item.id,
  slug: item.slug,
  title: item.title,
  instructor: item.instructor?.name || "",
  instructorAvatar: item.instructor?.avatar || "",
  rating: (item as any).rating_avg || item.rating || 0,
  students: item.enrolls || 0,
  price: item.base_price ?? null,
  image: item.thumbnail,
  tags: item.tags || [],
});

interface CoursesSliderProps {
  slug: string;
  feedType: "newest" | "top-rated" | "top-view";
  title: string;
  section: "featured" | "trending" | "top" | "newest" | "recommended";
  subtitle?: string;
}

const CoursesSlider = ({
  slug,
  feedType,
  title,
  section,
  subtitle,
}: CoursesSliderProps) => {
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [allCourses, setAllCourses] = useState<FeedResponse["items"]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, isLoading } = useSWR<FeedResponse>(
    `/categories/${slug}/courses/feed/${feedType}?limit=4`,
    fetcher,
    { revalidateOnFocus: false }
  );

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
      const res = await api.get<FeedResponse>(
        `/categories/${slug}/courses/feed/${feedType}?limit=4&cursor=${cursor}`
      );
      setAllCourses((prev) => [...prev, ...res.data.items]);
      setCursor(res.data.next_cursor);
    } catch (error) {
      console.error("Error loading more courses:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, slug, feedType, isLoadingMore]);

  const courses = allCourses.map(transformCourse);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());

    if (!cursor || isLoadingMore) return;
    const selectedIndex = emblaApi.selectedScrollSnap();
    const totalSlides = courses.length;
    if (selectedIndex >= totalSlides - 3) {
      loadMore();
    }
  }, [emblaApi, courses.length, cursor, isLoadingMore, loadMore]);

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

  const navBtnClass =
    "absolute top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 text-green-600 hover:text-white rounded-full flex items-center justify-center transition-all border border-green-200 hover:border-green-500 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section className="py-16 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      <div className="absolute top-10 right-10 w-32 h-32 bg-green-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-emerald-600 font-medium flex items-center gap-2">
              <span className="text-green-500">✨</span>
              {subtitle}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="relative">
            <button
              onClick={scrollPrev}
              disabled={prevBtnDisabled}
              className={`${navBtnClass} -left-4 sm:-left-6 lg:-left-8`}
              aria-label="Slide trước"
            >
              <HiChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0"
                  >
                    <CourseCard course={course} section={section} />
                  </div>
                ))}
                {isLoadingMore &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`loading-${i}`}
                      className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0"
                    >
                      <SkeletonCard />
                    </div>
                  ))}
              </div>
            </div>
            <button
              onClick={scrollNext}
              disabled={nextBtnDisabled}
              className={`${navBtnClass} -right-4 sm:-right-6 lg:-right-8`}
              aria-label="Slide tiếp theo"
            >
              <HiChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Chưa có thông tin</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CoursesSlider;
