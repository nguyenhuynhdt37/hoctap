"use client";

import { CourseTicketCard } from "@/components/user/shared/course-ticket-card";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "pulsoicon-react";
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
  const courseSlug = course.slug || course.id;

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (isChecking) return;
    setIsChecking(true);
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
    <CourseTicketCard
      href={`/course/${courseSlug}`}
      onClick={(event) => void handleClick(event)}
      ariaBusy={isChecking}
      title={course.title}
      thumbnail={course.thumbnail}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={
        course.score
          ? { label: `Đề xuất · ${course.score.toLocaleString("vi-VN")} điểm`, tone: "lavender" }
          : { label: "Đề xuất nổi bật", tone: "primary" }
      }
      metaParts={[
        course.instructor?.name,
        course.rating > 0 ? `${course.rating.toFixed(1)}★` : null,
        course.enrolls > 0 ? `${course.enrolls.toLocaleString("vi-VN")} học viên` : null,
      ]}
      srLabel={isChecking ? "(đang mở)" : "— xem khóa học"}
    />
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
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>
                <button
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={nextBtnDisabled}
                  className={`${navBtnClass} right-0`}
                  aria-label="Slide tiếp theo"
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
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
