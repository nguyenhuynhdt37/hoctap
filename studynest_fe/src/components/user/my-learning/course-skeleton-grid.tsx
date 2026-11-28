import { CourseTicketCardSkeleton } from "@/components/user/shared/course-ticket-card";

export const CourseSkeletonGrid = ({ count = 8 }: { count?: number }) => (
  <div className="mb-8 user-four-column-grid">
    {Array.from({ length: count }).map((_, index) => (
      <CourseTicketCardSkeleton key={index} />
    ))}
  </div>
);
