"use client";

import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import {
  HiUsers,
  HiBookOpen,
  HiBadgeCheck,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

interface LecturerItem {
  instructor_id: string;
  instructor_name: string;
  instructor_avatar: string;
  total_courses: number;
  total_enrolls: number;
}

interface LecturerResponse {
  items: LecturerItem[];
}

const LecturerCard = ({ item }: { item: LecturerItem }) => {
  const router = useRouter();

  return (
    <article className="rounded-[24px] border border-primary-pastel/80 bg-surface p-6 text-center">
      <div className="relative mb-4 inline-block">
        <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary-pastel">
          <img
            src={getImageUrl(item.instructor_avatar)}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (
                e.target as HTMLImageElement
              ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                item.instructor_name
              )}&background=E8F2FA&color=356FA7&size=80`;
            }}
          />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HiBadgeCheck className="h-4 w-4" />
        </span>
      </div>

      <h3 className="mb-4 text-base font-bold text-foreground">
        {item.instructor_name}
      </h3>

      <div className="mb-4 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1">
          <HiUsers className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">
            {item.total_enrolls.toLocaleString()}
          </span>
          <span>học viên</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <HiBookOpen className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">
            {item.total_courses}
          </span>
          <span>khóa học</span>
        </div>
      </div>

      <Button
        variant="pastel"
        size="sm"
        fullWidth
        onClick={() => router.push(`/instructors/${item.instructor_id}`)}
      >
        Xem giảng viên
      </Button>
    </article>
  );
};

interface LecturerRecommendsProps {
  slug: string;
}

const LecturerRecommends = ({ slug }: LecturerRecommendsProps) => {
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const { data, isLoading } = useSWR<LecturerResponse>(
    `/categories/${slug}/lectures/feed/recommend`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const instructors = data?.items || [];
  const hasMultiple = instructors.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { slidesToScroll: 1, align: "start" },
    hasMultiple ? [Autoplay({ delay: 4000, stopOnInteraction: false })] : []
  );

  const updateButtons = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);

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
    if (emblaApi && instructors.length > 0) {
      emblaApi.reInit();
    }
  }, [emblaApi, instructors.length]);

  const navBtnClass =
    "absolute top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-primary-pastel bg-surface text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section className="bg-background py-12 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="font-display text-3xl text-foreground">
            Giảng viên được đánh giá cao
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Học cùng giảng viên đang dạy trong danh mục này
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[24px] border border-primary-pastel/80 bg-surface p-6"
              >
                <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary-light" />
                <div className="mx-auto mb-2 h-4 w-3/4 rounded bg-primary-light" />
                <div className="mx-auto h-3 w-1/2 rounded bg-primary-light" />
              </div>
            ))}
          </div>
        ) : instructors.length > 0 ? (
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
              <div className="flex gap-6">
                {instructors.map((item) => (
                  <div
                    key={item.instructor_id}
                    className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(33.333%-16px)] lg:flex-[0_0_calc(25%-18px)] xl:flex-[0_0_calc(20%-19.2px)] min-w-0"
                  >
                    <LecturerCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Chưa có giảng viên trong mục này.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LecturerRecommends;
