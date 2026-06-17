"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
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
    <div
      onClick={() => router.push(`/instructors/${item.instructor_id}`)}
      className="group bg-white rounded-xl p-6 text-center hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-2 cursor-pointer"
    >
      <div className="relative mb-4 inline-block">
        <div className="w-20 h-20 rounded-full ring-4 ring-green-100 group-hover:ring-green-300 transition-all duration-300 overflow-hidden">
          <img
            src={getGoogleDriveImageUrl(item.instructor_avatar)}
            alt={item.instructor_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (
                e.target as HTMLImageElement
              ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                item.instructor_name
              )}&background=00bba7&color=fff&size=80`;
            }}
          />
        </div>
        <div className="absolute -bottom-1 -right-1">
          <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <HiBadgeCheck className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">
        {item.instructor_name}
      </h3>

      <div className="space-y-2 text-xs text-gray-600 mb-4">
        <div className="flex items-center justify-center gap-1">
          <HiUsers className="w-4 h-4 text-green-500" />
          <span className="font-semibold">
            {item.total_enrolls.toLocaleString()}
          </span>
          <span>học viên</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <HiBookOpen className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold">{item.total_courses}</span>
          <span>khóa học</span>
        </div>
      </div>

      <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 rounded-lg text-sm font-bold transition-all duration-300 shadow-md hover:shadow-xl">
        Xem khóa học
      </button>
    </div>
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
    "absolute top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 text-green-600 hover:text-white rounded-full flex items-center justify-center transition-all border border-green-200 hover:border-green-500 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section className="py-16 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      <div className="absolute top-10 right-10 w-32 h-32 bg-green-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-2">
            Giảng viên được đánh giá cao
          </h2>
          <p className="text-emerald-600 font-medium flex items-center gap-2">
            <span className="text-green-500">👨‍🏫</span>
            Học từ những chuyên gia có kinh nghiệm thực tế
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-green-100 rounded-xl p-6 animate-pulse"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4" />
                <div className="h-4 bg-green-100 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-green-100 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : instructors.length > 0 ? (
          <div className="relative">
            {hasMultiple && (
              <>
                <button
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={prevBtnDisabled}
                  className={`${navBtnClass} -left-4 sm:-left-6 lg:-left-8`}
                  aria-label="Slide trước"
                >
                  <HiChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>
                <button
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={nextBtnDisabled}
                  className={`${navBtnClass} -right-4 sm:-right-6 lg:-right-8`}
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
            <p className="text-gray-500">Chưa có thông tin</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LecturerRecommends;
