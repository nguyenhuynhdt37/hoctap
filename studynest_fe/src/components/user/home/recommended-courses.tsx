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
      className="w-full group bg-white rounded-[24px] overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col md:flex-row h-[280px] md:h-[320px] cursor-pointer border border-[#E7EEF7] hover:border-[#BFD7ED] relative"
    >
      <div className="w-full md:w-[38rem] flex-shrink-0 h-full relative overflow-hidden bg-[#E8F2FA]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#3D4A5A]/25 via-transparent to-transparent z-10" />
        <img
          src={getGoogleDriveImageUrl(course.thumbnail || "")}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          onError={(e) => {
            (
              e.target as HTMLImageElement
            ).src = `https://via.placeholder.com/400x300/E8F2FA/356FA7?text=${encodeURIComponent(
              course.title
            )}`;
          }}
        />
        {course.similarity && (
          <div className="absolute top-4 right-4 z-20 bg-[#E8F2FA]/95 text-[#356FA7] border border-[#BFD7ED] text-xs font-semibold px-3.5 py-1.5 rounded-full backdrop-blur-sm">
            {Math.round(course.similarity * 100)}% phù hợp
          </div>
        )}
      </div>

      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative z-10">
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#356FA7] bg-[#E8F2FA] px-3 py-1 rounded-full mb-3">
            Đề xuất cá nhân hóa
          </span>
          <h3 className="text-xl md:text-2xl font-semibold text-[#3D4A5A] mb-4 line-clamp-2 group-hover:text-[#356FA7] transition-colors leading-snug">
            {course.title}
          </h3>
          {course.instructor && (
            <div className="flex items-center gap-3 mb-6">
              {course.instructor.avatar && (
                <div className="relative">
                  <img
                    src={getGoogleDriveImageUrl(course.instructor.avatar)}
                    alt={course.instructor.name}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover ring-2 ring-[#E8F2FA] group-hover:ring-[#BFD7ED] transition-all"
                    onError={(e) => {
                      (
                        e.target as HTMLImageElement
                      ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        course.instructor.name
                      )}&background=E8F2FA&color=356FA7&size=48`;
                    }}
                  />
                </div>
              )}
              <div>
                <p className="text-xs text-[#8190A3] font-medium">Giảng viên</p>
                <p className="text-sm text-[#3D4A5A] font-semibold group-hover:text-[#356FA7] transition-colors">
                  {course.instructor.name}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[#356FA7] font-semibold text-sm group-hover:gap-3 transition-all">
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
    "absolute top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-11 md:h-11 bg-white hover:bg-[#356FA7] text-[#356FA7] hover:text-white rounded-full flex items-center justify-center transition-all border border-[#E7EEF7] hover:border-[#356FA7] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section className="py-16 bg-[#F6FAFF] relative overflow-hidden border-b border-[#E7EEF7]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D4A5A] tracking-tight mb-2">
            Khóa học gợi ý cho bạn
          </h2>
          <p className="text-[#6F7C8C] text-sm font-medium flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-[#356FA7] rounded-full" />
            Dựa trên sở thích và hành vi học tập của bạn
          </p>
        </div>

        {isLoading ? (
          <div className="w-full bg-white border border-[#E7EEF7] rounded-[24px] overflow-hidden animate-pulse flex">
            <div className="w-64 md:w-80 flex-shrink-0 h-48 bg-[#E8F2FA]" />
            <div className="flex-1 p-6 space-y-3">
              <div className="h-6 bg-[#E8F2FA] rounded-lg w-3/4" />
              <div className="h-4 bg-[#E8F2FA]/70 rounded-lg w-1/2" />
            </div>
          </div>
        ) : (
          <div className="relative">
            {courses.length > 1 && (
              <>
                <button
                  onClick={scrollPrev}
                  disabled={prevBtnDisabled}
                  className={`${navBtnClass} -left-3 sm:-left-5`}
                  aria-label="Slide trước"
                >
                  <HiChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={scrollNext}
                  disabled={nextBtnDisabled}
                  className={`${navBtnClass} -right-3 sm:-right-5`}
                  aria-label="Slide tiếp theo"
                >
                  <HiChevronRight className="h-5 w-5" />
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
