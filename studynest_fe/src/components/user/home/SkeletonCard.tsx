"use client";

import { Card, Skeleton } from "@/components/ui";

export default function SkeletonCard() {
  return (
    <Card density="none" className="overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="h-3 w-1/2" />
        <Skeleton variant="text" className="w-1/4 mt-2" />
      </div>
    </Card>
  );
}
