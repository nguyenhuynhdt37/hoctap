"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

interface CategoryRecommendedItem {
  id: string;
  title: string;
  slug?: string;
  thumbnail: string;
  instructor: {
    id: string;
    name: string;
    avatar: string;
  };
  views: number;
  enrolls: number;
  rating: number;
  score: number;
}

interface CategoryRecommendedResponse {
  items: CategoryRecommendedItem[];
}

const RecommendedCourseCard = ({
  course,
}: {
  course: CategoryRecommendedItem;
}) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleClick = async () => {
    if (isChecking) return;
    setIsChecking(true);
    const courseSlug = course.slug || course.id;
    try {
      const res = await api.get(`/courses/${course.id}/is_enroll`);
      router.push(
        res.data.is_enroll ? `/learning/${courseSlug}` : `/course/${courseSlug}`
      );
    } catch {
      router.push(`/course/${courseSlug}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex h-auto w-full cursor-pointer flex-col overflow-hidden rounded-[24px] border border-primary-pastel/80 bg-surface text-left shadow-sm transition-colors hover:border-primary md:h-72 md:flex-row"
    >
      <div className="relative h-48 w-full shrink-0 overflow-hidden md:h-auto md:w-[42%]">
        <img
          src={getImageUrl(course.thumbnail || "")}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/logo/maymay-logo.svg";
          }}
        />
        {course.score ? (
          <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Điểm {course.score.toLocaleString()}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between p-6 md:p-8">
        <div>
          <h3 className="line-clamp-2 text-xl font-bold leading-tight text-foreground md:text-2xl">
            {course.title}
          </h3>
          {course.instructor && (
            <div className="mt-4 flex items-center gap-3">
              {course.instructor.avatar && (
                <img
                  src={getImageUrl(course.instructor.avatar)}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-primary-pastel"
                  onError={(e) => {
                    (
                      e.target as HTMLImageElement
                    ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      course.instructor.name
                    )}&background=E8F2FA&color=356FA7&size=48`;
                  }}
                />
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Giảng viên
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {course.instructor.name}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
          <span>{isChecking ? "Đang mở..." : "Xem khóa học"}</span>
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
    </button>
  );
};

interface CourseRecommendsProps {
  slug: string;
}

const CourseRecommends = ({ slug }: CourseRecommendsProps) => {
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const { data, isLoading } = useSWR<CategoryRecommendedResponse>(
    `/categories/${slug}/courses/feed/recommend`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const courses = data?.items || [];
  const hasMultiple = courses.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: hasMultiple, duration: 20 },
    hasMultiple ? [Autoplay({ delay: 4000, stopOnInteraction: false })] : []
  );

  const updateButtons = useCallback(() => {
    if (!emblaApi) return;
    if (hasMultiple) {
      setPrevBtnDisabled(false);
      setNextBtnDisabled(false);
    } else {
      setPrevBtnDisabled(!emblaApi.canScrollPrev());
      setNextBtnDisabled(!emblaApi.canScrollNext());
    }
  }, [emblaApi, hasMultiple]);

  useEffect(() => {
    if (!emblaApi) return;
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi, updateButtons]);

  useEffect(() => {
    if (emblaApi && courses.length > 0) {
      emblaApi.reInit();
    }
  }, [emblaApi, courses.length]);

  const navBtnClass =
    "absolute top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-primary-pastel bg-surface text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="font-display text-3xl text-foreground">
            Khóa học gợi ý
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Khóa học phù hợp nhất với danh mục này
          </p>
        </div>

        {isLoading ? (
          <div className="flex animate-pulse overflow-hidden rounded-[24px] border border-primary-pastel/80 bg-surface">
            <div className="h-48 w-full shrink-0 bg-primary-light md:h-72 md:w-[42%]" />
            <div className="flex-1 space-y-3 p-6">
              <div className="h-6 w-3/4 rounded-lg bg-primary-light" />
              <div className="h-4 w-1/2 rounded-lg bg-primary-light" />
            </div>
          </div>
        ) : courses.length > 0 ? (
          <div className="relative px-12">
            {hasMultiple && (
              <>
                <button
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={prevBtnDisabled}
                  className={`${navBtnClass} left-0`}
                  aria-label="Slide trước"
                >
                  <HiChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>
                <button
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={nextBtnDisabled}
                  className={`${navBtnClass} right-0`}
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
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Chưa có khóa học gợi ý.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CourseRecommends;
