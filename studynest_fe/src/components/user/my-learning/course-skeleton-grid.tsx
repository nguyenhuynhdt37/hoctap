import { Card, Skeleton } from "@/components/ui";

export const CourseSkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    {Array.from({ length: count }).map((_, index) => (
      <Card
        key={index}
        className="flex flex-col overflow-hidden border-border bg-surface rounded-[20px] p-0 shadow-xs"
      >
        {/* Thumbnail Skeleton */}
        <Skeleton variant="rect" className="aspect-video w-full rounded-none" />

        {/* Content Skeleton */}
        <div className="flex flex-1 flex-col p-5 space-y-3.5">
          {/* Metadata Row */}
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="h-4 w-20 rounded-md" />
            <Skeleton variant="text" className="h-4 w-16 rounded-md" />
          </div>

          {/* Title Lines */}
          <div className="space-y-2">
            <Skeleton variant="text" className="h-4 w-full rounded-md" />
            <Skeleton variant="text" className="h-4 w-3/4 rounded-md" />
          </div>

          {/* Progress Skeleton */}
          <div className="mt-auto pt-3 border-t border-border/70 space-y-2">
            <div className="flex justify-between">
              <Skeleton variant="text" className="h-3 w-24 rounded-md" />
              <Skeleton variant="text" className="h-3 w-8 rounded-md" />
            </div>
            <Skeleton variant="rect" className="h-2 w-full rounded-full" />
          </div>

          {/* Footer Metadata */}
          <div className="flex justify-between pt-1">
            <Skeleton variant="text" className="h-3 w-16 rounded-md" />
            <Skeleton variant="text" className="h-3 w-24 rounded-md" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);
