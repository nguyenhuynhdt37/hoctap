"use client";

import { Button } from "@/components/ui";
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
          ? "bg-background"
          : section === "newest"
          ? "bg-surface-muted"
          : section === "featured"
          ? "bg-background"
          : section === "recommended"
          ? "bg-background"
          : "bg-surface",
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
      <section
        className={`py-16 ${containerBg} relative overflow-hidden border-b border-border/60`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
                {title}
              </h2>
              {section === "trending" && (
                <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full" />
                  Được nhiều học viên xem gần đây
                </p>
              )}
              {section === "top" && (
                <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-warning-foreground rounded-full" />
                  Được đánh giá cao bởi học viên
                </p>
              )}
              {section === "newest" && (
                <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-accent-foreground rounded-full" />
                  Vừa được ra mắt gần đây
                </p>
              )}
              {section === "featured" && (
                <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-secondary-foreground rounded-full" />
                  Khám phá lựa chọn bán chạy
                </p>
              )}
              {section === "recommended" && (
                <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full" />
                  Dựa trên sở thích và hành vi học tập của bạn
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2.5">
              <Button
                variant="secondary"
                size="icon"
                onClick={onPrev}
                disabled={index === 0}
                aria-label="Trang trước"
                className="rounded-full w-11 h-11 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <HiChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={onNext}
                disabled={(!hasMore && index >= totalPages - 1) || isFetchingMore}
                isLoading={isFetchingMore}
                aria-label="Trang tiếp theo"
                className="rounded-full w-11 h-11 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <HiChevronRight className="h-5 w-5" />
              </Button>
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
