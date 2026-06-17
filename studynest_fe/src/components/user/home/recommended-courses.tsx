"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { useUserStore } from "@/stores/user";
import { RecommendedItem, RecommendedResponse } from "@/types/user/course";
import useSWR from "swr";
import { useCallback, useEffect, useState, useMemo } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

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
    <div
      onClick={handleClick}
      className="w-full group bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all duration-500 flex flex-col md:flex-row h-[280px] md:h-[320px] cursor-pointer border border-green-100 hover:border-green-300 relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/0 via-emerald-50/0 to-teal-50/0 group-hover:from-green-50/50 group-hover:via-emerald-50/30 group-hover:to-teal-50/50 transition-all duration-500 pointer-events-none" />

      <div className="w-full md:w-[40rem] flex-shrink-0 h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
        <img
          src={getGoogleDriveImageUrl(course.thumbnail || "")}
          alt={course.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (
              e.target as HTMLImageElement
            ).src = `https://via.placeholder.com/400x300/00bba7/ffffff?text=${encodeURIComponent(
              course.title
            )}`;
          }}
        />
        {course.similarity && (
          <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-full backdrop-blur-sm">
            {Math.round(course.similarity * 100)}% phù hợp
          </div>
        )}
      </div>

      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative z-10">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 line-clamp-2 group-hover:text-green-600 transition-colors leading-tight">
            {course.title}
          </h3>
          {course.instructor && (
            <div className="flex items-center gap-3 mb-6">
              {course.instructor.avatar && (
                <div className="relative">
                  <img
                    src={getGoogleDriveImageUrl(course.instructor.avatar)}
                    alt={course.instructor.name}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ring-4 ring-green-100 group-hover:ring-green-300 transition-all"
                    onError={(e) => {
                      (
                        e.target as HTMLImageElement
                      ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        course.instructor.name
                      )}&background=00bba7&color=fff&size=48`;
                    }}
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 font-medium">Giảng viên</p>
                <p className="text-base text-gray-800 font-semibold group-hover:text-green-600 transition-colors">
                  {course.instructor.name}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-green-600 font-semibold text-sm group-hover:gap-3 transition-all">
          <span>Khám phá khóa học</span>
          <svg
            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
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
    </div>
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

  const navBtnClass =
    "absolute top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 text-green-600 hover:text-white rounded-full flex items-center justify-center transition-all border border-green-200 hover:border-green-500 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section className="py-16 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      <div className="absolute top-10 right-10 w-32 h-32 bg-green-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-2">
            Khóa học gợi ý cho bạn
          </h2>
          <p className="text-emerald-600 font-medium flex items-center gap-2">
            <span className="text-green-500">🎯</span>
            Dựa trên sở thích và hành vi học tập của bạn
          </p>
        </div>

        {isLoading ? (
          <div className="w-full bg-white border border-green-100 rounded-2xl overflow-hidden animate-pulse flex">
            <div className="w-64 md:w-80 flex-shrink-0 h-48 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100" />
            <div className="flex-1 p-6 space-y-3">
              <div className="h-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded w-3/4" />
              <div className="h-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded w-1/2" />
            </div>
          </div>
        ) : (
          <div className="relative">
            {courses.length > 1 && (
              <>
                <button
                  onClick={scrollPrev}
                  disabled={prevBtnDisabled}
                  className={`${navBtnClass} -left-4 sm:-left-6 lg:-left-8`}
                  aria-label="Slide trước"
                >
                  <HiChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>
                <button
                  onClick={scrollNext}
                  disabled={nextBtnDisabled}
                  className={`${navBtnClass} -right-4 sm:-right-6 lg:-right-8`}
                  aria-label="Slide tiếp theo"
                >
                  <HiChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </button>
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
