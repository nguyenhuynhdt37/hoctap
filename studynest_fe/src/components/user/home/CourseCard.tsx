"use client";

import { CourseTicketCard } from "@/components/user/shared/course-ticket-card";
import api from "@/lib/utils/fetcher/client/axios";
import { CourseCardProps } from "@/types/user/course";
import { useRouter } from "next/navigation";
import { useCallback, useState, type MouseEvent } from "react";

const CourseCard = ({ course }: CourseCardProps) => {
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(false);
  const router = useRouter();
  const slug = course.slug || course.id;

  const handleOpen = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
        return;
      }
      event.preventDefault();
      if (isCheckingEnrollment) return;

      setIsCheckingEnrollment(true);
      try {
        const response = await api.get(`/courses/${course.id}/is_enroll`);
        const { is_enroll } = response.data;
        router.push(is_enroll ? `/learning/${slug}` : `/course/${slug}`);
      } catch {
        router.push(`/course/${slug}`);
      } finally {
        setIsCheckingEnrollment(false);
      }
    },
    [course.id, isCheckingEnrollment, router, slug],
  );

  const hasDiscount =
    typeof course.price === "number" &&
    typeof course.originalPrice === "number" &&
    course.originalPrice > 0 &&
    course.price < course.originalPrice;
  const discountPercent = hasDiscount
    ? Math.max(1, Math.round((1 - course.price! / course.originalPrice!) * 100))
    : 0;

  const badge = hasDiscount
    ? { label: `Tiết kiệm ${discountPercent}%`, tone: "lavender" as const }
    : course.badge
      ? { label: course.badge, tone: "lavender" as const }
      : course.isBestSeller
        ? { label: "Bán chạy", tone: "lavender" as const }
        : course.tags?.[0]
          ? { label: course.tags[0], tone: "primary" as const }
          : null;

  const metaParts: Array<string | null | undefined | false> = [
    course.instructor,
    typeof course.rating === "number" && course.rating > 0
      ? `${course.rating.toFixed(1)}★`
      : null,
    typeof course.students === "number" && course.students > 0
      ? `${course.students.toLocaleString("vi-VN")} học viên`
      : null,
  ];

  return (
    <CourseTicketCard
      href={`/course/${slug}`}
      onClick={(event) => void handleOpen(event)}
      ariaBusy={isCheckingEnrollment}
      title={course.title}
      thumbnail={course.image}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={badge}
      metaParts={metaParts}
      price={
        course.price !== null && course.price !== undefined
          ? {
              priceVnd: course.price,
              originalPriceVnd: hasDiscount ? course.originalPrice : undefined,
              isFree: course.price === 0,
            }
          : null
      }
      srLabel={isCheckingEnrollment ? "(đang mở)" : "— xem khóa học"}
    />
  );
};

export default CourseCard;
