"use client";

import { CoursesCarouselProps } from "@/types/user/course";
import { memo, useMemo } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import CourseCard from "./CourseCard";
import SkeletonCard from "./SkeletonCard";

const CoursesCarousel = memo(
  ({
    title,
    items,
    index,
    onPrev,
    onNext,
    hasMore,
    isLoadingFeeds,
    isFetchingMore,
    itemsPerPage,
    section,
  }: CoursesCarouselProps) => {
    const containerBg = useMemo(
      () =>
        section === "trending"
          ? "bg-[#F6FAFF]"
          : section === "newest"
          ? "bg-[#FFF9F6]"
          : section === "featured"
          ? "bg-[#F6FAFF]"
          : section === "recommended"
          ? "bg-[#F6FAFF]"
          : "bg-white",
      [section]
    );

    const totalPages = useMemo(
      () => Math.max(1, Math.ceil((items?.length || 0) / itemsPerPage)),
      [items?.length, itemsPerPage]
    );

    const skeletonCards = useMemo(
      () =>
        Array.from({ length: itemsPerPage }).map((_, i) => (
          <SkeletonCard key={`sk-loading-${section}-${i}`} />
        )),
      [itemsPerPage, section]
    );

    const fetchingSkeletonCards = useMemo(
      () =>
        Array.from({ length: itemsPerPage }).map((_, i) => (
          <SkeletonCard key={`sk-fetching-${section}-${i}`} />
        )),
      [itemsPerPage, section]
    );

    if (!isLoadingFeeds && (!items || items.length === 0)) {
      return null;
    }

    return (
      <section className={`py-16 ${containerBg} relative overflow-hidden border-b border-[#E7EEF7]/60`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D4A5A] tracking-tight mb-2">
                {title}
              </h2>
              {section === "trending" && (
                <p className="text-[#6F7C8C] text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#356FA7] rounded-full" />
                  Được nhiều học viên xem gần đây
                </p>
              )}
              {section === "top" && (
                <p className="text-[#6F7C8C] text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#E6B84D] rounded-full" />
                  Được đánh giá cao bởi học viên
                </p>
              )}
              {section === "newest" && (
                <p className="text-[#6F7C8C] text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#7A4A9E] rounded-full" />
                  Vừa được ra mắt gần đây
                </p>
              )}
              {section === "featured" && (
                <p className="text-[#6F7C8C] text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#8A3B58] rounded-full" />
                  Khám phá lựa chọn bán chạy
                </p>
              )}
              {section === "recommended" && (
                <p className="text-[#6F7C8C] text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#356FA7] rounded-full" />
                  Dựa trên sở thích và hành vi học tập của bạn
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2.5">
              <button
                onClick={onPrev}
                disabled={index === 0}
                aria-label="Trang trước"
                className="w-11 h-11 bg-white hover:bg-[#356FA7] disabled:bg-[#F6FAFF] disabled:text-[#8190A3] text-[#356FA7] hover:text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-xs border border-[#E7EEF7] hover:border-[#356FA7] disabled:border-[#E7EEF7] cursor-pointer disabled:cursor-not-allowed"
              >
                <HiChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={onNext}
                disabled={
                  (!hasMore && index >= totalPages - 1) || isFetchingMore
                }
                aria-label="Trang tiếp theo"
                className="w-11 h-11 bg-white hover:bg-[#356FA7] disabled:bg-[#F6FAFF] disabled:text-[#8190A3] disabled:cursor-not-allowed text-[#356FA7] hover:text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-xs border border-[#E7EEF7] hover:border-[#356FA7] disabled:border-[#E7EEF7] cursor-pointer"
              >
                {isFetchingMore ? (
                  <div className="w-4 h-4 border-2 border-[#356FA7] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiChevronRight className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden">
            {isLoadingFeeds ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {skeletonCards}
              </div>
            ) : (
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${index * 100}%)` }}
              >
                {Array.from({ length: totalPages }).map((_, pageIndex) => (
                  <div key={pageIndex} className="w-full flex-shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {(items?.length ? items : [])
                        .slice(
                          pageIndex * itemsPerPage,
                          (pageIndex + 1) * itemsPerPage
                        )
                        .map((course) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            section={section}
                          />
                        ))}
                    </div>
                  </div>
                ))}
                {isFetchingMore && (
                  <div className="w-full flex-shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {fetchingSkeletonCards}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }
);

CoursesCarousel.displayName = "CoursesCarousel";

export default CoursesCarousel;
