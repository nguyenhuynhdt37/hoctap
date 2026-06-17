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
          ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50"
          : section === "newest"
          ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"
          : section === "featured"
          ? "bg-gradient-to-br from-green-50 to-emerald-50"
          : section === "recommended"
          ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"
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
      <section className={`py-16 ${containerBg} relative overflow-hidden`}>
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-green-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-2">
                {title}
              </h2>
              {section === "trending" && (
                <p className="text-emerald-600 font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Được nhiều học viên xem gần đây
                </p>
              )}
              {section === "top" && (
                <p className="text-green-600 font-medium flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  Được đánh giá cao bởi học viên
                </p>
              )}
              {section === "newest" && (
                <p className="text-green-600 font-medium flex items-center gap-2">
                  <span className="text-green-500">✨</span>
                  Vừa được ra mắt gần đây
                </p>
              )}
              {section === "featured" && (
                <p className="text-emerald-600 font-medium flex items-center gap-2">
                  <span className="text-green-500">🔥</span>
                  Khám phá lựa chọn bán chạy
                </p>
              )}
              {section === "recommended" && (
                <p className="text-emerald-600 font-medium flex items-center gap-2">
                  <span className="text-green-500">🎯</span>
                  Dựa trên sở thích và hành vi học tập của bạn
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onPrev}
                disabled={index === 0}
                className="w-12 h-12 bg-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 text-green-600 hover:text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl disabled:shadow-none border-2 border-green-100 disabled:border-gray-200"
              >
                <HiChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={onNext}
                disabled={
                  (!hasMore && index >= totalPages - 1) || isFetchingMore
                }
                className="w-12 h-12 bg-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-green-600 hover:text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl disabled:shadow-none border-2 border-green-100 disabled:border-gray-200"
              >
                {isFetchingMore ? (
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiChevronRight className="h-6 w-6" />
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
                className="flex transition-transform duration-300 ease-in-out"
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
                {/* Skeleton loading tab khi đang fetch more */}
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
